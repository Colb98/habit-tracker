import { iconImage } from '@/lib/icon-image'

export const dynamic = 'force-static'

export function GET() {
  return iconImage(96, { pad: 0.08, mono: true, transparent: true })
}
