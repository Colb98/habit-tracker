'use client'

import { ArrowRight, Check, Medal, Trophy } from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { addDays, WEEKDAY_SHORT, weekdayOf } from '@/lib/dates'
import { useToday } from '@/lib/hooks'
import { isDone, MILESTONE_TITLES, MILESTONES, nextMilestone } from '@/lib/stats'
import type { Habit } from '@/lib/types'
import { Flame } from './Flame'

export interface CelebrationInfo {
  habit: Habit
  streak: number
  best: number
  isNewBest: boolean
  values: Map<string, number>
  photoUrl: string | null
}

const PRAISE = [
  'Lửa đang cháy rất đẹp!',
  'Kỷ luật hôm nay là tự do ngày mai.',
  'Thêm một viên gạch cho phiên bản tốt hơn.',
  'Không ai cản được bạn đâu.',
  'Từng ngày nhỏ, cộng lại thành điều lớn.',
]

const CONFETTI_COLORS = ['#39d353', '#ffb547', '#ff6b3d', '#f3f1e8', '#7ee0ff', '#ffd166']

export function Celebration({ info, onClose }: { info: CelebrationInfo; onClose: () => void }) {
  const { habit, streak, isNewBest, values, photoUrl } = info
  const today = useToday()
  const [shown, setShown] = useState(Math.max(0, streak - 1))
  const milestone = MILESTONES.includes(streak) ? streak : null
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], [])

  useEffect(() => {
    const t = setTimeout(() => setShown(streak), 700)
    navigator.vibrate?.([30, 60, 30])
    return () => clearTimeout(t)
  }, [streak])

  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl])

  const week = Array.from({ length: 7 }, (_, i) => {
    const k = addDays(today, i - 6)
    return { k, label: WEEKDAY_SHORT[weekdayOf(k)], done: isDone(habit, values.get(k)), isToday: k === today }
  })

  const confetti = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.8,
        rot: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 6,
      })),
    [],
  )

  const next = nextMilestone(streak)

  return createPortal(
    <div className="celebrate" role="dialog" aria-modal="true" aria-label="Chúc mừng">
      <div className="celebrate__glow" aria-hidden />
      <div className="confetti" aria-hidden>
        {confetti.map((c, i) => (
          <i
            key={i}
            style={{
              left: `${c.left}%`,
              background: c.color,
              width: c.w,
              height: c.w * 0.45,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
              transform: `rotate(${c.rot}deg)`,
            }}
          />
        ))}
      </div>

      <div className="celebrate__body">
        <div className="celebrate__flame">
          <Flame size={128} lit animate />
        </div>
        <p className="celebrate__habit">
          {habit.emoji} {habit.name}
        </p>
        <div className="celebrate__count" aria-live="polite">
          <span key={shown} className="celebrate__num">
            {shown}
          </span>
        </div>
        <p className="celebrate__label">ngày liên tiếp!</p>
        <p className="celebrate__praise">{praise}</p>

        <div className="week-strip">
          {week.map((d) => (
            <div key={d.k} className={`week-strip__day${d.done ? ' is-done' : ''}${d.isToday ? ' is-today' : ''}`}>
              <span className="week-strip__dot">{d.done && <Check size={16} />}</span>
              <span className="week-strip__lbl">{d.label}</span>
            </div>
          ))}
        </div>

        {milestone && (
          <div className="badge-card">
            <Medal size={34} weight="fill" className="badge-card__medal" aria-hidden />
            <div>
              <strong>
                Mốc {milestone} ngày: {MILESTONE_TITLES[milestone]}
              </strong>
              <span className="muted">Ảnh hôm nay sẽ có khung vàng trên Hall of Fame</span>
            </div>
          </div>
        )}
        {isNewBest && !milestone && streak > 1 && (
          <div className="badge-card">
            <Trophy size={34} weight="fill" className="badge-card__medal" aria-hidden />
            <div>
              <strong>Kỷ lục mới!</strong>
              <span className="muted">Chuỗi dài nhất từ trước tới nay</span>
            </div>
          </div>
        )}
        {!milestone && (
          <p className="muted celebrate__next">
            Còn {next - streak} ngày nữa tới mốc {next}.
          </p>
        )}

        {photoUrl && (
          <div className="celebrate__polaroid">
            <img src={photoUrl} alt="" />
          </div>
        )}

        <div className="celebrate__actions">
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            Tuyệt vời!
          </button>
          {photoUrl && (
            <Link href={`/hall?id=${habit.id}`} className="btn btn--ghost btn--block" onClick={onClose}>
              Xem Hall of Fame <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
