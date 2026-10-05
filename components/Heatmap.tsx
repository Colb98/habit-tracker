'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, prettyDate, toKey, weekdayOf } from '@/lib/dates'
import { formatValue, levelOf } from '@/lib/stats'
import type { Habit } from '@/lib/types'

const WEEKS = 53
const ROW_LABELS = ['T2', '', 'T4', '', 'T6', '', 'CN']

export function Heatmap({ habit, values, today }: { habit: Habit; values: Map<string, number>; today: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const created = toKey(new Date(habit.createdAt))

  const { columns, months, activeDays } = useMemo(() => {
    const mondayOffset = (weekdayOf(today) + 6) % 7
    const start = addDays(today, -mondayOffset - (WEEKS - 1) * 7)
    const columns: { key: string; level: number; future: boolean; before: boolean }[][] = []
    const months: { col: number; label: string }[] = []
    let activeDays = 0
    let lastMonth = -1
    for (let w = 0; w < WEEKS; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const key = addDays(start, w * 7 + d)
        const level = levelOf(habit, values.get(key))
        if (level > 0 && key <= today) activeDays++
        col.push({ key, level, future: key > today, before: key < created && level === 0 })
      }
      const month = Number(col[0].key.slice(5, 7))
      if (month !== lastMonth) {
        if (w < WEEKS - 2) months.push({ col: w, label: `Th${month}` })
        lastMonth = month
      }
      columns.push(col)
    }
    return { columns, months, activeDays }
  }, [habit, values, today, created])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const sel = selected ?? today

  return (
    <div className="heatmap">
      <div className="heatmap__head">
        <p>
          <strong>{activeDays}</strong> ngày có hoạt động trong năm qua
        </p>
      </div>
      <div className="heatmap__body">
        <div className="heatmap__rows" aria-hidden>
          {ROW_LABELS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="heatmap__scroll" ref={scroller}>
          <div className="heatmap__months" aria-hidden>
            {months.map((m) => (
              <span key={m.col} style={{ left: m.col * 15 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="heatmap__grid" role="grid" aria-label="Lịch sử hoạt động">
            {columns.map((col, w) => (
              <div key={w} className="heatmap__col" role="row">
                {col.map((c) =>
                  c.future ? (
                    <span key={c.key} className="cell cell--future" />
                  ) : (
                    <button
                      key={c.key}
                      type="button"
                      role="gridcell"
                      className={`cell lv${c.level}${c.before ? ' cell--before' : ''}${c.key === today ? ' cell--today' : ''}${c.key === sel ? ' cell--sel' : ''}`}
                      onClick={() => setSelected(c.key)}
                      aria-label={`${prettyDate(c.key)}: ${formatValue(habit, values.get(c.key) ?? 0)}`}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap__foot">
        <p className="heatmap__info">
          {prettyDate(sel)} · <strong>{formatValue(habit, values.get(sel) ?? 0)}</strong>
        </p>
        <div className="legend" aria-hidden>
          Ít
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={`cell lv${l}`} />
          ))}
          Nhiều
        </div>
      </div>
    </div>
  )
}
