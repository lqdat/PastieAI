const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
// Cloud Translation Basic (v2) is used for real-time chat translation.
// Keep this separate from GEMINI_API_KEY: Gemini remains available for the
// chatbot, summaries, and other AI features.
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
// The preferred model can be overridden from .env.  When it is unavailable,
// try the newest compatible alternatives before using the non-Gemini fallback.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_MODEL_FALLBACKS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.6-flash,gemini-3.5-flash,gemini-2.5-flash')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);
const GEMINI_MODELS = [...new Set([GEMINI_MODEL, ...GEMINI_MODEL_FALLBACKS])];
let ai = null;

if (apiKey) {
  ai = new GoogleGenerativeAI(apiKey);
} else {
  console.error('WARNING: GEMINI_API_KEY is not defined. Gemini AI will be disabled.');
}

if (!GOOGLE_TRANSLATE_API_KEY) {
  console.warn('WARNING: GOOGLE_TRANSLATE_API_KEY is not defined. Cloud Translation is disabled.');
}

async function runGemini(request, modelOptions = {}) {
  if (!ai) throw new Error('GEMINI_API_KEY not set');

  let lastError;
  for (const modelName of GEMINI_MODELS) {
    try {
      return await request(ai.getGenerativeModel({ model: modelName, ...modelOptions }), modelName);
    } catch (error) {
      lastError = error;
      console.warn(`[Gemini] ${modelName} failed; trying next model:`, error.message);
    }
  }
  throw lastError || new Error('No Gemini models are configured');
}

// ── Groq fallback ─────────────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function groqChat(systemPrompt, historyMerged, userMessage) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const messages = [
    { role: 'system', content: systemPrompt.substring(0, 6000) }, // cap system prompt to avoid context overflow
    ...historyMerged.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.text
    })),
    { role: 'user', content: userMessage }
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 512, temperature: 0.7 }),
      signal: controller.signal
    });
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) throw new Error(JSON.stringify(data.error || data));
    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeout);
  }
}
// ─────────────────────────────────────────────────────────────────────────────


function decodeHtmlEntities(text = '') {
  return String(text)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// ── Dịch chat: Gemini làm chính, Cloud Translation (NMT) làm dự phòng ────────
//
// Vì sao bản Gemini cũ chậm và bản này không:
//   1. Bản cũ bắt model trả JSON {"translated_text","detected_language"} rồi
//      strip markdown + JSON.parse. Model phải sinh thêm token cấu trúc nên
//      chậm hẳn. Ở đây model chỉ trả về ĐÚNG câu dịch, không gì khác.
//   2. Lý do duy nhất phải dùng JSON là để lấy detected_language. Giờ tách hẳn:
//      nếu nơi gọi đã biết ngôn ngữ nguồn thì bỏ qua bước phát hiện; nếu chưa
//      biết thì gọi endpoint detect của Cloud Translation CHẠY SONG SONG với
//      Gemini — tổng thời gian bằng cái chậm hơn, không phải tổng hai cái.
//   3. Prompt ngắn lại: ít token đầu vào thì phản hồi tới sớm hơn.
//
// Nếu Gemini lỗi hoặc quá GEMINI_TRANSLATE_TIMEOUT_MS thì tự rơi sang NMT, nên
// đường dịch không bao giờ chết hẳn khi một bên gặp sự cố.
//
// ĐO THẬT trên Railway (26/08/2026, dịch vi -> en, câu chat thật):
//     "ok"                    Gemini 1951ms  |  NMT  251ms
//     "cảm ơn bạn nhé"        Gemini 4885ms  |  NMT 1266ms
//     "phòng còn trống ko a"  Gemini 4808ms  |  NMT  111ms
//     "bn tiền 1 đêm v ạ"     Gemini 7020ms  |  NMT  125ms
// Chậm hơn 4-56 lần, trong khi bản dịch ra gần như y hệt: NMT xử lý đúng cả
// viết tắt kiểu "bn tiền", "ko a", "v ạ". Vì vậy MẶC ĐỊNH LÀ 'nmt'.
// Muốn thử lại Gemini thì đặt TRANSLATION_PROVIDER=gemini, nhưng hãy đo lại
// bằng translate-bench.js trước khi bật cho khách.
const TRANSLATION_PROVIDER = (process.env.TRANSLATION_PROVIDER || 'nmt').toLowerCase();
// Cho phép trỏ riêng model dịch sang bản nhẹ/nhanh hơn mà không đụng tới
// chatbot và phần tóm tắt. Bỏ trống thì dùng chung chuỗi model ở trên.
const GEMINI_TRANSLATE_MODELS = (process.env.GEMINI_TRANSLATE_MODELS || '')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);
// Dịch nằm trên đường tới hạn nên phải THẤT BẠI NHANH rồi nhường cho NMT.
// 2500ms là quá dài: log thực tế cho thấy nó cộng dồn thành >7s.
const GEMINI_TRANSLATE_TIMEOUT_MS = Number(process.env.GEMINI_TRANSLATE_TIMEOUT_MS || 1500);

const LANGUAGE_NAMES = {
  vi: 'Vietnamese', en: 'English', ru: 'Russian', zh: 'Chinese (Simplified)', ko: 'Korean',
};

const normalizeLangCode = (value) => String(value || '').trim().toLowerCase().slice(0, 2);

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label || `Timeout sau ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Chỉ phát hiện ngôn ngữ, không dịch. Rẻ và nhanh hơn nhiều so với bắt Gemini
// vừa dịch vừa trả về mã ngôn ngữ trong JSON.
async function detectLanguageWithNmt(text) {
  if (!GOOGLE_TRANSLATE_API_KEY) return 'unknown';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${encodeURIComponent(GOOGLE_TRANSLATE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text }),
        signal: controller.signal,
      }
    );
    const data = await response.json().catch(() => ({}));
    const detected = data?.data?.detections?.[0]?.[0]?.language;
    return detected ? normalizeLangCode(detected) : 'unknown';
  } catch (error) {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}

// Model đôi khi vẫn trả kèm dấu ngoặc kép hoặc rào đón dù prompt đã yêu cầu
// không làm vậy — dọn lại cho chắc.
function cleanTranslationOutput(raw, fallback) {
  let output = String(raw || '').trim();
  if (!output) return fallback;
  output = output.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '').trim();
  if (output.length > 1 && /^".*"$/s.test(output)) output = output.slice(1, -1).trim();
  return output || fallback;
}

async function translateWithGemini(text, targetLang) {
  const targetName = LANGUAGE_NAMES[normalizeLangCode(targetLang)] || targetLang;
  // Prompt cố tình ngắn: mỗi token đầu vào đều cộng vào độ trễ.
  const prompt = `Translate the chat message below into ${targetName}.
Reply with ONLY the translation - no quotes, no explanation, no extra text.
Keep emoji, names, numbers and links unchanged. If it is already in ${targetName}, repeat it unchanged.

${text}`;

  // CHỈ thử ĐÚNG MỘT model. Chuỗi fallback nhiều model hợp lý cho chatbot,
  // nhưng ở đây mỗi lần thử hỏng lại cộng thêm một khoảng timeout — log thực tế
  // cho thấy 3 model x 2500ms = hơn 7 giây trước khi chịu rơi sang NMT. Với dịch
  // realtime thì thà hỏng ngay rồi để NMT trả lời trong ~150ms.
  const modelName = (GEMINI_TRANSLATE_MODELS.length ? GEMINI_TRANSLATE_MODELS : GEMINI_MODELS)[0];
  const model = ai.getGenerativeModel({ model: modelName });
  const result = await withTimeout(
    model.generateContent(prompt),
    GEMINI_TRANSLATE_TIMEOUT_MS,
    `Gemini dịch quá ${GEMINI_TRANSLATE_TIMEOUT_MS}ms`
  );
  return cleanTranslationOutput(result.response.text(), text);
}

async function translateWithNmt(text, targetLang) {
  if (!GOOGLE_TRANSLATE_API_KEY) throw new Error('GOOGLE_TRANSLATE_API_KEY chưa được cấu hình');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(GOOGLE_TRANSLATE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: normalizeLangCode(targetLang) || 'en', format: 'text' }),
        signal: controller.signal,
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.data?.translations?.[0]) {
      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }
    const result = data.data.translations[0];
    return {
      translatedText: decodeHtmlEntities(result.translatedText || text),
      detectedLang: normalizeLangCode(result.detectedSourceLanguage) || 'unknown',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} text
 * @param {string} targetLang
 * @param {{ sourceLang?: string }} [options] - Truyền sourceLang khi đã biết
 *        ngôn ngữ nguồn để bỏ hẳn một lượt gọi phát hiện ngôn ngữ.
 */
async function translateText(text, targetLang, options = {}) {
  const sourceText = String(text || '').trim();
  if (!sourceText) return { translatedText: sourceText, detectedLang: 'unknown', provider: 'none' };

  const knownSource = normalizeLangCode(options.sourceLang);
  const useGemini = TRANSLATION_PROVIDER === 'gemini' && !!ai;

  if (useGemini) {
    try {
      // Dịch và phát hiện ngôn ngữ chạy song song: tổng thời gian bằng cái chậm
      // hơn. Bỏ qua phát hiện nếu nơi gọi đã biết ngôn ngữ nguồn.
      const [translatedText, detectedLang] = await Promise.all([
        translateWithGemini(sourceText, targetLang),
        knownSource && knownSource !== 'unknown'
          ? Promise.resolve(knownSource)
          : detectLanguageWithNmt(sourceText),
      ]);
      return { translatedText, detectedLang: detectedLang || 'unknown', provider: 'gemini' };
    } catch (error) {
      console.warn('[Dịch] Gemini thất bại, chuyển sang Cloud Translation:', error.message);
    }
  }

  try {
    const result = await translateWithNmt(sourceText, targetLang);
    return { ...result, detectedLang: knownSource || result.detectedLang, provider: 'nmt' };
  } catch (error) {
    console.error('[Dịch] Cloud Translation cũng thất bại:', error.message);
    // Cả hai đường đều chết: trả nguyên văn để tin nhắn không bị mất.
    return { translatedText: sourceText, detectedLang: knownSource || 'unknown', provider: 'none' };
  }
}

/*
 * Legacy Gemini translation implementation retained intentionally for rollback.
 * It is disabled because JSON-generation latency made real-time chat appear slow.
 *
async function translateTextWithGemini(text, targetLang) {
  // 1. Try Gemini
  if (ai) {
    try {
      const targetLangName = { vi: 'Vietnamese', en: 'English', ru: 'Russian', zh: 'Chinese' }[targetLang.toLowerCase()] || targetLang;
      const prompt = `You are a real-time chat translator. Translate the following text into ${targetLangName}.
Input text: "${text}"

Requirements:
1. Detect the original language of the input text (use 2-letter ISO code e.g. "vi", "en", "ru", "zh").
2. If the text is already in the target language, do not translate it, but still detect the language.
3. Return the response strictly as a JSON object with the following format:
{
  "translated_text": "your translated text here",
  "detected_language": "2-letter ISO code of original text"
}
Do not wrap the JSON response in markdown code blocks. Return only raw JSON.`;
      const result = await runGemini(model => model.generateContent(prompt));
      const responseText = result.response.text().trim();
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      return { translatedText: parsed.translated_text || text, detectedLang: parsed.detected_language || 'unknown' };
    } catch (error) {
      console.warn('[Gemini] translateText failed, falling back:', error.message);
    }
  }

  // 2. Fallback: free Google Translate
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang.toLowerCase()}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    const translatedText = data[0].map(item => item[0]).join('');
    const detectedLang = data[2] || 'unknown';
    return { translatedText, detectedLang };
  } catch (err) {
    console.error('All translation options failed:', err.message);
    return { translatedText: text, detectedLang: 'unknown' };
  }
}
*/


async function analyzeSession(messages) {
  if (!messages || messages.length === 0) {
    return { summary: 'Không có dữ liệu phân tích.', tags: '' };
  }

  const conversationDump = messages
    .map(m => `${m.sender === 'visitor' ? 'Khách hàng' : 'Nhân viên'}: ${m.text}`)
    .join('\n');

  const prompt = `Bạn là một trợ lý AI phân tích hội thoại chăm sóc khách hàng.
Hãy đọc đoạn hội thoại sau và thực hiện phân tích:

Hội thoại:
"""
${conversationDump}
"""

Yêu cầu:
1. Tạo một bản tóm tắt ngắn bằng tiếng Việt (tối đa 2 câu) mô tả mục đích và kết quả cuộc hội thoại.
2. Gắn các thẻ ý định (intent tags) bằng tiếng Việt ngăn cách bởi dấu phẩy, phản ánh chủ đề cuộc chat (ví dụ: 'báo_giá, tư_vấn, khiếu_nại, hợp_tác, tuyển_dụng').
3. Trả về kết quả dạng JSON thuần túy như sau:
{
  "summary": "Nội dung tóm tắt ở đây",
  "tags": "tag1, tag2, tag3"
}
Không bao quanh JSON bằng các khối mã markdown.`;

  // Try Gemini first, then Groq
  const tryParse = (text) => {
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { summary: parsed.summary || 'Không thể tạo tóm tắt.', tags: parsed.tags || '' };
  };

  if (ai) {
    try {
      const result = await runGemini(model => model.generateContent(prompt));
      return tryParse(result.response.text().trim());
    } catch (error) {
      console.warn('[Gemini] analyzeSession failed, trying Groq:', error.message);
    }
  }

  if (GROQ_API_KEY) {
    try {
      const reply = await groqChat('You are a helpful assistant that returns only valid JSON.', [], prompt);
      return tryParse(reply);
    } catch (e) {
      console.error('[Groq] analyzeSession failed:', e.message);
    }
  }

  return { summary: 'Lỗi kết nối AI.', tags: '' };
}


const CHATBOT_FALLBACK = {
  vi: 'Xin lỗi, hệ thống đang xử lý. Nhân viên sẽ hỗ trợ bạn sớm nhất!',
  en: 'Sorry, our system is processing. A support agent will assist you shortly!',
  ru: 'Извините, система обрабатывает запрос. Оператор свяжется с вами в ближайшее время!',
  zh: '抱歉，系统正在处理中。客服人员将尽快与您联系！',
};

async function generateChatbotResponse(systemInstruction, history, userMessage, lang = 'vi') {
  const fallback = CHATBOT_FALLBACK[lang] || CHATBOT_FALLBACK['en'];

  // Build merged history (Gemini format, reused for Groq too)
  const raw = [];
  for (const msg of history) {
    const role = msg.sender === 'visitor' ? 'user' : 'model';
    const text = (msg.original_text || msg.text || '').trim();
    if (!text) continue;
    raw.push({ role, text });
  }
  const merged = [];
  for (const item of raw) {
    if (merged.length > 0 && merged[merged.length - 1].role === item.role) {
      merged[merged.length - 1].text += '\n' + item.text;
    } else {
      merged.push({ ...item });
    }
  }
  while (merged.length > 0 && merged[0].role !== 'user') merged.shift();

  // 1. Try Gemini
  if (ai) {
    try {
      const contents = merged.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
      const chatResult = await runGemini(
        model => model.generateContent({ contents }),
        { systemInstruction }
      );
      return chatResult.response.text().trim();
    } catch (error) {
      console.warn('[Gemini] generateChatbotResponse failed, trying Groq:', error.message);
    }
  }

  // 2. Fallback to Groq
  if (GROQ_API_KEY) {
    try {
      console.log('[Groq] generateChatbotResponse using Groq fallback.');
      return await groqChat(systemInstruction, merged, userMessage);
    } catch (e) {
      console.error('[Groq] generateChatbotResponse failed:', e.message);
    }
  }

  return fallback;
}


const SUPPORTED_LANGS = ['vi', 'en', 'ru', 'zh'];

async function detectLanguage(text) {
  if (!text?.trim()) return 'en';
  try {
    if (ai) {
      const prompt = `Detect the language of the following text. Return ONLY a 2-letter ISO 639-1 language code (e.g. "vi", "en", "ru", "zh"). No explanation, just the code.\n\nText: "${text.substring(0, 200)}"`;
      const result = await runGemini(model => model.generateContent(prompt));
      const lang = result.response.text().trim().toLowerCase().replace(/[^a-z]/g, '');
      return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    }
  } catch (e) {
    console.warn('detectLanguage failed:', e.message);
  }
  return 'en';
}

module.exports = {
  translateText,
  analyzeSession,
  generateChatbotResponse,
  detectLanguage
};
