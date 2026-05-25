# Kế Hoạch Triển Khai: Xây Dựng Backend & Cơ Sở Dữ Liệu Đa Dự Án Tích Hợp Gemini AI

Tài liệu này vạch ra kế hoạch xây dựng một hệ thống **Backend độc lập (Node.js/Express)** kèm **Cơ sở dữ liệu (SQLite)** gọn nhẹ, hỗ trợ đa dự án (Multi-tenant) để lưu trữ chat, gửi OTP qua email và dịch thuật bằng Gemini AI.

---

## 1. Kiến Trúc Backend Đa Dự Án (Multi-Tenant Architecture)

Để backend này có thể dùng chung cho nhiều trang web/dự án khác nhau (ví dụ: `pastie-landing`, `pastiego-app`, `another-project`), chúng ta sẽ thiết kế một trường `project_id` trong cơ sở dữ liệu để phân biệt nguồn gốc dữ liệu chat.

```
+--------------------------------------------------------+
|                    Node.js Backend                     |
|                                                        |
|   +------------------+          +------------------+   |
|   |   Gemini API     |          |    Resend API    |   |
|   |  (Dịch & Gắn Tag)|          |  (Gửi OTP Email) |   |
|   +--------+---------+          +--------+---------+   |
|            |                             |             |
|   +--------+-----------------------------+---------+   |
|   |                  Express API                   |   |
|   +--------+-----------------------------+---------+   |
|            | (Lọc theo project_id)                 |   |
|   +--------+-----------------------------+---------+   |
|   |              PostgreSQL Database               |   |
|   +------------------------------------------------+   |
+--------------------------------------------------------+
       ^                         ^                         ^
       |                         |                         |
+------+------+           +------+------+           +------+------+
|  Dự án A    |           |  Dự án B    |           |  Dự án C    |
| (Pastie UI) |           | (Hospitality|           | (Travel UI) |
+-------------+           +-------------+           +-------------+
```

---

## 2. Thiết Kế Cơ Sở Dữ Liệu (PostgreSQL Schema)

Sử dụng cơ sở dữ liệu **PostgreSQL** để có khả năng mở rộng tốt hơn, lưu trữ dữ liệu tập trung cho nhiều dự án. Cấu hình kết nối thông qua biến môi trường `DATABASE_URL`.

### Bảng `sessions` (Quản lý phiên chat)
*   `id` (TEXT, Khóa chính) - Mã định danh phiên chat (UUID).
*   `project_id` (VARCHAR(100)) - Định danh dự án (Ví dụ: `pastie-landingpage`).
*   `visitor_name` (VARCHAR(255))
*   `visitor_email` (VARCHAR(255))
*   `detected_language` (VARCHAR(10)) - Ngôn ngữ AI tự phát hiện.
*   `ai_summary` (TEXT) - Tóm tắt hội thoại tự động bằng AI.
*   `intent_tags` (TEXT) - Danh sách các thẻ ý định ngăn cách bằng dấu phẩy.
*   `is_verified` (BOOLEAN, Default FALSE) - Trạng thái xác thực OTP.
*   `status` (VARCHAR(20), Default 'active') - Trạng thái phiên chat (`active`, `closed`).
*   `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### Bảng `messages` (Chi tiết tin nhắn)
*   `id` (SERIAL, Khóa chính)
*   `session_id` (TEXT, Khóa ngoại) - Liên kết với `sessions(id)` ON DELETE CASCADE.
*   `sender` (VARCHAR(20)) - Người gửi (`visitor`, `agent`, `system`).
*   `original_text` (TEXT) - Tin nhắn gốc.
*   `translated_text` (TEXT) - Tin nhắn đã dịch qua AI.
*   `language` (VARCHAR(10)) - Ngôn ngữ của tin nhắn gốc.
*   `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

### Bảng `otps` (Lưu mã OTP tạm thời)
*   `email` (VARCHAR(255), Khóa chính)
*   `code` (VARCHAR(10)) - Mã OTP 6 số.
*   `expires_at` (TIMESTAMP) - Thời gian hết hạn mã.

---

## 3. Danh Sách Các File Sẽ Tạo Mới trong `backend/`

Chúng ta sẽ tạo một thư mục độc lập `backend` trong dự án:

#### 1. [NEW] [package.json](file:///f:/PastiePorfolio/pastie-landingpage/backend/package.json)
*   Khai báo dependencies: `express`, `cors`, `dotenv`, `pg`, `@google/generative-ai`, `resend`.

#### 2. [NEW] [database.js](file:///f:/PastiePorfolio/pastie-landingpage/backend/database.js)
*   Khởi tạo Connection Pool kết nối tới PostgreSQL sử dụng gói `pg`.
*   Tự động chạy các câu lệnh SQL để tạo bảng nếu chúng chưa tồn tại trong cơ sở dữ liệu khi server khởi chạy.
*   Cung cấp các hàm Helper để Thêm/Sửa/Xóa/Truy vấn dữ liệu.

#### 3. [NEW] [gemini-helper.js](file:///f:/PastiePorfolio/pastie-landingpage/backend/gemini-helper.js)
*   Chứa logic kết nối với **Gemini AI API** (`gemini-1.5-flash`).
*   Hàm dịch thuật 2 chiều (tự động phát hiện ngôn ngữ nguồn và dịch sang ngôn ngữ đích).
*   Hàm phân tích hội thoại để tự động gắn thẻ ý định (`intent_tags`) và tóm tắt (`ai_summary`).

#### 4. [NEW] [resend-helper.js](file:///f:/PastiePorfolio/pastie-landingpage/backend/resend-helper.js)
*   Kết nối với **Resend API** để gửi email chứa mã OTP xác nhận tới khách hàng.

#### 5. [NEW] [server.js](file:///f:/PastiePorfolio/pastie-landingpage/backend/server.js)
*   Khởi chạy server Express.
*   Cung cấp các API endpoint cho Client (Widget Chat) và Admin:
    *   `POST /api/otp/send`: Gửi OTP.
    *   `POST /api/otp/verify`: Xác thực OTP và kích hoạt phiên chat.
    *   `POST /api/chats/message`: Gửi tin nhắn mới (Tự động dịch qua Gemini và lưu vào DB).
    *   `GET /api/admin/chats`: Lấy danh sách các phiên chat (Lọc theo `project_id`).
    *   `GET /api/admin/chats/:sessionId/messages`: Lấy lịch sử tin nhắn của phiên chat.
    *   `GET /api/admin/export`: Xuất dữ liệu dưới dạng JSONL hoặc CSV phục vụ học máy/lập kịch bản.

#### 6. [NEW] [.env.example](file:///f:/PastiePorfolio/pastie-landingpage/backend/.env.example) & [.env](file:///f:/PastiePorfolio/pastie-landingpage/backend/.env)
*   Lưu các biến môi trường: `DATABASE_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, `PORT`.

#### 7. [NEW] [README.md](file:///f:/PastiePorfolio/pastie-landingpage/backend/README.md)
*   Hướng dẫn chạy backend chi tiết từ A-Z, cách lấy API Key Gemini và Resend, cách tạo và kết nối database Postgres (ví dụ qua Supabase, Neon hoặc Postgres Local).

---

## 4. Kế Hoạch Xác Minh (Verification Plan)

### Automated/Manual Tests:
1.  **Kiểm thử cục bộ (Local Run):** Chạy lệnh `npm install` và `npm start` trong thư mục `backend/` để kiểm tra khởi tạo SQLite thành công và server lắng nghe trên cổng `3000`.
2.  **Kiểm tra API OTP & Resend:** Sử dụng Postman hoặc Curl để gọi thử `/api/otp/send`, xác nhận email OTP gửi về hòm thư thành công.
3.  **Kiểm tra API Gemini Translation:** Gửi tin nhắn tiếng Nga/Anh qua `/api/chats/message`, xác nhận API trả về chuỗi đã dịch sang tiếng Việt chính xác và lưu vào DB.
4.  **Kiểm tra Export:** Gọi API `/api/admin/export`, kiểm tra định dạng dữ liệu đầu ra có đúng chuẩn JSONL (ChatML) để huấn luyện AI hay không.
