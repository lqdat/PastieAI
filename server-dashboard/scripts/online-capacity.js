#!/usr/bin/env node
/**
 * Đo sức chịu người dùng online CÙNG LÚC.
 *
 *   node scripts/online-capacity.js --code qr_abc
 *   node scripts/online-capacity.js --code qr_abc --url http://localhost:3000
 *   node scripts/online-capacity.js --session <sessionId> --levels 10,25,50,100,200
 *
 * ĐO CÁI GÌ
 *
 * "Online" ở hệ này không phải là một kết nối treo sẵn. Cổng khách hỏi lại máy
 * chủ mỗi 3,5 giây — nên N khách đang mở máy nghĩa là khoảng
 *
 *     N × (số endpoint mỗi vòng) ÷ 3,5   request mỗi giây
 *
 * Script dựng đúng nhịp đó: mỗi "khách ảo" gọi đúng những endpoint mà trang
 * khách gọi, đúng chu kỳ ấy, rồi tăng dần số khách cho tới khi máy chủ đuối.
 * Con số cuối cùng là NGƯỠNG THẬT, không phải suy đoán từ cấu hình.
 *
 * BA CÁI BẪY ĐÃ XỬ LÝ
 *
 * 1. Chặn theo IP giả làm ngưỡng. Máy chủ chặn 30 request/phút cho mỗi IP. Nếu
 *    tất cả khách ảo đi ra từ một máy thì tới khách thứ ba đã bị 429 — và ta sẽ
 *    tưởng máy chủ chỉ chịu được 3 người. Mỗi khách ảo vì thế mang một
 *    X-Forwarded-For riêng, đúng như khi họ ngồi ở ba trăm cái điện thoại khác
 *    nhau. (Việc này chạy được là vì app tin X-Forwarded-For — sau proxy của
 *    Railway thì đúng, nhưng nếu có đường nào vào thẳng máy chủ, chặn-theo-IP
 *    bỏ qua được bằng đúng một dòng header.)
 *
 * 2. Đo lúc khởi động thay vì lúc chạy đều. Kết nối đầu tiên bao giờ cũng chậm
 *    (bắt tay TLS, pool database còn nguội). Mỗi mức đều bỏ một vòng làm nóng
 *    trước khi bắt đầu đếm.
 *
 * 3. Trung bình che mất người chậm nhất. Trung bình đẹp mà p99 mười giây thì cứ
 *    một trăm khách có một người ngồi nhìn màn hình trắng. Báo cáo lấy p50, p95,
 *    p99 — không lấy trung bình.
 *
 * CHỈ ĐỌC. Script không tạo phiên, không gửi tin, không đặt món. Chạy lên máy
 * thật cũng không sinh ra dữ liệu rác — nhưng nó VẪN tạo tải thật, nên với máy
 * chủ đang phục vụ khách thì phải thêm --yes-production và nên chạy giờ vắng.
 */
const DEFAULT_LEVELS = [5, 10, 25, 50, 100, 200, 400];
const POLL_SECONDS = 3.5;      // đúng chu kỳ của cổng khách
const WARMUP_CYCLES = 1;
const MEASURE_CYCLES = 4;

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const value = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const BASE = (value('url', 'http://localhost:3000')).replace(/\/$/, '');
const CODE = value('code', '');
const SESSION = value('session', '');
const LANG = value('lang', 'vi');
const NO_CACHE = flag('no-cache');
const LEVELS = value('levels', '').trim()
  ? value('levels', '').split(',').map((n) => Number(n.trim())).filter((n) => n > 0)
  : DEFAULT_LEVELS;

// Ngưỡng gọi là "đuối". Chậm hơn hoặc lỗi nhiều hơn mức này thì dừng tăng.
const MAX_P95_MS = Number(value('max-p95', 1500));
const MAX_ERROR_RATE = Number(value('max-error', 0.02));

if (!CODE && !SESSION) {
  console.error('Cần --code <mã QR> hoặc --session <sessionId>.');
  console.error('');
  console.error('  --code    dùng endpoint công khai /api/qr-chat/:code (nhẹ nhất, luôn chạy được)');
  console.error('  --session dựng đúng nhịp thật của cổng khách: vừa tải tin nhắn vừa tải đơn');
  process.exit(1);
}

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(BASE);
if (!isLocal && !flag('yes-production')) {
  console.error(`Đang trỏ tới ${BASE} — không phải máy cục bộ.`);
  console.error('Script chỉ đọc, nhưng vẫn tạo tải thật lên máy chủ đang phục vụ khách.');
  console.error('Thêm --yes-production nếu chắc chắn, và nên chọn giờ vắng.');
  process.exit(1);
}

// Mỗi khách ảo một địa chỉ riêng, để không bị gộp chung vào một xô chặn-theo-IP.
const fakeIp = (n) => `203.0.113.${(n % 254) + 1}`;   // dải TEST-NET-3, không thuộc về ai

// Mỗi khách ảo nhớ dấu vân riêng, đúng như trình duyệt thật: lượt đầu tải đầy
// đủ, những lượt sau chỉ hỏi "có gì mới không", và cứ 17 lượt lại tải đầy đủ
// một lần. --no-cache tắt hết để đo lại kiểu cũ, tiện so trước/sau.
const memory = new Map();   // userIndex -> { conv, order, polls }
const FULL_EVERY = 17;

function endpointsFor(userIndex) {
  if (!SESSION) return [{ url: `${BASE}/api/qr-chat/${encodeURIComponent(CODE)}?_=${Date.now()}${userIndex}` }];

  const seen = memory.get(userIndex) || { conv: '', order: '', polls: 0 };
  const forceFull = NO_CACHE || seen.polls >= FULL_EVERY;
  const conv = forceFull || !seen.conv ? '' : `&known=${encodeURIComponent(seen.conv)}`;
  const ord = forceFull || !seen.order ? '' : `&known=${encodeURIComponent(seen.order)}`;
  return [
    { url: `${BASE}/api/chats/${encodeURIComponent(SESSION)}/messages?visitorLang=${LANG}&limit=50${conv}&_=${Date.now()}${userIndex}`,
      remember: (r, body) => { seen.conv = r.headers.get('X-Conversation') || body?.fingerprint || seen.conv; } },
    { url: `${BASE}/api/chats/${encodeURIComponent(SESSION)}/order?lang=${LANG}${ord}&_=${Date.now()}${userIndex}`,
      remember: (r, body) => { seen.order = r.headers.get('X-Order-Print') || body?.fingerprint || seen.order; } },
  ].map((e) => ({ ...e, after: () => {
    seen.polls = forceFull ? 0 : seen.polls + 1;
    memory.set(userIndex, seen);
  } }));
}

const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[i];
};

async function oneRequest(endpoint, ip, stats) {
  const url = typeof endpoint === 'string' ? endpoint : endpoint.url;
  const started = process.hrtime.bigint();
  try {
    const res = await fetch(url, {
      headers: { 'X-Forwarded-For': ip, 'User-Agent': 'pastie-capacity-probe' },
      signal: AbortSignal.timeout(20000),
    });
    // Phải đọc hết thân phản hồi. Bỏ dở thì tính giờ chỉ tới lúc nhận header,
    // trong khi máy chủ vẫn đang è cổ dựng nốt phần còn lại.
    const raw = await res.text();
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    stats.bytes += raw.length;
    if (res.ok && typeof endpoint === 'object') {
      let body = null;
      try { body = JSON.parse(raw); } catch { /* không phải JSON thì thôi */ }
      if (body?.unchanged) stats.unchanged++;
      endpoint.remember?.(res, body);
      endpoint.after?.();
    }
    if (res.status === 429) stats.rateLimited++;
    else if (res.status >= 500) stats.serverErrors++;
    else if (res.status >= 400) stats.clientErrors++;
    else stats.latencies.push(ms);
    stats.statuses.set(res.status, (stats.statuses.get(res.status) || 0) + 1);
  } catch (error) {
    stats.networkErrors++;
    const label = error.name === 'TimeoutError' ? 'quá hạn 20s' : (error.cause?.code || error.message);
    stats.failures.set(label, (stats.failures.get(label) || 0) + 1);
  }
}

async function runLevel(users) {
  const stats = {
    latencies: [], rateLimited: 0, serverErrors: 0, clientErrors: 0, networkErrors: 0,
    bytes: 0, unchanged: 0, statuses: new Map(), failures: new Map(),
  };

  // Vòng làm nóng: không đếm. Lượt đầu bao giờ cũng đắt hơn thực tế.
  for (let cycle = 0; cycle < WARMUP_CYCLES + MEASURE_CYCLES; cycle++) {
    const measuring = cycle >= WARMUP_CYCLES;
    const bucket = measuring ? stats : {
      latencies: [], rateLimited: 0, serverErrors: 0, clientErrors: 0, networkErrors: 0,
      bytes: 0, unchanged: 0, statuses: new Map(), failures: new Map(),
    };
    const cycleStart = Date.now();

    const calls = [];
    for (let user = 0; user < users; user++) {
      // Rải đều trong chu kỳ. Bắn cả N cùng một mili-giây là mô phỏng sai: khách
      // thật mở trang vào những thời điểm rải rác, không đồng loạt.
      const delay = (user / users) * POLL_SECONDS * 1000;
      calls.push((async () => {
        await new Promise((r) => setTimeout(r, delay));
        for (const endpoint of endpointsFor(user)) await oneRequest(endpoint, fakeIp(user), bucket);
      })());
    }
    await Promise.all(calls);

    const elapsed = Date.now() - cycleStart;
    const remain = POLL_SECONDS * 1000 - elapsed;
    if (remain > 0) await new Promise((r) => setTimeout(r, remain));
  }

  const sorted = stats.latencies.slice().sort((a, b) => a - b);
  const ok = sorted.length;
  const bad = stats.rateLimited + stats.serverErrors + stats.clientErrors + stats.networkErrors;
  return {
    users, ok, bad,
    errorRate: ok + bad === 0 ? 1 : bad / (ok + bad),
    p50: percentile(sorted, 50), p95: percentile(sorted, 95), p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] || 0,
    stats,
  };
}

const ms = (n) => `${Math.round(n)}ms`;

(async () => {
  const perCycle = endpointsFor(0).length;
  console.log('');
  console.log(`Đích       : ${BASE}`);
  console.log(`Kiểu tải   : ${SESSION ? 'đúng nhịp cổng khách (tin nhắn + đơn hàng)' : 'endpoint công khai /api/qr-chat/:code'}`);
  console.log(`Chu kỳ     : ${POLL_SECONDS}s, ${perCycle} request mỗi khách mỗi vòng`);
  console.log(`Mức thử    : ${LEVELS.join(', ')} khách`);
  console.log(`Coi là đuối: p95 > ${MAX_P95_MS}ms hoặc lỗi > ${(MAX_ERROR_RATE * 100).toFixed(0)}%`);
  console.log('');
  console.log(`Chế độ     : ${NO_CACHE || !SESSION ? 'luôn tải đầy đủ (kiểu cũ)' : 'có dấu vân, như cổng khách thật'}`);
  console.log('');
  console.log('  khách   req/s     p50     p95     p99   KB/s  "không đổi"   lỗi');
  console.log('  ' + '─'.repeat(66));

  let lastGood = 0;
  let brokeAt = null;
  const rows = [];

  for (const users of LEVELS) {
    const r = await runLevel(users);
    rows.push(r);
    const reqPerSec = (users * perCycle / POLL_SECONDS).toFixed(1);

    const notes = [];
    if (r.stats.rateLimited) notes.push(`${r.stats.rateLimited} lần bị chặn tốc độ`);
    if (r.stats.serverErrors) notes.push(`${r.stats.serverErrors} lỗi 5xx`);
    if (r.stats.clientErrors) notes.push(`${r.stats.clientErrors} lỗi 4xx`);
    if (r.stats.networkErrors) {
      const detail = [...r.stats.failures.entries()].map(([k, v]) => `${k}×${v}`).join(', ');
      notes.push(`${r.stats.networkErrors} lỗi mạng (${detail})`);
    }

    const failed = r.p95 > MAX_P95_MS || r.errorRate > MAX_ERROR_RATE;
    const mark = failed ? '✗' : '✓';
    const total = r.ok + r.bad;
    const kbPerSec = (r.stats.bytes / 1024 / (MEASURE_CYCLES * POLL_SECONDS)).toFixed(0);
    const unchangedPct = total ? ((r.stats.unchanged / total) * 100).toFixed(0) : '0';
    console.log(`${mark} ${String(users).padStart(6)}${String(reqPerSec).padStart(8)}` +
      `${ms(r.p50).padStart(8)}${ms(r.p95).padStart(8)}${ms(r.p99).padStart(8)}` +
      `${kbPerSec.padStart(7)}${(unchangedPct + '%').padStart(9)}` +
      `${(r.errorRate * 100).toFixed(1).padStart(9)}%  ${notes.join('; ')}`);

    if (failed) { brokeAt = users; break; }
    lastGood = users;
  }

  console.log('');
  console.log('─'.repeat(74));
  if (brokeAt === null) {
    console.log(`Chưa chạm ngưỡng. Chịu tốt ít nhất ${lastGood} khách cùng lúc.`);
    console.log(`Muốn tìm ngưỡng thật thì nâng tiếp: --levels ${LEVELS.join(',')},${lastGood * 2}`);
  } else if (lastGood === 0) {
    console.log(`Đuối ngay ở mức thấp nhất (${brokeAt} khách). Xem cột ghi chú — rất có thể là`);
    console.log('lỗi cấu hình hoặc sai mã QR / sessionId, chứ chưa phải giới hạn năng lực.');
  } else {
    console.log(`Chịu tốt : ${lastGood} khách cùng lúc`);
    console.log(`Bắt đầu đuối ở: ${brokeAt} khách`);
    console.log(`Ngưỡng thật nằm giữa hai con số này — thu hẹp bằng --levels ${lastGood},${Math.round((lastGood + brokeAt) / 2)},${brokeAt}`);
  }

  const worst = rows[rows.length - 1];
  if (worst?.stats.rateLimited) {
    console.log('');
    console.log('Có request bị chặn tốc độ dù mỗi khách ảo đã mang một IP riêng — nghĩa là');
    console.log('máy chủ KHÔNG tin X-Forwarded-For (đứng sau proxy khác, hoặc trust proxy tắt).');
    console.log('Con số ở trên là ngưỡng của bộ chặn, không phải ngưỡng năng lực.');
  }

  console.log('');
  console.log('Trần cấu trúc cần nhớ khi đọc kết quả:');
  console.log('  · Pool Postgres mặc định 20 kết nối (PG_POOL_MAX). Vượt qua là request xếp hàng');
  console.log('    chờ kết nối — p95 dâng lên trong khi CPU vẫn nhàn.');
  console.log('  · Node chạy một luồng: một truy vấn nặng hay một lần dựng PDF là chặn tất cả.');
  console.log('  · Mỗi khách online tốn %s request/giây, không phải một kết nối treo.',
    (perCycle / POLL_SECONDS).toFixed(2));
})().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
