# Hướng dẫn cấu hình Webhook Multi-channel

Hệ thống hỗ trợ 3 kênh: **WhatsApp**, **Facebook Messenger**, **Instagram DM** — đều đi qua 1 webhook endpoint duy nhất.

---

## Webhook URL

```
https://dashboard.pastie.vn/api/multichannel/webhook
```

---

## Bước 1 — Chuẩn bị trên Meta Developer Portal

1. Truy cập [developers.facebook.com](https://developers.facebook.com) → **My Apps** → tạo hoặc chọn App.
2. Vào **App Settings → Basic** → copy **App Secret** (dùng cho `META_APP_SECRET`).
3. Thêm sản phẩm cần thiết vào App:
   - **WhatsApp** → dùng WhatsApp Business API
   - **Messenger** → dùng Pages Messaging
   - **Instagram** → dùng Instagram Messaging

---

## Bước 2 — Cấu hình biến môi trường `.env`

```env
# Dùng để Meta xác minh webhook (tự đặt, nhớ lại để điền vào Meta Portal)
META_VERIFY_TOKEN=pastie_verify_token_2026

# App Secret lấy từ Meta App Settings → Basic
META_APP_SECRET=<your_app_secret>
```

---

## Bước 3 — Đăng ký Webhook trên Meta

Vào từng sản phẩm trong Meta App Dashboard:

| Sản phẩm | Đường dẫn trong Meta Portal |
|---|---|
| WhatsApp | WhatsApp → Configuration → Webhook |
| Messenger | Messenger → Settings → Webhooks |
| Instagram | Instagram → Settings → Webhooks |

Điền vào form:
- **Callback URL**: `https://dashboard.pastie.vn/api/multichannel/webhook`
- **Verify Token**: giá trị `META_VERIFY_TOKEN` trong `.env` (ví dụ: `pastie_verify_token_2026`)

Nhấn **Verify and Save** — Meta sẽ gọi `GET /api/multichannel/webhook` để xác minh.

**Subscribe các events:**
- WhatsApp: `messages`
- Messenger: `messages`, `messaging_postbacks`
- Instagram: `messages`

---

## Bước 4 — Lấy Access Token cho từng kênh

### WhatsApp

1. Vào **WhatsApp → API Setup**.
2. Copy **Phone Number ID** → `whatsapp_phone_number_id`.
3. Tạo **Permanent Token** (System User Token) → `whatsapp_access_token`.

### Messenger

1. Vào **Messenger → Settings → Access Tokens**.
2. Chọn Facebook Page → **Generate Token** → `messenger_page_access_token`.
3. Copy **Page ID** → `messenger_page_id`.

### Instagram

1. Kết nối Instagram Business Account với Facebook Page.
2. Vào **Instagram → Settings → Access Tokens**.
3. **Page ID** của Facebook Page đã kết nối → `instagram_page_id`.
4. **Page Access Token** (cùng token với Messenger nếu dùng cùng Page) → `instagram_access_token`.

---

## Bước 5 — Lưu cấu hình vào hệ thống

Gọi API để lưu credentials vào database (hỗ trợ multi-project):

```bash
POST https://dashboard.pastie.vn/api/admin/channels
Authorization: Bearer <ADMIN_PASSWORD>
Content-Type: application/json

{
  "projectId": "pastie-landingpage",
  "platform": "whatsapp",
  "whatsappPhoneNumberId": "<PHONE_NUMBER_ID>",
  "whatsappAccessToken": "<WHATSAPP_ACCESS_TOKEN>",
  "messengerPageId": "<MESSENGER_PAGE_ID>",
  "messengerPageAccessToken": "<MESSENGER_PAGE_ACCESS_TOKEN>",
  "instagramPageId": "<INSTAGRAM_PAGE_ID>",
  "instagramAccessToken": "<INSTAGRAM_ACCESS_TOKEN>",
  "metaVerifyToken": "pastie_verify_token_2026"
}
```

> `metaVerifyToken` cho phép mỗi project dùng verify token riêng — hệ thống tự lookup DB khi Meta gọi xác minh.

Kiểm tra cấu hình hiện tại:

```bash
GET https://dashboard.pastie.vn/api/admin/channels?projectId=pastie-landingpage
Authorization: Bearer <ADMIN_PASSWORD>
```

---

## Luồng hoạt động sau khi cấu hình

```
Khách nhắn tin (WA / Messenger / IG)
        ↓
Meta gửi POST đến webhook
        ↓
Hệ thống xác minh HMAC signature (META_APP_SECRET)
        ↓
Parse event → xác định platform + senderId + targetId
        ↓
Lookup channel_configs → map targetId → project_id
        ↓
    ┌───┴────────────────────┐
    │ Chưa có agent          │ Đang có human agent
    ↓                        ↓
Gemini AI trả lời tự động   Lưu vào DB → dashboard cập nhật
    ↓
Gửi reply qua Meta Graph API
```

---

## Kiểm tra nhanh

```bash
# Test verification handshake
curl "https://dashboard.pastie.vn/api/multichannel/webhook\
?hub.mode=subscribe\
&hub.verify_token=pastie_verify_token_2026\
&hub.challenge=test_challenge_123"

# Kết quả mong đợi: test_challenge_123
```

---

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Verification failed (403) | Verify token không khớp | Kiểm tra `META_VERIFY_TOKEN` trong `.env` hoặc `metaVerifyToken` trong DB |
| Missing signature (401) | Meta không gửi header `x-hub-signature-256` | Kiểm tra App Secret đã cấu hình đúng |
| Signature mismatch (401) | `META_APP_SECRET` sai | Copy lại App Secret từ Meta App Settings → Basic |
| Tin nhắn không reply được | Thiếu Access Token | Kiểm tra lại credentials trong `channel_configs` qua API GET |
| Webhook không nhận event | Chưa subscribe events | Vào Meta Portal subscribe đúng events cho từng sản phẩm |
