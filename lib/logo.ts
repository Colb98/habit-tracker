// Logo "Giữ Lửa": ngọn lửa ghép từ các ô contribution.
export const FLAME_PIXELS = [
  '...#...',
  '..##...',
  '..#g#..',
  '.#gg#..',
  '.#ggg#.',
  '#ggogg#',
  '#goyog#',
  '.#gog#.',
  '..###..',
]

export const PIXEL_COLORS: Record<string, string> = {
  '#': '#39d353',
  g: '#26a641',
  o: '#ff8a3d',
  y: '#ffd166',
}

export function flameCells() {
  const cells: { x: number; y: number; c: string }[] = []
  FLAME_PIXELS.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') cells.push({ x, y, c: PIXEL_COLORS[ch] })
    }),
  )
  return cells
}
