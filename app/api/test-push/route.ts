import { NextResponse } from 'next/server'
import { pushToDevice } from '@/lib/server/push'
import { isDeviceId, loadDevice } from '@/lib/server/store'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || !isDeviceId(body.deviceId)) return NextResponse.json({ error: 'deviceId không hợp lệ' }, { status: 400 })
  const { subscriptions } = await loadDevice(body.deviceId)
  if (!subscriptions.length) return NextResponse.json({ error: 'Thiết bị chưa đăng ký nhận thông báo' }, { status: 404 })
  const sent = await pushToDevice(body.deviceId, subscriptions, {
    title: '🔔 Thông báo hoạt động rồi!',
    body: 'Từ giờ bạn sẽ được nhắc đúng giờ và cảnh báo khi streak sắp mất.',
    url: '/',
    tag: 'test',
  })
  if (!sent) return NextResponse.json({ error: 'Không gửi được. Thử tắt rồi bật lại thông báo' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
