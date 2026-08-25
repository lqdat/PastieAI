# Pastie Chat Widget

Widget được đóng gói dạng script tự chèn toàn bộ giao diện và CSS; website tích hợp không cần cài package hay import stylesheet.

## Tích hợp

Chèn đoạn sau ngay trước thẻ `</body>`. Thay `data-project` bằng ID dự án đã tạo trong Dashboard.

```html
<script
  src="https://dashboard.pastie.vn/widget/v1.js"
  data-project="ten-project-cua-ban"
  async
></script>
```

Nếu CDN/widget được host ở một domain khác backend, chỉ định backend API rõ ràng:

```html
<script
  src="https://cdn.example.com/pastie-chat.js"
  data-backend="https://dashboard.pastie.vn"
  data-project="ten-project-cua-ban"
  async
></script>
```

`data-project` quyết định tenant và lịch sử hội thoại. Session của widget được cô lập theo project trong `sessionStorage`, nên nhiều website dùng chung một trình duyệt sẽ không lẫn phiên chat.

## Nhận diện người dùng đã đăng nhập (tuỳ chọn)

Gọi sau khi script tải, hoặc phát event để không phải chờ thứ tự tải script:

```js
window.dispatchEvent(new CustomEvent('pastie:identify', {
  detail: { name: 'Nguyễn Văn A', email: 'a@example.com' }
}));
```

Ngôn ngữ có thể đổi bằng event `pastie:setlang`, với `detail` là `vi`, `en`, `ru` hoặc `zh`.

## Phát hành

Hai file cần được public cùng backend là `pastie-chat.js` (loader) và `chat-widget.js` (widget lõi). Backend đã cung cấp URL ổn định `/widget/v1.js`; không đổi URL này khi cập nhật widget để các website nhúng tự nhận phiên bản mới.
