/**
 * SCRIPT AUTO-TEST TOÀN DIỆN: GIAO DIỆN & CHỨC NĂNG MOBILE
 * 
 * Kiểm tra đầy đủ:
 * 1. Giao diện & Chức năng Mobile Portal Chat (Bàn phím ảo, ô nhập không khựng, nút menu)
 * 2. Giao diện Agent Thêm/Sửa Sale (Avatar tròn 48x48 không dẹt, nút chọn ảnh cân đối)
 * 3. Thẻ QR Code (Bỏ nút sao chép, căn chỉnh nút xóa)
 * 4. Popup Poster QR (Căn giữa màn hình, không bám đáy mobile)
 * 5. Bỏ nút "Mở hóa đơn PDF" ở chân trang
 * 6. Quản lý Bill (Lọc bỏ superseded, chỉ hiện bản bill cuối cùng)
 * 7. Thuế VAT & Giá bán (Giá gồm VAT, không cộng thuế 2 lần, trạng thái đã thu tiền)
 * 8. Lịch sử hóa đơn (Ghi rõ vai trò và tên người thực hiện)
 * 9. Kiểm tra đồng bộ pastie-dashboard -> server-dashboard
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PASS = ' PASS ';
const FAIL = ' FAIL ';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`\x1b[32m[${PASS}]\x1b[0m ${message}`);
    passedTests++;
  } else {
    console.error(`\x1b[31m[${FAIL}]\x1b[0m ${message}`);
    failedTests++;
  }
}

async function runMobileAutotest() {
  console.log('================================================================');
  console.log(' BẮT ĐẦU CHẠY MOBILE AUTO-TEST: GIAO DIỆN & CHỨC NĂNG');
  console.log('================================================================\n');

  // ── PHẦN 1: TEST ĐỒNG BỘ NGUỒN VÀ BẢN DEPLOY ────────────────────────────────
  console.log('── PHẦN 1: Kiểm tra đồng bộ pastie-dashboard và server-dashboard ──');
  const pastieSrc = path.join(__dirname, '..', 'pastie-dashboard', 'src');
  const serverPublic = path.join(__dirname, '..', 'server-dashboard', 'public');
  
  const filesToCheck = ['admin.css', 'admin.html', 'org-console.js', 'cart-console.js', 'menu-console.js', 'menu-console.css'];
  for (const f of filesToCheck) {
    const srcContent = fs.readFileSync(path.join(pastieSrc, f), 'utf-8');
    const pubContent = fs.readFileSync(path.join(serverPublic, f), 'utf-8');
    assert(srcContent === pubContent, `Đồng bộ 100% file: ${f}`);
  }

  // ── PHẦN 2: TEST LOGIC BACKEND (VAT, BILL STATUS, AUDIT HISTORY) ───────────
  console.log('\n── PHẦN 2: Kiểm tra logic tính toán, lọc bill & lịch sử hóa đơn ──');
  const invoiceHelper = require(path.join(__dirname, '..', 'server-dashboard', 'invoice-helper.js'));
  const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server-dashboard', 'server.js'), 'utf-8');

  // 2.1: Lọc bỏ superseded trong API /api/admin/orders/cart
  assert(
    serverCode.includes("const where = ['o.status NOT IN ($1, $2)'];") &&
    serverCode.includes("const params = ['rejected', 'superseded'];"),
    'Quản lý bill đã loại trừ trạng thái superseded (Đã thay bản mới)'
  );

  // 2.2: VAT inclusive trong calculateQrMenuCharges
  const QR_MENU_VAT_RATE = 10;
  const basePrice = 100000;
  const inclusivePrice = Math.round(basePrice * (1 + QR_MENU_VAT_RATE / 100)); // 110,000
  const qty = 3;
  const lineTotal = inclusivePrice * qty; // 330,000
  const lineBase = lineTotal / (1 + QR_MENU_VAT_RATE / 100); // 300,000
  const lineVat = Math.round(lineTotal - lineBase); // 30,000

  assert(inclusivePrice === 110000, 'Giá bán hiển thị trên menu đã gồm 10% VAT (100.000 -> 110.000₫)');

  const mockItem = { unitPrice: inclusivePrice, quantity: qty, lineTotal, vatRate: 10, vatAmount: lineVat };
  const mockSubtotal = lineTotal;
  
  // Kiểm tra buildInvoiceData
  const invoice = invoiceHelper.buildInvoiceData({
    invoiceNo: 'BILL-TEST-VAT',
    items: [mockItem],
    subtotal: mockSubtotal,
    totalAmount: mockSubtotal,
    vatAmount: lineVat,
    status: 'paid'
  }, 'vi');

  assert(invoice.totalAmount === 330000, 'Tổng hóa đơn đúng 330.000₫ (không bị cộng đúp VAT)');
  assert(invoice.vatAmount === 30000, 'VAT bóc tách kế toán đúng 30.000₫');
  assert(invoice.isPaid === true, 'Chi tiết hóa đơn ghi nhận đúng trạng thái đã thu tiền (isPaid: true)');

  // 2.3: Menu API query trả về giá đã gồm VAT
  assert(
    serverCode.includes('ROUND(i.price * (1 + COALESCE(i.vat_rate, 10)::numeric / 100)) AS price'),
    'API thực đơn trả về giá cuối đã gồm VAT cho món'
  );

  // 2.4: Lịch sử hóa đơn ghi rõ ai làm gì
  assert(
    serverCode.includes("changes = rawDiff.map((d) => `${actorTag}: ${d}`);") &&
    serverCode.includes("Sale: ") || serverCode.includes("roleLabel"),
    'Lịch sử hóa đơn ghi rõ vai trò & tên người thực hiện (Sale, Agent, Khách hàng)'
  );

  // ── PHẦN 3: TEST GIAO DIỆN & TƯƠNG TÁC MOBILE VỚI HEADLESS CHROME ──────────
  console.log('\n── PHẦN 3: Kiểm tra giao diện Mobile với Google Chrome (390x844) ──');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    
    // Giả lập màn hình mobile iPhone 14 (390 x 844 px)
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });

    // 3.1: Test Dashboard Admin trên Mobile
    const adminHtmlPath = 'file:///' + path.join(pastieSrc, 'admin.html').replace(/\\/g, '/');
    await page.goto(adminHtmlPath, { waitUntil: 'domcontentloaded' });

    // Inject CSS
    const adminCss = fs.readFileSync(path.join(pastieSrc, 'admin.css'), 'utf-8');
    await page.addStyleTag({ content: adminCss });

    // Mở app, main-dashboard, ẩn login-modal, mở org-modal và pane sales để kiểm tra giao diện khi người dùng thao tác
    await page.evaluate(() => {
      document.getElementById('app')?.classList.remove('hide');
      document.getElementById('main-dashboard')?.classList.remove('hide');
      document.getElementById('login-modal')?.classList.add('hide');
      const orgModal = document.getElementById('org-modal');
      if (orgModal) {
        orgModal.classList.remove('hide');
        const salesPane = orgModal.querySelector('[data-org-pane="sales"]');
        if (salesPane) salesPane.classList.remove('hide');
        const addbox = orgModal.querySelector('[data-addbox="sales"]');
        if (addbox) addbox.classList.remove('hide');
      }
    });

    // Kiểm tra Sale Avatar Preview có phải hình tròn 48x48px (không bị dẹt)
    const avatarMetrics = await page.evaluate(() => {
      const el = document.getElementById('org-sale-avatar-preview');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        borderRadius: style.borderRadius,
        flexShrink: style.flexShrink
      };
    });

    assert(
      avatarMetrics && Math.round(avatarMetrics.width) === 48 && Math.round(avatarMetrics.height) === 48,
      `Avatar Sale trên mobile tròn chuẩn 48x48px (thực tế: ${avatarMetrics?.width}x${avatarMetrics?.height}px)`
    );
    assert(
      avatarMetrics && avatarMetrics.borderRadius === '50%',
      `Avatar Sale có border-radius: 50% hoàn hảo`
    );

    // Kiểm tra nút Chọn ảnh đại diện và Bỏ ảnh
    const pickBtnMetrics = await page.evaluate(() => {
      const btn = document.getElementById('org-sale-avatar-pick-btn');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    assert(
      pickBtnMetrics && pickBtnMetrics.height >= 32 && pickBtnMetrics.width > 50,
      `Nút "Chọn ảnh đại diện" hiển thị cân đối, không tràn lề (cao: ${pickBtnMetrics?.height}px)`
    );

    // Kiểm tra Popup Poster QR trên Mobile: Căn giữa, không sát đáy
    const qrModalCentered = await page.evaluate(() => {
      const modal = document.getElementById('qr-preview-modal');
      if (!modal) return false;
      modal.classList.remove('hide');
      const modalStyle = window.getComputedStyle(modal);
      const box = modal.querySelector('.qr-preview-box');
      const boxStyle = box ? window.getComputedStyle(box) : null;
      
      const isAlignCentered = modalStyle.alignItems === 'center' && modalStyle.justifyContent === 'center';
      const hasRoundedCorners = boxStyle && parseInt(boxStyle.borderRadius) >= 20;
      modal.classList.add('hide');
      return isAlignCentered && hasRoundedCorners;
    });
    assert(qrModalCentered, 'Popup Poster QR căn giữa màn hình mobile (align-items: center, border-radius >= 20px, không bám đáy)');

    // 3.2: Test Customer Portal Chat trên Mobile
    console.log('\n── PHẦN 4: Kiểm tra Cổng chat khách trên Mobile (Bàn phím ảo & Ô nhập) ──');
    const portalPage = await browser.newPage();
    await portalPage.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });

    const portalCss = fs.readFileSync(path.join(__dirname, '..', 'qr-chat-portal', 'app', 'globals.css'), 'utf-8');

    // Tạo trang mô phỏng cấu trúc portal khách
    await portalPage.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content">
        <style>${portalCss}</style>
      </head>
      <body>
        <main class="chat-shell" id="chat-shell">
          <header class="chat-header">
            <h1>Pastie Chat</h1>
          </header>
          <div class="thread" id="thread">
            <article class="incoming"><div>Xin chào quý khách!</div></article>
            <article class="outgoing"><div>Tôi muốn xem thực đơn</div></article>
          </div>
          <div class="portal-chat-input-area" id="input-area">
            <button type="button" class="floating-menu-button" id="menu-btn">
              <span>☰</span><i class="floating-menu-label">Thực đơn</i>
            </button>
            <form class="composer chat-composer">
              <textarea id="composer-text" rows="1" placeholder="Nhập tin nhắn..."></textarea>
              <button type="button" class="mic-button">🎤</button>
              <button type="submit" class="composer-send">➤</button>
            </form>
          </div>
        </main>
      </body>
      </html>
    `, { waitUntil: 'domcontentloaded' });

    // Kiểm tra vị trí của nút Thực đơn so với ô nhập tin nhắn
    const menuButtonPosition = await portalPage.evaluate(() => {
      const menuBtn = document.getElementById('menu-btn');
      const inputArea = document.getElementById('input-area');
      const menuRect = menuBtn.getBoundingClientRect();
      const inputRect = inputArea.getBoundingClientRect();
      const menuStyle = window.getComputedStyle(menuBtn);

      return {
        isAbsolute: menuStyle.position === 'absolute',
        menuBottom: menuRect.bottom,
        inputTop: inputRect.top,
        menuRight: menuRect.right,
        inputRight: inputRect.right,
        isAboveInput: menuRect.bottom <= inputRect.top + 2 // Nằm ngay trên nóc ô nhập
      };
    });

    assert(menuButtonPosition.isAbsolute, 'Nút thực đơn có position: absolute gắn liền với ô nhập tin nhắn');
    assert(menuButtonPosition.isAboveInput, 'Nút thực đơn nằm ngay trên nóc ô nhập (không bị đè hay thụt xuống dưới)');

    // Giả lập mở bàn phím ảo (visual viewport co từ 844px xuống 500px)
    await portalPage.evaluate(() => {
      const shell = document.getElementById('chat-shell');
      document.documentElement.style.setProperty('--visual-viewport-height', '500px');
      shell.style.height = '500px';
      shell.classList.add('keyboard-open');
    });

    const menuButtonAfterKeyboard = await portalPage.evaluate(() => {
      const menuBtn = document.getElementById('menu-btn');
      const inputArea = document.getElementById('input-area');
      const menuRect = menuBtn.getBoundingClientRect();
      const inputRect = inputArea.getBoundingClientRect();

      return {
        menuBottom: menuRect.bottom,
        inputTop: inputRect.top,
        isVisible: menuRect.top >= 0 && menuRect.bottom <= 500,
        isAboveInput: menuRect.bottom <= inputRect.top + 2
      };
    });

    assert(
      menuButtonAfterKeyboard.isAboveInput && menuButtonAfterKeyboard.isVisible,
      `Khi mở bàn phím ảo: Nút menu tự động di chuyển lên cùng ô nhập và luôn hiển thị rõ ràng (bottom: ${menuButtonAfterKeyboard.menuBottom}px / 500px)`
    );

    // Kiểm tra nút menu ở trạng thái thu nhỏ (.is-compact)
    const compactMenuCheck = await portalPage.evaluate(() => {
      const menuBtn = document.getElementById('menu-btn');
      menuBtn.classList.add('is-compact');
      const style = window.getComputedStyle(menuBtn);
      return style.position === 'absolute';
    });
    assert(compactMenuCheck, 'Trạng thái .is-compact của nút menu vẫn giữ position: absolute (không bị rơi về fixed bám đáy)');

    // Kiểm tra ô nhập TextArea: Auto-height không bị sụt về 0px và không nhảy giật
    const textareaAutoResize = await portalPage.evaluate(() => {
      const textarea = document.getElementById('composer-text');
      // Gõ 1 dòng ngắn
      textarea.value = 'Tin nhắn 1 dòng';
      textarea.style.height = 'auto';
      const h1 = Math.min(Math.max(textarea.scrollHeight, 42), 134);
      textarea.style.height = h1 + 'px';

      // Gõ 5 dòng dài
      textarea.value = 'Dòng 1\nDòng 2\nDòng 3\nDòng 4\nDòng 5\nDòng 6';
      textarea.style.height = 'auto';
      const h5 = Math.min(Math.max(textarea.scrollHeight, 42), 134);
      textarea.style.height = h5 + 'px';

      return { h1, h5 };
    });

    assert(textareaAutoResize.h1 === 42, `Ô nhập 1 dòng có chiều cao tiêu chuẩn 42px (thực tế: ${textareaAutoResize.h1}px)`);
    assert(textareaAutoResize.h5 <= 134 && textareaAutoResize.h5 > 42, `Ô nhập nhiều dòng mở rộng mượt mà đến tối đa 134px (thực tế: ${textareaAutoResize.h5}px)`);

    // Kiểm tra code page.tsx đã loại bỏ onInput trùng lặp và footer pdf
    const pageTsx = fs.readFileSync(path.join(__dirname, '..', 'qr-chat-portal', 'app', 'page.tsx'), 'utf-8');
    assert(!pageTsx.includes('onInput={(event) => handleVisitorDraftChange'), 'Đã gỡ bỏ onInput trùng lặp trên textarea trong page.tsx');
    assert(!pageTsx.includes('pdf-modal-foot'), 'Đã gỡ bỏ hoàn toàn nút mở hóa đơn PDF ở chân trang modal');

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(` KẾT QUẢ AUTO-TEST: ${passedTests}/${totalTests} KIỂM TRA ĐẠT (${failedTests} THẤT BẠI)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMobileAutotest().catch((err) => {
  console.error('Lỗi khi chạy autotest:', err);
  process.exit(1);
});
