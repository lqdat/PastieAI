// MÀN CẤU HÌNH NHÃN PHẢI NẰM Ở CONSOLE SUPERADMIN, KHÔNG Ở BẢNG AGENT/SALE.
//
// Đây là lỗi đã thật sự xảy ra: tôi thêm tab "Nhãn sản phẩm" vào
// pastie-dashboard/src (bảng điều khiển Agent & Sale) thay vì
// server-dashboard/public (console Superadmin). Tab ẩn theo vai trò nên không
// ai báo lỗi — chỉ đơn giản là Superadmin đăng nhập vào console của mình và
// không tìm thấy chỗ tạo nhãn.
//
// Quy tắc 4 trong docs/CODEBASE.md nói rõ HAI GIAO DIỆN ĐỘC LẬP và cố ý KHÔNG
// đồng bộ. Bài này biến quy tắc đó thành một phép đo: thứ của Superadmin chỉ
// được nằm bên Superadmin, thứ của Agent chỉ được nằm bên Agent.
const fs = require('fs');
const path = require('path');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

// Hai kho, tìm theo bố cục thật rồi rơi về bản sao cục bộ khi chạy ở máy khác.
function timKho(...duongDan) {
  return duongDan.find((p) => fs.existsSync(p)) || null;
}
const KHO_SA = timKho(
  path.join(__dirname, '..', 'server-dashboard', 'public'),
  path.join(__dirname, '..', '..', 'server-dashboard', 'public'),
  __dirname,
);
const KHO_AGENT = timKho(
  path.join(__dirname, '..', 'pastie-dashboard', 'src'),
  path.join(__dirname, '..', '..', 'pastie-dashboard', 'src'),
  path.join(__dirname, '..', 'g2ui', 'dev'),
  path.join(__dirname, '..', '..', 'g2ui', 'dev'),
);

check('tìm thấy console Superadmin', Boolean(KHO_SA), 'server-dashboard/public');
check('tìm thấy bảng điều khiển Agent/Sale', Boolean(KHO_AGENT), 'pastie-dashboard/src');
if (!KHO_SA || !KHO_AGENT) { console.log('\nThiếu kho để đối chiếu.'); process.exit(1); }

const doc = (kho, ten) => {
  const p = path.join(kho, ten);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
};

const saHtml = doc(KHO_SA, 'admin.html');
const saJs = doc(KHO_SA, 'admin.js');
const saOrg = doc(KHO_SA, 'org-console.js');
const saCss = doc(KHO_SA, 'admin.css');

const agHtml = doc(KHO_AGENT, 'admin.html');
const agJs = doc(KHO_AGENT, 'admin.js');
const agOrg = doc(KHO_AGENT, 'org-console.js');

// ── 1. BÊN SUPERADMIN PHẢI CÓ ĐỦ ─────────────────────────────────────────
check('console Superadmin CÓ tab "Nhãn sản phẩm"',
  saHtml.includes('data-org-tab="tags"'),
  'thiếu thì Superadmin không tìm thấy chỗ tạo nhãn — đúng lỗi đã xảy ra');
check('console Superadmin có khung nội dung của tab đó',
  saHtml.includes('data-org-pane="tags"'));
check('… kèm form tạo/sửa nhãn', saHtml.includes('id="org-tag-form"') && saHtml.includes('id="org-tag-label"'));
check('… kèm ô chọn màu nền và màu chữ',
  saHtml.includes('id="org-tag-color-bg"') && saHtml.includes('id="org-tag-color-text"'));
check('… kèm chỗ hiện danh sách nhãn', saHtml.includes('id="org-tag-list"'));

check('console Superadmin nạp danh sách nhãn khi mở tab',
  /if \(name === 'tags'\) void loadOrgTags/.test(saOrg));
check('… và có hàm vẽ danh sách nhãn', /async function loadOrgTags/.test(saOrg));
check('… gọi đúng đường API của Superadmin',
  saOrg.includes("orgFetch('/api/superadmin/menu-tags')"));
check('… hiện ĐỦ các bản dịch của từng nhãn',
  /tag\.translations \|\| \[\]/.test(saOrg),
  'không nhìn được bản dịch thì một bản sai nằm trên góc ảnh sản phẩm hàng tháng');
check('… phân biệt bản sửa tay với bản máy dịch',
  /is-manual/.test(saOrg) && /is-manual/.test(saCss),
  'người cấu hình cần biết vì sao sửa nhãn gốc mà bản này không đổi');

check('console Superadmin xử lý được sửa / bật tắt / xoá nhãn',
  saJs.includes('data-tag-edit') && saJs.includes('data-tag-toggle') && saJs.includes('data-tag-delete'));
check('… khoá nút Lưu trong lúc dịch',
  /nut\.disabled = true/.test(saJs),
  'lưu là dịch ngay 6 thứ tiếng, không khoá thì bấm hai lần ra hai nhãn trùng');
check('… cảnh báo số sản phẩm sẽ mất nhãn trước khi xoá',
  /sản phẩm đang gắn nhãn sẽ mất nhãn/.test(saJs));
check('console Superadmin có kiểu hiển thị cho thẻ nhãn', /\.tag-card\{/.test(saCss));

// ── 2. BÊN AGENT/SALE TUYỆT ĐỐI KHÔNG ĐƯỢC CÓ ────────────────────────────
//
// Không phải vì nguy hiểm — máy chủ đã chặn bằng requireSuperAdmin — mà vì đó
// là mã chết nằm nhầm nhà: hai giao diện cố ý độc lập, để lẫn vào nhau thì lần
// sau sửa một bên quên bên kia.
check('bảng Agent/Sale KHÔNG có tab cấu hình nhãn',
  !agHtml.includes('data-org-tab="tags"'),
  'cấu hình nhãn là việc của Superadmin — xem quy tắc 4 trong CODEBASE.md');
check('bảng Agent/Sale KHÔNG có form cấu hình nhãn',
  !agHtml.includes('id="org-tag-form"'));
check('bảng Agent/Sale KHÔNG nạp danh mục nhãn kiểu Superadmin',
  !/loadOrgTags/.test(agOrg) && !/superadmin\/menu-tags/.test(agJs + agOrg));

// ── 3. NHƯNG AGENT VẪN PHẢI CHỌN ĐƯỢC NHÃN CHO SẢN PHẨM ─────────────────
//
// Ranh giới đúng: Superadmin ĐẶT danh mục, Agent CHỌN. Gỡ nhầm cả phần chọn
// thì Agent không gắn được nhãn nào cho sản phẩm của mình.
const agMenu = doc(KHO_AGENT, 'menu-console.js');
check('bảng Agent VẪN có ô chọn nhãn trong form sản phẩm',
  agHtml.includes('id="menu-item-tags"') && /veOChonTag/.test(agMenu),
  'Superadmin ĐẶT danh mục, Agent CHỌN — gỡ nhầm phần chọn là Agent bó tay');
check('… và gọi đúng đường API dành cho Agent',
  agMenu.includes("orgFetch('/api/agent/menu-tags')"));

// ── 4. CHỮ TRÊN NÚT PHÂN QUYỀN THU TIỀN ─────────────────────────────────
check('nút dùng chữ "Phân quyền thu tiền"',
  agOrg.includes('Phân quyền thu tiền'), 'chữ cũ là "Trao thu tiền"');
check('không còn sót chữ cũ', !/Trao thu tiền/.test(agOrg + agJs));

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
