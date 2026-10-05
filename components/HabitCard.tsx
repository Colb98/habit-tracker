'use client'

import { Alarm, Check, Plus, Timer } from '@phosphor-icons/react'
import Link from 'next/link'
import { addDays } from '@/lib/dates'
import { formatElapsed, useNow, useTimerStart, useToday, type HabitWithStats } from '@/lib/hooks'
import { formatValue, goalOf, isActiveDay, isAtRisk, kindLabel, levelOf } from '@/lib/stats'
import { Flame } from './Flame'
import { ProgressRing } from './ProgressRing'

export function HabitCard({ data, index = 0, onCheckin }: { data: HabitWithStats; index?: number; onCheckin: () => void }) {
  const { habit, values, stats } = data
  const today = useToday()
  const progress = habit.kind === 'once' ? (stats.doneToday ? 1 : 0) : stats.todayValue / goalOf(habit)
  const risk = isAtRisk(habit, stats, today)
  const restDay = !isActiveDay(habit, today)

  return (
    <article
      className={`habit-card${stats.doneToday ? ' is-done' : ''}${risk ? ' is-risk' : ''}`}
      style={{ '--i': index } as React.CSSProperties}
    >
      <Link href={`/habit?id=${habit.id}`} className="habit-card__main">
        <ProgressRing progress={progress} size={54}>
          <span className="habit-card__emoji">{habit.emoji}</span>
        </ProgressRing>
        <div className="habit-card__text">
          <h3>{habit.name}</h3>
          <p className="habit-card__meta">
            <span>{restDay ? 'Hôm nay nghỉ' : kindLabel(habit)}</span>
            {habit.remindAt && !restDay && (
              <span className="inline-icon">
                <Alarm size={13} aria-label="Giờ nhắc" />
                {habit.remindAt}
              </span>
            )}
          </p>
          <div className="mini-week" aria-label="7 ngày gần nhất">
            {Array.from({ length: 7 }, (_, i) => {
              const k = addDays(today, i - 6)
              return <i key={k} className={`lv${levelOf(habit, values.get(k))}${k === today ? ' is-today' : ''}`} />
            })}
          </div>
        </div>
      </Link>
      <div className="habit-card__side">
        <span className={stats.doneToday ? 'streak-pill is-lit' : 'streak-pill'} aria-label={`Streak ${stats.current} ngày`}>
          <Flame size={18} lit={stats.doneToday} />
          {stats.current}
        </span>
        <button
          type="button"
          className={stats.doneToday ? 'check-btn is-done' : 'check-btn'}
          onClick={onCheckin}
          aria-label={stats.doneToday ? 'Thêm ảnh hoặc cập nhật' : 'Ghi nhận hôm nay'}
        >
          {stats.doneToday ? <Check size={22} /> : <Plus size={22} />}
        </button>
      </div>
      {risk && (
        <p className="habit-card__note habit-card__note--risk">
          <Flame size={15} lit /> Streak {stats.current} ngày sắp tắt. Làm ngay!
        </p>
      )}
      <RunningTimer habitId={habit.id} />
      {stats.todayValue > 0 && habit.kind !== 'once' && !stats.doneToday && (
        <p className="habit-card__note">Hôm nay: {formatValue(habit, stats.todayValue)}</p>
      )}
    </article>
  )
}

function RunningTimer({ habitId }: { habitId: string }) {
  const start = useTimerStart(habitId)
  const now = useNow(1000)
  if (!start) return null
  return (
    <p className="habit-card__note habit-card__note--timer">
      <Timer size={15} /> Đang bấm giờ {formatElapsed(now - start)}
    </p>
  )
}
