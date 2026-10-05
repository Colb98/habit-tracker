'use client'

import { Alarm, ArrowRight, Camera, CaretLeft, PencilSimple } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { db } from '@/lib/db'
import { WEEKDAY_SHORT } from '@/lib/dates'
import { useHabit, useToday } from '@/lib/hooks'
import { formatMinutes, isAtRisk, kindLabel, nextMilestone } from '@/lib/stats'
import { CheckinSheet } from './CheckinSheet'
import { Flame } from './Flame'
import { Heatmap } from './Heatmap'
import { BlobImg } from './PhotoThumb'

export function HabitDetail() {
  const id = useSearchParams().get('id')
  const data = useHabit(id)
  const today = useToday()
  const [open, setOpen] = useState(false)
  const photos = useLiveQuery(
    async () => (id ? (await db.photos.where('habitId').equals(id).sortBy('createdAt')).reverse() : []),
    [id],
  )

  if (data === undefined) return <div className="skeleton" style={{ height: 320 }} />
  if (data === null) {
    return (
      <section className="empty">
        <h2 className="display">Không tìm thấy habit</h2>
        <Link href="/" className="btn btn--primary">
          Về trang chủ
        </Link>
      </section>
    )
  }

  const { habit, values, stats } = data
  const risk = isAtRisk(habit, stats, today)
  const total =
    habit.kind === 'duration'
      ? formatMinutes(stats.totalValue)
      : habit.kind === 'count'
        ? `${stats.totalValue} ${habit.unit}`
        : `${stats.totalDays} lần`
  const next = nextMilestone(stats.current)
  const everyDay = habit.days.length === 7

  return (
    <>
      <nav className="topbar">
        <Link href="/" className="icon-btn" aria-label="Quay lại">
          <CaretLeft size={20} />
        </Link>
        <Link href={`/edit?id=${habit.id}`} className="chip">
          <PencilSimple size={15} /> Sửa
        </Link>
      </nav>

      <header className="detail-hero">
        <span className="detail-hero__emoji">{habit.emoji}</span>
        <div>
          <h1 className="display">{habit.name}</h1>
          <p className="muted">
            <span>{kindLabel(habit)}</span>
            {habit.remindAt && (
              <span className="inline-icon">
                <Alarm size={14} aria-label="Giờ nhắc" />
                {habit.remindAt}
              </span>
            )}
            {!everyDay && <span>{habit.days.map((d) => WEEKDAY_SHORT[d]).join(' ')}</span>}
          </p>
        </div>
      </header>

      <section className={`streak-hero${stats.doneToday ? ' is-lit' : ''}${risk ? ' is-risk' : ''}`}>
        <div className="streak-hero__main">
          <Flame size={64} lit={stats.doneToday} animate={stats.doneToday} />
          <div>
            <p className="streak-hero__num">{stats.current}</p>
            <p className="streak-hero__lbl">ngày liên tiếp</p>
          </div>
        </div>
        <div className="streak-hero__goal">
          <div className="bar">
            <div className="bar__fill bar__fill--fire" style={{ transform: `scaleX(${stats.current / next})` }} />
          </div>
          <span className="muted">Mốc tiếp theo: {next} ngày</span>
        </div>
        {risk && <p className="streak-hero__warn">Hôm nay chưa làm, streak sắp tắt!</p>}
      </section>

      <section className="stat-grid">
        <div className="stat">
          <span className="stat__val">{stats.best}</span>
          <span className="stat__lbl">Kỷ lục</span>
        </div>
        <div className="stat">
          <span className="stat__val">{stats.totalDays}</span>
          <span className="stat__lbl">Ngày hoàn thành</span>
        </div>
        <div className="stat">
          <span className="stat__val">{Math.round(stats.rate30 * 100)}%</span>
          <span className="stat__lbl">30 ngày qua</span>
        </div>
        <div className="stat">
          <span className="stat__val stat__val--sm">{total}</span>
          <span className="stat__lbl">Tổng cộng</span>
        </div>
      </section>

      <button type="button" className="btn btn--primary btn--block btn--cta" onClick={() => setOpen(true)}>
        <Camera size={20} />
        {stats.doneToday ? 'Thêm ảnh hôm nay' : 'Ghi nhận hôm nay'}
      </button>

      <section className="section">
        <h2 className="section__title">Lịch sử</h2>
        <Heatmap habit={habit} values={values} today={today} />
      </section>

      <section className="section">
        <div className="section__row">
          <h2 className="section__title">Hall of Fame</h2>
          <span className="muted">{photos?.length ?? 0} ảnh</span>
        </div>
        <Link href={`/hall?id=${habit.id}`} className="hall-teaser">
          <div className="hall-teaser__stack">
            {(photos ?? []).slice(0, 3).map((p, i) => (
              <div key={p.id} className="mini-polaroid" style={{ '--i': i } as React.CSSProperties}>
                <BlobImg blob={p.blob} />
              </div>
            ))}
            {photos && photos.length === 0 && <div className="mini-polaroid mini-polaroid--empty"><Camera size={20} /></div>}
          </div>
          <div className="hall-teaser__text">
            <strong>{photos?.length ? 'Ngắm bức tường thành quả' : 'Bức tường còn trống'}</strong>
            <span className="muted">
              {photos?.length ? 'Mỗi dây treo 7 tấm polaroid. Làm càng nhiều, càng nhiều dây.' : 'Chụp tấm ảnh đầu tiên để treo lên tường.'}
            </span>
          </div>
          <ArrowRight size={20} className="hall-teaser__arrow" aria-hidden />
        </Link>
      </section>

      {open && <CheckinSheet data={data} onClose={() => setOpen(false)} />}
    </>
  )
}
