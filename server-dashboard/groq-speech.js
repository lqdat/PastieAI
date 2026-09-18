// Nhận diện giọng nói -> chữ, dùng Whisper chạy trên Groq.
//
// Vì sao chọn Groq thay vì Google Cloud Speech-to-Text:
//   1. Dùng lại đúng GROQ_API_KEY đã có sẵn — xác thực bằng Bearer token, không
//      cần service account. Tổ chức Google Cloud của dự án đang bật chính sách
//      iam.disableServiceAccountKeyCreation nên không tạo được khóa service
//      account, mà gỡ chính sách đó là hạ một lớp bảo mật.
//   2. Rẻ hơn khoảng 24 lần ($0,04/giờ so với $0,96/giờ), free tier 8 giờ/ngày
//      so với 60 phút/tháng.
//   3. Nhận thẳng MP4/M4A/WebM. Google streaming không nhận MP4/AAC — đúng thứ
//      iOS Safari xuất ra — nên nếu dùng Google thì phải tự lấy PCM thô rồi hạ
//      mẫu 16kHz. Với Groq thì MediaRecorder mặc định của trình duyệt là đủ.
//
// Đánh đổi: Groq chỉ nhận nguyên file, không có streaming. Nghĩa là chữ chỉ hiện
// sau khi bấm dừng ghi, không chạy realtime trong lúc đang nói.

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_SPEECH_MODEL = process.env.GROQ_SPEECH_MODEL || 'whisper-large-v3-turbo';
const GROQ_SPEECH_TIMEOUT_MS = Number(process.env.GROQ_SPEECH_TIMEOUT_MS || 20000);

const isConfigured = !!GROQ_API_KEY;

if (!isConfigured) {
  console.warn('[Speech] Thiếu GROQ_API_KEY — tính năng đọc để nhập chữ sẽ bị tắt.');
}

// Whisper nhận mã ngôn ngữ ISO-639-1. Truyền đúng ngôn ngữ người nói giúp nhận
// diện chính xác hơn hẳn so với để nó tự đoán, nhất là với câu ngắn.
// Whisper có hỗ trợ tiếng Kazakh; thiếu nó ở đây thì khách nói tiếng Kazakh bị
// để cho mô hình tự đoán — mà đoán sai ngôn ngữ là nguồn sinh ảo giác lớn nhất.
const SUPPORTED_HINTS = new Set(['vi', 'en', 'ru', 'zh', 'ko', 'kk']);

function normalizeLanguageHint(language) {
  const code = String(language || '').trim().toLowerCase().slice(0, 2);
  return SUPPORTED_HINTS.has(code) ? code : null;
}

/**
 * @param {Buffer} buffer      Dữ liệu âm thanh thô
 * @param {string} fileName    Tên file kèm đuôi, dùng để Groq đoán định dạng
 * @param {string} mimeType    Content-Type của bản ghi
 * @param {string} [language]  Gợi ý ngôn ngữ người nói
 * @returns {Promise<{ text: string }>}
 */
async function transcribeAudio(buffer, fileName, mimeType, language) {
  if (!isConfigured) throw new Error('Chưa cấu hình GROQ_API_KEY trên máy chủ.');
  if (!buffer || !buffer.length) throw new Error('Không có dữ liệu âm thanh.');

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), fileName || 'audio.webm');
  form.append('model', GROQ_SPEECH_MODEL);
  form.append('response_format', 'json');
  // temperature 0: bám sát tiếng nói, không "sáng tác" thêm cho trôi chảy.
  form.append('temperature', '0');

  const hint = normalizeLanguageHint(language);
  if (hint) form.append('language', hint);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_SPEECH_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      // 429 hay gặp nhất: chạm trần free tier (20 lượt/phút, 2000 lượt/ngày).
      if (response.status === 429) throw new Error('Hệ thống đang nhận quá nhiều yêu cầu, thử lại sau giây lát.');
      throw new Error(message);
    }

    const rawText = String(data.text || '').trim();
    const cleanText = sanitizeTranscribedText(rawText);
    return { text: cleanText };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Nhận diện giọng nói quá lâu, vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ── LỌC ẢO GIÁC CỦA WHISPER ───────────────────────────────────────────────
//
// Bấm ghi âm rồi KHÔNG NÓI GÌ, Whisper vẫn trả về một câu hoàn chỉnh. Không
// phải lỗi ngẫu nhiên: mô hình được luyện trên phụ đề YouTube, nên khi không có
// tiếng nói nó rơi về câu xuất hiện dày đặc nhất trong dữ liệu luyện — với
// tiếng Việt đó là lời kêu gọi đăng ký kênh và câu chào cuối video.
//
// Khách thấy trong ô chat của mình dòng "Hãy subscribe cho kênh Ghiền Mì Gõ…"
// — một câu họ chưa từng nói, mang tên một kênh không liên quan gì đến quán.
//
// Lọc chia làm HAI TẦNG, và ranh giới giữa chúng là cố ý:
//
//   Tầng A — DẤU HIỆU CHẮC CHẮN LÀ RÁC. Tên kênh, lời kêu gọi đăng ký, dòng ghi
//   công phụ đề. Không một người khách nào đang ngồi trong quán lại nói những
//   chữ này vào micro. Thấy ở BẤT KỲ ĐÂU trong câu là bỏ cả câu.
//
//   Tầng B — CÂU KẾT VIDEO. "Cảm ơn các bạn đã theo dõi và hẹn gặp lại" là ảo
//   giác, nhưng "cảm ơn" thì lại là chữ khách nói thật mỗi ngày. Nên tầng này
//   đòi TRÙNG KHỚP CẢ CÂU sau khi chuẩn hoá, không phải chứa. Nhờ vậy khách nói
//   "cảm ơn bạn nhé" vẫn đi qua, còn đúng câu kết video thì bị chặn.
//
// Chuẩn hoá trước khi so: bỏ dấu tiếng Việt, hạ chữ thường, bỏ dấu câu, gộp
// khoảng trắng — vì Whisper trả về cùng một câu với dấu câu và cách viết hoa
// khác nhau tuỳ lần.
function chuanHoaDeSo(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // bỏ dấu thanh và dấu mũ
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // bỏ dấu câu, giữ chữ mọi bảng chữ cái
    .replace(/\s+/g, ' ')
    .trim();
}

// Tầng A: thấy ở bất kỳ đâu trong câu là bỏ.
const DAU_HIEU_RAC = [
  'ghien mi go',            // tên kênh YouTube xuất hiện nhiều nhất trong ảo giác tiếng Việt
  'subscribe',
  'dang ky kenh',
  'dang ky de khong bo lo',
  'bam chuong thong bao',
  'amara org',              // "Subtitles by the Amara.org community"
  'subtitles by',
  'phu de boi',
];
// Các bảng chữ cái không dùng dấu thanh kiểu tiếng Việt thì so thẳng trên chữ
// gốc (đã hạ chữ thường). Lưu ý tiếng Nga: bước bỏ dấu ở trên biến "й" thành
// "и" — "подписывайтесь" thành "подписываитесь" — nên chuỗi này phải nằm ở đây
// chứ không nằm trong danh sách đã chuẩn hoá.
const DAU_HIEU_RAC_NGUYEN_VAN = [
  'подписывайтесь',
  'подписываитесь',
  '订阅',
  '字幕',
  '구독',
];

// Tầng B: phải trùng khớp CẢ CÂU sau chuẩn hoá.
const CAU_KET_VIDEO = [
  'cam on cac ban da theo doi va hen gap lai',
  'cam on cac ban da theo doi',
  'cam on cac ban da xem video',
  'hen gap lai cac ban trong video tiep theo',
  'hen gap lai cac ban',
  'chuc cac ban xem video vui ve',
  'xin chao cac ban',
  'thank you for watching',
  'thanks for watching',
  'see you in the next video',
  'thank you',
  'bye',
  'you',
  // Các nhãn âm thanh mô hình tự chèn khi không có tiếng nói.
  'am nhac', 'tieng tho', 'im lang', 'music', 'silence', 'applause',
  'laughter', 'whispering', 'cough',
  'spasibo za prosmotr',
];

function sanitizeTranscribedText(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return '';

  // Im lặng hoàn toàn: Whisper hay trả về đúng một dấu chấm, "..." hoặc "。".
  const stripped = text.replace(/^[.\s,。!?…·\-_:;'"“”‘’`~]+|[.\s,。!?…·\-_:;'"“”‘’`~]+$/g, '').trim();
  if (!stripped) return '';

  // Nhãn trong ngoặc: "(tiếng nhạc)", "[Applause]", "{音楽}".
  if (/^(\(|\[|\{).+(\)|\]|\})$/.test(text)) return '';

  const chuan = chuanHoaDeSo(stripped);
  if (!chuan) return '';

  if (DAU_HIEU_RAC.some((dau) => chuan.includes(dau))) return '';
  const thuong = text.toLowerCase();
  if (DAU_HIEU_RAC_NGUYEN_VAN.some((dau) => thuong.includes(dau))) return '';
  if (CAU_KET_VIDEO.includes(chuan)) return '';

  return text;
}

module.exports = {
  isConfigured,
  transcribeAudio,
  normalizeLanguageHint,
  sanitizeTranscribedText,
  chuanHoaDeSo,
};
