import 'server-only'
import { Redis } from '@upstash/redis'
import type { PushSubscription as WebPushSubscription } from 'web-push'
import type { SyncedHabit } from '../types'

let client: Redis | null = null

export function redis(): Redis {
  if (client) return client
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Thiếu cấu hình Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN)')
  client = new Redis({ url, token })
  return client
}

export interface DeviceState {
  tz: string
  habits: SyncedHabit[]
  updatedAt: number
}

const K = {
  devices: 'ht:devices',
  state: (id: string) => `ht:dev:${id}:state`,
  subs: (id: string) => `ht:dev:${id}:subs`,
  sent: (id: string) => `ht:dev:${id}:sent`,
}

export const isDeviceId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)

export async function saveDevice(id: string, state: DeviceState, sub?: WebPushSubscription) {
  const r = redis()
  const p = r.pipeline()
  p.sadd(K.devices, id)
  p.set(K.state(id), state)
  if (sub) p.hset(K.subs(id), { [sub.endpoint]: JSON.stringify(sub) })
  await p.exec()
}

export async function removeSubscription(id: string, endpoint: string) {
  const r = redis()
  await r.hdel(K.subs(id), endpoint)
  if ((await r.hlen(K.subs(id))) === 0) {
    await r.srem(K.devices, id)
    await r.del(K.state(id), K.subs(id), K.sent(id))
  }
}

export async function listDevices(): Promise<string[]> {
  return redis().smembers(K.devices)
}

export async function loadDevice(id: string) {
  const r = redis()
  const [state, subs, sent] = await Promise.all([
    r.get<DeviceState>(K.state(id)),
    r.hgetall<Record<string, unknown>>(K.subs(id)),
    r.hgetall<Record<string, string>>(K.sent(id)),
  ])
  const subscriptions = Object.values(subs ?? {}).map(
    (v) => (typeof v === 'string' ? JSON.parse(v) : v) as WebPushSubscription,
  )
  return { state, subscriptions, sent: sent ?? {} }
}

export async function markSent(id: string, values: Record<string, string>) {
  if (Object.keys(values).length) await redis().hset(K.sent(id), values)
}
