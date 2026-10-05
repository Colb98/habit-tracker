// Không đánh dấu 'use client': layout (server) cần import THEME_BOOT_SCRIPT dạng chuỗi.
// Các hàm bên dưới chỉ được gọi trong trình duyệt.

export type ThemePref = 'system' | 'light' | 'dark'
export type Palette = 'forest' | 'ocean' | 'rose' | 'ember'

const THEME_KEY = 'ht.theme'
const PALETTE_KEY = 'ht.palette'

/** Màu nền từng bảng màu, dùng cho thanh trạng thái (meta theme-color). Khớp với --bg trong globals.css */
export const PALETTES: Record<Palette, { name: string; light: string; dark: string; swatch: string[] }> = {
  forest: { name: 'Rừng', light: '#f4f6f0', dark: '#0d0f0a', swatch: ['#9be9a8', '#40c463', '#30a14e', '#216e39'] },
  ocean: { name: 'Đại dương', light: '#f3f5f9', dark: '#0b0f17', swatch: ['#b6ccff', '#7aa2ff', '#3d73f2', '#1f4fc9'] },
  rose: { name: 'Anh đào', light: '#f8f4f5', dark: '#110c0e', swatch: ['#f7c2d4', '#ee8bae', '#dc4f82', '#b02a5c'] },
  ember: { name: 'Than hồng', light: '#f5f5f4', dark: '#0f0f0f', swatch: ['#ffd2a8', '#ffa25c', '#f26a1f', '#c2410c'] },
}

const isPalette = (v: unknown): v is Palette => typeof v === 'string' && v in PALETTES

/** Chạy inline trong <head> trước lần vẽ đầu tiên để không bị nháy theme. */
export const THEME_BOOT_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem('${THEME_KEY}'),p=localStorage.getItem('${PALETTE_KEY}');if(t==='light'||t==='dark')d.dataset.theme=t;if(p&&p!=='forest'&&${JSON.stringify(Object.keys(PALETTES))}.indexOf(p)>=0)d.dataset.palette=p}catch(e){}`

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

export function getThemePref(): ThemePref {
  const t = read(THEME_KEY)
  return t === 'light' || t === 'dark' ? t : 'system'
}

export function getPalette(): Palette {
  const p = read(PALETTE_KEY)
  return isPalette(p) ? p : 'forest'
}

/** Thanh trạng thái của PWA đi theo bảng màu + theme đang chọn */
function syncMetaThemeColor() {
  const pref = getThemePref()
  const bg = PALETTES[getPalette()]
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const mode = pref === 'system' ? (m.media.includes('dark') ? 'dark' : 'light') : pref
    m.content = bg[mode]
  })
}

export function setThemePref(pref: ThemePref) {
  write(THEME_KEY, pref === 'system' ? null : pref)
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  syncMetaThemeColor()
}

export function setPalette(palette: Palette) {
  write(PALETTE_KEY, palette === 'forest' ? null : palette)
  const root = document.documentElement
  if (palette === 'forest') delete root.dataset.palette
  else root.dataset.palette = palette
  syncMetaThemeColor()
}
