# 🔥 Giữ Lửa — Habit Tracker PWA

Xây thói quen, giữ chuỗi streak, chụp lại thành quả mỗi ngày. Cài được lên màn hình chính (iOS/Android) và nhận thông báo nhắc nhở.

- **Next.js 16** (App Router), toàn bộ UI chạy client-side
- **IndexedDB (Dexie)**: habit, lịch sử, ảnh được lưu ngay trên máy, không cần tài khoản
- **Web Push + Upstash Redis**: server chỉ giữ lịch nhắc + trạng thái streak tối thiểu để bắn thông báo đúng giờ
- **Cron endpoint** `/api/cron`: gọi mỗi 1–5 phút

## Chạy local

```bash
npm install
cp .env.example .env.local   # điền các biến bên dưới
npm run dev
```

App chạy được mà không cần env; khi đó chỉ có phần thông báo bị tắt.

## Deploy lên Vercel

1. **Push code lên GitHub → Import project vào Vercel.**
2. **Redis:** Vercel Dashboard → Storage → Marketplace → *Upstash for Redis* → Connect vào project.
   Vercel sẽ tự thêm `KV_REST_API_URL` và `KV_REST_API_TOKEN`.
3. **VAPID keys** (cho Web Push):
   ```bash
   npm run vapid
   ```
   Thêm vào Environment Variables:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Public Key
   - `VAPID_PRIVATE_KEY` = Private Key
   - `VAPID_SUBJECT` = `mailto:email-cua-ban@example.com`
4. **`CRON_SECRET`**: một chuỗi ngẫu nhiên dài (vd. `openssl rand -hex 24`).
5. Redeploy.

### Cron bắn thông báo

Gói Hobby của Vercel chỉ cho cron chạy **1 lần/ngày**, không đủ để nhắc đúng giờ. Dùng một dịch vụ cron miễn phí bên ngoài:

**cron-job.org (khuyên dùng, miễn phí, chạy được mỗi phút)**
- URL: `https://<app>.vercel.app/api/cron`
- Schedule: mỗi 1 hoặc 5 phút
- Advanced → Headers: `Authorization: Bearer <CRON_SECRET>`
  (hoặc gọi `https://<app>.vercel.app/api/cron?secret=<CRON_SECRET>`)

**Cách khác:** Upstash QStash Schedules (cùng tài khoản Upstash với Redis), hoặc Vercel Pro (thêm `crons` vào `vercel.json`, Vercel tự gửi header `Authorization: Bearer $CRON_SECRET`).

Mỗi lần chạy, cron tính giờ địa phương của từng thiết bị. Nó gửi:
- **Nhắc làm**: vào giờ hẹn của habit, nếu hôm nay chưa xong.
- **Cảnh báo streak**: vào giờ cảnh báo, nếu chưa xong. Ví dụ: *"🔥 Streak 12 ngày sắp tắt!"*

Mỗi loại thông báo chỉ gửi 1 lần/ngày. Nếu cron chạy trễ, thông báo vẫn được gửi trong vòng 90 phút sau giờ hẹn.

## Dùng trên điện thoại

- **iPhone (iOS 16.4+)**: mở bằng Safari → nút Chia sẻ → **Thêm vào MH chính** → mở app từ màn hình chính → Cài đặt → bật Thông báo. iOS chỉ cho PWA đã cài nhận push.
- **Android/Chrome**: bấm "Cài đặt" trên banner, hoặc menu ⋮ → Cài đặt ứng dụng.

## Tính năng

| | |
|---|---|
| 3 loại habit | **1 lần/ngày** (uống thuốc, ngủ đúng giờ), **càng nhiều càng tốt** (trang sách, ly nước), **khoảng thời gian** (tập 60 phút) có đồng hồ bấm giờ chạy nền |
| Lịch sử | Heatmap 53 tuần kiểu GitHub, càng làm nhiều ô càng xanh đậm, chạm ô để xem chi tiết |
| Ghi nhận + ảnh | Ảnh được đóng dấu ngày giờ **kiểu máy film** (số 7 đoạn màu cam). Giờ chụp lấy từ EXIF nếu có |
| Streak | Ngọn lửa sáng khi hôm nay đã xong. Màn ăn mừng có confetti, dải 7 ngày, kỷ lục và các mốc 3/7/14/21/30/50/100/365… ngày. Ngày nghỉ trong tuần không làm gãy streak |
| Hall of Fame | Bức tường tối với đèn neon và dây đèn fairy light. Ảnh polaroid kẹp kẹp gỗ, đung đưa nhẹ, 7 tấm/dây, cuộn vô tận. Ảnh ở ngày đạt mốc có **khung vàng**. Dây mới nhất có chỗ trống "ảnh tiếp theo…". Mở ảnh để xem lớn, viết ghi chú, khoe (Web Share) hoặc tải về |
| Sao lưu | Xuất/nhập file JSON chứa cả ảnh |

## Cấu trúc

```
app/                 pages (/, /habit, /edit, /hall, /settings) + API routes
  api/sync           đăng ký push + đồng bộ lịch nhắc
  api/cron           bắn thông báo đến hạn
  api/test-push      gửi thử
  pwa/*              icon PNG sinh bằng code
components/          UI
lib/db.ts            IndexedDB (Dexie)
lib/stats.ts         streak, heatmap level, mốc
lib/photo.ts         EXIF + watermark 7-segment
lib/push.ts          service worker, subscribe, auto-sync
lib/server/*         Redis, web-push, logic chọn thông báo
public/sw.js         service worker (offline + push)
```
