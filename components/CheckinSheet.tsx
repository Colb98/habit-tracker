'use client'

import { ArrowsClockwise, Camera, Check, CircleNotch, Fire, Minus, Play, Plus, Stop } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { addPhoto, setEntryValue } from '@/lib/db'
import { formatElapsed, startTimer, stopTimer, useNow, useTimerStart, useToday } from '@/lib/hooks'
import { captureTime, stampPhoto } from '@/lib/photo'
import { computeStats, formatMinutes, goalOf, isDone } from '@/lib/stats'
import type { HabitWithStats } from '@/lib/hooks'
import { Celebration, type CelebrationInfo } from './Celebration'
import { Sheet } from './Sheet'

interface Stamped {
  file: File
  takenAt: Date
  label: string
  blob: Blob
  width: number
  height: number
  url: string
}

export function CheckinSheet({ data, onClose }: { data: HabitWithStats; onClose: () => void }) {
  const { habit, values, stats } = data
  const today = useToday()
  const [amount, setAmount] = useState(() => (habit.kind === 'once' ? 1 : stats.todayValue))
  const [photo, setPhoto] = useState<Stamped | null>(null)
  const [busy, setBusy] = useState<'photo' | 'save' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [celebrate, setCelebrate] = useState<CelebrationInfo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const goal = goalOf(habit)
  const willBeDone = isDone(habit, amount)
  const predictedStreak = willBeDone ? stats.current + (stats.doneToday ? 0 : 1) : stats.current
  const label = `${habit.emoji} ${habit.name}${willBeDone ? ` · Ngày ${predictedStreak}` : ''}`

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo])

  async function stamp(file: File, takenAt: Date, lbl: string): Promise<Stamped> {
    const { blob, width, height } = await stampPhoto(file, { takenAt, label: lbl })
    return { file, takenAt, label: lbl, blob, width, height, url: URL.createObjectURL(blob) }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy('photo')
    setError(null)
    try {
      setPhoto(await stamp(file, await captureTime(file), label))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    setBusy('save')
    setError(null)
    try {
      const value = habit.kind === 'once' ? (amount > 0 ? 1 : 0) : amount
      if (value !== stats.todayValue) await setEntryValue(habit.id, today, value)
      const nextValues = new Map(values)
      if (value > 0) nextValues.set(today, value)
      else nextValues.delete(today)
      const after = computeStats(habit, nextValues, today)

      let finalPhoto = photo
      if (photo && photo.label !== label) finalPhoto = await stamp(photo.file, photo.takenAt, label)
      if (finalPhoto) {
        await addPhoto({
          habitId: habit.id,
          date: today,
          takenAt: finalPhoto.takenAt.getTime(),
          blob: finalPhoto.blob,
          width: finalPhoto.width,
          height: finalPhoto.height,
          caption: caption.trim(),
          streak: after.doneToday ? after.current : 0,
        })
      }

      if (after.doneToday && !stats.doneToday) {
        setCelebrate({
          habit,
          streak: after.current,
          best: after.best,
          isNewBest: after.current >= after.best && after.current > stats.best,
          values: nextValues,
          photoUrl: finalPhoto ? URL.createObjectURL(finalPhoto.blob) : null,
        })
      } else {
        onClose()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (celebrate) return <Celebration info={celebrate} onClose={onClose} />

  return (
    <Sheet onClose={onClose} label={`Ghi nhận ${habit.name}`}>
      <header className="sheet__head">
        <span className="sheet__emoji">{habit.emoji}</span>
        <div>
          <p className="kicker">Ghi nhận hôm nay</p>
          <h2 className="sheet__title">{habit.name}</h2>
        </div>
      </header>

      {habit.kind === 'once' && (
        <button
          type="button"
          className={amount > 0 ? 'toggle-done toggle-done--on' : 'toggle-done'}
          onClick={() => setAmount(amount > 0 ? 0 : 1)}
          aria-pressed={amount > 0}
        >
          <span className="toggle-done__box" aria-hidden>
            {amount > 0 && <Check size={18} />}
          </span>
          {amount > 0 ? 'Đã hoàn thành hôm nay' : 'Chưa hoàn thành'}
        </button>
      )}

      {habit.kind === 'count' && (
        <Stepper
          value={amount}
          goal={goal}
          unit={habit.unit}
          onChange={setAmount}
          steps={[1, 5]}
        />
      )}

      {habit.kind === 'duration' && (
        <>
          <Stepper value={amount} goal={goal} unit="phút" onChange={setAmount} steps={[5, 15, 30]} display={formatMinutes} />
          <TimerControl habitId={habit.id} onStop={(m) => setAmount((a) => a + m)} />
        </>
      )}

      <div className="photo-pick">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
        {photo ? (
          <figure className="photo-preview">
            <img src={photo.url} alt="Ảnh thành quả hôm nay" />
            <button type="button" className="chip" onClick={() => fileRef.current?.click()}>
              <ArrowsClockwise size={14} /> Đổi ảnh
            </button>
          </figure>
        ) : (
          <button type="button" className="photo-drop" onClick={() => fileRef.current?.click()} disabled={busy === 'photo'}>
            <span className="photo-drop__icon" aria-hidden>
              {busy === 'photo' ? <CircleNotch size={26} className="spin" /> : <Camera size={26} />}
            </span>
            <strong>{busy === 'photo' ? 'Đang in ngày giờ lên ảnh…' : 'Chụp ảnh thành quả'}</strong>
            <span className="muted">Ảnh sẽ được đóng dấu ngày giờ và treo lên Hall of Fame</span>
          </button>
        )}
        {photo && (
          <input
            className="input input--hand"
            placeholder="Ghi chú viết tay lên polaroid… (tuỳ chọn)"
            maxLength={40}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <button type="button" className="btn btn--primary btn--block" onClick={save} disabled={busy !== null}>
        {busy === 'save' ? (
          'Đang lưu…'
        ) : willBeDone && !stats.doneToday ? (
          <>
            <Fire size={18} weight="fill" /> Hoàn thành & giữ lửa
          </>
        ) : (
          'Lưu thành quả'
        )}
      </button>
    </Sheet>
  )
}

function Stepper({
  value,
  goal,
  unit,
  onChange,
  steps,
  display = (v) => `${v}`,
}: {
  value: number
  goal: number
  unit: string
  onChange: (v: number) => void
  steps: number[]
  display?: (v: number) => string
}) {
  const pct = Math.min(1, value / goal)
  return (
    <div className="stepper">
      <div className="stepper__row">
        <button type="button" className="stepper__btn" onClick={() => onChange(Math.max(0, value - steps[0]))} aria-label="Giảm">
          <Minus size={22} />
        </button>
        <div className="stepper__value">
          <strong>{display(value)}</strong>
          <span className="muted">
            mục tiêu {display(goal)} {unit !== 'phút' ? unit : ''}
          </span>
        </div>
        <button type="button" className="stepper__btn" onClick={() => onChange(value + steps[0])} aria-label="Tăng">
          <Plus size={22} />
        </button>
      </div>
      <div className="bar">
        <div className={pct >= 1 ? 'bar__fill bar__fill--done' : 'bar__fill'} style={{ transform: `scaleX(${pct})` }} />
      </div>
      <div className="chips">
        {steps.slice(1).map((s) => (
          <button key={s} type="button" className="chip" onClick={() => onChange(value + s)}>
            +{display(s)}
          </button>
        ))}
        {value < goal && (
          <button type="button" className="chip chip--accent" onClick={() => onChange(goal)}>
            Đạt mục tiêu
          </button>
        )}
      </div>
    </div>
  )
}

function TimerControl({ habitId, onStop }: { habitId: string; onStop: (minutes: number) => void }) {
  const start = useTimerStart(habitId)
  const now = useNow(1000)
  const elapsed = useMemo(() => (start ? now - start : 0), [start, now])
  return (
    <div className={start ? 'timer timer--running' : 'timer'}>
      {start ? (
        <>
          <span className="timer__clock">{formatElapsed(elapsed)}</span>
          <button type="button" className="btn btn--ghost" onClick={() => onStop(stopTimer(habitId))}>
            <Stop size={16} weight="fill" /> Dừng và cộng vào
          </button>
        </>
      ) : (
        <>
          <span className="muted">Hoặc bấm giờ, đóng app vẫn chạy</span>
          <button type="button" className="btn btn--ghost" onClick={() => startTimer(habitId)}>
            <Play size={16} weight="fill" /> Bấm giờ
          </button>
        </>
      )}
    </div>
  )
}
