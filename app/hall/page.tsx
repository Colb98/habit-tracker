import { Suspense } from 'react'
import { HallWall } from '@/components/HallWall'

export default function HallPage() {
  return (
    <Suspense>
      <HallWall />
    </Suspense>
  )
}
