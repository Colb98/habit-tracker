// Không đánh dấu 'use client': layout (server) cần import THEME_BOOT_SCRIPT dạng chuỗi.
// Các hàm bên dưới chỉ được gọi trong trình duyệt.

export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'ht.theme'
const BG = { light: '#f4f6f0', dark: '#0d0f0a' }

/** Chạy inline trong <head> trước lần vẽ đầu tiên để không bị nháy theme. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    /* private mode */
  }
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref

  // thanh trạng thái của PWA đi theo theme đang chọn
  const resolved =
    pref === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    if (pref === 'system') {
      m.content = m.media.includes('dark') ? BG.dark : BG.light
    } else {
      m.content = BG[resolved]
    }
  })
}
