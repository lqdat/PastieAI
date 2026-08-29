# Kế hoạch phân cấp Agent – Sale – Nhóm – QR

## 1. Phạm vi

Flow mới chỉ áp dụng cho project loại `qr_concierge`.

- `DealPhuQuoc` giữ nguyên flow hiện tại.
- `Pastie Landing` giữ nguyên flow hiện tại.
- Các tài khoản có role `agent` hiện tại trong QR Concierge sẽ được chuyển thành `sale`.
- Tạo role `agent` mới làm cấp quản lý Sale.
- Khung giờ áp dụng lặp lại hằng ngày, không cấu hình theo thứ hoặc ngày cụ thể.

## 2. Phân cấp role

| Role | Trách nhiệm |
|---|---|
| `superadmin` | Tạo Agent, gắn project và thiết lập giờ đăng nhập cho Agent |
| `agent` | Quản lý Sale, nhóm, QR, giờ đăng nhập và giờ nhận chat |
| `sale` | Tiếp nhận và trả lời chat của các nhóm được phân quyền |

### Superadmin

- Tạo tài khoản Agent bằng email.
- Đặt tên Agent.
- Gắn Agent vào project.
- Thiết lập giờ Agent được đăng nhập.
- Khóa hoặc mở tài khoản Agent.
- Agent không được tự sửa tên, email, role hoặc project.

### Agent

- Tạo tài khoản Sale bằng email.
- Đặt và sửa tên hiển thị của Sale.
- Khóa hoặc mở tài khoản Sale.
- Thiết lập giờ Sale được đăng nhập.
- Tạo nhóm và thêm Sale vào nhóm.
- Thiết lập giờ Sale nhận chat trong từng nhóm.
- Tạo QR, đặt tên QR và chọn nhóm tiếp nhận.
- Theo dõi, phân công hoặc chuyển chat giữa các Sale.

### Sale

- Đăng nhập bằng OTP email hoặc Google.
- Chỉ thấy chat thuộc nhóm được phân quyền và đúng khung giờ.
- Tiếp nhận và trả lời chat.
- Không được sửa tên hiển thị, giờ làm việc, nhóm hoặc QR.
- Không được truy cập cài đặt project.

## 3. Cấu trúc tổ chức

```text
Project QR Concierge
└── Agent
    ├── Nhóm Lễ tân
    │   ├── Sale An
    │   ├── Sale Bình
    │   ├── QR: Bàn 1
    │   └── QR: Bàn 2
    └── Nhóm Phòng
        ├── Sale Cường
        └── QR: Phòng 1
```

Quy tắc:

- Một Agent quản lý nhiều nhóm.
- Một nhóm có nhiều Sale.
- Một Sale có thể thuộc nhiều nhóm.
- Mỗi QR thuộc đúng một nhóm.
- QR có thể có một Sale ưu tiên.
- Agent chỉ quản lý dữ liệu thuộc phạm vi của mình.

## 4. Tài khoản Agent và Sale

### Tạo Agent

Superadmin nhập:

- Tên Agent.
- Email đăng nhập.
- Project.
- Giờ bắt đầu đăng nhập.
- Giờ kết thúc đăng nhập.
- Trạng thái hoạt động.

Agent chỉ xem tên của mình, không được chỉnh sửa.

### Tạo Sale

Agent nhập:

- Email Sale.
- Tên hiển thị.
- Giờ bắt đầu đăng nhập.
- Giờ kết thúc đăng nhập.
- Nhóm tham gia.
- Trạng thái hoạt động.

Sale đăng nhập bằng OTP email hoặc Google, không sử dụng mật khẩu.

## 5. Quản lý nhóm

Agent có thể:

- Tạo nhóm.
- Đổi tên nhóm.
- Thêm hoặc xóa Sale khỏi nhóm.
- Thiết lập giờ nhận chat của từng Sale trong nhóm.
- Xem số chat đang chờ, đang xử lý và đã đóng.

Ví dụ:

```text
Nhóm Lễ tân
- Sale An: 08:00–14:00
- Sale Bình: 14:00–22:00
```

## 6. Quản lý QR

Khi tạo QR, Agent nhập:

- Nhóm tiếp nhận.
- Tên QR: `Bàn 1`, `Phòng 1`, `Quầy 2`...
- Sale ưu tiên, không bắt buộc.
- Trạng thái hoạt động.

Tên nhận diện đầy đủ nếu có Sale ưu tiên:

```text
Hộ kinh doanh Test · Sale Nguyễn An · Bàn 1
```

Nếu không có Sale ưu tiên:

```text
Hộ kinh doanh Test · Nhóm Lễ tân · Bàn 1
```

Poster QR gồm:

- Logo Pastie.
- Tên hộ kinh doanh.
- Tên Sale hoặc tên nhóm.
- Tên QR.
- Câu mời quét mã bằng tiếng Việt và tiếng Anh.
- Mã QR.

## 7. Khung giờ đăng nhập

Chỉ cấu hình giờ bắt đầu và giờ kết thúc, áp dụng lặp lại hằng ngày.

Ví dụ:

```text
Agent A: 07:00–22:00
Sale A:  08:00–17:00
Sale B:  14:00–23:00
```

Một tài khoản có thể có nhiều khung giờ:

```text
08:00–12:00
13:30–18:00
```

Không có cấu hình:

- Thứ trong tuần.
- Ngày cụ thể.
- Lịch nghỉ.
- Lịch theo tháng.

Timezone mặc định:

```text
Asia/Bangkok
```

### Ca qua nửa đêm

Phải hỗ trợ khung giờ như `18:00–02:00`.

```text
Nếu start_time < end_time:
    hợp lệ khi start_time <= giờ hiện tại < end_time

Nếu start_time > end_time:
    hợp lệ khi giờ hiện tại >= start_time
    hoặc giờ hiện tại < end_time
```

## 8. Kiểm soát đăng nhập và tự đăng xuất

Backend kiểm tra khung giờ trước khi cấp token.

Ngoài giờ, không cấp token và trả thông báo:

```text
Tài khoản của bạn chỉ được phép đăng nhập từ 08:00 đến 17:00.
```

Backend tiếp tục kiểm tra giờ tại các thao tác:

- Tải danh sách chat.
- Mở cuộc chat.
- Gửi tin nhắn.
- Tiếp nhận chat.
- Upload file.
- Tạo hóa đơn.
- Đăng ký notification.

Khi hết giờ:

1. Token bị vô hiệu hóa.
2. Dashboard hiển thị thông báo hết ca.
3. Tài khoản tự đăng xuất.
4. Sale không nhận chat mới.
5. Chat chưa tiếp nhận vẫn nằm trong hàng đợi nhóm.
6. Chat đang xử lý có thể được cho thêm 10 phút đệm hoặc trả lại nhóm.

## 9. Giờ nhận chat theo nhóm

Giờ đăng nhập và giờ nhận chat theo nhóm là hai lớp kiểm tra riêng.

Ví dụ:

```text
Sale An
- Giờ đăng nhập: 08:00–22:00
- Nhóm Lễ tân: 08:00–14:00
- Nhóm Phòng: 14:00–22:00
```

Sale chỉ nhận chat khi đồng thời:

- Tài khoản đang hoạt động.
- Đang trong giờ đăng nhập.
- Thuộc nhóm của QR.
- Đang trong giờ nhận chat của nhóm.
- Có phiên đăng nhập hợp lệ.

## 10. Flow khách quét QR

```text
Khách quét QR
→ Chọn ngôn ngữ
→ Đăng nhập OTP/Google
→ Tạo session chat mới
→ Xác định nhóm từ QR
→ Tìm Sale đang trong khung giờ
→ Đưa chat vào hàng đợi nhóm
→ Gửi notification cho Sale đủ điều kiện
```

Quy tắc session:

- Mỗi lần đăng nhập QR là một cuộc chat mới.
- Quét QR khác sẽ đóng session QR cũ của khách.
- Hết 15 phút không hoạt động thì session chuyển sang `closed`.
- Khách không thấy tin nhắn của session cũ.
- Agent và Sale vẫn có thể tra cứu lịch sử đã đóng.

## 11. Phân phối và tiếp nhận chat

1. Chat mới xuất hiện cho các Sale đủ điều kiện trong nhóm.
2. Các Sale đủ điều kiện nhận notification.
3. Một Sale nhấn `Tiếp nhận`.
4. Backend claim nguyên tử để chỉ một Sale nhận được chat.
5. Sale khác thấy trạng thái `Đã có người tiếp nhận`.
6. Agent có thể chuyển chat sang Sale khác.

Ví dụ claim nguyên tử:

```sql
UPDATE sessions
SET assigned_admin_id = :sale_id,
    routing_status = 'assigned'
WHERE id = :session_id
  AND assigned_admin_id IS NULL
  AND routing_status = 'waiting'
RETURNING id;
```

## 12. Sale ưu tiên của QR

Nếu QR có Sale ưu tiên:

1. Kiểm tra Sale đang trong giờ đăng nhập.
2. Kiểm tra Sale đang trong giờ nhận chat của nhóm.
3. Nếu hợp lệ, ưu tiên notification cho Sale đó.
4. Nếu không hợp lệ, đưa chat vào hàng đợi chung của nhóm.

Khách không bị chặn khi Sale ưu tiên ngoài giờ.

## 13. Khi không có Sale trong giờ

- Chat vẫn được tạo.
- Khách thấy trạng thái `Đang chờ tư vấn viên`.
- Agent quản lý nhận notification.
- Khi Sale vào đúng giờ, chat xuất hiện trong hàng đợi.
- Agent có thể xử lý hoặc phân công thủ công.

## 14. Database đề xuất

### Mở rộng bảng `admins`

```text
role
managed_by_admin_id
display_name
is_active
```

### Bảng nhóm

```text
agent_groups
- id
- project_id
- agent_id
- name
- description
- is_active
- created_at
```

### Thành viên nhóm

```text
agent_group_sales
- group_id
- sale_id
- is_active
- created_at
```

### Giờ đăng nhập

```text
account_access_hours
- id
- admin_id
- start_time
- end_time
- timezone
- is_active
```

### Giờ Sale nhận chat theo nhóm

```text
group_sale_hours
- id
- group_id
- sale_id
- start_time
- end_time
- priority
- is_active
```

### Mở rộng bảng `qr_chat_accounts`

```text
group_id
preferred_sale_id
display_label
created_by_admin_id
```

### Mở rộng bảng `sessions`

```text
group_id
preferred_sale_id
assigned_admin_id
routing_status
```

Giá trị `routing_status`:

```text
waiting
assigned
closed
```

## 15. Giao diện Superadmin

### Danh sách Agent

- Tên Agent.
- Email.
- Project.
- Giờ đăng nhập.
- Số Sale quản lý.
- Số nhóm.
- Trạng thái.

### Form tạo Agent

- Tên Agent.
- Email.
- Project.
- Giờ bắt đầu.
- Giờ kết thúc.
- Trạng thái.

Không có mật khẩu.

## 16. Giao diện Agent

### Sale

- Tạo Sale.
- Đặt tên hiển thị.
- Email.
- Giờ đăng nhập.
- Nhóm tham gia.
- Online/offline.
- Khóa/mở.

### Nhóm

- Tạo hoặc đổi tên nhóm.
- Thêm/xóa Sale.
- Thiết lập giờ Sale nhận chat.
- Xem số chat đang chờ.

### QR

- Chọn nhóm.
- Chọn Sale ưu tiên.
- Nhập tên QR.
- Xem và tải poster.
- Thu hồi QR.

### Chat

- Chat đang chờ.
- Chat đang xử lý.
- Chat đã đóng.
- Phân công hoặc chuyển Sale.

## 17. Giao diện Sale

Sale chỉ thấy:

- Chat thuộc nhóm trong giờ được phân.
- Chat đang chờ.
- Chat đang xử lý.
- Chat đã đóng.
- Notification.
- Thông tin tài khoản dạng chỉ đọc.

Sale không thấy:

- Quản lý tài khoản.
- Tạo nhóm.
- Tạo QR.
- Cấu hình project.
- Chỉnh tên.
- Chỉnh giờ làm việc.

## 18. API đề xuất

```text
POST   /api/superadmin/agents
GET    /api/superadmin/agents
PUT    /api/superadmin/agents/:agentId

POST   /api/agent/sales
GET    /api/agent/sales
PUT    /api/agent/sales/:saleId
PATCH  /api/agent/sales/:saleId/status

POST   /api/agent/groups
GET    /api/agent/groups
PUT    /api/agent/groups/:groupId
DELETE /api/agent/groups/:groupId

POST   /api/agent/groups/:groupId/sales
DELETE /api/agent/groups/:groupId/sales/:saleId

PUT    /api/agent/accounts/:accountId/access-hours
PUT    /api/agent/groups/:groupId/sales/:saleId/hours

POST   /api/agent/qr-accounts
GET    /api/agent/qr-accounts
PUT    /api/agent/qr-accounts/:qrId
POST   /api/agent/qr-accounts/:qrId/revoke

POST   /api/chats/:sessionId/claim
POST   /api/chats/:sessionId/transfer
```

Mọi API phải kiểm tra quyền ở backend, không chỉ ẩn chức năng ở frontend.

## 19. Migration dữ liệu hiện tại

1. Đổi role `agent` hiện tại thành `sale`.
2. Giữ nguyên email, tên, QR và lịch sử chat.
3. Tạo `Nhóm mặc định` cho dữ liệu cũ.
4. Đưa Sale cũ vào nhóm mặc định.
5. Gắn QR hiện tại vào nhóm mặc định.
6. Superadmin tạo Agent mới.
7. Chuyển Sale và nhóm mặc định sang Agent mới.
8. Đặt giờ mặc định `00:00–23:59` để không khóa nhầm tài khoản.
9. Superadmin và Agent cập nhật giờ chính xác sau migration.

## 20. Thứ tự triển khai

1. Migration role `agent` hiện tại thành `sale`.
2. Thêm role Agent quản lý.
3. Tạo bảng nhóm và thành viên.
4. Tạo bảng giờ đăng nhập.
5. Thêm middleware kiểm tra giờ.
6. Thêm cơ chế tự đăng xuất khi hết giờ.
7. Tạo bảng giờ Sale nhận chat theo nhóm.
8. Gắn QR vào nhóm và Sale ưu tiên.
9. Routing chat theo nhóm và giờ.
10. Claim chat nguyên tử.
11. Xây dựng giao diện Superadmin.
12. Xây dựng giao diện Agent.
13. Giới hạn giao diện Sale.
14. Migration dữ liệu cũ.
15. Kiểm thử OTP, Google, session, routing, notification và phân quyền.

## 21. Tiêu chí hoàn thành

- Agent chỉ quản lý Sale, nhóm và QR thuộc phạm vi của mình.
- Sale ngoài giờ không thể đăng nhập hoặc nhận chat.
- Một chat chỉ có một Sale được quyền xử lý tại một thời điểm.
- QR luôn chuyển chat vào đúng nhóm.
- Sale ưu tiên ngoài giờ không làm khách bị chặn.
- Khách không thấy lịch sử của session QR cũ.
- Agent và Sale có quyền vẫn tra cứu được lịch sử đã đóng.
- Flow của DealPhuQuoc và Pastie Landing không bị ảnh hưởng.
