'use client'

import { Plus } from '@phosphor-icons/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CheckinSheet } from '@/components/CheckinSheet'
import { HabitCard } from '@/components/HabitCard'
import { InstallHint, PushPrompt } from '@/components/Notices'
import { PixelFlame } from '@/components/PixelFlame'
import { createHabit } from '@/lib/db'
import { prettyDate } from '@/lib/dates'
import { useHabitsWithStats, useToday } from '@/lib/hooks'
import { PRESETS } from '@/lib/presets'
import { isActiveDay } from '@/lib/stats'

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function HomePage() {
  const list = useHabitsWithStats()
  const today = useToday()
  const [sheetId, setSheetId] = useState<string | null>(null)
  const sheetData = list?.find((d) => d.habit.id === sheetId)

  const summary = useMemo(() => {
    if (!list) return null
    const active = list.filter((d) => isActiveDay(d.habit, today))
    const done = active.filter((d) => d.stats.doneToday).length
    const fire = list.reduce((m, d) => Math.max(m, d.stats.current), 0)
    return { total: active.length, done, fire }
  }, [list, today])

  return (
    <>
      <header className="home-head">
        <div>
          <p className="kicker">{prettyDate(today)}</p>
          <h1 className="display">{greeting()}</h1>
        </div>
        <Link href="/settings" className="brand" aria-label="Cài đặt">
          <PixelFlame size={30} />
        </Link>
      </header>

      <InstallHint />
      <PushPrompt />

      {summary && summary.total > 0 && (
        <section className="today-card">
          <div className="today-card__top">
            <div>
              <p className="today-card__big">
                {summary.done}
                <span>/{summary.total}</span>
              </p>
              <p className="today-card__label">đã xong hôm nay</p>
            </div>
            <p className="today-card__msg">
              {summary.done === summary.total
                ? 'Hoàn hảo! Mọi ngọn lửa đều đang cháy.'
                : summary.done === 0
                  ? 'Bắt đầu với việc dễ nhất trước nhé.'
                  : `Còn ${summary.total - summary.done} việc nữa thôi.`}
            </p>
          </div>
          <div className="segments" aria-hidden>
            {Array.from({ length: summary.total }, (_, i) => (
              <i key={i} className={i < summary.done ? 'is-on' : ''} />
            ))}
          </div>
        </section>
      )}

      {list === undefined ? (
        <div className="skeleton-list">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="habit-list">
          {[...list]
            .sort((a, b) => Number(a.stats.doneToday) - Number(b.stats.doneToday))
            .map((d, i) => (
              <HabitCard key={d.habit.id} data={d} index={i} onCheckin={() => setSheetId(d.habit.id)} />
            ))}
        </section>
      )}

      {list && list.length > 0 && (
        <Link href="/edit" className="fab">
          <Plus size={18} aria-hidden /> Habit mới
        </Link>
      )}

      {sheetData && <CheckinSheet key={sheetData.habit.id} data={sheetData} onClose={() => setSheetId(null)} />}
    </>
  )
}

function EmptyState() {
  return (
    <section className="empty">
      <div className="empty__art">
        <PixelFlame size={88} />
      </div>
      <h2 className="display">Nhóm ngọn lửa đầu tiên</h2>
      <p className="muted">Chọn một thói quen nhỏ. Làm mỗi ngày, chụp lại thành quả, và nhìn chuỗi streak lớn dần.</p>
      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className="preset" onClick={() => createHabit(p)}>
            <span className="preset__emoji">{p.emoji}</span>
            <span className="preset__name">{p.name}</span>
            <span className="preset__meta">{p.remindAt}</span>
          </button>
        ))}
      </div>
      <Link href="/edit" className="btn btn--primary">
        <Plus size={18} aria-hidden /> Tự tạo habit
      </Link>
    </section>
  )
}
