import { addDays, timeToMinutes, toKey, weekdayOf } from './dates'
import type { Entry, Habit } from './types'

export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 365, 500, 730, 1000]

export const MILESTONE_TITLES: Record<number, string> = {
  3: 'Khởi động',
  7: 'Tuần lửa',
  14: 'Hai tuần thép',
  21: 'Thói quen thành hình',
  30: 'Tháng bền bỉ',
  50: 'Nửa trăm',
  75: 'Không thể cản',
  100: 'Câu lạc bộ 100',
  150: 'Huyền thoại sống',
  200: 'Kỷ luật thép',
  250: 'Phi thường',
  365: 'Trọn một năm',
  500: 'Bất tử',
  730: 'Hai năm rực lửa',
  1000: 'Ngàn ngày',
}

export function goalOf(h: Habit): number {
  return h.kind === 'once' ? 1 : Math.max(1, h.target)
}

export function isDone(h: Habit, value: number | undefined): boolean {
  return (value ?? 0) >= goalOf(h)
}

export function isActiveDay(h: Habit, key: string): boolean {
  return h.days.includes(weekdayOf(key))
}

/** 0-4, như ô contribution của GitHub */
export function levelOf(h: Habit, value: number | undefined): number {
  const v = value ?? 0
  if (v <= 0) return 0
  if (h.kind === 'once') return 4
  const r = v / goalOf(h)
  if (r >= 1) return 4
  if (r >= 0.66) return 3
  if (r >= 0.33) return 2
  return 1
}

export function valuesByDate(entries: Entry[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const e of entries) m.set(e.date, e.value)
  return m
}

export interface HabitStats {
  current: number
  best: number
  doneToday: boolean
  todayValue: number
  lastDone: string | null
  streakAtLastDone: number
  totalDays: number
  totalValue: number
  rate30: number
}

export function computeStats(h: Habit, values: Map<string, number>, today: string): HabitStats {
  let earliest = toKey(new Date(h.createdAt))
  for (const k of values.keys()) if (k < earliest) earliest = k

  const done = (k: string) => isDone(h, values.get(k))
  const todayValue = values.get(today) ?? 0
  const doneToday = done(today)

  // streak hiện tại: hôm nay chưa xong thì chưa tính là gãy
  let current = doneToday ? 1 : 0
  for (let k = addDays(today, -1); k >= earliest; k = addDays(k, -1)) {
    if (done(k)) current++
    else if (isActiveDay(h, k)) break
  }

  // streak dài nhất
  let best = 0
  let run = 0
  for (let k = earliest; k <= today; k = addDays(k, 1)) {
    if (done(k)) {
      run++
      best = Math.max(best, run)
    } else if (isActiveDay(h, k) && k !== today) {
      run = 0
    }
  }

  let lastDone: string | null = null
  let totalDays = 0
  let totalValue = 0
  for (const [k, v] of values) {
    if (k > today) continue
    totalValue += v
    if (isDone(h, v)) {
      totalDays++
      if (!lastDone || k > lastDone) lastDone = k
    }
  }

  let active30 = 0
  let done30 = 0
  for (let i = 0; i < 30; i++) {
    const k = addDays(today, -i)
    if (k < earliest) break
    if (k === today && !doneToday) continue
    if (isActiveDay(h, k)) {
      active30++
      if (done(k)) done30++
    }
  }

  return {
    current,
    best,
    doneToday,
    todayValue,
    lastDone,
    streakAtLastDone: current,
    totalDays,
    totalValue,
    rate30: active30 ? done30 / active30 : 0,
  }
}

/** Habit đang ở tình trạng "streak sắp mất" theo giờ máy? */
export function isAtRisk(h: Habit, s: HabitStats, today: string, now = new Date()): boolean {
  if (s.doneToday || s.current === 0 || !isActiveDay(h, today)) return false
  const alertAt = h.streakAlertAt ? timeToMinutes(h.streakAlertAt) : 20 * 60
  return now.getHours() * 60 + now.getMinutes() >= alertAt
}

export function nextMilestone(n: number): number {
  return MILESTONES.find((m) => m > n) ?? n + 100
}

export function formatValue(h: Habit, v: number): string {
  if (h.kind === 'once') return v >= 1 ? 'Đã xong' : 'Chưa làm'
  if (h.kind === 'duration') return formatMinutes(v)
  return `${v} ${h.unit}`.trim()
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} phút`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}g ${r}p` : `${h} giờ`
}

export function kindLabel(h: Habit): string {
  if (h.kind === 'once') return 'Mỗi ngày 1 lần'
  if (h.kind === 'duration') return `${formatMinutes(h.target)} / ngày`
  return `${h.target} ${h.unit} / ngày`
}
