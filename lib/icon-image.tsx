import { ImageResponse } from 'next/og'
import { flameCells } from './logo'

/** Icon PNG cho PWA. `pad` = tỉ lệ vùng an toàn (maskable cần lề rộng hơn). */
export function iconImage(size: number, opts: { pad?: number; mono?: boolean; transparent?: boolean } = {}) {
  const pad = opts.pad ?? 0.2
  const cell = (size * (1 - pad * 2)) / 9 / 1.18
  const gap = cell * 0.18
  const w = 7 * cell + 6 * gap
  const h = 9 * cell + 8 * gap
  const left = (size - w) / 2
  const top = (size - h) / 2
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: opts.transparent ? 'transparent' : 'radial-gradient(circle at 50% 60%, #1f2a18 0%, #0d0f0a 70%)',
        }}
      >
        {flameCells().map(({ x, y, c }) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              left: left + x * (cell + gap),
              top: top + y * (cell + gap),
              width: cell,
              height: cell,
              borderRadius: cell * 0.22,
              background: opts.mono ? '#ffffff' : c,
            }}
          />
        ))}
      </div>
    ),
    { width: size, height: size },
  )
}
