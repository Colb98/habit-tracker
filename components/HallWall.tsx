'use client'

import { Camera, Scissors, Star } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { db } from '@/lib/db'
import { useHabitsWithStats } from '@/lib/hooks'
import { MILESTONES } from '@/lib/stats'
import type { Habit, Photo } from '@/lib/types'
import { Lightbox } from './Lightbox'
import { BlobImg } from './PhotoThumb'

export const PER_STRING = 7
// 136px mỗi ô: trên màn 390px tấm thứ 3 ló ra mép phải, tự gợi ý vuốt ngang
const SLOT = 136
const LEAD = 84
const TAIL = 36
const Y0 = 26

/** Số giả ngẫu nhiên ổn định theo id, để mỗi tấm ảnh luôn nghiêng cùng một kiểu. */
function seeded(id: string, salt = 0) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

const ddmm = (key: string) => `${key.slice(8, 10)}.${key.slice(5, 7)}`

export function HallWall() {
  const id = useSearchParams().get('id')
  const router = useRouter()
  const list = useHabitsWithStats()
  const allPhotos = useLiveQuery(() => db.photos.toArray(), [])
  const [visible, setVisible] = useState(3)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  const habits = useMemo(() => new Map((list ?? []).map((d) => [d.habit.id, d.habit])), [list])
  const habit = id ? habits.get(id) : undefined

  /** cũ → mới */
  const photos = useMemo(() => {
    const ps = (allPhotos ?? []).filter((p) => !id || p.habitId === id)
    return ps.sort((a, b) => (a.date === b.date ? a.takenAt - b.takenAt || a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
  }, [allPhotos, id])

  /** dây mới nhất ở trên cùng */
  const strings = useMemo(() => {
    const out: { no: number; items: { photo: Photo; index: number }[] }[] = []
    for (let i = 0; i < photos.length; i += PER_STRING) {
      out.push({ no: out.length + 1, items: photos.slice(i, i + PER_STRING).map((photo, j) => ({ photo, index: i + j })) })
    }
    return out.reverse()
  }, [photos])

  useEffect(() => setVisible(3), [id])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((es) => es[0].isIntersecting && setVisible((v) => v + 3), { rootMargin: '800px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [strings.length])

  const stats = useMemo(() => {
    const scope = (list ?? []).filter((d) => !id || d.habit.id === id)
    return {
      best: scope.reduce((m, d) => Math.max(m, d.stats.best), 0),
      gold: photos.filter((p) => MILESTONES.includes(p.streak)).length,
      days: new Set(photos.map((p) => p.date)).size,
    }
  }, [list, id, photos])

  const loading = allPhotos === undefined || list === undefined

  return (
    <div className="hall">
      <header className="hall__head">
        {habit && (
          <p className="hall__eyebrow">
            {habit.emoji} {habit.name}
          </p>
        )}
        <h1 className="neon">
          Hall <span className="neon__of">of</span> Fame
        </h1>

        {list && list.length > 1 && (
          <div className="hall__filters">
            <button type="button" className={!id ? 'tag-chip is-on' : 'tag-chip'} onClick={() => router.replace('/hall')}>
              Tất cả
            </button>
            {list.map((d) => (
              <button
                key={d.habit.id}
                type="button"
                className={id === d.habit.id ? 'tag-chip is-on' : 'tag-chip'}
                onClick={() => router.replace(`/hall?id=${d.habit.id}`)}
              >
                {d.habit.emoji} {d.habit.name}
              </button>
            ))}
          </div>
        )}

        <div className="plaques">
          <Plaque value={photos.length} label="khoảnh khắc" />
          <Plaque value={strings.length} label="dây ảnh" />
          <Plaque value={stats.best} label="streak kỷ lục" />
          <Plaque value={stats.gold} label="khung vàng" />
        </div>
      </header>

      {loading ? null : photos.length === 0 ? (
        <>
          <PhotoString no={1} items={[]} habits={habits} showEmpty onOpen={setOpenIndex} />
          <div className="hall__empty">
            <p className="hall__empty-title">Bức tường còn trống</p>
            <p>Mỗi lần hoàn thành, chụp một tấm ảnh để kẹp lên dây. Đủ 7 tấm, một dây mới được giăng ra.</p>
            <Link href={id ? `/habit?id=${id}` : '/'} className="btn btn--primary">
              <Camera size={20} /> Chụp tấm đầu tiên
            </Link>
          </div>
        </>
      ) : (
        <>
          {strings.slice(0, visible).map((s, i) => (
            <PhotoString
              key={s.no}
              no={s.no}
              items={s.items}
              habits={habits}
              showEmpty={i === 0}
              onOpen={setOpenIndex}
            />
          ))}
          <div ref={sentinel} />
          {visible >= strings.length && (
            <div className="hall__end">
              <Scissors size={24} aria-hidden />
              <p>
                Hết dây rồi: {photos.length} khoảnh khắc trong {stats.days} ngày.
                <br />
                Đi tạo thêm thành quả nào!
              </p>
            </div>
          )}
        </>
      )}

      {openIndex !== null && photos[openIndex] && (
        <Lightbox photos={photos} index={openIndex} habits={habits} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  )
}

function Plaque({ value, label }: { value: number; label: string }) {
  return (
    <div className="plaque">
      <span className="plaque__val">{value}</span>
      <span className="plaque__lbl">{label}</span>
    </div>
  )
}

function PhotoString({
  no,
  items,
  habits,
  showEmpty,
  onOpen,
}: {
  no: number
  items: { photo: Photo; index: number }[]
  habits: Map<string, Habit>
  showEmpty: boolean
  onOpen: (index: number) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const empty = showEmpty ? PER_STRING - items.length : 0
  const slots = items.length + empty
  const W = LEAD + slots * SLOT + TAIL
  const sag = Math.min(54, W * 0.045)
  const yAt = (x: number) => {
    const t = x / W
    return Y0 + 4 * t * (1 - t) * sag
  }
  const height = Y0 + sag + 210
  const first = items[0]?.photo.date
  const last = items[items.length - 1]?.photo.date

  useLayoutEffect(() => {
    // dây mới nhất: cuộn tới tấm ảnh mới nhất
    const el = scroller.current
    if (el && showEmpty) el.scrollLeft = Math.max(0, LEAD + items.length * SLOT - el.clientWidth + SLOT * 0.6)
  }, [showEmpty, items.length])

  return (
    <section className="string" aria-label={`Dây ảnh số ${no}`}>
      <div className="string__scroll" ref={scroller}>
        <div className="string__track" style={{ width: W, height }}>
          <svg className="string__rope" width={W} height={Y0 + sag + 12} aria-hidden>
            <path d={`M 4 ${Y0} Q ${W / 2} ${Y0 + 2 * sag} ${W - 4} ${Y0}`} />
            <path className="string__rope-hi" d={`M 4 ${Y0 - 0.8} Q ${W / 2} ${Y0 + 2 * sag - 0.8} ${W - 4} ${Y0 - 0.8}`} />
            <circle cx={4} cy={Y0} r={4} className="string__nail" />
            <circle cx={W - 4} cy={Y0} r={4} className="string__nail" />
          </svg>

          {Array.from({ length: slots + 1 }, (_, i) => {
            const x = LEAD + i * SLOT
            return (
              <i
                key={`b${i}`}
                className="bulb"
                style={{ left: x - 4, top: yAt(x) + 3, animationDelay: `${seeded(`${no}-${i}`) * 3}s` }}
                aria-hidden
              />
            )
          })}

          <div className="string__tag" style={{ left: 16, top: yAt(42) - 2 }}>
            <span className="string__tag-no">#{no}</span>
            {first && last && (
              <span className="string__tag-date">
                {ddmm(first)}
                {first !== last && ` - ${ddmm(last)}`}
              </span>
            )}
          </div>

          {items.map(({ photo, index }, i) => {
            const x = LEAD + i * SLOT + SLOT / 2
            const rot = (seeded(photo.id) - 0.5) * 12
            const gold = MILESTONES.includes(photo.streak)
            const h = habits.get(photo.habitId)
            return (
              <button
                key={photo.id}
                type="button"
                className={gold ? 'polaroid polaroid--gold' : 'polaroid'}
                style={
                  {
                    left: x - 62,
                    top: yAt(x) - 8,
                    '--r': `${rot.toFixed(2)}deg`,
                    '--sway': `${(3.6 + seeded(photo.id, 7) * 2.4).toFixed(2)}s`,
                    '--delay': `${(-seeded(photo.id, 3) * 4).toFixed(2)}s`,
                  } as React.CSSProperties
                }
                onClick={() => onOpen(index)}
                aria-label={`Ảnh ngày ${ddmm(photo.date)}`}
              >
                <span className="pin" aria-hidden />
                <span className="polaroid__photo">
                  <BlobImg blob={photo.blob} />
                </span>
                <span className="polaroid__caption">{photo.caption || `${h?.emoji ?? ''} ${ddmm(photo.date)}`}</span>
                {gold && (
                  <span className="polaroid__star">
                    <Star size={11} weight="fill" /> {photo.streak}
                  </span>
                )}
              </button>
            )
          })}

          {Array.from({ length: empty }, (_, i) => {
            const x = LEAD + (items.length + i) * SLOT + SLOT / 2
            return (
              <div key={`e${i}`} className="polaroid polaroid--ghost" style={{ left: x - 62, top: yAt(x) - 8 } as React.CSSProperties} aria-hidden>
                <span className="pin" />
                <span className="polaroid__photo">
                  <Camera size={28} weight="regular" />
                </span>
                <span className="polaroid__caption">{i === 0 ? 'ảnh tiếp theo…' : ''}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
