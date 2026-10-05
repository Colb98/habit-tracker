'use client'

import { db, onDataChange } from './db'
import { todayKey } from './dates'
import { computeStats, valuesByDate } from './stats'
import type { SyncedHabit } from './types'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export const pushConfigured = () => VAPID.length > 0

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function deviceId(): string {
  const KEY = 'ht.deviceId'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  try {
    // Ở dev, tên chunk JS không đổi khi sửa code nên SW không được cache (?dev=1 tắt cache, vẫn giữ push)
    const url = process.env.NODE_ENV === 'production' ? '/sw.js' : '/sw.js?dev=1'
    return await navigator.serviceWorker.register(url, { scope: '/', updateViaCache: 'none' })
  } catch (e) {
    console.warn('SW register failed', e)
    return null
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Phải được gọi từ một thao tác bấm của người dùng (bắt buộc trên iOS). */
export async function enablePush(): Promise<void> {
  if (!pushConfigured()) throw new Error('Server chưa cấu hình VAPID key (xem README).')
  if (!pushSupported()) {
    throw new Error(
      isIOS() && !isStandalone()
        ? 'Trên iPhone, hãy "Thêm vào MH chính" rồi mở app từ màn hình chính để bật thông báo.'
        : 'Trình duyệt này không hỗ trợ thông báo đẩy.',
    )
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Bạn chưa cho phép thông báo. Hãy bật lại trong Cài đặt của máy.')
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerSW())
  if (!reg) throw new Error('Không đăng ký được service worker.')
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }))
  await syncNow(sub)
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  await fetch('/api/sync', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId: deviceId(), endpoint: sub.endpoint }),
  }).catch(() => {})
  await sub.unsubscribe()
}

export async function sendTestPush(): Promise<void> {
  const res = await fetch('/api/test-push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId: deviceId() }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Gửi thử thất bại')
}

async function buildPayload(): Promise<SyncedHabit[]> {
  const [habits, entries] = await Promise.all([db.habits.toArray(), db.entries.toArray()])
  const today = todayKey()
  return habits.map((h) => {
    const s = computeStats(h, valuesByDate(entries.filter((e) => e.habitId === h.id)), today)
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      remindAt: h.remindAt,
      streakAlertAt: h.streakAlertAt,
      days: h.days,
      lastDone: s.lastDone,
      streakAtLastDone: s.current > 0 ? s.streakAtLastDone : 0,
    }
  })
}

/** Gửi lịch nhắc + trạng thái streak lên server. */
export async function syncNow(sub?: PushSubscription | null): Promise<void> {
  if (!pushConfigured() || !pushSupported()) return
  const subscription = sub ?? (await currentSubscription())
  if (!subscription) return
  await fetch('/api/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      deviceId: deviceId(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      subscription: subscription.toJSON(),
      habits: await buildPayload(),
    }),
  })
}

let timer: ReturnType<typeof setTimeout> | undefined
export function scheduleSync(delay = 800) {
  clearTimeout(timer)
  timer = setTimeout(() => syncNow().catch((e) => console.warn('sync failed', e)), delay)
}

let wired = false
export function wireAutoSync() {
  if (wired) return
  wired = true
  onDataChange(() => scheduleSync())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(1500)
  })
  scheduleSync(2000)
}
