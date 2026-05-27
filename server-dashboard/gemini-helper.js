const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey) {
  ai = new GoogleGenerativeAI(apiKey);
} else {
  console.error('WARNING: GEMINI_API_KEY is not defined. Gemini AI translation will be disabled.');
}


/**
 * Translates text and detects its source language using Gemini.
 * @param {string} text The text to translate.
 * @param {string} targetLang The target language (e.g., "vi", "en", "ru", "zh").
 * @returns {Promise<{translatedText: string, detectedLang: string}>}
 */
async function translateText(text, targetLang) {
  if (!ai) {
    console.warn('Gemini AI not initialized. Returning original text.');
    return { translatedText: text, detectedLang: 'unknown' };
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const targetLangName = {
      'vi': 'Vietnamese',
      'en': 'English',
      'ru': 'Russian',
      'zh': 'Chinese'
    }[targetLang.toLowerCase()] || targetLang;

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
    
    // Parse the JSON response
    try {
      // Clean up markdown wrapper if model accidentally outputs it
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      return {
        translatedText: parsed.translated_text || text,
        detectedLang: parsed.detected_language || 'unknown'
      };
    } catch (e) {
      console.error('Failed to parse Gemini translation JSON response:', responseText, e);
      return { translatedText: responseText || text, detectedLang: 'unknown' };
    }
  } catch (error) {
    console.error('Error calling Gemini API for translation:', error.message);
    return { translatedText: text, detectedLang: 'unknown' };
  }
}

/**
 * Analyzes the chat history to generate tags and a short summary.
 * @param {Array<{sender: string, text: string}>} messages List of messages in the session.
 * @returns {Promise<{summary: string, tags: string}>}
 */
async function analyzeSession(messages) {
  if (!ai || !messages || messages.length === 0) {
    return { summary: 'Không có dữ liệu phân tích.', tags: '' };
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    try {
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      return {
        summary: parsed.summary || 'Không thể tạo tóm tắt.',
        tags: parsed.tags || ''
      };
    } catch (e) {
      console.error('Failed to parse Gemini analysis JSON response:', responseText, e);
      return { summary: 'Lỗi phân tích cú pháp kết quả AI.', tags: '' };
    }
  } catch (error) {
    console.error('Error calling Gemini API for analysis:', error.message);
    return { summary: 'Lỗi kết nối với Gemini AI.', tags: '' };
  }
}

module.exports = {
  translateText,
  analyzeSession
};
