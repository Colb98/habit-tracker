/* Service worker: offline shell + web push */
const VERSION = 'v2'
// Đăng ký bằng /sw.js?dev=1 khi chạy next dev: không cache gì, chỉ xử lý push
const DEV = new URL(self.location.href).searchParams.has('dev')
const SHELL = `shell-${VERSION}`
const STATIC = `static-${VERSION}`
const PRECACHE = ['/', '/habit', '/edit', '/hall', '/settings']

self.addEventListener('install', (event) => {
  if (DEV) {
    self.skipWaiting()
    return
  }
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => DEV || (k !== SHELL && k !== STATIC)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (DEV) return
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Asset có hash: cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/pwa/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
    return
  }

  // Trang: network-first, rớt mạng thì dùng bản cache (bỏ qua ?id=...)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(SHELL).then((c) => c.put(url.pathname, copy))
          }
          return res
        })
        .catch(() =>
          caches.match(url.pathname).then((hit) => hit || caches.match('/')),
        ),
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Habit', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Đến giờ rồi!'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa/192',
      badge: '/pwa/badge',
      tag: data.tag,
      renotify: Boolean(data.tag),
      vibrate: [80, 40, 80],
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate?.(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
