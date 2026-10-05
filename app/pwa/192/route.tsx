import { iconImage } from '@/lib/icon-image'

export const dynamic = 'force-static'

export function GET() {
  return iconImage(192, { pad: 0.16 })
}
