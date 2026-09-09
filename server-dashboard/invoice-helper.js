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

function formatBillNote(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) return trimmed;
  return `(${trimmed})`;
}

const INVOICE_I18N = {
  vi: {
    title: 'HÓA ĐƠN BÁN HÀNG', invoiceNo: 'Số hóa đơn', date: 'Ngày bán', customer: 'Khách hàng', email: 'Email', table: 'Bàn', openedAt: 'Giờ vào', printedAt: 'Giờ in', sale: 'Nhân viên',
    phone: 'Điện thoại', address: 'Địa chỉ', item: 'Mặt hàng', unitPrice: 'Đơn giá', quantity: 'SL',
    discount: 'Chiết khấu', lineTotal: 'Thành tiền', subtotal: 'Tổng tiền hàng',
    totalDiscount: 'Chiết khấu', vat: 'VAT', grandTotal: 'TỔNG CỘNG', paymentMethod: 'Thanh toán',
    thanks: 'Cảm ơn quý khách!', note: 'Hóa đơn được tạo tự động từ hệ thống Pastie Chat.', paidStamp: 'ĐÃ THANH TOÁN',
  },
  en: {
    title: 'SALES INVOICE', invoiceNo: 'Invoice No.', date: 'Date', customer: 'Customer', email: 'Email', table: 'Table', openedAt: 'Time in', printedAt: 'Printed', sale: 'Served by',
    phone: 'Phone', address: 'Address', item: 'Item', unitPrice: 'Unit price', quantity: 'Qty',
    discount: 'Discount', lineTotal: 'Amount', subtotal: 'Subtotal',
    totalDiscount: 'Discount', vat: 'VAT', grandTotal: 'TOTAL', paymentMethod: 'Payment',
    thanks: 'Thank you!', note: 'This invoice was generated automatically by Pastie Chat.', paidStamp: 'PAID',
  },
  ru: {
    title: 'СЧЁТ НА ОПЛАТУ', invoiceNo: 'Номер счёта', date: 'Дата', customer: 'Клиент', email: 'Email', table: 'Стол', openedAt: 'Время входа', printedAt: 'Напечатано', sale: 'Обслужил',
    phone: 'Телефон', address: 'Адрес', item: 'Наименование', unitPrice: 'Цена', quantity: 'Кол-во',
    discount: 'Скидка', lineTotal: 'Сумма', subtotal: 'Итого по товарам',
    totalDiscount: 'Скидка', vat: 'НДС', grandTotal: 'ИТОГО', paymentMethod: 'Оплата',
    thanks: 'Спасибо за покупку!', note: 'Счёт сформирован автоматически системой Pastie Chat.', paidStamp: 'ОПЛАЧЕНО',
  },
  zh: {
    title: '销售发票', invoiceNo: '发票号', date: '日期', customer: '客户', email: '邮箱', table: '桌号', openedAt: '入座时间', printedAt: '打印时间', sale: '服务员',
    phone: '电话', address: '地址', item: '商品', unitPrice: '单价', quantity: '数量',
    discount: '折扣', lineTotal: '金额', subtotal: '商品合计',
    totalDiscount: '折扣', vat: '增值税', grandTotal: '总计', paymentMethod: '付款方式',
    thanks: '感谢惠顾！', note: '本发票由 Pastie Chat 系统自动生成。', paidStamp: '已付款',
  },
  ko: {
    title: '판매 영수증', invoiceNo: '영수증 번호', date: '발행일', customer: '고객', email: '이메일', table: '테이블', openedAt: '입장 시간', printedAt: '출력 시간', sale: '담당 직원',
    phone: '전화번호', address: '주소', item: '품목', unitPrice: '단가', quantity: '수량',
    discount: '할인', lineTotal: '금액', subtotal: '상품 합계',
    totalDiscount: '할인', vat: 'VAT', grandTotal: '총 합계', paymentMethod: '결제 수단',
    thanks: '이용해 주셔서 감사합니다!', note: '본 영수증은 Pastie Chat 시스템에서 자동 발행되었습니다.', paidStamp: '결제 완료',
  },
};

// room_charge / pay_later chỉ xuất hiện theo cấu hình của Superadmin; nhãn vẫn
// khai báo đủ mọi ngôn ngữ để hóa đơn và payload POS không lộ mã kỹ thuật.
const PAYMENT_METHOD_I18N = {
  vi: { cash: 'Tiền mặt', bank_qr: 'Chuyển khoản QR', card: 'Thẻ', room_charge: 'Cộng vào tiền phòng', pay_later: 'Thanh toán sau' },
  en: { cash: 'Cash', bank_qr: 'Bank transfer (QR)', card: 'Card', room_charge: 'Charge to room', pay_later: 'Pay later' },
  ru: { cash: 'Наличные', bank_qr: 'Перевод по QR', card: 'Карта', room_charge: 'На счёт номера', pay_later: 'Оплатить позже' },
  zh: { cash: '现金', bank_qr: '扫码转账', card: '刷卡', room_charge: '记入房账', pay_later: '稍后付款' },
  ko: { cash: '현금', bank_qr: 'QR 계좌이체', card: '카드', room_charge: '객실 요금에 청구', pay_later: '나중에 결제' },
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
    const note = String(item.note ?? item.notes ?? '').trim();
    const vatRate = item.vatRate != null ? toNumber(item.vatRate) : (item.vat_rate != null ? toNumber(item.vat_rate) : null);
    const vatAmount = item.vatAmount != null ? toNumber(item.vatAmount) : (vatRate != null ? Math.round(toNumber(lineTotal) * vatRate / 100) : 0);
    return { name, note, quantity, unitPrice, discount, lineTotal: toNumber(lineTotal), vatRate, vatAmount };
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
  const vatRate = toNumber(invoice?.vatRate ?? invoice?.vat_rate ?? 0);
  const vatAmount = invoice?.vatAmount !== undefined
    ? toNumber(invoice.vatAmount)
    : items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);

  return {
    invoiceNo: invoice?.invoiceNo || invoice?.invoice_no || '',
    issuedAt: invoice?.issuedAt || invoice?.issued_at || new Date().toISOString(),
    buyerName: invoice?.buyerName || invoice?.buyer_name || invoice?.customerName || '',
    buyerPhone: invoice?.buyerPhone || invoice?.buyer_phone || invoice?.customerPhone || '',
    buyerAddress: invoice?.buyerAddress || invoice?.buyer_address || invoice?.customerAddress || '',
    // Bốn trường mới theo mẫu bill của quán: email khách, bàn, giờ vào, và
    // nhân viên phụ trách. Khách cầm bill về mà thắc mắc thì biết hỏi ai.
    buyerEmail: invoice?.buyerEmail || invoice?.buyer_email || '',
    tableLabel: invoice?.tableLabel || invoice?.table_label || '',
    openedAt: invoice?.openedAt || invoice?.opened_at || null,
    saleName: invoice?.saleName || invoice?.sale_name || '',
    sellerName: invoice?.sellerName || invoice?.seller_name || '',
    currency: invoice?.currency || 'VND',
    paymentMethod: invoice?.paymentMethod || invoice?.payment_method || '',
    isPaid: !!(invoice?.isPaid || invoice?.is_paid || invoice?.status === 'paid'),
    items, subtotal, totalDiscount, vatRate, vatAmount, totalAmount,
    language: normalizeLanguage(language),
  };
}

// Múi giờ của QUÁN, không phải của máy chủ.
//
// Máy chủ trên Railway chạy theo UTC. toLocaleString không có timeZone thì lấy
// múi giờ của tiến trình, nên hoá đơn xuất lúc 20:15 giờ Việt Nam in ra 13:15 —
// và với mọi đơn sau 7 giờ tối thì NGÀY cũng lùi lại một hôm. Đó là lỗi "sai
// giờ và ngày bill".
const INVOICE_TIMEZONE = process.env.INVOICE_TIMEZONE || process.env.WORK_TIMEZONE || 'Asia/Ho_Chi_Minh';

function formatIssuedAt(issuedAt, language) {
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) return '';
  const locale = { vi: 'vi-VN', en: 'en-GB', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR' }[normalizeLanguage(language)] || 'vi-VN';
  try {
    return date.toLocaleString(locale, {
      timeZone: INVOICE_TIMEZONE,
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
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
    // A5 portrait cho cảm giác đúng một tờ bill/phiếu bán hàng. A4 tuy là dọc
    // về kỹ thuật nhưng phần nội dung thấp và trải ngang khiến bản xem trước
    // trên điện thoại trông như một banner nằm ngang.
    const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 32, info: { Title: data.invoiceNo || 'Pastie Invoice' } });
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

    // Thương hiệu của Agent là tiêu đề chính. Loại chứng từ nằm dưới với kích
    // thước nhỏ hơn; không dùng chữ "SALES INVOICE" thay tên cơ sở.
    doc.roundedRect(left, doc.y, width, data.sellerName ? 62 : 48, 10).fill('#fff1f8');
    doc.y += 13;
    if (data.sellerName) {
      useBold().fontSize(17).fillColor('#98205f').text(data.sellerName, left + 12, doc.y, { width: width - 24, align: 'center' });
      doc.moveDown(0.28);
      useBold().fontSize(9).fillColor('#c52d77').text(copy.title, left + 12, doc.y, { width: width - 24, align: 'center', characterSpacing: .7 });
    } else {
      useBold().fontSize(17).fillColor('#98205f').text(copy.title, left + 12, doc.y, { width: width - 24, align: 'center' });
    }
    doc.y = doc.y < 100 ? 100 : doc.y;
    if (data.invoiceNo) {
      useBold().fontSize(10.5).fillColor('#382936').text(data.invoiceNo, { align: 'center' });
    }
    doc.moveDown(0.9);

    // Thông tin khách
    useRegular().fontSize(10).fillColor('#222');
    const infoLine = (label, value) => {
      if (!value) return;
      useBold().text(`${label}: `, { continued: true });
      useRegular().text(String(value));
    };
    // Thứ tự theo mẫu bill của quán: bàn -> giờ vào -> giờ in -> khách -> liên hệ.
    // Bàn và giờ vào đứng trước vì nhân viên cầm tờ bill lên là tìm hai thứ đó
    // trước tiên để mang đúng bàn.
    infoLine(copy.table, data.tableLabel);
    infoLine(copy.openedAt, data.openedAt ? formatIssuedAt(data.openedAt, fonts.language) : '');
    infoLine(copy.printedAt, formatIssuedAt(data.issuedAt, fonts.language));
    infoLine(copy.customer, data.buyerName);
    infoLine(copy.email, data.buyerEmail);
    infoLine(copy.phone, data.buyerPhone);
    infoLine(copy.address, data.buyerAddress);
    infoLine(copy.sale, data.saleName);

    doc.moveDown(0.7);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#e6cede').lineWidth(1).stroke();
    doc.moveDown(0.6);

    const hasDiscount = data.items.some((item) => item.discount > 0) || data.totalDiscount > 0;
    // Cột: tên | đơn giá | SL | (chiết khấu) | thành tiền
    const colTotalW = 76;
    const colDiscountW = hasDiscount ? 56 : 0;
    const colQtyW = 30;
    const colPriceW = 68;
    const colNameW = width - colPriceW - colQtyW - colDiscountW - colTotalW;
    const xName = left;
    const xPrice = xName + colNameW;
    const xQty = xPrice + colPriceW;
    const xDiscount = xQty + colQtyW;
    const xTotal = xDiscount + colDiscountW;

    // Tiêu đề bảng
    useBold().fontSize(8).fillColor('#7a2a5c');
    let y = doc.y;
    doc.text(copy.item, xName, y, { width: colNameW });
    doc.text(copy.unitPrice, xPrice, y, { width: colPriceW, align: 'right' });
    doc.text(copy.quantity, xQty, y, { width: colQtyW, align: 'right' });
    if (hasDiscount) doc.text(copy.discount, xDiscount, y, { width: colDiscountW, align: 'right' });
    doc.text(copy.lineTotal, xTotal, y, { width: colTotalW, align: 'right' });
    doc.y = y + 16;
    doc.moveTo(left, doc.y - 4).lineTo(right, doc.y - 4).strokeColor('#f0dfea').stroke();

    // Dòng hàng
    useRegular().fontSize(8.7).fillColor('#222');
    data.items.forEach((item) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 120) doc.addPage();
      y = doc.y;
      const nameHeight = doc.heightOfString(item.name, { width: colNameW });
      doc.text(item.name, xName, y, { width: colNameW });
      doc.text(money(item.unitPrice), xPrice, y, { width: colPriceW, align: 'right' });
      doc.text(String(item.quantity), xQty, y, { width: colQtyW, align: 'right' });
      if (hasDiscount) doc.text(item.discount ? money(item.discount) : '—', xDiscount, y, { width: colDiscountW, align: 'right' });
      doc.text(money(item.lineTotal), xTotal, y, { width: colTotalW, align: 'right' });
      // Ghi chú của Sale ("ít cay", "không hành") in ngay dưới tên món: đó là
      // thứ bếp và khách cần đối chiếu, mà hoá đơn lại là bản duy nhất khách
      // giữ lại được. Chữ nhỏ và nhạt hơn để không tranh chỗ với tên món.
      let noteHeight = 0;
      const vatSuffix = item.vatRate != null ? `VAT: ${item.vatRate}%` : '';
      const displayNote = [item.note ? formatBillNote(item.note) : '', vatSuffix].filter(Boolean).join(' | ');
      if (displayNote) {
        const noteY = y + nameHeight + 2;
        doc.fontSize(8.2).fillColor('#6f6070');
        noteHeight = doc.heightOfString(displayNote, { width: colNameW }) + 2;
        doc.text(displayNote, xName, noteY, { width: colNameW });
        doc.fontSize(8.7).fillColor('#222');
      }
      doc.y = y + Math.max(nameHeight, 12) + noteHeight + 7;
    });

    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#e6cede').stroke();
    doc.moveDown(0.6);

    // Tổng kết
    const summaryRow = (label, value, options = {}) => {
      const rowY = doc.y;
      const labelWidth = width - colTotalW - 10;
      (options.bold ? useBold() : useRegular()).fontSize(options.bold ? 12 : 9)
        .fillColor(options.bold ? '#b20c69' : '#444');
      doc.text(label, left, rowY, { width: labelWidth, align: 'right' });
      doc.text(value, xTotal - 10, rowY, { width: colTotalW + 10, align: 'right' });
      doc.y = rowY + (options.bold ? 20 : 15);
    };
    summaryRow(copy.subtotal, money(data.subtotal));
    if (data.totalDiscount > 0) summaryRow(copy.totalDiscount, `- ${money(data.totalDiscount)}`);
    if (data.vatAmount > 0) summaryRow(copy.vat, money(data.vatAmount));
    summaryRow(copy.grandTotal, money(data.totalAmount), { bold: true });
    if (data.paymentMethod) {
      summaryRow(copy.paymentMethod, paymentMethodLabel(data.paymentMethod, fonts.language));
    }

    doc.moveDown(1.1);
    useBold().fontSize(10.5).fillColor('#b20c69').text(copy.thanks, left, doc.y, { width, align: 'center' });
    useRegular().fontSize(7.8).fillColor('#897b88');
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

// Xuống hàng theo TỪ, không cắt cụt bằng "…".
//
// Bản PDF (pdfkit) vốn đã tự xuống hàng theo bề rộng cột, còn bản xem trước SVG
// thì cắt cụt — nên cùng một hoá đơn, khách thấy hai tên món khác nhau ở hai
// nơi. Tên món dài là thứ khách cần đọc đủ nhất ("Combo gia đình 4 người — cơm,
// canh, ba món mặn"), cắt đi là mất luôn phần phân biệt.
function wrapToWidth(text, fontSize, maxWidth, maxLines = 3) {
  const value = String(text ?? '').trim();
  if (!value) return [];
  const lines = [];
  let current = '';
  const flush = () => { if (current) { lines.push(current); current = ''; } };
  for (const word of value.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (approximateTextWidth(next, fontSize) <= maxWidth) { current = next; continue; }
    flush();
    // Một TỪ dài hơn cả cột (tên không dấu cách, hoặc chữ CJK): cắt theo ký tự.
    if (approximateTextWidth(word, fontSize) > maxWidth) {
      let piece = '';
      for (const char of word) {
        if (approximateTextWidth(piece + char, fontSize) > maxWidth) { lines.push(piece); piece = ''; }
        piece += char;
      }
      current = piece;
    } else {
      current = word;
    }
    if (lines.length >= maxLines) break;
  }
  flush();
  if (lines.length > maxLines) {
    // Quá dài thật thì mới cắt — và cắt ở hàng CUỐI, không phải hàng đầu.
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = truncateToWidth(kept[maxLines - 1] + ' …', fontSize, maxWidth);
    return kept;
  }
  return lines;
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

  // Bản xem trước cùng tỷ lệ bill dọc với PDF A5. Chiều cao tối thiểu giúp bill
  // ít món không co thành một dải ngang trong khung chat.
  const W = 440;
  const PAD = 22;
  const innerWidth = W - PAD * 2;
  const hasDiscount = data.items.some((item) => item.discount > 0) || data.totalDiscount > 0;

  const colTotalW = 82;
  const colDiscountW = hasDiscount ? 58 : 0;
  const colQtyW = 32;
  const colPriceW = 72;
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
    const fontStyle = options.style ? ` font-style="${options.style}"` : '';
    const size = options.size || 13;
    const fill = options.fill || '#2d2335';
    parts.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}"${weight}${anchor}${fontStyle}>${escapeXml(content)}</text>`);
  };
  const line = (y) => parts.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#e6cede" stroke-width="1"/>`);

  // Khối đầu hoá đơn: nền hồng phải CAO THEO nội dung.
  //
  // Trước đây chiều cao viết cứng 72px trong khi bên trong có ba dòng (tên cơ
  // sở, "HOÁ ĐƠN BÁN HÀNG", mã bill) — dòng mã bill rơi hẳn ra ngoài nền. Tên
  // cơ sở dài cũng bị cắt bằng "…" thay vì xuống hàng.
  //
  // Vẽ chữ vào một mảng riêng trước để biết đáy thật, rồi mới đẩy hình nền vào
  // TRƯỚC: SVG vẽ theo thứ tự, nền phải nằm dưới chữ.
  const headerParts = [];
  const headerText = (content, x, yy, options) => {
    const before = parts.length;
    text(content, x, yy, options);
    headerParts.push(...parts.splice(before));
  };

  const HEADER_TOP = 20;
  let y = 47;
  const sellerLines = data.sellerName ? wrapToWidth(data.sellerName, 19, innerWidth - 30, 2) : [];
  if (sellerLines.length) {
    sellerLines.forEach((lineText, index) => {
      headerText(lineText, W / 2, y + index * 23, { size: 19, weight: 700, fill: '#98205f', anchor: 'middle' });
    });
    y += 24 + (sellerLines.length - 1) * 23;
    headerText(copy.title, W / 2, y, { size: 10.5, weight: 700, fill: '#c52d77', anchor: 'middle' });
    y += 21;
  } else {
    headerText(copy.title, W / 2, y, { size: 18, weight: 700, fill: '#98205f', anchor: 'middle' });
    y += 25;
  }
  if (data.invoiceNo) { headerText(data.invoiceNo, W / 2, y, { size: 13, fill: '#6b5c69', anchor: 'middle' }); y += 20; }
  else y += 4;

  // Đáy nền = chân dòng cuối + một khoảng thở, không phải một con số đoán.
  const headerBottom = y - 20 + 12;
  parts.push(`<rect x="${PAD}" y="${HEADER_TOP}" width="${innerWidth}" height="${Math.round(headerBottom - HEADER_TOP)}" rx="13" fill="#fff1f8"/>`);
  parts.push(...headerParts);
  y = headerBottom + 16;

  const infoLine = (label, value) => {
    if (!value) return;
    text(`${label}: ${value}`, PAD, y, { size: 12, fill: '#3d3044' });
    y += 18;
  };
  // Ảnh xem trước phải khớp với PDF tải về, nếu không khách tưởng hai bản là
  // hai hoá đơn khác nhau.
  infoLine(copy.table, data.tableLabel);
  if (data.paymentMethod) infoLine(copy.paymentMethod, paymentMethodLabel(data.paymentMethod, code));
  infoLine(copy.openedAt, data.openedAt ? formatIssuedAt(data.openedAt, code) : '');
  infoLine(copy.printedAt, formatIssuedAt(data.issuedAt, code));
  infoLine(copy.customer, data.buyerName);
  infoLine(copy.email, data.buyerEmail);
  infoLine(copy.phone, data.buyerPhone);
  infoLine(copy.address, data.buyerAddress);
  infoLine(copy.sale, data.saleName);

  // Đóng dấu ĐÃ THANH TOÁN bên phải cạnh info khi đơn đã thanh toán
  if (data.isPaid) {
    const stampText = copy.paidStamp || 'ĐÃ THANH TOÁN';
    const stampX = W - PAD - 10;
    const stampY = headerBottom + 40;
    parts.push(`<g transform="rotate(-18, ${stampX - 50}, ${stampY - 6})">`
      + `<rect x="${stampX - 108}" y="${stampY - 18}" width="116" height="28" rx="4" fill="none" stroke="#d32f2f" stroke-width="2.5" opacity="0.85"/>`
      + `<rect x="${stampX - 105}" y="${stampY - 15}" width="110" height="22" rx="3" fill="none" stroke="#d32f2f" stroke-width="1" opacity="0.7"/>`
      + `<text x="${stampX - 50}" y="${stampY + 3}" font-size="13" font-weight="800" fill="#d32f2f" text-anchor="middle" opacity="0.85">${escapeXml(stampText)}</text>`
      + `</g>`);
  }

  y += 6; line(y); y += 20;

  text(copy.item, xName, y, { size: 9.5, weight: 700, fill: '#7a2a5c' });
  text(copy.unitPrice, xPriceEnd, y, { size: 9.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  text(copy.quantity, xQtyEnd, y, { size: 9.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  if (hasDiscount) text(copy.discount, xDiscountEnd, y, { size: 9.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  text(copy.lineTotal, xTotalEnd, y, { size: 9.5, weight: 700, fill: '#7a2a5c', anchor: 'end' });
  y += 8; line(y); y += 20;

  data.items.forEach((item) => {
    // Tên món xuống hàng như trong PDF; giá và số lượng vẫn ở hàng ĐẦU của món.
    const nameLines = wrapToWidth(item.name, 10.5, colNameW - 8);
    text(money(item.unitPrice), xPriceEnd, y, { size: 10.5, anchor: 'end' });
    text(String(item.quantity), xQtyEnd, y, { size: 10.5, anchor: 'end' });
    if (hasDiscount) text(item.discount ? money(item.discount) : '—', xDiscountEnd, y, { size: 10.5, anchor: 'end' });
    text(money(item.lineTotal), xTotalEnd, y, { size: 10.5, anchor: 'end' });
    nameLines.forEach((lineText, index) => {
      text(lineText, xName, y + index * 14, { size: 10.5 });
    });
    y += 22 + Math.max(0, nameLines.length - 1) * 14;
    // Ảnh xem trước phải khớp với PDF tải về, nếu không khách sẽ tưởng hai bản
    // là hai hoá đơn khác nhau.
    const vatSuffix = item.vatRate != null ? `VAT: ${item.vatRate}%` : '';
    const displayNote = [item.note ? formatBillNote(item.note) : '', vatSuffix].filter(Boolean).join(' | ');
    if (displayNote) {
      const noteLines = wrapToWidth(displayNote, 9.5, colNameW - 8, 2);
      noteLines.forEach((lineText, index) => {
        text(lineText, xName, y - 6 + index * 12, { size: 9.5, fill: '#6f6070', style: 'italic' });
      });
      y += 13 + Math.max(0, noteLines.length - 1) * 12;
    }
  });

  y -= 4; line(y); y += 24;

  // NHÃN PHẢI TRÁNH CHỖ SỐ TIỀN ĐANG ĐỨNG.
  //
  // Hai chuỗi đều căn phải, nhãn kết thúc đúng tại xDiscountEnd còn số tiền kéo
  // dài về bên trái từ xTotalEnd. Hoá đơn vài trăm nghìn thì không sao; tới
  // "3.278.000 đ" cỡ chữ 15 đậm là số tiền lấn qua mốc kia và chồng thẳng lên
  // chữ "TỔNG CỘNG" — đúng cái trong ảnh.
  //
  // Nên mốc phải của nhãn không được cố định: nó là điểm nào sớm hơn giữa
  // xDiscountEnd và mép trái của số tiền, chừa 10px thở.
  const summary = (label, value, options = {}) => {
    const size = options.bold ? 15 : 12.5;
    const fill = options.bold ? '#b20c69' : '#4a3f52';
    const valueLeft = xTotalEnd - approximateTextWidth(String(value), size);
    const labelEnd = Math.min(xDiscountEnd, valueLeft - 10);
    text(label, labelEnd, y, { size, weight: options.bold ? 700 : 400, fill, anchor: 'end' });
    text(value, xTotalEnd, y, { size, weight: options.bold ? 700 : 400, fill, anchor: 'end' });
    y += options.bold ? 26 : 20;
  };
  summary(copy.subtotal, money(data.subtotal));
  if (data.totalDiscount > 0) summary(copy.totalDiscount, `- ${money(data.totalDiscount)}`);
  if (data.vatAmount > 0) summary(copy.vat, money(data.vatAmount));
  summary(copy.grandTotal, money(data.totalAmount), { bold: true });
  // Payment method moved to info section above; no longer repeated in summary.

  y += 8;
  text(copy.thanks, W / 2, y, { size: 13, weight: 700, fill: '#b20c69', anchor: 'middle' });
  y += 18;
  text(copy.note, W / 2, y, { size: 10, fill: '#9b8d9c', anchor: 'middle' });
  y += 22;

  const H = Math.max(640, Math.round(y));
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
