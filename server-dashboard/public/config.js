// Địa chỉ backend của bảng điều khiển.
//
// null = dùng chính origin của trang. Đó là trường hợp mặc định: backend phục
// vụ luôn trang này nên origin của trang chính là backend.
//
// Khi deploy dashboard ở domain riêng, scripts/build.js GHI ĐÈ file này trong
// dist/ bằng giá trị lấy từ biến môi trường PASTIE_API_BASE. Đừng sửa tay ở đây
// để cấu hình production — sửa biến môi trường.
//
// File này tồn tại sẵn (thay vì chỉ sinh lúc build) để bản chạy kèm backend
// không bị 404 config.js trong console mỗi lần tải trang.
window.PASTIE_API_BASE = null;
