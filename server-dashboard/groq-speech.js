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
const SUPPORTED_HINTS = new Set(['vi', 'en', 'ru', 'zh', 'ko']);

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

    return { text: String(data.text || '').trim() };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Nhận diện giọng nói quá lâu, vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { isConfigured, transcribeAudio, normalizeLanguageHint };
