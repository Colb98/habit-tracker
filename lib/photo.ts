'use client'

import { pad } from './dates'

// ---------- EXIF: lấy DateTimeOriginal từ JPEG ----------

export async function readExifDate(file: Blob): Promise<Date | null> {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer()
    const v = new DataView(buf)
    if (v.getUint16(0) !== 0xffd8) return null
    let off = 2
    while (off + 4 < v.byteLength) {
      const marker = v.getUint16(off)
      const len = v.getUint16(off + 2)
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10)
      if ((marker & 0xff00) !== 0xff00) return null
      off += 2 + len
    }
  } catch {
    /* ảnh không có EXIF */
  }
  return null
}

function parseTiff(v: DataView, start: number): Date | null {
  const le = v.getUint16(start) === 0x4949
  const u16 = (o: number) => v.getUint16(start + o, le)
  const u32 = (o: number) => v.getUint32(start + o, le)
  const readAscii = (o: number, n: number) => {
    let s = ''
    for (let i = 0; i < n - 1; i++) s += String.fromCharCode(v.getUint8(start + o + i))
    return s
  }
  const findTag = (ifd: number, tag: number) => {
    const count = u16(ifd)
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12
      if (u16(e) === tag) return { count: u32(e + 4), value: u32(e + 8) }
    }
    return null
  }
  const ifd0 = u32(4)
  const exifPtr = findTag(ifd0, 0x8769)
  const original = exifPtr ? findTag(exifPtr.value, 0x9003) : null
  const tag = original ?? findTag(ifd0, 0x0132)
  if (!tag) return null
  const m = readAscii(tag.value, tag.count).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
  return isNaN(d.getTime()) ? null : d
}

// ---------- 7-segment, giống date stamp của máy ảnh film ----------

const SEGMENTS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
}

function drawSegment(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, t: number) {
  const h = t / 2
  ctx.beginPath()
  if (y1 === y2) {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 + h, y1 - h)
    ctx.lineTo(x2 - h, y1 - h)
    ctx.lineTo(x2, y1)
    ctx.lineTo(x2 - h, y1 + h)
    ctx.lineTo(x1 + h, y1 + h)
  } else {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 + h, y1 + h)
    ctx.lineTo(x1 + h, y2 - h)
    ctx.lineTo(x1, y2)
    ctx.lineTo(x1 - h, y2 - h)
    ctx.lineTo(x1 - h, y1 + h)
  }
  ctx.closePath()
  ctx.fill()
}

/** Vẽ chuỗi 7-segment, trả về độ rộng đã vẽ. Hỗ trợ 0-9, '-', ':', "'", ' '. */
function drawSegText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, measureOnly = false) {
  const w = h * 0.52
  const t = h * 0.13
  const g = t * 0.28
  let cx = x
  for (const ch of text) {
    if (ch === ' ') {
      cx += w * 0.55
      continue
    }
    if (ch === ':') {
      if (!measureOnly) {
        ctx.fillRect(cx + t * 0.2, y + h * 0.28, t, t)
        ctx.fillRect(cx + t * 0.2, y + h * 0.66, t, t)
      }
      cx += t * 2
      continue
    }
    if (ch === "'") {
      if (!measureOnly) {
        ctx.beginPath()
        ctx.moveTo(cx + t * 0.9, y)
        ctx.lineTo(cx + t * 1.6, y)
        ctx.lineTo(cx + t * 0.6, y + h * 0.3)
        ctx.lineTo(cx + t * 0.1, y + h * 0.3)
        ctx.closePath()
        ctx.fill()
      }
      cx += t * 2.2
      continue
    }
    const segs = SEGMENTS[ch]
    if (!segs) continue
    if (!measureOnly) {
      const L = cx + t / 2
      const R = cx + w - t / 2
      const T = y + t / 2
      const M = y + h / 2
      const B = y + h - t / 2
      const map: Record<string, [number, number, number, number]> = {
        a: [L + g, T, R - g, T],
        b: [R, T + g, R, M - g],
        c: [R, M + g, R, B - g],
        d: [L + g, B, R - g, B],
        e: [L, M + g, L, B - g],
        f: [L, T + g, L, M - g],
        g: [L + g, M, R - g, M],
      }
      for (const s of segs) drawSegment(ctx, ...map[s], t)
    }
    cx += w + t * 0.9
  }
  return cx - x
}

// ---------- Xử lý ảnh: resize + watermark ----------

const MAX_EDGE = 1600

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không đọc được ảnh (thử định dạng JPG/PNG).'))
    }
    img.src = url
  })
}

export interface StampOptions {
  takenAt: Date
  label?: string
}

export async function stampPhoto(file: Blob, opts: StampOptions) {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.round(img.naturalWidth * scale)
  const H = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, W, H)

  const d = opts.takenAt
  const dateText = `${pad(d.getDate())} ${pad(d.getMonth() + 1)} '${String(d.getFullYear()).slice(2)}`
  const timeText = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const unit = Math.min(W, H)
  const h = unit * 0.05
  const margin = unit * 0.045

  // date stamp góc phải dưới: cam phát sáng, hơi nghiêng như máy film
  ctx.save()
  const dateW = drawSegText(ctx, dateText, 0, 0, h, true)
  const timeW = drawSegText(ctx, timeText, 0, 0, h * 0.72, true)
  const x = W - margin - dateW
  const y = H - margin - h
  ctx.transform(1, 0, -0.1, 1, y * 0.1, 0)
  ctx.fillStyle = '#ff9a3c'
  ctx.shadowColor = 'rgba(255, 120, 30, 0.95)'
  ctx.shadowBlur = h * 0.45
  for (let pass = 0; pass < 2; pass++) {
    drawSegText(ctx, dateText, x, y, h)
    drawSegText(ctx, timeText, W - margin - timeW, y - h * 0.72 - h * 0.35, h * 0.72)
  }
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffd7a8'
  ctx.globalAlpha = 0.35
  drawSegText(ctx, dateText, x, y, h)
  ctx.restore()

  // nhãn habit góc trái dưới
  if (opts.label) {
    ctx.save()
    const fs = Math.round(unit * 0.034)
    ctx.font = `600 ${fs}px ${getComputedStyle(document.body).fontFamily || "system-ui, sans-serif"}`
    ctx.textBaseline = 'alphabetic'
    ctx.shadowColor = 'rgba(0,0,0,0.65)'
    ctx.shadowBlur = fs * 0.5
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    const maxW = W - margin * 3 - dateW
    let label = opts.label
    while (ctx.measureText(label).width > maxW && label.length > 4) label = label.slice(0, -2) + '…'
    ctx.fillText(label, margin, H - margin)
    ctx.restore()
  }

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không xuất được ảnh'))), 'image/jpeg', 0.86),
  )
  return { blob, width: W, height: H }
}

/** Thời điểm chụp: EXIF → lastModified → bây giờ */
export async function captureTime(file: File): Promise<Date> {
  const exif = await readExifDate(file)
  if (exif) return exif
  if (file.lastModified && Math.abs(Date.now() - file.lastModified) < 1000 * 60 * 60 * 24 * 365 * 5) {
    return new Date(file.lastModified)
  }
  return new Date()
}
