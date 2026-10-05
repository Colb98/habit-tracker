import { Suspense } from 'react'
import { HabitDetail } from '@/components/HabitDetail'

export default function HabitPage() {
  return (
    <Suspense>
      <HabitDetail />
    </Suspense>
  )
}
