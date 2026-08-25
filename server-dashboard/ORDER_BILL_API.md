# API mẫu: đơn hàng và hóa đơn cho QR Chat

Tài liệu này là hợp đồng thử nghiệm giữa QR Chat và phần mềm lên đơn/bill. Hiện tại API dùng token đăng nhập của Agent/Admin (`Authorization: Bearer <token>`). Khi kết nối phần mềm bill thực tế, có thể thay bằng API key riêng mà không cần đổi dữ liệu phía khách.

## Luồng trạng thái

`awaiting_payment` → khách chọn `cash`, `bank_qr` hoặc `card` → Agent xác nhận tiền → `paid` → khách **Mua tiếp** hoặc **Kết thúc**.

Khi khách kết thúc, API xoá order và message của phiên QR, sau đó đóng session. Quét lại QR sẽ có cuộc trò chuyện mới.

## 1. Agent tạo đơn mẫu

`POST /api/admin/orders`

```json
{
  "sessionId": "uuid-cua-phien-chat",
  "items": [
    { "name": "Nước suối", "quantity": 2, "unitPrice": 10000 }
  ]
}
```

API tự tính `total_amount`, trả về order kèm `invoice` JSON. `invoice.html` là HTML có thể render trực tiếp trong bubble chat; `pngUrl` và `pdfUrl` ban đầu là `null` để dành cho phần mềm bill.

## 2. Phần mềm bill thay thế/gắn hóa đơn thật

`PUT /api/admin/orders/:orderId/invoice`

```json
{
  "totalAmount": 20000,
  "items": [
    { "sku": "WATER-500", "name": "Nước suối", "quantity": 2, "unitPrice": 10000, "lineTotal": 20000 }
  ],
  "invoice": {
    "invoiceNo": "POS-20260825-001",
    "currency": "VND",
    "totalAmount": 20000,
    "html": "<article><h2>Hóa đơn POS-20260825-001</h2>...</article>",
    "pngUrl": "https://billing.example.com/invoices/POS-20260825-001.png",
    "pdfUrl": "https://billing.example.com/invoices/POS-20260825-001.pdf",
    "metadata": { "externalOrderId": "12345" }
  }
}
```

`invoice` có thể chỉ là JSON, HTML, hoặc URL PNG/PDF. Client sẽ ưu tiên URL ảnh/PDF khi triển khai phần hiển thị; không cần nhúng file binary vào database.

## 3. Customer portal đọc order và chọn thanh toán

- `GET /api/chats/:sessionId/order` trả order mới nhất của session đang hoạt động và các phương thức thanh toán.
- `POST /api/chats/:sessionId/order/payment-method`

```json
{ "method": "bank_qr" }
```

Các giá trị hợp lệ: `cash`, `bank_qr`, `card`.

## 4. Agent xác nhận đã nhận tiền

`POST /api/admin/orders/:orderId/received-payment`

```json
{ "reference": "Giao dịch MB 123456" }
```

Kết quả trả `nextAction: "customer_thank_you"`. Frontend dùng tín hiệu này để hiển thị popup cảm ơn, với nút **Mua tiếp** và **Kết thúc**.

## 5. Customer kết thúc

`POST /api/chats/:sessionId/order/finish`

Chỉ chạy sau khi order đã `paid`. API đóng session, xoá toàn bộ tin nhắn và order của session; client xóa token/session local rồi quay về màn hình QR/login.

## Lưu ý tích hợp

- API hiện mới là backend mẫu; giao diện chat chưa render bill hay các nút thanh toán.
- Endpoint khách dựa vào `sessionId` được tạo sau OTP/Google login. Không được ghi sessionId vào log công khai.
- Trước khi mở cho phần mềm bill bên ngoài, nên bổ sung `BILLING_API_KEY`, chữ ký webhook và giới hạn IP thay cho token Agent.
