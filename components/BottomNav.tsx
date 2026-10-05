'use client'

import { GearSix, House, Images, type Icon } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS: { href: string; label: string; icon: Icon }[] = [
  { href: '/', label: 'Hôm nay', icon: House },
  { href: '/hall', label: 'Hall of Fame', icon: Images },
  { href: '/settings', label: 'Cài đặt', icon: GearSix },
]

export function BottomNav() {
  const path = usePathname()
  if (path.startsWith('/edit')) return null
  return (
    <nav className={path.startsWith('/hall') ? 'tabbar tabbar--gallery' : 'tabbar'} aria-label="Điều hướng chính">
      {TABS.map(({ href, label, icon: TabIcon }) => {
        const active = href === '/' ? path === '/' || path.startsWith('/habit') : path.startsWith(href)
        return (
          <Link key={href} href={href} className={active ? 'tab tab--active' : 'tab'} aria-current={active ? 'page' : undefined}>
            {/* quy ước: tab đang chọn dùng weight fill, còn lại regular */}
            <TabIcon size={24} weight={active ? 'fill' : 'regular'} aria-hidden />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
