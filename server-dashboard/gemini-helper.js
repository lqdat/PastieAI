const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey) {
  ai = new GoogleGenerativeAI(apiKey);
} else {
  console.error('WARNING: GEMINI_API_KEY is not defined. Gemini AI will be disabled.');
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


async function translateText(text, targetLang) {
  // 1. Try Gemini
  if (ai) {
    try {
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

      const result = await model.generateContent(prompt);
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
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
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
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction });
      const contents = merged.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
      const chatResult = await model.generateContent({ contents });
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
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Detect the language of the following text. Return ONLY a 2-letter ISO 639-1 language code (e.g. "vi", "en", "ru", "zh"). No explanation, just the code.\n\nText: "${text.substring(0, 200)}"`;
      const result = await model.generateContent(prompt);
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
