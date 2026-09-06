// Mã hoá nội dung tin nhắn khi LƯU (encryption at rest).
//
// KHÔNG phải mã hoá đầu cuối, và đừng bao giờ quảng cáo là như vậy. Máy chủ
// giữ khoá nên máy chủ đọc được — nó buộc phải đọc được, vì toàn bộ sản phẩm
// dựa trên việc dịch nội dung, chatbot trả lời, quét từ khoá chuyển nhân viên
// và Agent giám sát Sale. Thứ này chống được đúng một ca, nhưng là ca hay xảy
// ra nhất: bản sao lưu hoặc file dump database lọt ra ngoài.
//
// AES-256-GCM: vừa giấu nội dung vừa phát hiện sửa đổi. Dùng CBC hay ECB thì
// kẻ có quyền ghi vào database sửa được nội dung tin nhắn mà không ai biết.
//
// Định dạng: pcv1:<iv base64>:<tag base64>:<ciphertext base64>
// Có tiền tố nên phân biệt được dòng đã mã hoá với dòng cũ còn plaintext —
// nhờ đó bật tính năng này KHÔNG cần chạy migration toàn bảng, và tắt đi cũng
// không làm hỏng dữ liệu cũ.
const crypto = require('crypto');

const PREFIX = 'pcv1:';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;   // độ dài IV chuẩn của GCM

function loadKey() {
  const raw = String(process.env.MESSAGE_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  let key;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    key = null;
  }
  if (!key || key.length !== 32) {
    // Khoá sai độ dài mà vẫn chạy tiếp là tệ nhất: tin nhắn ghi ra bằng một
    // khoá rác thì không ai đọc lại được nữa. Dừng hẳn còn hơn.
    throw new Error(
      'MESSAGE_ENCRYPTION_KEY phải là 32 byte mã hoá base64. '
      + 'Sinh khoá: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  return key;
}

const KEY = loadKey();
const ENABLED = !!KEY;

if (!ENABLED) {
  console.warn('[Bảo mật] MESSAGE_ENCRYPTION_KEY chưa đặt — nội dung tin nhắn lưu dạng thường.');
}

const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

/**
 * Mã hoá một chuỗi. Không có khoá thì trả nguyên văn — để môi trường dev và
 * staging chạy được mà không cần cấu hình gì.
 */
function encryptText(value) {
  if (!ENABLED || value === null || value === undefined) return value;
  const text = String(value);
  if (text === '' || isEncrypted(text)) return text;   // đã mã hoá rồi thì thôi
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64')).join(':');
}

/**
 * Giải mã. Chuỗi không có tiền tố được trả nguyên văn: đó là dòng cũ ghi từ
 * trước khi bật mã hoá, và chúng vẫn phải đọc được.
 */
function decryptText(value) {
  if (!isEncrypted(value)) return value;
  if (!ENABLED) return value;   // không có khoá thì trả nguyên chuỗi mã, đừng làm sập request
  const [, ivB64, tagB64, bodyB64] = String(value).split(':');
  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(bodyB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch (error) {
    // Sai khoá, nội dung bị sửa, hoặc đây vốn không phải bản mã của mình (một
    // tin nhắn tình cờ bắt đầu bằng "pcv1:"). Trả lại NGUYÊN VĂN chứ không trả
    // chuỗi rỗng: chuỗi rỗng thì tin nhắn thật của khách biến mất không dấu vết,
    // còn trả nguyên văn thì tệ nhất là hiện ra một chuỗi rõ ràng vô nghĩa —
    // không ai nhầm nó với một tin nhắn có thật.
    //
    // Không ném lỗi ra giữa luồng chat: một dòng hỏng không được làm chết cả
    // cuộc trò chuyện.
    console.error('[Bảo mật] Không giải mã được một giá trị:', error.message);
    return value;
  }
}

module.exports = { encryptText, decryptText, isEncrypted, ENABLED, PREFIX };
