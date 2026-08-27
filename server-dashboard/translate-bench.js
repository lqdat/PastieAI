/*
 * So sánh Gemini và Cloud Translation (NMT) trên chính máy chủ đang chạy.
 *
 * Số liệu trên blog đo ở mạng/khu vực khác nên không dùng để quyết định được.
 * Script này gửi cùng một bộ câu chat thật qua cả hai đường, in ra độ trễ
 * p50/p95 và đặt hai bản dịch cạnh nhau để tự chấm chất lượng.
 *
 *   node translate-bench.js            # chạy đủ 2 đường, 3 lượt mỗi câu
 *   node translate-bench.js --runs=5   # đổi số lượt
 *   node translate-bench.js --target=en
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const arg = (name, fallback) => {
  const found = process.argv.find((item) => item.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : fallback;
};

const RUNS = Number(arg('runs', 3));
const TARGET = arg('target', 'en');

// Câu chat thật, cố tình gồm cả viết tắt, xưng hô và tên riêng địa phương —
// đây mới là chỗ NMT và LLM khác nhau rõ nhất.
const SAMPLES = [
  'ok',
  'cảm ơn bạn nhé',
  'phòng còn trống ko a',
  'bn tiền 1 đêm v ạ',
  'cho e hỏi đi Hòn Thơm mất bao lâu',
  'Anh cho em xin số phòng và giờ nhận phòng với ạ, em tới lúc 2h chiều nay.',
  'Chị ơi bên mình có xe đưa đón sân bay Phú Quốc không, giá thế nào ạ?',
];

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

async function timeIt(fn) {
  const started = Date.now();
  try {
    const value = await fn();
    return { ms: Date.now() - started, value, ok: true };
  } catch (error) {
    return { ms: Date.now() - started, value: `LỖI: ${error.message}`, ok: false };
  }
}

async function main() {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasNmt = !!process.env.GOOGLE_TRANSLATE_API_KEY;
  console.log(`Đích: ${TARGET} · ${RUNS} lượt/câu · Gemini: ${hasGemini ? 'có' : 'THIẾU KEY'} · NMT: ${hasNmt ? 'có' : 'THIẾU KEY'}\n`);

  // Nạp helper hai lần với TRANSLATION_PROVIDER khác nhau để so đúng hai đường.
  const load = (provider) => {
    process.env.TRANSLATION_PROVIDER = provider;
    delete require.cache[require.resolve('./gemini-helper')];
    return require('./gemini-helper');
  };

  const results = { gemini: [], nmt: [] };

  for (const text of SAMPLES) {
    console.log(`— "${text}"`);
    for (const provider of ['gemini', 'nmt']) {
      if (provider === 'gemini' && !hasGemini) continue;
      if (provider === 'nmt' && !hasNmt) continue;

      const helper = load(provider);
      let sample = null;
      for (let run = 0; run < RUNS; run++) {
        const result = await timeIt(() => helper.translateText(text, TARGET));
        results[provider].push(result.ms);
        if (run === 0) sample = result;
      }
      const out = sample.ok ? sample.value.translatedText : sample.value;
      const via = sample.ok ? sample.value.provider : '-';
      console.log(`   ${provider.padEnd(6)} ${String(sample.ms).padStart(5)}ms  [${via}]  ${out}`);
    }
    console.log('');
  }

  console.log('Tổng hợp độ trễ:');
  for (const [provider, values] of Object.entries(results)) {
    if (!values.length) continue;
    const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    console.log(`   ${provider.padEnd(6)} n=${String(values.length).padStart(3)}  tb ${String(avg).padStart(5)}ms  p50 ${String(percentile(values, 50)).padStart(5)}ms  p95 ${String(percentile(values, 95)).padStart(5)}ms`);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
