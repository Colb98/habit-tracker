import { Suspense } from 'react'
import { HabitForm } from '@/components/HabitForm'

export default function EditPage() {
  return (
    <Suspense>
      <HabitForm />
    </Suspense>
  )
}
