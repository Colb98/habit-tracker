'use client'

import { CaretLeft, CaretRight, DownloadSimple, Fire, ShareFat, Trash, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { deletePhoto, updateCaption } from '@/lib/db'
import { pad, prettyDate } from '@/lib/dates'
import { MILESTONES } from '@/lib/stats'
import type { Habit, Photo } from '@/lib/types'
import { BlobImg } from './PhotoThumb'

export function Lightbox({
  photos,
  index,
  habits,
  onIndex,
  onClose,
}: {
  photos: Photo[]
  index: number
  habits: Map<string, Habit>
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const photo = photos[index]
  const habit = habits.get(photo.habitId)
  const touch = useRef<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(photo.caption)
  const taken = new Date(photo.takenAt)
  const gold = MILESTONES.includes(photo.streak)

  useEffect(() => {
    setCaption(photo.caption)
    setEditing(false)
  }, [photo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [index, photos.length, onIndex, onClose])

  const fileName = `giu-lua-${photo.date}-${photo.id.slice(0, 6)}.jpg`

  async function share() {
    const file = new File([photo.blob], fileName, { type: 'image/jpeg' })
    const text = `${habit?.emoji ?? '🔥'} ${habit?.name ?? 'Habit'}${photo.streak ? `: ngày ${photo.streak} liên tiếp!` : ''}`
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text }).catch(() => {})
    } else {
      download()
    }
  }

  function download() {
    const url = URL.createObjectURL(photo.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function remove() {
    if (!confirm('Gỡ tấm ảnh này khỏi Hall of Fame?')) return
    await deletePhoto(photo.id)
    if (photos.length <= 1) onClose()
    else onIndex(Math.min(index, photos.length - 2))
  }

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (dx > 60 && index > 0) onIndex(index - 1)
        if (dx < -60 && index < photos.length - 1) onIndex(index + 1)
      }}
    >
      <div className="lightbox__bar">
        <span className="lightbox__count">
          {index + 1} / {photos.length}
        </span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
          <X size={20} />
        </button>
      </div>

      <div className="lightbox__stage" onClick={onClose}>
        <figure key={photo.id} className={gold ? 'lightbox__frame is-gold' : 'lightbox__frame'} onClick={(e) => e.stopPropagation()}>
          <BlobImg blob={photo.blob} alt={photo.caption || prettyDate(photo.date)} />
          <figcaption>
            {editing ? (
              <input
                className="lightbox__caption-input"
                value={caption}
                maxLength={40}
                autoFocus
                onChange={(e) => setCaption(e.target.value)}
                onBlur={() => {
                  updateCaption(photo.id, caption.trim())
                  setEditing(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <button type="button" className="lightbox__caption" onClick={() => setEditing(true)}>
                {photo.caption || 'chạm để viết ghi chú…'}
              </button>
            )}
          </figcaption>
        </figure>
        {index > 0 && (
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={(e) => (e.stopPropagation(), onIndex(index - 1))} aria-label="Ảnh trước">
            <CaretLeft size={22} />
          </button>
        )}
        {index < photos.length - 1 && (
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={(e) => (e.stopPropagation(), onIndex(index + 1))} aria-label="Ảnh sau">
            <CaretRight size={22} />
          </button>
        )}
      </div>

      <div className="lightbox__info">
        <p className="lightbox__title">
          {habit?.emoji} {habit?.name ?? 'Habit đã xoá'}
          {photo.streak > 0 && (
            <span className="lightbox__streak">
              <Fire size={16} weight="fill" /> Ngày {photo.streak}
            </span>
          )}
        </p>
        <p className="muted">
          {prettyDate(photo.date)} · chụp lúc {pad(taken.getHours())}:{pad(taken.getMinutes())}
        </p>
        <div className="lightbox__actions">
          <button type="button" className="btn btn--primary" onClick={share}>
            <ShareFat size={18} weight="fill" /> Khoe ngay
          </button>
          <button type="button" className="btn btn--ghost" onClick={download}>
            <DownloadSimple size={18} /> Tải về
          </button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={remove} aria-label="Xoá ảnh">
            <Trash size={20} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
