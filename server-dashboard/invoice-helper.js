// Sinh hóa đơn PDF cho khách hàng, dịch theo ngôn ngữ khách đang chọn.
//
// Vì sao PDF được sinh lúc khách MỞ hóa đơn (không phải lúc Agent tạo đơn):
// khách có thể đổi ngôn ngữ bất cứ lúc nào, nên hóa đơn phải được vẽ lại theo
// ngôn ngữ hiện tại. Dữ liệu đơn hàng lưu trong DB ở dạng JSON có cấu trúc
// (items/totals), còn PDF chỉ là bản render — không lưu lại.
//
// Font: font mặc định của pdfkit (Helvetica) KHÔNG có dấu tiếng Việt và không
// có Cyrillic, nên phải nhúng một font Unicode. DejaVuSans phủ Latin (đủ dấu
// tiếng Việt) + Cyrillic. Tiếng Trung và tiếng Hàn cần font CJK ~20MB nên không
// đóng gói kèm repo; nếu máy chủ có sẵn font CJK/Hangul thì dùng, không thì hóa
// đơn hai thứ tiếng đó tự chuyển sang tiếng Anh để không mất chữ (xem resolveFonts).

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const FONT_DIR = path.join(__dirname, 'assets', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

// Tiếng Trung và tiếng Hàn đều cần font CJK — DejaVuSans không có chữ Hán lẫn
// Hangul. Font CJK chỉ dùng nếu máy chủ có sẵn (không đóng gói vì quá nặng).
// Lưu ý: pdfkit KHÔNG nhúng được file .ttc (TrueType Collection) — nó không
// subset được collection — nên chỉ liệt kê .ttf/.otf đơn lẻ ở đây.
const CJK_LANGUAGES = new Set(['zh', 'ko']);
const CJK_FONT_CANDIDATES = {
  zh: [
    '/usr/share/fonts/opentype/noto/NotoSansSC-Regular.otf',
    '/usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf',
    '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf',
    '/usr/share/fonts/truetype/arphic/uming.ttf',
  ],
  ko: [
    '/usr/share/fonts/opentype/noto/NotoSansKR-Regular.otf',
    '/usr/share/fonts/truetype/noto/NotoSansKR-Regular.otf',
    '/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf',
    '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
  ],
};

const fileExists = (filePath) => {
  try { return fs.existsSync(filePath); } catch { return false; }
};

const HAS_BUNDLED_FONT = fileExists(FONT_REGULAR);
if (!HAS_BUNDLED_FONT) {
  console.warn('[Invoice] Không tìm thấy assets/fonts/DejaVuSans.ttf — hóa đơn PDF sẽ mất dấu tiếng Việt.');
}

function findCjkFont(language) {
  return (CJK_FONT_CANDIDATES[language] || []).find(fileExists) || null;
}

const INVOICE_I18N = {
  vi: {
    title: 'HÓA ĐƠN BÁN HÀNG', invoiceNo: 'Số hóa đơn', date: 'Ngày bán', customer: 'Khách hàng',
    phone: 'Điện thoại', address: 'Địa chỉ', item: 'Mặt hàng', unitPrice: 'Đơn giá', quantity: 'SL',
    discount: 'Chiết khấu', lineTotal: 'Thành tiền', subtotal: 'Tổng tiền hàng',
    totalDiscount: 'Chiết khấu', grandTotal: 'TỔNG CỘNG', paymentMethod: 'Thanh toán',
    thanks: 'Cảm ơn quý khách!', note: 'Hóa đơn được tạo tự động từ hệ thống Pastie Chat.',
  },
  en: {
    title: 'SALES INVOICE', invoiceNo: 'Invoice No.', date: 'Date', customer: 'Customer',
    phone: 'Phone', address: 'Address', item: 'Item', unitPrice: 'Unit price', quantity: 'Qty',
    discount: 'Discount', lineTotal: 'Amount', subtotal: 'Subtotal',
    totalDiscount: 'Discount', grandTotal: 'TOTAL', paymentMethod: 'Payment',
    thanks: 'Thank you!', note: 'This invoice was generated automatically by Pastie Chat.',
  },
  ru: {
    title: 'СЧЁТ НА ОПЛАТУ', invoiceNo: 'Номер счёта', date: 'Дата', customer: 'Клиент',
    phone: 'Телефон', address: 'Адрес', item: 'Наименование', unitPrice: 'Цена', quantity: 'Кол-во',
    discount: 'Скидка', lineTotal: 'Сумма', subtotal: 'Итого по товарам',
    totalDiscount: 'Скидка', grandTotal: 'ИТОГО', paymentMethod: 'Оплата',
    thanks: 'Спасибо за покупку!', note: 'Счёт сформирован автоматически системой Pastie Chat.',
  },
  zh: {
    title: '销售发票', invoiceNo: '发票号', date: '日期', customer: '客户',
    phone: '电话', address: '地址', item: '商品', unitPrice: '单价', quantity: '数量',
    discount: '折扣', lineTotal: '金额', subtotal: '商品合计',
    totalDiscount: '折扣', grandTotal: '总计', paymentMethod: '付款方式',
    thanks: '感谢惠顾！', note: '本发票由 Pastie Chat 系统自动生成。',
  },
  ko: {
    title: '판매 영수증', invoiceNo: '영수증 번호', date: '발행일', customer: '고객',
    phone: '전화번호', address: '주소', item: '품목', unitPrice: '단가', quantity: '수량',
    discount: '할인', lineTotal: '금액', subtotal: '상품 합계',
    totalDiscount: '할인', grandTotal: '총 합계', paymentMethod: '결제 수단',
    thanks: '이용해 주셔서 감사합니다!', note: '본 영수증은 Pastie Chat 시스템에서 자동 발행되었습니다.',
  },
};

// room_charge chỉ xuất hiện với Agent được superadmin cho phép; nhãn vẫn khai
// báo đủ mọi ngôn ngữ để hoá đơn cũ in ra không bị lòi mã máy.
const PAYMENT_METHOD_I18N = {
  vi: { cash: 'Tiền mặt', bank_qr: 'Chuyển khoản QR', card: 'Thẻ', room_charge: 'Cộng vào tiền phòng' },
  en: { cash: 'Cash', bank_qr: 'Bank transfer (QR)', card: 'Card', room_charge: 'Charge to room' },
  ru: { cash: 'Наличные', bank_qr: 'Перевод по QR', card: 'Карта', room_charge: 'На счёт номера' },
  zh: { cash: '现金', bank_qr: '扫码转账', card: '刷卡', room_charge: '记入房账' },
  ko: { cash: '현금', bank_qr: 'QR 계좌이체', card: '카드', room_charge: '객실 요금에 청구' },
};

function normalizeLanguage(language) {
  const code = String(language || '').toLowerCase().slice(0, 2);
  return INVOICE_I18N[code] ? code : 'vi';
}

function dictionary(language) {
  return INVOICE_I18N[normalizeLanguage(language)];
}

function paymentMethodLabel(method, language) {
  const table = PAYMENT_METHOD_I18N[normalizeLanguage(language)] || PAYMENT_METHOD_I18N.vi;
  return table[method] || method;
}

// Font phù hợp với ngôn ngữ. Trả về cả cờ `fallbackToEnglish` để nơi gọi biết
// phải đổi nội dung sang tiếng Anh khi thiếu font (tránh in ra ô vuông trống).
function resolveFonts(language) {
  const code = normalizeLanguage(language);
  if (CJK_LANGUAGES.has(code)) {
    const cjk = findCjkFont(code);
    if (cjk) return { regular: cjk, bold: cjk, language: code, fallbackToEnglish: false };
    // Không có font CJK => in bằng tiếng Anh thay vì mất toàn bộ chữ.
    return {
      regular: HAS_BUNDLED_FONT ? FONT_REGULAR : null,
      bold: fileExists(FONT_BOLD) ? FONT_BOLD : null,
      language: 'en',
      fallbackToEnglish: true,
    };
  }
  return {
    regular: HAS_BUNDLED_FONT ? FONT_REGULAR : null,
    bold: fileExists(FONT_BOLD) ? FONT_BOLD : null,
    language: code,
    fallbackToEnglish: false,
  };
}

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function formatMoney(value, currency = 'VND', language = 'vi') {
  const amount = toNumber(value);
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`;
  }
  try {
    return new Intl.NumberFormat(normalizeLanguage(language), { style: 'currency', currency }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('en-US').format(amount)} ${currency}`;
  }
}

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<\/(p|div|h[1-6]|tr|li|br)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Chấp nhận nhiều cách đặt tên trường khác nhau để POS/phần mềm hóa đơn bên
// ngoài đẩy JSON sang mà không phải sửa theo đúng một chuẩn duy nhất.
function normalizeInvoiceItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const item = raw || {};
    const name = String(item.name ?? item.title ?? item.product ?? item.description ?? '').trim() || '—';
    const quantity = toNumber(item.quantity ?? item.qty ?? item.amount ?? 1) || 1;
    const unitPrice = toNumber(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
    const discount = toNumber(item.discount ?? item.discountAmount ?? item.discount_amount ?? 0);
    const lineTotal = item.lineTotal ?? item.line_total ?? item.total ?? (unitPrice * quantity - discount);
    return { name, quantity, unitPrice, discount, lineTotal: toNumber(lineTotal) };
  });
}

// Có đủ trường để vẽ hóa đơn có cấu trúc hay không.
function hasStructuredFields(invoice) {
  return Array.isArray(invoice?.items) && invoice.items.length > 0;
}

function buildInvoiceData(invoice, language) {
  const items = normalizeInvoiceItems(invoice?.items);
  const subtotal = invoice?.subtotal !== undefined
    ? toNumber(invoice.subtotal)
    : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalDiscount = invoice?.totalDiscount !== undefined
    ? toNumber(invoice.totalDiscount)
    : items.reduce((sum, item) => sum + item.discount, 0);
  const totalAmount = invoice?.totalAmount !== undefined
    ? toNumber(invoice.totalAmount)
    : subtotal - totalDiscount;

  return {
    invoiceNo: invoice?.invoiceNo || invoice?.invoice_no || '',
    issuedAt: invoice?.issuedAt || invoice?.issued_at || new Date().toISOString(),
    buyerName: invoice?.buyerName || invoice?.buyer_name || invoice?.customerName || '',
    buyerPhone: invoice?.buyerPhone || invoice?.buyer_phone || invoice?.customerPhone || '',
    buyerAddress: invoice?.buyerAddress || invoice?.buyer_address || invoice?.customerAddress || '',
    sellerName: invoice?.sellerName || invoice?.seller_name || '',
    currency: invoice?.currency || 'VND',
    paymentMethod: invoice?.paymentMethod || invoice?.payment_method || '',
    items, subtotal, totalDiscount, totalAmount,
    language: normalizeLanguage(language),
  };
}

function formatIssuedAt(issuedAt, language) {
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) return '';
  const locale = { vi: 'vi-VN', en: 'en-GB', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR' }[normalizeLanguage(language)] || 'vi-VN';
  try {
    return date.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

// Vẽ hóa đơn dạng phiếu bán hàng (giống bill in tại quầy).
function createInvoicePdfDataUrl(invoice, language) {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts(language);
    // Thiếu font CJK => nội dung chuyển sang tiếng Anh cho khỏi mất chữ.
    const copy = dictionary(fonts.language);
    const data = buildInvoiceData(invoice, fonts.language);

    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 46, info: { Title: data.invoiceNo || 'Pastie Invoice' } });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(`data:application/pdf;base64,${Buffer.concat(chunks).toString('base64')}`));

    const REGULAR = 'body';
    const BOLD = 'body-bold';
    if (fonts.regular) doc.registerFont(REGULAR, fonts.regular);
    if (fonts.bold) doc.registerFont(BOLD, fonts.bold);
    const useRegular = () => doc.font(fonts.regular ? REGULAR : 'Helvetica');
    const useBold = () => doc.font(fonts.bold ? BOLD : (fonts.regular ? REGULAR : 'Helvetica-Bold'));

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const money = (value) => formatMoney(value, data.currency, fonts.language);

    // Tiêu đề
    useBold().fontSize(19).fillColor('#b20c69').text(copy.title, { align: 'center' });
    if (data.sellerName) {
      useRegular().fontSize(10).fillColor('#666').text(data.sellerName, { align: 'center' });
    }
    if (data.invoiceNo) {
      useRegular().fontSize(11).fillColor('#333').text(data.invoiceNo, { align: 'center' });
    }
    doc.moveDown(0.9);

    // Thông tin khách
    useRegular().fontSize(10).fillColor('#222');
    const infoLine = (label, value) => {
      if (!value) return;
      useBold().text(`${label}: `, { continued: true });
      useRegular().text(String(value));
    };
    infoLine(copy.date, formatIssuedAt(data.issuedAt, fonts.language));
    infoLine(copy.customer, data.buyerName);
    infoLine(copy.phone, data.buyerPhone);
    infoLine(copy.address, data.buyerAddress);

    doc.moveDown(0.7);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#e6cede').lineWidth(1).stroke();
    doc.moveDown(0.6);

    const hasDiscount = data.items.some((item) => item.discount > 0) || data.totalDiscount > 0;
    // Cột: tên | đơn giá | SL | (chiết khấu) | thành tiền
    const colTotalW = 92;
    const colDiscountW = hasDiscount ? 78 : 0;
    const colQtyW = 42;
    const colPriceW = 88;
    const colNameW = width - colPriceW - colQtyW - colDiscountW - colTotalW;
    const xName = left;
    const xPrice = xName + colNameW;
    const xQty = xPrice + colPriceW;
    const xDiscount = xQty + colQtyW;
    const xTotal = xDiscount + colDiscountW;

    // Tiêu đề bảng
    useBold().fontSize(9.5).fillColor('#7a2a5c');
    let y = doc.y;
    doc.text(copy.item, xName, y, { width: colNameW });
    doc.text(copy.unitPrice, xPrice, y, { width: colPriceW, align: 'right' });
    doc.text(copy.quantity, xQty, y, { width: colQtyW, align: 'right' });
    if (hasDiscount) doc.text(copy.discount, xDiscount, y, { width: colDiscountW, align: 'right' });
    doc.text(copy.lineTotal, xTotal, y, { width: colTotalW, align: 'right' });
    doc.y = y + 16;
    doc.moveTo(left, doc.y - 4).lineTo(right, doc.y - 4).strokeColor('#f0dfea').stroke();

    // Dòng hàng
    useRegular().fontSize(10).fillColor('#222');
    data.items.forEach((item) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 120) doc.addPage();
      y = doc.y;
      const nameHeight = doc.heightOfString(item.name, { width: colNameW });
      doc.text(item.name, xName, y, { width: colNameW });
      doc.text(money(item.unitPrice), xPrice, y, { width: colPriceW, align: 'right' });
      doc.text(String(item.quantity), xQty, y, { width: colQtyW, align: 'right' });
      if (hasDiscount) doc.text(item.discount ? money(item.discount) : '—', xDiscount, y, { width: colDiscountW, align: 'right' });
      doc.text(money(item.lineTotal), xTotal, y, { width: colTotalW, align: 'right' });
      doc.y = y + Math.max(nameHeight, 12) + 7;
    });

    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#e6cede').stroke();
    doc.moveDown(0.6);

    // Tổng kết
    const summaryRow = (label, value, options = {}) => {
      const rowY = doc.y;
      const labelWidth = width - colTotalW - 10;
      (options.bold ? useBold() : useRegular()).fontSize(options.bold ? 12.5 : 10)
        .fillColor(options.bold ? '#b20c69' : '#444');
      doc.text(label, left, rowY, { width: labelWidth, align: 'right' });
      doc.text(value, xTotal - 10, rowY, { width: colTotalW + 10, align: 'right' });
      doc.y = rowY + (options.bold ? 20 : 15);
    };
    summaryRow(copy.subtotal, money(data.subtotal));
    if (data.totalDiscount > 0) summaryRow(copy.totalDiscount, `- ${money(data.totalDiscount)}`);
    summaryRow(copy.grandTotal, money(data.totalAmount), { bold: true });
    if (data.paymentMethod) {
      summaryRow(copy.paymentMethod, paymentMethodLabel(data.paymentMethod, fonts.language));
    }

    doc.moveDown(1.1);
    useBold().fontSize(11).fillColor('#b20c69').text(copy.thanks, left, doc.y, { width, align: 'center' });
    useRegular().fontSize(8.5).fillColor('#998');
    doc.moveDown(0.35);
    doc.text(copy.note, left, doc.y, { width, align: 'center' });

    doc.end();
  });
}

// PDF từ HTML thuần (khi POS chỉ gửi HTML, không có items có cấu trúc).
function createPdfFromHtml(invoice, language) {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts(language);
    const copy = dictionary(fonts.language);
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: invoice?.invoiceNo || 'Pastie Invoice' } });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(`data:application/pdf;base64,${Buffer.concat(chunks).toString('base64')}`));

    if (fonts.regular) doc.registerFont('body', fonts.regular);
    if (fonts.bold) doc.registerFont('body-bold', fonts.bold);
    const useRegular = () => doc.font(fonts.regular ? 'body' : 'Helvetica');
    const useBold = () => doc.font(fonts.bold ? 'body-bold' : 'Helvetica-Bold');

    useBold().fontSize(18).fillColor('#b20c69').text(`${copy.title} ${invoice?.invoiceNo || ''}`.trim());
    doc.moveDown(0.6);
    useRegular().fontSize(11).fillColor('#222');
    const lines = htmlToPlainText(invoice?.html || '').split('\n').filter(Boolean);
    (lines.length ? lines : [JSON.stringify(invoice ?? {})]).forEach((line) => doc.text(line, { width: 498 }));
    if (invoice?.totalAmount !== undefined) {
      doc.moveDown().fontSize(14);
      useBold().fillColor('#b20c69').text(`${copy.grandTotal}: ${formatMoney(invoice.totalAmount, invoice.currency || 'VND', fonts.language)}`);
    }
    doc.end();
  });
}

// Chuẩn bị hóa đơn để gửi cho khách.
// - POS đã cung cấp sẵn pdfUrl/pngUrl/imageUrl => dùng nguyên, không sinh lại.
// - Có items (JSON đủ trường) => vẽ hóa đơn có cấu trúc.
// - Chỉ có HTML => sinh PDF từ nội dung HTML.

// ── Bản xem trước SVG ───────────────────────────────────────────────────────
// Vì sao có thêm SVG bên cạnh PDF: PDF nhúng thẳng vào khung chat rất kém tin
// cậy trên điện thoại (iOS Safari thường hiện trắng), mà khách QR chủ yếu dùng
// điện thoại. SVG co giãn theo chiều ngang khung chứa nên không bao giờ phải
// lăn ngang, chạy được trên mọi máy, và chữ dùng font của chính trình duyệt
// khách — nên tiếng Việt/Hàn/Trung đều hiện đúng, không phụ thuộc font máy chủ.
// PDF vẫn giữ nguyên để bấm vào xem/tải.
const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]
));

// Ước lượng bề rộng chữ để cắt bớt tên hàng quá dài (SVG không tự xuống dòng).
// Chữ CJK rộng gần gấp đôi chữ Latin nên phải tính riêng.
function approximateTextWidth(text, fontSize) {
  let units = 0;
  for (const char of String(text)) {
    units += /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(char) ? 1 : 0.52;
  }
  return units * fontSize;
}

function truncateToWidth(text, fontSize, maxWidth) {
  const value = String(text ?? '');
  if (approximateTextWidth(value, fontSize) <= maxWidth) return value;
  let result = '';
  for (const char of value) {
    if (approximateTextWidth(result + char + '…', fontSize) > maxWidth) break;
    result += char;
  }
  return result + '…';
}

function createInvoiceSvg(invoice, language) {
  const code = normalizeLanguage(language);
  const copy = dictionary(code);
  const data = buildInvoiceData(invoice, code);
  const money = (value) => formatMoney(value, data.currency, code);

  const W = 620;
  const PAD = 26;
  const innerWidth = W - PAD * 2;
  const hasDiscount = data.items.some((item) => item.discount > 0) || data.totalDiscount > 0;

  const colTotalW = 104;
  const colDiscountW = hasDiscount ? 84 : 0;
  const colQtyW = 44;
  const colPriceW = 96;
  const colNameW = innerWidth - colPriceW - colQtyW - colDiscountW - colTotalW;
  const xName = PAD;
  const xPriceEnd = xName + colNameW + colPriceW;
  const xQtyEnd = xPriceEnd + colQtyW;
  const xDiscountEnd = xQtyEnd + colDiscountW;
  const xTotalEnd = xDiscountEnd + colTotalW;

  const parts = [];
  const text = (content, x, y, options = {}) => {
    const anchor = options.anchor ? ` text-anchor="${options.anchor}"` : '';
    const weight = options.weight ? ` font-weight="${options.weight}"` : '';
    const size = options.size || 13;
    const fill = options.fill || '#2d2335';
    parts.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}"${weight}${anchor}>${escapeXml(content)}</text>`);
  };
  const line = (y) => parts.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#e6cede" stroke-width="1"/>`);

  let y = 44;
  text(copy.title, W / 2, y, { size: 20, weight: 700, fill: '#b20c69', anchor: 'middle' });
  y += 22;
  if (data.invoiceNo) { text(data.invoiceNo, W / 2, y, { size: 13, fill: '#6b5c69', anchor: 'middle' }); y += 20; }
  else y += 4;

  const infoLine = (label, value) => {
    if (!value) return;
    text(`${label}: ${value}`, PAD, y, { size: 12, fill: '#3d3044' });
    y += 18;
  };
  infoLine(copy.date, formatIssuedAt(data.issuedAt, code));
  infoLine(copy.customer, data.buyerName);
  infoLine(copy.phone, data.buyerPhone);
  infoLine(copy.address, data.buyerAddress);

  y += 6; line(y); y += 20;

  text(copy.item, xName, y, { size: 11.5, weight: 700, fill: '#7a2a5c' });
  text(copy.unitPrice, xPriceEnd, y, { size: 11.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  text(copy.quantity, xQtyEnd, y, { size: 11.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  if (hasDiscount) text(copy.discount, xDiscountEnd, y, { size: 11.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  text(copy.lineTotal, xTotalEnd, y, { size: 11.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  y += 8; line(y); y += 20;

  data.items.forEach((item) => {
    text(truncateToWidth(item.name, 12.5, colNameW - 8), xName, y, { size: 12.5 });
    text(money(item.unitPrice), xPriceEnd, y, { size: 12.5, anchor: 'end' });
    text(String(item.quantity), xQtyEnd, y, { size: 12.5, anchor: 'end' });
    if (hasDiscount) text(item.discount ? money(item.discount) : '—', xDiscountEnd, y, { size: 12.5, anchor: 'end' });
    text(money(item.lineTotal), xTotalEnd, y, { size: 12.5, anchor: 'end' });
    y += 22;
  });

  y -= 4; line(y); y += 24;

  const summary = (label, value, options = {}) => {
    const size = options.bold ? 15 : 12.5;
    const fill = options.bold ? '#b20c69' : '#4a3f52';
    text(label, xDiscountEnd, y, { size, weight: options.bold ? 700 : 400, fill, anchor: 'end' });
    text(value, xTotalEnd, y, { size, weight: options.bold ? 700 : 400, fill, anchor: 'end' });
    y += options.bold ? 26 : 20;
  };
  summary(copy.subtotal, money(data.subtotal));
  if (data.totalDiscount > 0) summary(copy.totalDiscount, `- ${money(data.totalDiscount)}`);
  summary(copy.grandTotal, money(data.totalAmount), { bold: true });
  if (data.paymentMethod) summary(copy.paymentMethod, paymentMethodLabel(data.paymentMethod, code));

  y += 8;
  text(copy.thanks, W / 2, y, { size: 13, weight: 700, fill: '#b20c69', anchor: 'middle' });
  y += 18;
  text(copy.note, W / 2, y, { size: 10, fill: '#9b8d9c', anchor: 'middle' });
  y += 22;

  const H = Math.round(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Be Vietnam Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"><rect x="0" y="0" width="${W}" height="${H}" rx="16" fill="#ffffff"/><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="#f0cde0"/>${parts.join('')}</svg>`;
}

function createInvoiceSvgDataUrl(invoice, language) {
  const svg = createInvoiceSvg(invoice, language);
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

async function prepareInvoiceDelivery(invoice, language = 'vi') {
  const source = invoice && typeof invoice === 'object' ? invoice : {};

  if (source.pdfUrl || source.pngUrl || source.imageUrl || source.imageDataUrl) {
    const renderType = source.pdfUrl ? 'pdf' : 'image';
    return { ...source, renderType, generated: false };
  }

  // Bản xem trước hiển thị ngay trong khung chat (co giãn theo bề ngang).
  let svgDataUrl = null;
  if (hasStructuredFields(source)) {
    try { svgDataUrl = createInvoiceSvgDataUrl(source, language); }
    catch (error) { console.error('[Invoice] Không thể sinh bản xem trước SVG:', error.message); }
  }

  const render = (lang) => (hasStructuredFields(source)
    ? createInvoicePdfDataUrl(source, lang)
    : createPdfFromHtml(source, lang));

  try {
    const pdfDataUrl = await render(language);
    return { ...source, pdfDataUrl, svgDataUrl, renderType: 'pdf', generated: true, renderedLanguage: normalizeLanguage(language) };
  } catch (error) {
    console.error('[Invoice] Không thể sinh PDF:', error.message);
  }

  // Thường là do thiếu/không nhúng được font cho ngôn ngữ đó. Thà đưa khách một
  // hóa đơn tiếng Anh đọc được còn hơn không có hóa đơn nào.
  if (normalizeLanguage(language) !== 'en') {
    try {
      const pdfDataUrl = await render('en');
      return { ...source, pdfDataUrl, svgDataUrl, renderType: 'pdf', generated: true, renderedLanguage: 'en', languageFallback: true };
    } catch (error) {
      console.error('[Invoice] PDF tiếng Anh dự phòng cũng lỗi:', error.message);
    }
  }

  return { ...source, svgDataUrl, renderType: 'html', generated: false };
}

module.exports = {
  INVOICE_I18N,
  PAYMENT_METHOD_I18N,
  normalizeLanguage,
  dictionary,
  paymentMethodLabel,
  formatMoney,
  htmlToPlainText,
  normalizeInvoiceItems,
  buildInvoiceData,
  createInvoicePdfDataUrl,
  createInvoiceSvg,
  createInvoiceSvgDataUrl,
  prepareInvoiceDelivery,
};
