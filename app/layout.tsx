import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro, Bricolage_Grotesque, Patrick_Hand } from 'next/font/google'
import { AppShell } from '@/components/AppShell'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'
import './globals.css'

const body = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})
const display = Bricolage_Grotesque({ subsets: ['latin', 'vietnamese'], variable: '--font-display' })
const hand = Patrick_Hand({ subsets: ['latin', 'vietnamese'], weight: '400', variable: '--font-hand' })

export const metadata: Metadata = {
  title: 'Giữ Lửa',
  description: 'Xây thói quen, giữ chuỗi streak, lưu lại thành quả mỗi ngày.',
  appleWebApp: { capable: true, title: 'Giữ Lửa', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
