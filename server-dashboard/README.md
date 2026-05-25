# Pastie AI Chat - Server & Dashboard

Dự án này là hệ thống **Backend REST API** tích hợp **Cơ sở dữ liệu PostgreSQL**, dịch vụ dịch thuật tự động qua **Gemini AI**, xác thực mã OTP email qua **Resend API**, và giao diện **Admin Dashboard** dạng Glassmorphism để nhân viên hỗ trợ trực tiếp.

Hệ thống được thiết kế dạng **Multi-tenant**, cho phép tích hợp và phân biệt lịch sử chat của nhiều trang web (dự án) khác nhau thông qua khoá `project_id`.

---

## 1. Yêu Cầu Hệ Thống

*   **Node.js** phiên bản v18 trở lên.
*   Một cơ sở dữ liệu **PostgreSQL** hoạt động (Có thể dùng Postgres chạy Local hoặc nhà cung cấp đám mây miễn phí như [Supabase](https://supabase.com) hoặc [Neon](https://neon.tech)).
*   **Gemini AI API Key** (Miễn phí từ Google AI Studio).
*   **Resend API Key** (Miễn phí gửi email).

---

## 2. Hướng Dẫn Cách Lấy Các API Key Cần Thiết

### A. Lấy Gemini AI API Key (Dịch thuật & Phân tích hội thoại)
1.  Truy cập vào trang chủ **Google AI Studio**: [https://aistudio.google.com/](https://aistudio.google.com/)
2.  Đăng nhập bằng tài khoản Google của bạn.
3.  Click vào nút **"Get API Key"** ở góc phía trên bên trái.
4.  Chọn **"Create API Key"**, sau đó chọn dự án và nhấn tạo.
5.  Sao chép khoá API được cấp (Bắt đầu bằng `AIzaSy...`) và lưu vào cấu hình biến môi trường `GEMINI_API_KEY`.

### B. Lấy Resend API Key (Gửi email mã OTP xác thực)
1.  Truy cập vào trang chủ **Resend**: [https://resend.com/](https://resend.com/)
2.  Tạo tài khoản và truy cập vào trang quản trị.
3.  Click chọn mục **"API Keys"** bên trái thanh menu.
4.  Nhấp vào **"Create API Key"**, đặt tên cho API Key và phân quyền gửi thư.
5.  Sao chép khoá API (Bắt đầu bằng `re_...`) và lưu vào cấu hình `RESEND_API_KEY`.
6.  *Lưu ý về tên miền người gửi (Sender Email):*
    *   Mặc định, bạn có thể kiểm thử bằng cách dùng hòm thư mặc định: `onboarding@resend.dev`. Hòm thư này chỉ có thể gửi thử nghiệm đến chính email đăng ký của bạn.
    *   Để gửi tới khách hàng bất kỳ, hãy vào mục **"Domains"** trên Resend, thêm tên miền của bạn (ví dụ: `myportfolio.com`) và xác minh các bản ghi DNS (TXT, MX) theo hướng dẫn của Resend. Sau đó, thay đổi cấu hình `SENDER_EMAIL=support@myportfolio.com`.

### C. Thiết Lập Cơ Sở Dữ Liệu PostgreSQL (Ví dụ dùng Supabase)
1.  Truy cập **[Supabase](https://supabase.com/)** và tạo một Project mới.
2.  Sau khi project được tạo thành công, chọn mục **"Settings"** (Hình răng cưa) -> **"Database"**.
3.  Tìm phần **"Connection string"** -> chọn mục **"URI"**.
4.  Sao chép chuỗi kết nối và thay thế `[YOUR-PASSWORD]` bằng mật khẩu database bạn đã tạo.
5.  Lưu chuỗi này vào cấu hình `DATABASE_URL` trong file `.env`. (Hệ thống sẽ tự động khởi tạo các bảng `sessions`, `messages`, `otps` khi chạy server lần đầu).

---

## 3. Cài Đặt và Khởi Chạy Backend

1.  Mở terminal và di chuyển vào thư mục `server-dashboard`:
    ```bash
    cd F:\PastiePorfolio\pastieBE_AI\server-dashboard
    ```

2.  Sao chép file `.env.example` thành `.env`:
    ```bash
    copy .env.example .env
    ```

3.  Mở file `.env` lên và điền các thông tin API Key của bạn:
    ```env
    PORT=3000
    DATABASE_URL=postgres://postgres:mật_khẩu_của_bạn@db.supabase.co:5432/postgres
    GEMINI_API_KEY=AIzaSy...
    RESEND_API_KEY=re_...
    SENDER_EMAIL=onboarding@resend.dev
    ADMIN_PASSWORD=mật_khẩu_để_vào_admin_ở_đây
    ```

4.  Cài đặt các gói thư viện phụ thuộc:
    ```bash
    npm install
    ```

5.  Khởi chạy server ở chế độ Production:
    ```bash
    npm start
    ```
    Hoặc chế độ Dev (tự động tải lại khi chỉnh sửa mã nguồn):
    ```bash
    npm run dev
    ```

6.  Truy cập vào trang quản trị để trả lời khách hàng:
    *   Mở trình duyệt truy cập: `http://localhost:3000/admin.html`
    *   Nhập mật khẩu bạn đã cấu hình tại biến `ADMIN_PASSWORD` trong `.env` để đăng nhập.

---

## 4. Cấu Trúc Bảng Dữ Liệu Tạo Tự Động
Khi server chạy, nó sẽ tự động tạo 3 bảng chính trong PostgreSQL:
*   `sessions`: Quản lý các phòng chat, trạng thái đóng/mở, tóm tắt cuộc hội thoại do Gemini phân tích, gắn tag phân loại tự động.
*   `messages`: Lưu lịch sử tin nhắn song ngữ (Tiếng Anh/Nga/Trung... và Tiếng Việt đã dịch tương ứng).
*   `otps`: Lưu trữ tạm thời các mã số xác thực email của khách hàng để kích hoạt chat trực tiếp.
