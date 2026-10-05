import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Giữ Lửa: Habit Tracker',
    short_name: 'Giữ Lửa',
    description: 'Xây thói quen, giữ chuỗi streak, lưu lại thành quả mỗi ngày.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d0f0a',
    theme_color: '#0d0f0a',
    lang: 'vi',
    icons: [
      { src: '/pwa/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
