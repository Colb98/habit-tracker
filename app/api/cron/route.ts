import { NextResponse } from 'next/server'
import { pushToDevice } from '@/lib/server/push'
import { dueReminders } from '@/lib/server/reminders'
import { listDevices, loadDevice, markSent } from '@/lib/server/store'

export const maxDuration = 60

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true
  return new URL(req.url).searchParams.get('secret') === secret
}

/**
 * Gọi định kỳ (mỗi 1-5 phút) bởi cron-job.org / Upstash QStash / Vercel Cron.
 * Với mỗi thiết bị: tính giờ địa phương, gửi nhắc nhở và cảnh báo streak đến hạn.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const now = new Date()
  const devices = await listDevices()
  let pushed = 0

  await Promise.all(
    devices.map(async (id) => {
      const { state, subscriptions, sent } = await loadDevice(id)
      if (!state || !subscriptions.length) return
      const { due, today } = dueReminders(state.tz, state.habits, sent, now)
      if (!due.length) return
      const marks: Record<string, string> = {}
      for (const d of due) {
        if (await pushToDevice(id, subscriptions, d.message)) pushed++
        marks[d.key] = today
      }
      await markSent(id, marks)
    }),
  )

  return NextResponse.json({ ok: true, devices: devices.length, pushed, at: now.toISOString() })
}

export const POST = GET
