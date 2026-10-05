import { aliveStreak, timeToMinutes, zonedNow } from '../dates'
import type { SyncedHabit } from '../types'
import type { PushMessage } from './push'

/** Nhắc chỉ được gửi trong khoảng này sau giờ hẹn (phòng khi cron chạy trễ / lỡ nhịp). */
const WINDOW_MIN = 90

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function remindMessage(h: SyncedHabit, streak: number): PushMessage {
  const body =
    streak > 0
      ? pick([
          `Chuỗi ${streak} ngày đang chờ ngày thứ ${streak + 1}. Làm thôi! 🔥`,
          `Giữ lửa ${streak} ngày nhé. Nhớ chụp 1 tấm làm bằng chứng 📸`,
          `${streak} ngày liên tiếp rồi, đừng để hôm nay là ngày trống.`,
        ])
      : pick([
          'Bắt đầu một chuỗi mới ngay hôm nay nào ✨',
          'Chỉ cần làm một chút thôi, miễn là bắt đầu.',
          'Hôm nay là ngày 1. Chụp ảnh lại khoảnh khắc này nhé 📸',
        ])
  return { title: `${h.emoji} Đến giờ ${h.name} rồi!`, body, tag: `remind-${h.id}`, url: `/habit?id=${h.id}` }
}

function streakMessage(h: SyncedHabit, streak: number): PushMessage {
  if (streak > 0) {
    return {
      title: `🔥 Streak ${streak} ngày sắp tắt!`,
      body: pick([
        `Bạn chưa ${h.name.toLowerCase()} hôm nay. Vài phút thôi là giữ được chuỗi.`,
        `${streak} ngày công sức, đừng để mất vì hôm nay. ${h.emoji}`,
        `Ngọn lửa ${streak} ngày đang leo lét. Cứu nó ngay! ${h.emoji}`,
      ]),
      tag: `streak-${h.id}`,
      url: `/habit?id=${h.id}`,
    }
  }
  return {
    title: `${h.emoji} Hôm nay chưa ${h.name.toLowerCase()}`,
    body: 'Vẫn còn kịp để bắt đầu chuỗi mới trước khi hết ngày.',
    tag: `streak-${h.id}`,
    url: `/habit?id=${h.id}`,
  }
}

export interface Due {
  key: string
  message: PushMessage
}

export function dueReminders(
  tz: string,
  habits: SyncedHabit[],
  sent: Record<string, string>,
  now = new Date(),
): { due: Due[]; today: string } {
  const local = zonedNow(tz, now)
  const due: Due[] = []
  for (const h of habits) {
    if (!h.days.includes(local.weekday)) continue
    if (h.lastDone === local.key) continue // đã xong hôm nay
    const streak = aliveStreak(local.key, h.lastDone, h.streakAtLastDone, h.days)
    const slots: [string, string | null, (h: SyncedHabit, s: number) => PushMessage][] = [
      ['remind', h.remindAt, remindMessage],
      ['streak', h.streakAlertAt, streakMessage],
    ]
    for (const [kind, at, build] of slots) {
      if (!at) continue
      const t = timeToMinutes(at)
      if (local.minutes < t || local.minutes > t + WINDOW_MIN) continue
      const key = `${h.id}:${kind}`
      if (sent[key] === local.key) continue
      due.push({ key, message: build(h, streak) })
    }
  }
  return { due, today: local.key }
}
