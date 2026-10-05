'use client'

import { IconContext } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { registerSW, wireAutoSync } from '@/lib/push'
import { BottomNav } from './BottomNav'
import { PixelFlame } from './PixelFlame'

// Một độ đậm icon cho toàn app (tab bar tự ghi đè: regular / fill khi đang chọn)
const ICONS = { size: 20, weight: 'bold' as const }

// Toàn bộ dữ liệu nằm trong IndexedDB của máy nên chỉ render sau khi mount
// (tránh lệch giờ/ngày giữa HTML build sẵn và client).
export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    registerSW()
    wireAutoSync()
    navigator.storage?.persist?.().catch(() => {})
  }, [])
  if (!mounted) {
    return (
      <div className="splash" aria-label="Đang tải">
        <PixelFlame size={64} />
      </div>
    )
  }
  return (
    <IconContext.Provider value={ICONS}>
      <main className="page">{children}</main>
      <BottomNav />
    </IconContext.Provider>
  )
}
