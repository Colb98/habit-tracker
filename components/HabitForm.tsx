'use client'

import { Check, Hash, Timer, X, type Icon } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createHabit, db, deleteHabit, saveHabit } from '@/lib/db'
import { WEEKDAY_SHORT } from '@/lib/dates'
import { EMOJIS, EMPTY_DRAFT, type HabitDraft } from '@/lib/presets'
import type { HabitKind } from '@/lib/types'

const KINDS: { kind: HabitKind; title: string; desc: string; icon: Icon }[] = [
  { kind: 'once', title: '1 lần mỗi ngày', desc: 'Uống thuốc, ngủ đúng giờ…', icon: Check },
  { kind: 'count', title: 'Càng nhiều càng tốt', desc: 'Số trang sách, ly nước…', icon: Hash },
  { kind: 'duration', title: 'Khoảng thời gian', desc: 'Tập 60 phút, thiền 10 phút…', icon: Timer },
]

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function HabitForm() {
  const id = useSearchParams().get('id')
  const router = useRouter()
  const existing = useLiveQuery(async () => (id ? ((await db.habits.get(id)) ?? null) : null), [id])
  const [draft, setDraft] = useState<HabitDraft>(EMPTY_DRAFT)
  const [showEmojis, setShowEmojis] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existing) {
      const { id: _id, order: _o, createdAt: _c, ...rest } = existing
      setDraft(rest)
    }
  }, [existing])

  const set = <K extends keyof HabitDraft>(k: K, v: HabitDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  function setKind(kind: HabitKind) {
    setDraft((d) => {
      if (d.kind === kind) return d
      if (kind === 'once') return { ...d, kind, target: 1, unit: '' }
      if (kind === 'duration') return { ...d, kind, target: 30, unit: 'phút' }
      return { ...d, kind, target: 10, unit: 'lần' }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return setError('Đặt tên cho habit đã nhé')
    if (!draft.days.length) return setError('Chọn ít nhất 1 ngày trong tuần')
    const clean = { ...draft, name: draft.name.trim(), target: Math.max(1, Math.round(draft.target || 1)) }
    if (existing) {
      await saveHabit({ ...existing, ...clean })
      router.push(`/habit?id=${existing.id}`)
    } else {
      const h = await createHabit(clean)
      router.push(`/habit?id=${h.id}`)
    }
  }

  async function remove() {
    if (!existing) return
    if (!confirm(`Xoá "${existing.name}" cùng toàn bộ lịch sử và ảnh? Không thể hoàn tác.`)) return
    await deleteHabit(existing.id)
    router.push('/')
  }

  if (id && existing === undefined) return <div className="skeleton" style={{ height: 400 }} />

  return (
    <form className="form" onSubmit={submit}>
      <nav className="topbar">
        <Link href={existing ? `/habit?id=${existing.id}` : '/'} className="icon-btn" aria-label="Huỷ">
          <X size={20} />
        </Link>
        <h1 className="topbar__title">{existing ? 'Sửa habit' : 'Habit mới'}</h1>
        <span style={{ width: 40 }} />
      </nav>

      <div className="name-row">
        <button type="button" className="emoji-btn" onClick={() => setShowEmojis((s) => !s)} aria-label="Chọn biểu tượng">
          {draft.emoji}
        </button>
        <input
          className="input input--lg"
          placeholder="Tên habit, vd: Đọc sách"
          value={draft.name}
          maxLength={40}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      {showEmojis && (
        <div className="emoji-grid">
          {EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              className={em === draft.emoji ? 'is-on' : ''}
              onClick={() => {
                set('emoji', em)
                setShowEmojis(false)
              }}
            >
              {em}
            </button>
          ))}
          <input
            className="input emoji-grid__custom"
            placeholder="Emoji khác…"
            maxLength={4}
            onChange={(e) => e.target.value && set('emoji', e.target.value)}
          />
        </div>
      )}

      <fieldset className="field">
        <legend>Thể loại</legend>
        <div className="kind-grid">
          {KINDS.map(({ icon: KindIcon, ...k }) => (
            <button
              key={k.kind}
              type="button"
              className={draft.kind === k.kind ? 'kind is-on' : 'kind'}
              onClick={() => setKind(k.kind)}
              aria-pressed={draft.kind === k.kind}
            >
              <span className="kind__icon">
                <KindIcon size={18} />
              </span>
              <strong>{k.title}</strong>
              <span>{k.desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {draft.kind !== 'once' && (
        <fieldset className="field">
          <legend>Mục tiêu mỗi ngày</legend>
          <div className="target-row">
            <input
              className="input input--num"
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.target || ''}
              onChange={(e) => set('target', Number(e.target.value))}
            />
            {draft.kind === 'count' ? (
              <input
                className="input"
                placeholder="đơn vị (trang, ly, lần…)"
                value={draft.unit}
                maxLength={12}
                onChange={(e) => set('unit', e.target.value)}
              />
            ) : (
              <span className="target-row__unit">phút</span>
            )}
          </div>
          <p className="hint">Đạt mục tiêu = hoàn thành ngày đó, giữ được streak. Làm càng nhiều, ô lịch sử càng xanh đậm.</p>
        </fieldset>
      )}

      <fieldset className="field">
        <legend>Lặp lại</legend>
        <div className="days">
          {WEEK_ORDER.map((d) => {
            const on = draft.days.includes(d)
            return (
              <button
                key={d}
                type="button"
                className={on ? 'day is-on' : 'day'}
                aria-pressed={on}
                onClick={() => set('days', on ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort())}
              >
                {WEEKDAY_SHORT[d]}
              </button>
            )
          })}
        </div>
        <p className="hint">Ngày không chọn là ngày nghỉ: không làm cũng không mất streak.</p>
      </fieldset>

      <fieldset className="field">
        <legend>Nhắc nhở</legend>
        <TimeToggle
          label="Giờ làm habit"
          hint="Bắn thông báo nhắc bạn bắt đầu"
          value={draft.remindAt}
          fallback="08:00"
          onChange={(v) => set('remindAt', v)}
        />
        <TimeToggle
          label="Cảnh báo giữ streak"
          hint="Tới giờ này vẫn chưa xong sẽ báo: Streak xx ngày sắp mất!"
          value={draft.streakAlertAt}
          fallback="21:00"
          onChange={(v) => set('streakAlertAt', v)}
        />
      </fieldset>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn btn--primary btn--block">
        {existing ? 'Lưu thay đổi' : 'Tạo habit'}
      </button>
      {existing && (
        <button type="button" className="btn btn--danger btn--block" onClick={remove}>
          Xoá habit
        </button>
      )}
    </form>
  )
}

function TimeToggle({
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  label: string
  hint: string
  value: string | null
  fallback: string
  onChange: (v: string | null) => void
}) {
  return (
    <div className="time-toggle">
      <label className="switch">
        <input type="checkbox" checked={value !== null} onChange={(e) => onChange(e.target.checked ? fallback : null)} />
        <span className="switch__track" aria-hidden />
        <span className="time-toggle__text">
          <strong>{label}</strong>
          <span>{hint}</span>
        </span>
      </label>
      {value !== null && (
        <input className="input input--time" type="time" value={value} onChange={(e) => onChange(e.target.value || fallback)} />
      )}
    </div>
  )
}
