// Ngày được biểu diễn bằng key "YYYY-MM-DD" (so sánh chuỗi = so sánh ngày).
// Dùng chung cho client và server, không phụ thuộc DOM.

export const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function weekdayOf(key: string): number {
  return fromKey(key).getDay()
}

export function todayKey(): string {
  return toKey(new Date())
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export const WEEKDAY_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

export function prettyDate(key: string): string {
  const d = fromKey(key)
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`
}

export function shortDate(key: string): string {
  const [y, m, d] = key.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

/** Ngày + giờ hiện tại theo một múi giờ IANA (dùng trên server). */
export function zonedNow(timeZone: string, now = new Date()) {
  let tz = timeZone
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
  } catch {
    tz = 'Asia/Ho_Chi_Minh'
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
  const key = `${p.year}-${p.month}-${p.day}`
  return { key, minutes: Number(p.hour) * 60 + Number(p.minute), weekday: weekdayOf(key) }
}

/**
 * Streak còn "sống" tới hôm nay không? Streak kết thúc ở lastDone còn sống nếu
 * không có ngày hoạt động nào bị bỏ lỡ giữa lastDone và hôm nay.
 */
export function aliveStreak(
  today: string,
  lastDone: string | null,
  streakAtLastDone: number,
  days: number[],
): number {
  if (!lastDone || streakAtLastDone <= 0) return 0
  if (lastDone >= today) return streakAtLastDone
  let k = addDays(lastDone, 1)
  for (let guard = 0; k < today && guard < 400; guard++) {
    if (days.includes(weekdayOf(k))) return 0
    k = addDays(k, 1)
  }
  return streakAtLastDone
}
