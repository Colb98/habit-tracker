import type { Habit } from './types'

export type HabitDraft = Omit<Habit, 'id' | 'order' | 'createdAt'>

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const PRESETS: HabitDraft[] = [
  { name: 'Uống thuốc', emoji: '💊', color: 'mint', kind: 'once', target: 1, unit: '', remindAt: '08:00', streakAlertAt: '10:00', days: ALL_DAYS },
  { name: 'Ngủ trước 23h', emoji: '😴', color: 'violet', kind: 'once', target: 1, unit: '', remindAt: '22:30', streakAlertAt: '23:00', days: ALL_DAYS },
  { name: 'Tập thể dục', emoji: '🏃', color: 'orange', kind: 'duration', target: 60, unit: 'phút', remindAt: '17:30', streakAlertAt: '21:00', days: ALL_DAYS },
  { name: 'Đọc sách', emoji: '📚', color: 'sky', kind: 'count', target: 20, unit: 'trang', remindAt: '21:00', streakAlertAt: '22:30', days: ALL_DAYS },
  { name: 'Uống nước', emoji: '💧', color: 'sky', kind: 'count', target: 8, unit: 'ly', remindAt: '09:00', streakAlertAt: '20:00', days: ALL_DAYS },
  { name: 'Thiền', emoji: '🧘', color: 'mint', kind: 'duration', target: 10, unit: 'phút', remindAt: '06:30', streakAlertAt: '21:00', days: ALL_DAYS },
]

export const EMPTY_DRAFT: HabitDraft = {
  name: '',
  emoji: '✨',
  color: 'green',
  kind: 'once',
  target: 1,
  unit: '',
  remindAt: '08:00',
  streakAlertAt: '21:00',
  days: ALL_DAYS,
}

export const EMOJIS = [
  '✨', '💊', '😴', '🏃', '📚', '💧', '🧘', '🏋️', '🚴', '🏊', '🥗', '🍎',
  '✍️', '🎸', '🎹', '🎨', '📷', '💻', '🧠', '🌱', '🧹', '🪥', '🙏', '💰',
  '🚭', '📵', '☀️', '🌙', '🐕', '❤️', '🗣️', '🇬🇧',
]
