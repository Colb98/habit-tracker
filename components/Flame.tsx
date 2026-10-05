import { Fire } from '@phosphor-icons/react'
import { useId } from 'react'

/** Ngọn lửa streak: sáng (gradient lửa) khi hôm nay đã xong, xám khi chưa. */
export function Flame({ size = 24, lit = true, animate = false }: { size?: number; lit?: boolean; animate?: boolean }) {
  const id = useId()
  return (
    <Fire
      size={size}
      weight="fill"
      color={lit ? `url(#${id})` : 'currentColor'}
      className={`flame${lit ? '' : ' flame--off'}${animate ? ' flame--alive' : ''}`}
      aria-hidden
    >
      {lit && (
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--fire)' }} />
            <stop offset="1" style={{ stopColor: 'var(--fire-2)' }} />
          </linearGradient>
        </defs>
      )}
    </Fire>
  )
}
