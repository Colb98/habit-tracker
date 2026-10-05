export type HabitKind = 'once' | 'count' | 'duration'

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  kind: HabitKind
  /** once: 1 · count: số lần/đơn vị mỗi ngày · duration: số phút mỗi ngày */
  target: number
  unit: string
  /** "HH:MM": giờ nhắc làm habit */
  remindAt: string | null
  /** "HH:MM": giờ cảnh báo streak sắp mất nếu chưa làm */
  streakAlertAt: string | null
  /** 0 = Chủ nhật … 6 = Thứ bảy */
  days: number[]
  order: number
  createdAt: number
}

export interface Entry {
  /** `${habitId}_${date}` */
  id: string
  habitId: string
  /** YYYY-MM-DD theo giờ máy */
  date: string
  value: number
  updatedAt: number
}

export interface Photo {
  id: string
  habitId: string
  /** ngày được tính thành quả */
  date: string
  /** thời điểm chụp (EXIF nếu có) */
  takenAt: number
  blob: Blob
  width: number
  height: number
  caption: string
  /** streak tại thời điểm ghi nhận, dùng để làm khung vàng ở các mốc */
  streak: number
  createdAt: number
}

/** Dữ liệu tối thiểu gửi lên server để server biết khi nào bắn thông báo */
export interface SyncedHabit {
  id: string
  name: string
  emoji: string
  remindAt: string | null
  streakAlertAt: string | null
  days: number[]
  lastDone: string | null
  streakAtLastDone: number
}
