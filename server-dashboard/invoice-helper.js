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

const PAYMENT_METHOD_I18N = {
  vi: { cash: 'Tiền mặt', bank_qr: 'Chuyển khoản QR', card: 'Thẻ' },
  en: { cash: 'Cash', bank_qr: 'Bank transfer (QR)', card: 'Card' },
  ru: { cash: 'Наличные', bank_qr: 'Перевод по QR', card: 'Карта' },
  zh: { cash: '现金', bank_qr: '扫码转账', card: '刷卡' },
  ko: { cash: '현금', bank_qr: 'QR 계좌이체', card: '카드' },
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
async function prepareInvoiceDelivery(invoice, language = 'vi') {
  const source = invoice && typeof invoice === 'object' ? invoice : {};

  if (source.pdfUrl || source.pngUrl || source.imageUrl || source.imageDataUrl) {
    const renderType = source.pdfUrl ? 'pdf' : 'image';
    return { ...source, renderType, generated: false };
  }

  const render = (lang) => (hasStructuredFields(source)
    ? createInvoicePdfDataUrl(source, lang)
    : createPdfFromHtml(source, lang));

  try {
    const pdfDataUrl = await render(language);
    return { ...source, pdfDataUrl, renderType: 'pdf', generated: true, renderedLanguage: normalizeLanguage(language) };
  } catch (error) {
    console.error('[Invoice] Không thể sinh PDF:', error.message);
  }

  // Thường là do thiếu/không nhúng được font cho ngôn ngữ đó. Thà đưa khách một
  // hóa đơn tiếng Anh đọc được còn hơn không có hóa đơn nào.
  if (normalizeLanguage(language) !== 'en') {
    try {
      const pdfDataUrl = await render('en');
      return { ...source, pdfDataUrl, renderType: 'pdf', generated: true, renderedLanguage: 'en', languageFallback: true };
    } catch (error) {
      console.error('[Invoice] PDF tiếng Anh dự phòng cũng lỗi:', error.message);
    }
  }

  return { ...source, renderType: 'html', generated: false };
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
  prepareInvoiceDelivery,
};
