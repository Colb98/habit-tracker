import { NextResponse } from 'next/server'
import type { PushSubscription as WebPushSubscription } from 'web-push'
import { isDeviceId, removeSubscription, saveDevice } from '@/lib/server/store'
import type { SyncedHabit } from '@/lib/types'

const TIME = /^\d{2}:\d{2}$/

function cleanHabit(h: SyncedHabit): SyncedHabit | null {
  if (!h || typeof h.id !== 'string' || typeof h.name !== 'string') return null
  return {
    id: h.id.slice(0, 64),
    name: h.name.slice(0, 80),
    emoji: String(h.emoji ?? '').slice(0, 16),
    remindAt: typeof h.remindAt === 'string' && TIME.test(h.remindAt) ? h.remindAt : null,
    streakAlertAt: typeof h.streakAlertAt === 'string' && TIME.test(h.streakAlertAt) ? h.streakAlertAt : null,
    days: Array.isArray(h.days) ? h.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [],
    lastDone: typeof h.lastDone === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.lastDone) ? h.lastDone : null,
    streakAtLastDone: Math.max(0, Math.min(100000, Number(h.streakAtLastDone) || 0)),
  }
}

/** Đăng ký / cập nhật lịch nhắc của một thiết bị. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || !isDeviceId(body.deviceId)) return NextResponse.json({ error: 'deviceId không hợp lệ' }, { status: 400 })
  const sub = body.subscription as WebPushSubscription | undefined
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'subscription không hợp lệ' }, { status: 400 })
  }
  const habits = (Array.isArray(body.habits) ? body.habits : [])
    .slice(0, 100)
    .map(cleanHabit)
    .filter(Boolean) as SyncedHabit[]
  await saveDevice(
    body.deviceId,
    { tz: typeof body.tz === 'string' ? body.tz.slice(0, 64) : 'Asia/Ho_Chi_Minh', habits, updatedAt: Date.now() },
    { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
  )
  return NextResponse.json({ ok: true, habits: habits.length })
}

/** Huỷ nhận thông báo. */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || !isDeviceId(body.deviceId) || typeof body.endpoint !== 'string') {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
  }
  await removeSubscription(body.deviceId, body.endpoint)
  return NextResponse.json({ ok: true })
}
