'use client'

import { Archive, Bell, CircleHalf, Moon, Palette, Sun, Warning, type Icon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { PixelFlame } from '@/components/PixelFlame'
import { exportBackup, importBackup, wipeAll } from '@/lib/db'
import { todayKey } from '@/lib/dates'
import {
  currentSubscription,
  disablePush,
  enablePush,
  isIOS,
  isStandalone,
  pushConfigured,
  pushSupported,
  sendTestPush,
} from '@/lib/push'
import { getPalette, getThemePref, PALETTES, setPalette, setThemePref, type Palette as PaletteName, type ThemePref } from '@/lib/theme'

const THEMES: { value: ThemePref; label: string; icon: Icon }[] = [
  { value: 'system', label: 'Hệ thống', icon: CircleHalf },
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
]

type PushState = 'loading' | 'unconfigured' | 'unsupported' | 'need-install' | 'off' | 'on' | 'denied'

export default function SettingsPage() {
  const [push, setPush] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState<ThemePref>(getThemePref)
  const [palette, setPaletteState] = useState<PaletteName>(getPalette)

  async function refresh() {
    if (!pushConfigured()) return setPush('unconfigured')
    if (!pushSupported()) return setPush(isIOS() && !isStandalone() ? 'need-install' : 'unsupported')
    if (Notification.permission === 'denied') return setPush('denied')
    setPush((await currentSubscription()) ? 'on' : 'off')
  }

  useEffect(() => {
    refresh()
  }, [])

  async function run(fn: () => Promise<string | void>) {
    setBusy(true)
    setMsg(null)
    try {
      const text = await fn()
      if (text) setMsg({ ok: true, text })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const pushText: Record<PushState, string> = {
    loading: '…',
    unconfigured: 'Server chưa cấu hình VAPID key. Xem README để thiết lập.',
    unsupported: 'Trình duyệt này không hỗ trợ thông báo đẩy.',
    'need-install': 'Trên iPhone/iPad: bấm Chia sẻ → “Thêm vào MH chính”, rồi mở app từ màn hình chính để bật.',
    denied: 'Thông báo đang bị chặn. Vào Cài đặt của máy → Thông báo → Giữ Lửa để bật lại.',
    off: 'Đang tắt. Bật để nhận nhắc nhở đúng giờ và cảnh báo streak.',
    on: 'Đang bật. Nhắc nhở sẽ đến đúng giờ bạn hẹn trong từng habit.',
  }

  return (
    <>
      <header className="page-head">
        <h1 className="display">Cài đặt</h1>
      </header>

      {msg && <p className={msg.ok ? 'toast' : 'error'}>{msg.text}</p>}

      <section className="card">
        <div className="card__row">
          <div>
            <h2 className="card__title">
              <Bell size={20} /> Thông báo
            </h2>
            <p className="muted">{pushText[push]}</p>
          </div>
          {(push === 'off' || push === 'on') && (
            <label className="switch switch--solo">
              <input
                type="checkbox"
                checked={push === 'on'}
                disabled={busy}
                onChange={(e) =>
                  run(async () => {
                    if (e.target.checked) {
                      await enablePush()
                      return 'Đã bật thông báo.'
                    }
                    await disablePush()
                    return 'Đã tắt thông báo'
                  })
                }
              />
              <span className="switch__track" aria-hidden />
            </label>
          )}
        </div>
        {push === 'on' && (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await sendTestPush()
                return 'Đã gửi. Thông báo sẽ hiện trong vài giây.'
              })
            }
          >
            Gửi thử một thông báo
          </button>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">
          <Palette size={20} /> Giao diện
        </h2>
        <div className="segmented" role="group" aria-label="Chọn giao diện">
          {THEMES.map(({ value, label, icon: ThemeIcon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => {
                setThemePref(value)
                setTheme(value)
              }}
            >
              <ThemeIcon size={16} /> {label}
            </button>
          ))}
        </div>
        <div className="palettes" role="radiogroup" aria-label="Bảng màu">
          {(Object.keys(PALETTES) as PaletteName[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={palette === key}
              className="palette"
              onClick={() => {
                setPalette(key)
                setPaletteState(key)
              }}
            >
              <span className="palette__swatch" aria-hidden>
                {PALETTES[key].swatch.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="palette__name">{PALETTES[key].name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">
          <Archive size={20} /> Sao lưu
        </h2>
        <p className="muted">
          Habit và ảnh được lưu ngay trên máy này (không cần tài khoản). Hãy xuất file sao lưu định kỳ để không mất kỷ niệm khi đổi máy.
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const blob = await exportBackup()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `giu-lua-backup-${todayKey()}.json`
                a.click()
                setTimeout(() => URL.revokeObjectURL(url), 2000)
                return `Đã xuất bản sao lưu (${(blob.size / 1024 / 1024).toFixed(1)} MB)`
              })
            }
          >
            Xuất sao lưu
          </button>
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
            Khôi phục…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f)
                run(async () => {
                  const r = await importBackup(f)
                  return `Đã khôi phục ${r.habits} habit, ${r.photos} ảnh`
                })
            }}
          />
        </div>
      </section>

      <section className="card card--danger">
        <h2 className="card__title">
          <Warning size={20} /> Vùng nguy hiểm
        </h2>
        <button
          type="button"
          className="btn btn--danger btn--block"
          disabled={busy}
          onClick={() => {
            if (confirm('Xoá TẤT CẢ habit, lịch sử và ảnh trên máy này?'))
              run(async () => {
                await wipeAll()
                return 'Đã xoá toàn bộ dữ liệu'
              })
          }}
        >
          Xoá toàn bộ dữ liệu
        </button>
      </section>

      <footer className="about">
        <PixelFlame size={36} />
        <p>
          <strong>Giữ Lửa.</strong> Mỗi ô xanh là một ngày bạn giữ lời hứa với chính mình.
        </p>
      </footer>
    </>
  )
}
