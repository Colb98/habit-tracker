'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { db } from './db'
import { todayKey } from './dates'
import { computeStats, valuesByDate, type HabitStats } from './stats'
import type { Habit } from './types'

/** Key ngày hôm nay, tự cập nhật khi qua nửa đêm hoặc khi app được mở lại. */
export function useToday(): string {
  const [key, setKey] = useState(todayKey)
  useEffect(() => {
    const tick = () => setKey(todayKey())
    const id = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return key
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export interface HabitWithStats {
  habit: Habit
  values: Map<string, number>
  stats: HabitStats
}

export function useHabitsWithStats(): HabitWithStats[] | undefined {
  const today = useToday()
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), [])
  const entries = useLiveQuery(() => db.entries.toArray(), [])
  return useMemo(() => {
    if (!habits || !entries) return undefined
    return habits.map((habit) => {
      const values = valuesByDate(entries.filter((e) => e.habitId === habit.id))
      return { habit, values, stats: computeStats(habit, values, today) }
    })
  }, [habits, entries, today])
}

export function useHabit(id: string | null): HabitWithStats | null | undefined {
  const today = useToday()
  const habit = useLiveQuery(async () => (id ? ((await db.habits.get(id)) ?? null) : null), [id])
  const entries = useLiveQuery(() => (id ? db.entries.where('habitId').equals(id).toArray() : []), [id])
  return useMemo(() => {
    if (habit === undefined || !entries) return undefined
    if (!habit) return null
    const values = valuesByDate(entries)
    return { habit, values, stats: computeStats(habit, values, today) }
  }, [habit, entries, today])
}

// ---------- Hẹn giờ cho habit dạng "khoảng thời gian" ----------

const TIMER_KEY = 'ht.timers'
const timerListeners = new Set<() => void>()

function readTimers(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TIMER_KEY) ?? '{}')
  } catch {
    return {}
  }
}

const timersSnapshot = () => localStorage.getItem(TIMER_KEY) ?? '{}'

export function startTimer(habitId: string) {
  localStorage.setItem(TIMER_KEY, JSON.stringify({ ...readTimers(), [habitId]: Date.now() }))
  timerListeners.forEach((f) => f())
}

/** Dừng hẹn giờ, trả về số phút đã chạy. */
export function stopTimer(habitId: string): number {
  const timers = readTimers()
  const start = timers[habitId]
  delete timers[habitId]
  localStorage.setItem(TIMER_KEY, JSON.stringify(timers))
  timerListeners.forEach((f) => f())
  return start ? Math.max(0, Math.round((Date.now() - start) / 60000)) : 0
}

export function useTimerStart(habitId: string): number | null {
  const raw = useSyncExternalStore(
    (cb) => {
      timerListeners.add(cb)
      window.addEventListener('storage', cb)
      return () => {
        timerListeners.delete(cb)
        window.removeEventListener('storage', cb)
      }
    },
    timersSnapshot,
    () => '{}',
  )
  return useMemo(() => {
    try {
      return (JSON.parse(raw) as Record<string, number>)[habitId] ?? null
    } catch {
      return null
    }
  }, [raw, habitId])
}

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
