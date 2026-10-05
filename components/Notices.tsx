'use client'

import { Bell, DeviceMobile, Export, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { currentSubscription, enablePush, isIOS, isStandalone, pushConfigured, pushSupported } from '@/lib/push'

const DISMISS_KEY = 'ht.dismissed'

function useDismissed(id: string): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    setDismissed(localStorage.getItem(`${DISMISS_KEY}.${id}`) === '1')
  }, [id])
  return [
    dismissed,
    () => {
      localStorage.setItem(`${DISMISS_KEY}.${id}`, '1')
      setDismissed(true)
    },
  ]
}

/** Hướng dẫn "Thêm vào màn hình chính" (bắt buộc trên iOS để nhận thông báo). */
export function InstallHint() {
  const [show, setShow] = useState(false)
  const [dismissed, dismiss] = useDismissed('install')
  const [prompt, setPrompt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null)

  useEffect(() => {
    setShow(!isStandalone())
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as Event & { prompt: () => Promise<void> })
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!show || dismissed) return null
  const ios = isIOS()
  if (!ios && !prompt) return null

  return (
    <div className="notice">
      <span className="notice__icon" aria-hidden>
        <DeviceMobile size={22} />
      </span>
      <div className="notice__text">
        <strong>Cài Giữ Lửa lên màn hình chính</strong>
        {ios ? (
          <span>
            Bấm nút <b>Chia sẻ</b> <Export size={15} style={{ verticalAlign: '-2px' }} aria-label="biểu tượng chia sẻ" /> của Safari → <b>Thêm vào MH chính</b>. Sau đó mở app từ màn hình chính để bật thông báo.
          </span>
        ) : (
          <span>Mở nhanh như app thật và nhận nhắc nhở đúng giờ.</span>
        )}
      </div>
      <div className="notice__actions">
        {prompt && (
          <button type="button" className="chip chip--accent" onClick={() => prompt.prompt().then(() => setPrompt(null))}>
            Cài đặt
          </button>
        )}
        <button type="button" className="notice__close" onClick={dismiss} aria-label="Ẩn">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

/** Mời bật thông báo nếu app đã cài nhưng chưa đăng ký push. */
export function PushPrompt() {
  const [need, setNeed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, dismiss] = useDismissed('push')

  useEffect(() => {
    if (!pushConfigured() || !pushSupported()) return
    if (isIOS() && !isStandalone()) return
    currentSubscription().then((s) => setNeed(!s))
  }, [])

  if (!need || dismissed) return null

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      await enablePush()
      setNeed(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="notice notice--accent">
      <span className="notice__icon" aria-hidden>
        <Bell size={22} />
      </span>
      <div className="notice__text">
        <strong>Bật nhắc nhở</strong>
        <span>{error ?? 'Nhắc đúng giờ hẹn và báo động khi streak sắp mất.'}</span>
      </div>
      <div className="notice__actions">
        <button type="button" className="chip chip--accent" onClick={enable} disabled={busy}>
          {busy ? '…' : 'Bật'}
        </button>
        <button type="button" className="notice__close" onClick={dismiss} aria-label="Ẩn">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
