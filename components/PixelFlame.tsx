import { flameCells } from '@/lib/logo'

export function PixelFlame({ size = 28 }: { size?: number }) {
  return (
    <svg width={size * (7 / 9)} height={size} viewBox="0 0 7 9" aria-hidden shapeRendering="crispEdges">
      {flameCells().map(({ x, y, c }) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.18} fill={c} />
      ))}
    </svg>
  )
}
