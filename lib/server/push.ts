import 'server-only'
import webpush, { type PushSubscription as WebPushSubscription } from 'web-push'
import { removeSubscription } from './store'

let configured = false

function configure() {
  if (configured) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) throw new Error('Thiếu VAPID key (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)')
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:habit@example.com', pub, priv)
  configured = true
}

export interface PushMessage {
  title: string
  body: string
  url?: string
  tag?: string
}

/** Gửi tới mọi subscription của thiết bị; tự dọn subscription đã hết hạn. */
export async function pushToDevice(deviceId: string, subs: WebPushSubscription[], msg: PushMessage) {
  configure()
  let ok = 0
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(msg), { TTL: 60 * 60, urgency: 'high' })
        ok++
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await removeSubscription(deviceId, sub.endpoint)
        else console.error('push failed', code, (err as Error).message)
      }
    }),
  )
  return ok
}
