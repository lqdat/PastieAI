const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const webpush = require('web-push');
const db = require('./database');
const gemini = require('./gemini-helper');
const resend = require('./resend-helper');
const cron = require('node-cron');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const PDFDocument = require('pdfkit');
const dealSync = require('./deal-sync');
const invoiceHelper = require('./invoice-helper');
const multer = require('multer');
const s3 = require('./s3-helper');
const speech = require('./groq-speech');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ── Anti-spam: rate limit AI calls per session ────────────────────────────────
const aiRateLimit = new Map(); // sessionId → { count, windowStart }
const AI_RATE_MAX = 10;        // max AI responses per window
const AI_RATE_WINDOW = 2 * 60 * 1000; // 2-minute window
const AI_TEXT_MAX_LEN = 500;   // max chars sent to Gemini

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const rawVapidSubject = (process.env.VAPID_SUBJECT || 'mailto:support@pastie.vn').trim();
const VAPID_SUBJECT = rawVapidSubject.includes('@') && !rawVapidSubject.startsWith('mailto:')
  ? `mailto:${rawVapidSubject}`
  : rawVapidSubject;
let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch (error) {
    console.error(`[Push] VAPID_SUBJECT không hợp lệ. Dùng mailto:email@domain.com hoặc URL HTTPS. ${error.message}`);
  }
} else {
  console.warn('[Push] Web Push chưa bật: thiếu VAPID_PUBLIC_KEY hoặc VAPID_PRIVATE_KEY.');
}

// Đẩy thông báo chat vào CHUÔNG DealPhuQuoc (để agent thấy ngay cả khi không mở tab chat).
async function notifyDealBell(session, { title, preview = '' }) {
  const base = process.env.DEALPHUQUOC_API_URL;
  const secret = process.env.CHAT_SSO_SECRET;
  if (!base || !secret || session?.project_id !== 'dealphuquoc') return;
  let claimedEmail = null;
  try {
    if (session.claimed_by_admin_id) {
      const a = await db.query('SELECT username FROM admins WHERE id = $1 LIMIT 1', [session.claimed_by_admin_id]);
      const u = a.rows[0]?.username || '';
      if (u.startsWith('sso:')) claimedEmail = u.slice(4);
    }
  } catch {}
  try {
    await fetch(`${base.replace(/\/$/, '')}/api/notifications/chat-hook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-chat-secret': secret },
      body: JSON.stringify({
        title,
        body: `${session.visitor_name || 'Khách hàng'}: ${(preview || 'Có tin nhắn mới cần phản hồi.').slice(0, 120)}`,
        href: '/admin/chat',
        claimedEmail,
        sessionId: session.id,
      }),
    });
  } catch (e) { console.warn('[DealBell] lỗi gửi hook:', e.message); }
}

async function notifyChatRecipients(session, { title, preview = '', tag }) {
  if (!session?.id || !session?.project_id) return;
  // Chuông DealPhuQuoc không phụ thuộc VAPID của Pastie -> luôn thử đẩy.
  void notifyDealBell(session, { title, preview });
  if (!vapidConfigured) return;
  try {
    let subscriptions;
    if (session.group_id) {
      // Chat đi theo nhóm: báo cho MỌI Sale đang đủ điều kiện nhận chat của nhóm
      // đó ngay lúc này, cộng Agent quản lý nhóm và superadmin. QR không chỉ định
      // Sale nào cả — ai trong nhóm đang trong ca thì cùng nhận, ai bấm trước thì
      // được (claim nguyên tử lo phần tranh chấp). Sale ngoài ca không bị làm
      // phiền, và Agent luôn biết khi không có ai trực (mục 13).
      const eligible = await listAvailableSales(session.group_id);
      const targets = session.claimed_by_admin_id ? [session.claimed_by_admin_id] : eligible;
      subscriptions = await db.query(
        `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
         FROM push_subscriptions ps JOIN admins a ON a.id = ps.admin_id
         WHERE a.is_active = TRUE
           AND (
             a.id = ANY($2::int[])
             OR a.role = 'superadmin'
             OR a.id = (SELECT agent_id FROM agent_groups WHERE id = $3)
           )`,
        [session.project_id, targets, session.group_id]
      );
    } else {
      subscriptions = await db.query(
        `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
         FROM push_subscriptions ps JOIN admins a ON a.id = ps.admin_id
         WHERE a.is_active = TRUE AND a.role IN ('superadmin', 'project_admin', 'agent', 'sale')
           AND (
             a.role = 'superadmin'
             OR ($2::integer IS NOT NULL AND a.id = $2)
             OR ($2::integer IS NULL AND a.project_id = $1)
           )`,
        [session.project_id, session.claimed_by_admin_id || null]
      );
    }
    const payload = JSON.stringify({
      title,
      body: `${session.visitor_name || 'Khách hàng'}: ${(preview || 'Có tin nhắn mới cần phản hồi.').slice(0, 120)}`,
      sessionId: session.id,
      projectId: session.project_id,
      tag: `${tag}-${session.id}`,
    });
    await Promise.all(subscriptions.rows.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 120 });
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) await db.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        else console.warn('[Push] Gửi notification thất bại:', error.statusCode || error.message);
      }
    }));
  } catch (error) { console.error('[Push] Không thể thông báo Agent:', error.message); }
}

function notifyAgentTransfer(session, preview = '') {
  return notifyChatRecipients(session, {
    title: 'Khách cần nhân viên hỗ trợ',
    preview: preview || 'Hệ thống đã chuyển cuộc trò chuyện cho Agent.',
    tag: 'agent-transfer',
  });
}

function notifyAgentMessage(session, preview = '') {
  return notifyChatRecipients(session, {
    title: 'Tin nhắn mới từ khách',
    preview,
    tag: 'customer-message',
  });
}

// -----------------------------------------------------------------------------
// SSE Realtime Event Bus cho Admin Dashboard
// Thay vì để Client liên tục poll GET /api/admin/chats 7s/lần và GET messages 2s/lần
// gây quá tải CPU & Database, Server sẽ chủ động đẩy sự kiện Realtime qua SSE.
// Client chỉ tải lại dữ liệu khi THẬT SỰ có tin nhắn mới hoặc có thay đổi trạng thái.
// -----------------------------------------------------------------------------
const adminEventClients = new Set();

function broadcastAdminEvent(event) {
  if (adminEventClients.size === 0) return;
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of adminEventClients) {
    try {
      const admin = client.admin;
      if (event.adminId && admin && Number(admin.id) !== Number(event.adminId) && event.type === 'session_revoked') {
        continue;
      }
      if (admin && event.projectId && admin.role !== 'superadmin' && admin.project_id && admin.project_id !== event.projectId) {
        continue;
      }
      client.res.write(payload);
    } catch (e) {
      adminEventClients.delete(client);
    }
  }
}

function notifyAdminRealtime(type, data = {}) {
  broadcastAdminEvent({
    type,
    timestamp: Date.now(),
    ...data
  });
}

function isAiRateLimited(sessionId) {
  const now = Date.now();
  const entry = aiRateLimit.get(sessionId) || { count: 0, windowStart: now };
  if (now - entry.windowStart > AI_RATE_WINDOW) {
    aiRateLimit.set(sessionId, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  aiRateLimit.set(sessionId, entry);
  if (entry.count > AI_RATE_MAX) {
    console.warn(`[RateLimit] Session ${sessionId}: ${entry.count} AI calls in 2min — skipping.`);
    return true;
  }
  return false;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - AI_RATE_WINDOW * 3;
  for (const [key, val] of aiRateLimit.entries()) {
    if (val.windowStart < cutoff) aiRateLimit.delete(key);
  }
}, 5 * 60 * 1000);

// QR Concierge visitor slots are intentionally short-lived. The database is
// authoritative, so expiry also works if the browser is closed or refreshed.
// Hết phiên QR (hết giờ hoặc bị quét đè) => CHỈ đóng cuộc chat (status='closed'),
// KHÔNG xóa: lịch sử hội thoại và file đính kèm phải giữ lại để tra cứu sau.
setInterval(() => {
  db.query(`UPDATE sessions SET status = 'closed',
                   routing_status = CASE WHEN routing_status IS NULL THEN NULL ELSE 'closed' END
            WHERE qr_account_id IS NOT NULL AND status = 'active'
              AND expires_at IS NOT NULL AND expires_at <= NOW()`)
    .catch((error) => console.error('[QR Concierge] Không thể đóng session hết hạn:', error.message));
}, 60 * 1000);
// ─────────────────────────────────────────────────────────────────────────────

// --- Chat attachments (images / videos / documents) -------------------------
const ATTACHMENT_LIMITS_BYTES = {
  image: 10 * 1024 * 1024,   // 10MB
  video: 30 * 1024 * 1024,   // 30MB
  document: 20 * 1024 * 1024, // 20MB
};
const ATTACHMENT_MIME_MAP = [
  { type: 'image', test: (mime) => mime.startsWith('image/') },
  { type: 'video', test: (mime) => mime.startsWith('video/') },
  {
    type: 'document',
    test: (mime) =>
      mime === 'application/pdf' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/vnd.ms-powerpoint' ||
      mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mime === 'text/plain' ||
      mime === 'text/csv' ||
      mime === 'application/zip' ||
      mime === 'application/x-zip-compressed',
  },
];
function classifyAttachment(mime) {
  const found = ATTACHMENT_MIME_MAP.find((entry) => entry.test(mime || ''));
  return found ? found.type : null;
}
// Largest allowed size across all types — multer needs one hard cap up front;
// the exact per-type limit is enforced after we know the file's MIME type.
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(...Object.values(ATTACHMENT_LIMITS_BYTES)) },
});
// Bản ghi giọng nói chỉ để chuyển thành chữ rồi bỏ đi — không lưu vào bucket,
// không gắn vào tin nhắn. Giới hạn nhỏ hơn attachment vì đây là câu nói ngắn.
const VOICE_MAX_BYTES = 12 * 1024 * 1024;
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VOICE_MAX_BYTES },
});
function uploadVoiceMiddleware(req, res, next) {
  voiceUpload.single('audio')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Đoạn ghi âm quá dài, hãy nói ngắn lại.' });
      }
      return res.status(400).json({ error: err.message || 'Lỗi khi tải bản ghi âm lên.' });
    }
    next();
  });
}

function uploadAttachmentMiddleware(req, res, next) {
  attachmentUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File vượt quá giới hạn dung lượng cho phép.' });
      }
      return res.status(400).json({ error: err.message || 'Lỗi khi tải file lên.' });
    }
    next();
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// --- Swagger Configuration ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pastie AI Chat API',
      version: '1.0.0',
      description: 'API documentation for Pastie AI Chat Multi-tenant Backend',
    },
    servers: [
      {
        url: 'https://dashboard.pastie.vn',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Bearer <ADMIN_PASSWORD>',
        },
        MetaSignature: {
          type: 'apiKey',
          in: 'header',
          name: 'x-hub-signature-256',
          description: 'HMAC SHA-256 signature từ Meta: sha256=<hash>. Bắt buộc khi META_APP_SECRET được cấu hình.',
        },
      },
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Catch uncaught exceptions and unhandled rejections to prevent server from crashing
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err.stack || err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason.stack || reason || reason.message);
});

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const fs = require('fs');

// Automatically sync widget files if they exist locally (for convenience in development)
try {
  const localWidgetJs = path.join(__dirname, '../widget/chat-widget.js');
  const localWidgetCss = path.join(__dirname, '../widget/chat-widget.css');
  const publicWidgetJs = path.join(__dirname, 'public/chat-widget.js');
  const publicWidgetCss = path.join(__dirname, 'public/chat-widget.css');

  if (fs.existsSync(localWidgetJs)) {
    fs.copyFileSync(localWidgetJs, publicWidgetJs);
    console.log('Synced chat-widget.js to public/ successfully.');
  }
  if (fs.existsSync(localWidgetCss)) {
    fs.copyFileSync(localWidgetCss, publicWidgetCss);
    console.log('Synced chat-widget.css to public/ successfully.');
  }
} catch (e) {
  console.log('Note: Widget files not synced dynamically (expected in production):', e.message);
}

// Request-time sync for widget files during development
app.get('/chat-widget.js', (req, res, next) => {
  try {
    const localWidgetJs = path.join(__dirname, '../widget/chat-widget.js');
    const publicWidgetJs = path.join(__dirname, 'public/chat-widget.js');
    if (fs.existsSync(localWidgetJs)) {
      fs.copyFileSync(localWidgetJs, publicWidgetJs);
    }
  } catch (e) {
    console.error('Failed to sync chat-widget.js on request:', e.message);
  }
  next();
});

app.get('/chat-widget.css', (req, res, next) => {
  try {
    const localWidgetCss = path.join(__dirname, '../widget/chat-widget.css');
    const publicWidgetCss = path.join(__dirname, 'public/chat-widget.css');
    if (fs.existsSync(localWidgetCss)) {
      fs.copyFileSync(localWidgetCss, publicWidgetCss);
    }
  } catch (e) {
    console.error('Failed to sync chat-widget.css on request:', e.message);
  }
  next();
});

// Stable public entry point for websites embedding the chat widget. Keeping a
// versioned URL lets us improve the implementation without changing snippets
// already installed on customer sites.
app.get('/widget/v1.js', (_req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300'
  });
  res.sendFile(path.join(__dirname, '../widget/pastie-chat.js'));
});

const crypto = require('crypto');

// Cryptographically secure password hashing using Node's native PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Automatically seed a default Super-Admin account if none exist
async function seedSuperAdmin() {
  try {
    const result = await db.query("SELECT * FROM admins WHERE role = 'superadmin' LIMIT 1");
    if (result.rows.length === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'PastiePhuQuoc@123';
      const hashedPassword = hashPassword(adminPassword);
      await db.query(
        "INSERT INTO admins (username, password_hash, full_name, role, avatar_url) VALUES ($1, $2, $3, $4, $5)",
        ['admin', hashedPassword, 'Admin Tổng', 'superadmin', 'gradient-1']
      );
      console.log('Successfully seeded default super-admin account ("admin")');
    }
  } catch (err) {
    console.error('Error seeding super-admin account:', err.message);
  }
}
// Run seed function with a short delay to ensure DB tables are ready
setTimeout(seedSuperAdmin, 2500);

// Serving admin dashboard statically from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.get('/privacy-policy', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html')));
app.get('/terms', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html')));
// Serve widget files statically (as a fallback)
app.use(express.static(path.join(__dirname, '../widget')));

// Redirect root path to admin dashboard
app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Staff-only helper page for testing the sample order flow. Authentication is
// checked by the POST /samplebill API when the page submits.
app.get('/samplebill', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'samplebill.html'));
});

function qrCustomerChatUrl(req, code) {
  const portalUrl = String(process.env.QR_CHAT_PORTAL_URL || '').trim();
  if (portalUrl) {
    try {
      const url = new URL(portalUrl);
      url.searchParams.set('code', code);
      return url.toString();
    } catch (_error) {
      console.warn('[QR Concierge] QR_CHAT_PORTAL_URL is invalid; using the local customer page.');
    }
  }
  const dashboardUrl = (process.env.DASHBOARD_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  return `${dashboardUrl}/customer-chat/${encodeURIComponent(code)}`;
}

// Customer-facing QR Chat Portal. This is intentionally separate from the
// admin console; deploy it on a dedicated domain through QR_CHAT_PORTAL_URL.
// The QR code contains only an opaque identifier; customer identity is still
// verified with OTP email or Google before chat.
app.get('/customer-chat/:code', async (req, res) => {
  try {
    const account = await resolveQrChatAccount('qr-concierge', String(req.params.code || ''));
    if (!account) return res.status(404).send('Mã QR không hợp lệ hoặc đã hết hiệu lực.');
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '');
    const json = JSON.stringify({ projectId: account.project_id, qrCode: String(req.params.code), clientId }).replace(/</g, '\\u003c');
    res.type('html').send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chat hỗ trợ</title><script src="https://accounts.google.com/gsi/client" async defer></script><style>body{margin:0;font-family:'Be Vietnam Pro',Arial,sans-serif;background:linear-gradient(135deg,#fff7fb,#f8f7ff);color:#2d2335;min-height:100vh}.portal{max-width:440px;margin:0 auto;padding:72px 20px}.portal-card{padding:30px;border:1px solid #efd8e7;border-radius:24px;background:#fff;box-shadow:0 18px 55px #8c4a7620;text-align:center}.portal-mark{width:50px;height:50px;margin:0 auto 16px;border-radius:16px;display:grid;place-items:center;background:#ffe0ef;color:#ec4899;font-size:25px}.portal-card h1{margin:0;font-size:23px}.portal-card p{margin:10px 0 20px;line-height:1.55;color:#766878;font-size:14px}.portal-note{margin-top:18px;color:#978a99;font-size:11px}</style></head><body><main class="portal"><section class="portal-card"><div class="portal-mark">✦</div><h1>Trò chuyện hỗ trợ</h1><p>Đăng nhập nhanh bằng Google, hoặc mở khung chat để nhận mã xác thực qua email.</p><div id="google"></div><div class="portal-note">Phiên chat sẽ tự kết thúc sau 15 phút.</div></section></main><script>const QR=${json};function startGoogle(r){fetch('/api/qr-chat/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:r.credential,projectId:QR.projectId,qrCode:QR.qrCode})}).then(x=>x.json().then(d=>({ok:x.ok,d}))).then(({ok,d})=>{if(!ok)throw Error(d.error);sessionStorage.setItem('pastie_chat_'+QR.projectId+'_'+QR.qrCode+'_session_id',d.sessionId);sessionStorage.setItem('pastie_chat_'+QR.projectId+'_'+QR.qrCode+'_mode','ai');location.reload();}).catch(e=>alert(e.message));}function g(){if(QR.clientId&&window.google?.accounts?.id){google.accounts.id.initialize({client_id:QR.clientId,callback:startGoogle});google.accounts.id.renderButton(document.getElementById('google'),{theme:'outline',size:'large',text:'continue_with'});}else setTimeout(g,250)}g();</script><script src="/widget/v1.js" data-project="${account.project_id}" data-qr-code="${req.params.code}" async></script></body></html>`);
  } catch (error) {
    console.error('[QR Concierge] Cannot open QR chat:', error.message);
    res.status(500).send('Không thể mở trang chat.');
  }
});

// Keep legacy QR codes working while all newly created links use the portal.
app.get('/qr/:code', (req, res) => res.redirect(302, `/customer-chat/${encodeURIComponent(req.params.code)}`));

// Public metadata used by the standalone customer portal. It intentionally
// exposes only the support agent's display name for a valid opaque QR code.
app.get('/api/qr-chat/:code', async (req, res) => {
  try {
    const account = await resolveQrChatAccount('qr-concierge', String(req.params.code || ''));
    if (!account) return res.status(404).json({ error: 'Mã QR không hợp lệ hoặc đã bị vô hiệu hóa.' });
    res.json({
      agentName: account.owner_name || 'Agent',
      groupName: account.group_name || account.label || 'Tư vấn viên',
      label: account.label || ''
    });
  } catch (error) {
    console.error('[QR Concierge] Cannot read public QR metadata:', error.message);
    res.status(500).json({ error: 'Không thể tải thông tin hỗ trợ.' });
  }
});


const ADMIN_SESSION_HOURS = 8;
const ADMIN_SESSION_MS = ADMIN_SESSION_HOURS * 3600000;
const QR_CHAT_SESSION_MS = 15 * 60 * 1000;

// --- LỚP 1 BẢO MẬT LICENSE: Single Active Session ----------------------------
// Mỗi admin_id chỉ được phép có duy nhất 1 phiên (token) hoạt động tại một thời điểm.
// Khi phát hành token mới -> thu hồi (xóa) toàn bộ token cũ và gửi thông báo SSE session_revoked.
async function issueSingleActiveAdminSession(admin, req = null) {
  const clientIp = req ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '') : '';
  const userAgent = req ? String(req.headers['user-agent'] || '').slice(0, 1000) : '';
  const deviceId = req ? String(req.headers['x-device-id'] || '').slice(0, 64) : null;

  // 1. Gửi thông báo đá phiên qua SSE đến các kết nối cũ của admin này
  notifyAdminRealtime('session_revoked', { adminId: admin.id, reason: 'new_login' });

  // 2. Thu hồi toàn bộ token cũ của tài khoản này
  await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [admin.id]);

  // 3. Tạo token phiên mới duy nhất
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MS);
  await db.query(
    `INSERT INTO admin_sessions (token, admin_id, expires_at, device_id, user_agent, client_ip, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [sessionToken, admin.id, expiresAt, deviceId, userAgent, clientIp]
  );

  return { token: sessionToken, expiresAt };
}

// Upgraded Multi-Admin Session-based Auth Middleware (hiệu lực 8 giờ + trượt 8 giờ)
async function checkAdminAuth(req, res, next) {
  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Missing authentication token.' });
  }

  try {
    // 1. Check if token exists in admin_sessions and joins admins
    const sessionRes = await db.query(
      `SELECT s.token, s.expires_at, a.id, a.username, a.full_name, a.role, a.avatar_url, a.is_active, a.project_id, a.sale_limit,
              m.full_name AS manager_name, m.username AS manager_username
       FROM admin_sessions s
       JOIN admins a ON s.admin_id = a.id
       LEFT JOIN admins m ON m.id = a.managed_by_admin_id
       WHERE s.token = $1`,
      [token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({
        error: 'Phiên làm việc của bạn đã hết hạn hoặc tài khoản vừa được đăng nhập trên một thiết bị khác.',
        code: 'SESSION_REVOKED'
      });
    }

    const adminSession = sessionRes.rows[0];

    // Check session token expiration
    if (new Date() > new Date(adminSession.expires_at)) {
      await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
      return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' });
    }

    // Gia hạn kiểu trượt: gia hạn thêm 8 giờ nếu còn hoạt động (cập nhật tối đa 1 lần/giờ) + lưu last_seen_at
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 1000);
    const currentExpires = new Date(adminSession.expires_at).getTime();
    if (currentExpires - Date.now() < (ADMIN_SESSION_HOURS - 1) * 3600000) {
      const newExpiresAt = new Date(Date.now() + ADMIN_SESSION_MS);
      db.query(
        `UPDATE admin_sessions 
            SET expires_at = $1, last_seen_at = NOW(), client_ip = COALESCE(NULLIF($2, ''), client_ip), user_agent = COALESCE(NULLIF($3, ''), user_agent) 
          WHERE token = $4`,
        [newExpiresAt, clientIp, userAgent, token]
      ).catch(() => {});
    } else {
      db.query(
        `UPDATE admin_sessions 
            SET last_seen_at = NOW(), client_ip = COALESCE(NULLIF($1, ''), client_ip), user_agent = COALESCE(NULLIF($2, ''), user_agent) 
          WHERE token = $3`,
        [clientIp, userAgent, token]
      ).catch(() => {});
    }

    // Check active status
    if (!adminSession.is_active) {
      return res.status(403).json({ error: 'Account deactivated. Please contact the administrator.' });
    }

    // Attach admin context to the request
    req.admin = {
      id: adminSession.id,
      username: adminSession.username,
      full_name: adminSession.full_name,
      role: adminSession.role,
      avatar_url: adminSession.avatar_url,
      project_id: adminSession.project_id, // null = xem mọi project
      // Trần số Sale (chỉ có nghĩa với role 'agent'). Cột này vốn đã được truy vấn
      // ở vài chỗ khác nhưng không gắn vào req.admin, nên /api/admin/me không trả
      // về và giao diện luôn hiển thị "Không giới hạn" dù đã đặt hạn mức.
      sale_limit: adminSession.sale_limit,
      // Tên Agent quản lý — header của Sale hiển thị "Agent · Sale" để người trực
      // chat luôn biết mình đang trực dưới quyền ai.
      manager_name: adminSession.manager_name || adminSession.manager_username || null,
      token: token
    };

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

const ADMIN_ROLES = new Set(['superadmin', 'project_owner', 'project_admin', 'agent', 'sale']);
const isSuperAdmin = (admin) => admin?.role === 'superadmin';
const isProjectOwner = (admin) => admin?.role === 'project_owner';
const isProjectAdmin = (admin) => admin?.role === 'project_admin';
// 'agent' giờ là cấp QUẢN LÝ Sale (chỉ trong project qr_concierge); 'sale' là
// người trực tiếp trả lời chat — vai trò mà 'agent' đảm nhiệm trước đây.
const isAgentManager = (admin) => admin?.role === 'agent';
const isSale = (admin) => admin?.role === 'sale';
const isChatStaff = (admin) => isSuperAdmin(admin) || isProjectOwner(admin) || isProjectAdmin(admin) || isAgentManager(admin) || isSale(admin);

function canAccessProject(admin, projectId) {
  return isSuperAdmin(admin) || (admin?.project_id && admin.project_id === projectId);
}

// --- Khung giờ làm việc ------------------------------------------------------
// Giờ lưu trong DB là TIME trần kèm tên timezone. So sánh thực hiện ở đây bằng
// Intl thay vì trong SQL, vì Postgres trên Railway chạy UTC và việc dựa vào tz
// database của server là nguồn lỗi lệch múi giờ kinh điển.
const DEFAULT_WORK_TIMEZONE = process.env.WORK_TIMEZONE || 'Asia/Bangkok';
// Đệm sau khi hết ca, để Sale kịp kết thúc cuộc đang dở thay vì bị cắt giữa câu.
const SHIFT_GRACE_MINUTES = Number(process.env.SHIFT_GRACE_MINUTES || 10);

// Số phút kể từ 00:00 tại timezone chỉ định.
function minutesNowInZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || DEFAULT_WORK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return (hour % 24) * 60 + minute;
}

function parseTimeToMinutes(value) {
  const [hour, minute] = String(value || '00:00').split(':');
  return (Number(hour) || 0) * 60 + (Number(minute) || 0);
}

// Một khung giờ. start < end là ca trong ngày; start > end là ca vắt qua nửa
// đêm (ví dụ 18:00-02:00) nên điều kiện là "hoặc" thay vì "và".
function isWithinWindow(row, graceMinutes = 0) {
  if (!row || row.is_active === false) return false;
  const now = minutesNowInZone(row.timezone);
  const start = parseTimeToMinutes(row.start_time);
  const end = parseTimeToMinutes(row.end_time) + graceMinutes;
  if (start === end) return true; // khung rỗng coi như cả ngày
  if (start < end) return now >= start && now < end;
  return now >= start || now < end % (24 * 60);
}

function isWithinAnyWindow(rows, graceMinutes = 0) {
  if (!Array.isArray(rows) || rows.length === 0) return true; // chưa cấu hình = không giới hạn
  return rows.some((row) => isWithinWindow(row, graceMinutes));
}

// Mô tả khung giờ cho thông báo lỗi: "08:00 đến 17:00", nhiều khung nối bằng "hoặc".
function describeWindows(rows) {
  return (rows || [])
    .filter((row) => row.is_active !== false)
    .map((row) => `${String(row.start_time).slice(0, 5)} đến ${String(row.end_time).slice(0, 5)}`)
    .join(' hoặc ');
}

// Chuẩn hóa một khung giờ người dùng gửi lên. Trả về null nếu không hợp lệ.
function normalizeHourWindow(entry) {
  if (!entry) return null;
  const clean = (value) => {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
  };
  const start = clean(entry.start_time ?? entry.start);
  const end = clean(entry.end_time ?? entry.end);
  if (!start || !end) return null;
  return { start, end, timezone: String(entry.timezone || DEFAULT_WORK_TIMEZONE).slice(0, 60) };
}

// Chuyển một khung giờ (start_time, end_time) thành danh sách các khoảng phút [startMin, endMin) trong ngày [0, 1440).
// Hỗ trợ đầy đủ ca qua đêm (start > end) bằng cách phân rã thành 2 khoảng con: [start, 1440) và [0, end).
function windowToMinuteIntervals(startTimeStr, endTimeStr) {
  const start = parseTimeToMinutes(startTimeStr);
  const end = parseTimeToMinutes(endTimeStr);
  if (start === end) {
    return [[0, 1440]];
  }
  if (start < end) {
    return [[start, end]];
  }
  return [[start, 1440], [0, end]];
}

// Kiểm tra xem hai khung giờ có bị chồng lấn (overlap) không.
// Các ca nối tiếp nhau (ví dụ 08:00-16:00 và 16:00-23:00) KHÔNG bị coi là trùng.
function doTimeWindowsOverlap(w1Start, w1End, w2Start, w2End) {
  const intervals1 = windowToMinuteIntervals(w1Start, w1End);
  const intervals2 = windowToMinuteIntervals(w2Start, w2End);
  for (const [s1, e1] of intervals1) {
    for (const [s2, e2] of intervals2) {
      if (Math.max(s1, s2) < Math.min(e1, e2)) {
        return true;
      }
    }
  }
  return false;
}

// Kiểm tra xung đột khung giờ giữa Sale mới/sửa với các Sale khác trong cùng nhóm
async function findConflictingSaleShift(saleId, candidateWindows, groupIds, queryRunner = db) {
  const cleanWindows = (Array.isArray(candidateWindows) ? candidateWindows : [])
    .map(normalizeHourWindow)
    .filter(Boolean);
  if (cleanWindows.length === 0) return null;

  const validGroupIds = (Array.isArray(groupIds) ? groupIds : [])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (validGroupIds.length === 0) return null;

  const existingSales = await queryRunner.query(
    `SELECT gs.group_id, g.name AS group_name, gs.sale_id, a.full_name AS sale_name, a.username AS sale_username,
            h.start_time, h.end_time, h.timezone
       FROM agent_group_sales gs
       JOIN agent_groups g ON g.id = gs.group_id
       JOIN admins a ON a.id = gs.sale_id
       JOIN account_access_hours h ON h.admin_id = gs.sale_id
      WHERE gs.group_id = ANY($1::int[])
        AND gs.is_active = TRUE
        AND a.is_active = TRUE
        AND h.is_active = TRUE
        AND ($2::int IS NULL OR gs.sale_id <> $2)`,
    [validGroupIds, saleId || null]
  );

  for (const myWindow of cleanWindows) {
    for (const other of existingSales.rows) {
      if (doTimeWindowsOverlap(myWindow.start, myWindow.end, other.start_time, other.end_time)) {
        return {
          groupName: other.group_name,
          saleName: other.sale_name || other.sale_username,
          conflictingWindow: `${String(other.start_time).slice(0, 5)} - ${String(other.end_time).slice(0, 5)}`,
          myWindow: `${myWindow.start} - ${myWindow.end}`
        };
      }
    }
  }
  return null;
}

async function getAccessHours(adminId, queryRunner = db) {
  const result = await queryRunner.query(
    `SELECT start_time, end_time, timezone, is_active FROM account_access_hours
     WHERE admin_id = $1 AND is_active = TRUE ORDER BY start_time`,
    [adminId]
  );
  return result.rows;
}

// Danh sách project QR Concierge, có cache vì được hỏi ở mọi request. Toàn bộ
// phân cấp Agent - Sale (kể cả luật khung giờ) CHỈ áp dụng cho các project này.
let qrProjectIdsCache = { ids: new Set(), fetchedAt: 0 };
const QR_PROJECT_CACHE_MS = 60000;

async function getQrProjectIds() {
  if (Date.now() - qrProjectIdsCache.fetchedAt < QR_PROJECT_CACHE_MS) return qrProjectIdsCache.ids;
  try {
    const result = await db.query(`SELECT id FROM projects WHERE project_type = 'qr_concierge'`);
    qrProjectIdsCache = { ids: new Set(result.rows.map((row) => row.id)), fetchedAt: Date.now() };
  } catch (error) {
    console.error('Không tải được danh sách project QR:', error.message);
  }
  return qrProjectIdsCache.ids;
}

// CHỈ Sale của project QR bị ràng buộc khung giờ.
//
// Agent quản lý KHÔNG có giờ đăng nhập: họ phải vào được bất cứ lúc nào để sắp
// ca, thêm Sale hay xử lý chat tồn — khóa Agent theo giờ là tự khóa luôn người
// duy nhất có thể mở khóa.
async function isHourRestrictedAdmin(admin) {
  if (admin?.role !== 'sale') return false;
  if (!admin?.project_id) return false;
  return (await getQrProjectIds()).has(admin.project_id);
}

// Trả về null nếu được phép, hoặc chuỗi thông báo nếu ngoài giờ.
async function checkWorkingHours(admin, graceMinutes = 0) {
  if (!(await isHourRestrictedAdmin(admin))) return null;
  const rows = await getAccessHours(admin.id);
  if (isWithinAnyWindow(rows, graceMinutes)) return null;
  const windows = describeWindows(rows);
  return windows
    ? `Tài khoản của bạn chỉ được phép đăng nhập từ ${windows}.`
    : 'Tài khoản của bạn hiện không nằm trong khung giờ làm việc.';
}

// Thời gian gia hạn hoàn tất phiên dở dang khi hết ca (mặc định 25 phút)
const DRAIN_GRACE_MINUTES = Number(process.env.DRAIN_GRACE_MINUTES || 25);

// Chặn nhận mới ngoài giờ nhưng cho phép hoàn tất phiên chat dở dang (Draining Mode)
async function requireWorkingHours(req, res, next) {
  try {
    const isRestricted = await isHourRestrictedAdmin(req.admin);
    if (!isRestricted) return next();

    // 1. Kiểm tra xem đang trong ca chuẩn không
    const onShiftMsg = await checkWorkingHours(req.admin, 0);
    if (!onShiftMsg) {
      req.isOnShift = true;
      req.isDrainingGraceMode = false;
      return next();
    }

    // 2. Nếu đã hết ca, kiểm tra xem có đang trong thời gian gia hạn hoàn tất (Draining Grace) không
    const drainMsg = await checkWorkingHours(req.admin, DRAIN_GRACE_MINUTES);
    if (!drainMsg) {
      // Đang trong thời gian gia hạn hoàn tất ca:
      // Kiểm tra xem Sale có phiên chat nào ĐANG TIẾP NHẬN (claimed) không
      const activeClaimed = await db.query(
        `SELECT COUNT(*)::int AS count FROM sessions WHERE claimed_by_admin_id = $1 AND status = 'active'`,
        [req.admin.id]
      );
      if (activeClaimed.rows[0].count > 0) {
        req.isDrainingGraceMode = true;
        req.isOnShift = false;
        res.setHeader('X-Shift-Draining', 'true');
        return next();
      }
    }

    // 3. Ngoài ca và không có phiên chat dở trong thời gian gia hạn -> Đăng xuất an toàn
    const message = onShiftMsg;
    if (req.admin?.token) {
      await db.query('DELETE FROM admin_sessions WHERE token = $1', [req.admin.token]).catch(() => {});
    }
    return res.status(403).json({ error: message, code: 'OUT_OF_HOURS' });
  } catch (error) {
    console.error('Working-hours check error:', error);
    return next(); // lỗi tra cứu giờ không được khóa người đang làm việc
  }
}

// Sale có được nhận chat của nhóm này lúc này không: phải vừa trong giờ đăng
// nhập, vừa trong giờ nhận chat của chính nhóm đó (mục 9 của kế hoạch).
async function isSaleAvailableForGroup(saleId, groupId, queryRunner = db) {
  const result = await queryRunner.query(
    `SELECT gs.sale_id,
            a.is_active,
            COALESCE(json_agg(DISTINCT jsonb_build_object(
              'start_time', gh.start_time, 'end_time', gh.end_time, 'timezone', gh.timezone
            )) FILTER (WHERE gh.id IS NOT NULL), '[]') AS group_hours
     FROM agent_group_sales gs
     JOIN admins a ON a.id = gs.sale_id
     LEFT JOIN group_sale_hours gh
       ON gh.group_id = gs.group_id AND gh.sale_id = gs.sale_id AND gh.is_active = TRUE
     WHERE gs.group_id = $1 AND gs.sale_id = $2 AND gs.is_active = TRUE
     GROUP BY gs.sale_id, a.is_active`,
    [groupId, saleId]
  );
  if (result.rows.length === 0 || !result.rows[0].is_active) return false;
  if (!isWithinAnyWindow(await getAccessHours(saleId, queryRunner))) return false;
  return isWithinAnyWindow(result.rows[0].group_hours);
}

// Danh sách Sale đủ điều kiện nhận chat của một nhóm ngay lúc này.
async function listAvailableSales(groupId, queryRunner = db) {
  const result = await queryRunner.query(
    `SELECT gs.sale_id AS id,
            COALESCE(json_agg(DISTINCT jsonb_build_object(
              'start_time', gh.start_time, 'end_time', gh.end_time, 'timezone', gh.timezone
            )) FILTER (WHERE gh.id IS NOT NULL), '[]') AS group_hours,
            COALESCE(json_agg(DISTINCT jsonb_build_object(
              'start_time', ah.start_time, 'end_time', ah.end_time, 'timezone', ah.timezone
            )) FILTER (WHERE ah.id IS NOT NULL), '[]') AS access_hours
     FROM agent_group_sales gs
     JOIN admins a ON a.id = gs.sale_id AND a.is_active = TRUE
     LEFT JOIN group_sale_hours gh
       ON gh.group_id = gs.group_id AND gh.sale_id = gs.sale_id AND gh.is_active = TRUE
     LEFT JOIN account_access_hours ah ON ah.admin_id = gs.sale_id AND ah.is_active = TRUE
     WHERE gs.group_id = $1 AND gs.is_active = TRUE
     GROUP BY gs.sale_id`,
    [groupId]
  );
  return result.rows
    .filter((row) => isWithinAnyWindow(row.access_hours) && isWithinAnyWindow(row.group_hours))
    .map((row) => row.id);
}

async function resolveQrChatAccount(projectId, qrCode, queryRunner = db) {
  if (!qrCode) return null;
  const result = await queryRunner.query(
    `SELECT q.id, q.project_id, q.owner_admin_id, q.label,
            q.group_id,
            COALESCE(p.ai_enabled, p.project_type <> 'qr_concierge') AS ai_enabled,
            a.full_name AS owner_name,
            g.name AS group_name
       FROM qr_chat_accounts q
       JOIN projects p ON p.id = q.project_id
       JOIN admins a ON a.id = q.owner_admin_id
       LEFT JOIN agent_groups g ON g.id = q.group_id
      WHERE q.project_id = $1 AND q.code = $2
        AND q.is_active = TRUE AND p.project_type = 'qr_concierge' AND a.is_active = TRUE`,
    [projectId, qrCode]
  );
  return result.rows[0] || null;
}

// Tự động phân tích và tóm tắt cuộc hội thoại bằng AI khi đóng phiên chat
async function autoSummarizeClosedSession(sessionId) {
  if (!sessionId) return;
  try {
    const sessionRes = await db.query('SELECT id, project_id, ai_summary, intent_tags FROM sessions WHERE id = $1', [sessionId]);
    const session = sessionRes.rows[0];
    if (!session) return;
    if (session.ai_summary && session.ai_summary.trim() && session.ai_summary !== 'Không có dữ liệu phân tích.') {
      return; // Đã có tóm tắt trước đó
    }

    const msgRes = await db.query(
      'SELECT sender, original_text as text FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    if (msgRes.rows.length === 0) return;

    const analysis = await gemini.analyzeSession(msgRes.rows);
    const summary = analysis?.summary || null;
    const tags = analysis?.tags || null;

    if (summary) {
      await db.query(
        `UPDATE sessions
            SET ai_summary = $1, intent_tags = $2
          WHERE id = $3`,
        [summary, tags, sessionId]
      );
      notifyAdminRealtime('session_update', {
        sessionId,
        projectId: session.project_id,
        action: 'summarized',
        summary,
        tags
      });
      console.log(`[AI Auto-Summary] Đã tự động tóm tắt phiên chat ${sessionId}: "${summary}"`);
    }
  } catch (error) {
    console.error(`[AI Auto-Summary] Lỗi khi tự động tóm tắt phiên ${sessionId}:`, error.message);
  }
}

async function closeActiveQrSession(qrAccountId, queryRunner = db) {
  const oldSessions = await queryRunner.query(
    `UPDATE sessions SET status = 'closed',
            routing_status = CASE WHEN routing_status IS NULL THEN NULL ELSE 'closed' END
      WHERE qr_account_id = $1 AND status = 'active'
      RETURNING id`,
    [qrAccountId]
  );
  for (const row of oldSessions.rows) {
    void autoSummarizeClosedSession(row.id);
  }
}

async function closeActiveQrSessionsForVisitor(projectId, email, queryRunner = db) {
  if (!projectId || !email) return;
  const oldSessions = await queryRunner.query(
    `UPDATE sessions SET status = 'closed',
            routing_status = CASE WHEN routing_status IS NULL THEN NULL ELSE 'closed' END
      WHERE project_id = $1
        AND LOWER(visitor_email) = LOWER($2)
        AND qr_account_id IS NOT NULL
        AND status = 'active'
      RETURNING id`,
    [projectId, String(email).trim()]
  );
  for (const row of oldSessions.rows) {
    void autoSummarizeClosedSession(row.id);
  }
}

async function expireQrSessionIfNeeded(session, queryRunner = db) {
  if (session?.status === 'active' && session.qr_account_id && session.expires_at && new Date(session.expires_at) <= new Date()) {
    await queryRunner.query(
      `UPDATE sessions SET status = 'closed',
              routing_status = CASE WHEN routing_status IS NULL THEN NULL ELSE 'closed' END
        WHERE id = $1 AND status = 'active'`,
      [session.id]
    );
    session.status = 'closed';
    void autoSummarizeClosedSession(session.id);
  }
  return session;
}

// QR sessions are idle sessions: every real chat activity gives the customer
// and assigned agent another 15 minutes. A new QR scan still closes the old
// session immediately, regardless of this sliding expiry.
async function extendQrSessionOnActivity(session, queryRunner = db) {
  if (!session?.id || !session.qr_account_id || session.status !== 'active') return null;
  const expiresAt = new Date(Date.now() + QR_CHAT_SESSION_MS);
  const result = await queryRunner.query(
    `UPDATE sessions SET expires_at = $1
      WHERE id = $2 AND status = 'active' AND qr_account_id IS NOT NULL
      RETURNING expires_at`,
    [expiresAt, session.id]
  );
  if (result.rows[0]) session.expires_at = result.rows[0].expires_at;
  return result.rows[0]?.expires_at || null;
}

async function upsertCustomer({ projectId, email, fullName, authProvider, qrAccountId = null }, queryRunner = db) {
  if (!projectId || !email) return null;
  const result = await queryRunner.query(
    `INSERT INTO customers (project_id, email, full_name, auth_provider, last_qr_account_id)
     VALUES ($1, LOWER($2), $3, $4, $5)
     ON CONFLICT (project_id, email) DO UPDATE SET
       -- Portal always supplies a display name; avoid an empty-string literal here
       -- so deployments cannot corrupt the SQL template around nested quotes.
       full_name = COALESCE(EXCLUDED.full_name, customers.full_name),
       auth_provider = EXCLUDED.auth_provider,
       last_qr_account_id = EXCLUDED.last_qr_account_id,
       last_login_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [projectId, email.trim(), fullName || null, authProvider || 'otp', qrAccountId]
  );
  return result.rows[0] || null;
}

async function getAdminFromToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;
  if (!token) return null;
  const result = await db.query(
    `SELECT a.id, a.username, a.full_name, a.role, a.project_id, a.is_active, a.sale_limit, a.avatar_url, s.expires_at
     FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  if (!result.rows[0]) return null;
  const admin = result.rows[0];
  const currentExpires = new Date(admin.expires_at).getTime();
  if (currentExpires - Date.now() < (ADMIN_SESSION_HOURS - 1) * 3600000) {
    const newExpiresAt = new Date(Date.now() + ADMIN_SESSION_MS);
    db.query('UPDATE admin_sessions SET expires_at = $1, last_seen_at = NOW() WHERE token = $2', [newExpiresAt, token]).catch(() => {});
  } else {
    db.query('UPDATE admin_sessions SET last_seen_at = NOW() WHERE token = $1', [token]).catch(() => {});
  }
  return admin;
}

// Middleware to disable response caching for all API endpoints
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// ----------------------------------------------------
// CLIENT API ENDPOINTS (VISITORS)
// ----------------------------------------------------

/**
 * @openapi
 * /api/otp/send:
 *   post:
 *     summary: Gửi mã OTP xác thực qua email
 *     description: Tạo mã số 6 chữ số và gửi qua Resend để xác thực email của khách hàng.
 *     tags:
 *       - Khách hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *     responses:
 *       200:
 *         description: Gửi OTP thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Mã OTP đã được gửi về email của bạn.
 *       400:
 *         description: Email không hợp lệ
 *       500:
 *         description: Lỗi hệ thống khi xử lý
 */
// 1. Generate and Send OTP to email
app.post('/api/otp/send', async (req, res) => {
  const { email, projectId } = req.body;
  if (projectId === 'dealphuquoc') {
    return res.status(403).json({
      code: 'LOGIN_REQUIRED',
      error: 'Vui lòng đăng nhập tài khoản DealPhuQuoc để sử dụng chat.'
    });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email không hợp lệ.' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

  try {
    // Upsert OTP into table
    await db.query(
      `INSERT INTO otps (email, code, expires_at) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
      [email, code, expiresAt]
    );

    // Send email via Resend
    const sent = await resend.sendOTPEmail(email, code);
    if (!sent.ok) {
      console.error('[OTP Send] Failed:', sent.reason);
      return res.status(500).json({ error: `Không thể gửi email OTP: ${sent.reason}` });
    }

    res.json({ success: true, message: 'Mã OTP đã được gửi về email của bạn.' });
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ error: `Lỗi hệ thống khi xử lý OTP: ${error.message}` });
  }
});

/**
 * @openapi
 * /api/otp/verify:
 *   post:
 *     summary: Xác thực mã OTP và khởi tạo phòng chat
 *     description: Xác thực mã OTP đã được gửi về email. Nếu chính xác và chưa hết hạn, hệ thống sẽ tạo một phiên chat mới và cấp một `sessionId` dạng UUID.
 *     tags:
 *       - Khách hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - projectId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *               name:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               projectId:
 *                 type: string
 *                 example: pastie-landingpage
 *     responses:
 *       200:
 *         description: Xác thực thành công và khởi tạo session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessionId:
 *                   type: string
 *                   format: uuid
 *                   example: 123e4567-e89b-12d3-a456-426614174000
 *                 name:
 *                   type: string
 *                   example: Nguyễn Văn A
 *       400:
 *         description: Mã OTP sai hoặc hết hạn hoặc thiếu thông số đầu vào
 *       500:
 *         description: Lỗi hệ thống
 */
function parseUserAgent(ua) {
  let browser = 'Chrome';
  let device = 'Desktop';

  if (!ua) return { browser, device };

  // OS / Device detection
  if (ua.includes('Windows')) device = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) device = 'macOS';
  else if (ua.includes('iPhone')) device = 'iPhone';
  else if (ua.includes('iPad')) device = 'iPad';
  else if (ua.includes('Android')) device = 'Android';
  else if (ua.includes('Linux')) device = 'Linux';

  // Browser detection
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  
  return { browser, device };
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || req.socket.remoteAddress || '');
  return ip.split(',')[0].trim().replace(/^::ffff:/, '');
}

async function findActiveSessionForClient(projectId, email, clientIp, browser, device, queryRunner = db) {
  // Tái dùng phiên theo EMAIL đã định danh (không ràng buộc IP/trình duyệt/thiết bị) -> mở tab mới,
  // đổi mạng hay đổi máy vẫn vào ĐÚNG một đoạn chat của user, không tạo phiên trùng.
  const result = await queryRunner.query(
    `SELECT id FROM sessions
     WHERE project_id = $1
       AND LOWER(visitor_email) = LOWER($2)
       AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId, email]
  );
  return result.rows[0] || null;
}

async function findActiveAnonymousSessionForClient(projectId, clientIp, browser, device, queryRunner = db) {
  const result = await queryRunner.query(
    `SELECT id FROM sessions
     WHERE project_id = $1
       AND visitor_email IS NULL
       AND status = 'active'
       AND client_ip = $2
       AND browser = $3
       AND device = $4
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId, clientIp, browser, device]
  );
  return result.rows[0] || null;
}

// 2. Verify OTP and Create/Activate Chat Session
app.post('/api/otp/verify', async (req, res) => {
  const { email, code, name, projectId, language, qrCode } = req.body;
  
  if (!email || !code || !projectId) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email, mã OTP và projectId.' });
  }
  if (projectId === 'dealphuquoc') {
    return res.status(403).json({
      code: 'LOGIN_REQUIRED',
      error: 'Vui lòng đăng nhập tài khoản DealPhuQuoc để sử dụng chat.'
    });
  }

  try {
    const qrAccount = await resolveQrChatAccount(projectId, qrCode);
    if (qrCode && !qrAccount) return res.status(404).json({ error: 'Mã QR không hợp lệ hoặc đã bị vô hiệu hóa.' });
    // Query OTP record
    const otpRes = await db.query('SELECT * FROM otps WHERE email = $1', [email]);
    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy mã OTP cho email này.' });
    }

    const { code: savedCode, expires_at: expiresAt } = otpRes.rows[0];

    // Check code and expiration
    if (savedCode !== code) {
      return res.status(400).json({ error: 'Mã OTP không chính xác.' });
    }

    if (new Date() > new Date(expiresAt)) {
      return res.status(400).json({ error: 'Mã OTP đã hết hạn (quá 5 phút).' });
    }

    // Always create a new distinct device/browser session
    const sessionId = randomUUID(); // Node native secure UUID
    const finalName = name || 'Khách ẩn danh';
    const finalLang = language || 'vi';

    // Parse User-Agent
    const ua = req.headers['user-agent'] || '';
    const { browser, device } = parseUserAgent(ua);
    const clientIp = getClientIp(req);

    await upsertCustomer({
      projectId,
      email,
      fullName: finalName,
      authProvider: 'otp',
      qrAccountId: qrAccount?.id || null
    }).catch((error) => console.error('Customer profile save failed after OTP login:', error.message));

    const existingSession = qrAccount ? null : await findActiveSessionForClient(projectId, email, clientIp, browser, device);
    if (existingSession) {
      return res.json({ success: true, sessionId: existingSession.id, name: finalName, reused: true });
    }

    // Auto-assignment algorithm (Least Active Load)
    let assignedAdminId = qrAccount?.owner_admin_id || null;
    try {
      if (assignedAdminId) throw new Error('QR account has an assigned agent');
      // Ưu tiên subadmin gắn đúng project (hoặc toàn quyền project_id IS NULL)
      const leastLoadRes = await db.query(`
        SELECT a.id, a.full_name, COUNT(s.id) as active_count
        FROM admins a
        LEFT JOIN sessions s ON s.assigned_admin_id = a.id AND s.status = 'active'
        WHERE a.role = 'subadmin' AND a.is_active = TRUE
          AND (a.project_id = $1 OR a.project_id IS NULL)
        GROUP BY a.id, a.full_name
        ORDER BY active_count ASC, a.id ASC
        LIMIT 1
      `, [projectId]);
      if (leastLoadRes.rows.length > 0) {
        assignedAdminId = leastLoadRes.rows[0].id;
        console.log(`Auto-assigned conversation ${sessionId} to sub-admin ${leastLoadRes.rows[0].full_name} (Active chats: ${leastLoadRes.rows[0].active_count})`);
      } else {
        // Fallback to superadmin
        const superRes = await db.query("SELECT id FROM admins WHERE role = 'superadmin' AND is_active = TRUE LIMIT 1");
        if (superRes.rows.length > 0) {
          assignedAdminId = superRes.rows[0].id;
          console.log(`No active sub-admins found. Auto-assigned to Super-Admin.`);
        }
      }
    } catch (assignError) {
      if (!qrAccount) console.error('Error during auto-assignment calculations:', assignError.message);
    }

    if (qrAccount) {
      await closeActiveQrSessionsForVisitor(projectId, email);
      await closeActiveQrSession(qrAccount.id);
    }
    await db.query(
      // Định tuyến QR: chat vào hàng đợi của nhóm gắn với QR. routing_status chỉ
      // được đặt cho phiên QR có nhóm — phiên của flow cũ vẫn để NULL nên không
      // lọt vào bộ lọc "đang chờ / đang xử lý" của Agent.
      `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, detected_language, is_verified, status, browser, device, client_ip, assigned_admin_id, qr_account_id, expires_at, group_id, routing_status)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'active', $6, $7, $8, $9, $10, $11, $12, $13)`,
      [sessionId, projectId, finalName, email, finalLang, browser, device, clientIp, assignedAdminId, qrAccount?.id || null, qrAccount ? new Date(Date.now() + QR_CHAT_SESSION_MS) : null,
       qrAccount?.group_id || null, qrAccount?.group_id ? 'waiting' : null]
    );

    // Only chatbot-enabled projects receive an automatic greeting.
    const greetings = {
      vi: `Xin chào ${finalName}! 👋 Mình là Pat, trợ lý của Pastie đây 🌴 Mình giúp gì được cho bạn nào?`,
      en: `Hi ${finalName}! 👋 I'm Pat from Pastie 🌴 How can I help you today?`,
      ru: `Привет, ${finalName}! 👋 Я Pat из Pastie 🌴 Чем могу помочь?`,
      zh: `您好，${finalName}！👋 我是 Pastie 的小助手 Pat 🌴 有什么可以帮您？`,
    };
    if (qrAccount?.ai_enabled !== false) {
      const greetingText = greetings[finalLang] || greetings['vi'];
      await db.query(
        `INSERT INTO messages (session_id, sender, original_text, translated_text, language) VALUES ($1, 'ai', $2, $2, $3)`,
        [sessionId, greetingText, finalLang]
      );
    }

    // Chỉ hủy mã sau khi toàn bộ phiên được tạo thành công. Nếu DB tạm lỗi,
    // khách vẫn có thể thử lại cùng mã thay vì bị khóa khỏi form OTP.
    await db.query('DELETE FROM otps WHERE email = $1', [email]);

    res.json({ success: true, sessionId, name: finalName });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xác thực OTP.' });
  }
});

/**
 * @openapi
 * /api/chats/message:
 *   post:
 *     summary: Gửi tin nhắn song ngữ (Khách hàng & Hỗ trợ viên)
 *     description: Tiếp nhận tin nhắn từ Khách hàng (`visitor`) hoặc Nhân viên (`agent`). Hệ thống tự động dịch ngôn ngữ bằng Gemini AI và lưu trữ hội thoại song ngữ.
 *     tags:
 *       - Tin nhắn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - sender
 *               - text
 *               - targetLang
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của phiên chat (lấy từ verify OTP hoặc danh sách admin)
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               sender:
 *                 type: string
 *                 enum: [visitor, agent]
 *                 description: Người gửi (khách hàng hoặc nhân viên)
 *                 example: visitor
 *               text:
 *                 type: string
 *                 description: Nội dung tin nhắn cần gửi
 *                 example: Hello, I have an issue
 *               targetLang:
 *                 type: string
 *                 description: Ngôn ngữ đích cần dịch sang (ví dụ khách gửi tiếng Anh thì targetLang='vi', nhân viên gửi tiếng Việt thì targetLang='en')
 *                 example: vi
 *     responses:
 *       200:
 *         description: Gửi thành công và tin nhắn đã được dịch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     session_id:
 *                       type: string
 *                     sender:
 *                       type: string
 *                     original_text:
 *                       type: string
 *                     translated_text:
 *                       type: string
 *                     language:
 *                       type: string
 *       400:
 *         description: Thiếu thông số đầu vào bắt buộc
 *       404:
 *         description: Phiên chat không tồn tại
 *       410:
 *         description: Phiên chat đã bị đóng
 *       500:
 *         description: Lỗi hệ thống khi dịch/lưu tin nhắn
 */
// 3. Log Message and Translate (2-way Translation & AI Chatbot / Multi-Channel Router)
// Ba endpoint gửi tin / đính kèm / ghi âm dùng chung cho cả khách lẫn nhân viên
// nên không gắn checkAdminAuth được. Dashboard vẫn gửi kèm Bearer token, nên khi
// sender là nhân viên ta soi token đó để chặn thao tác ngoài ca (mục 8 kế hoạch).
// Khách không có token thì bỏ qua, không ảnh hưởng gì.
async function blockStaffOutOfHours(req, res, sender, sessionId = null) {
  if (sender !== 'agent' && sender !== 'admin') return false;
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) return false;
  const token = header.substring(7);
  try {
    const result = await db.query(
      `SELECT a.id, a.role, a.project_id FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token = $1`,
      [token]
    );
    if (result.rows.length === 0) return false;
    const admin = result.rows[0];
    const isRestricted = await isHourRestrictedAdmin(admin);
    if (!isRestricted) return false;

    const onShiftMsg = await checkWorkingHours(admin, 0);
    if (!onShiftMsg) return false;

    // Nếu đã hết ca nhưng trong thời gian gia hạn Draining Grace (25 phút):
    // Cho phép trả lời nốt phiên mà chính Sale này đang tiếp nhận (claimed)
    const drainMsg = await checkWorkingHours(admin, DRAIN_GRACE_MINUTES);
    if (!drainMsg && sessionId) {
      const claimCheck = await db.query(
        `SELECT id FROM sessions WHERE id = $1 AND claimed_by_admin_id = $2 AND status = 'active'`,
        [sessionId, admin.id]
      );
      if (claimCheck.rows.length > 0) {
        return false; // Cho phép hoàn tất nốt phiên dở
      }
    }

    await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]).catch(() => {});
    res.status(403).json({ error: onShiftMsg, code: 'OUT_OF_HOURS' });
    return true;
  } catch (error) {
    console.error('Staff out-of-hours check error:', error);
    return false;
  }
}

app.post('/api/chats/message', async (req, res) => {
  const { sessionId, sender, text, targetLang, visitorLang, adminLang } = req.body;

  if (!sessionId || !sender || !text || !targetLang) {
    return res.status(400).json({ error: 'Thiếu thông số đầu vào bắt buộc.' });
  }
  if (await blockStaffOutOfHours(req, res, sender, sessionId)) return;

  try {
    // Verify session is active
    const sessionRes = await db.query(
      `SELECT s.*, COALESCE(p.ai_enabled, p.project_type <> 'qr_concierge') AS ai_enabled
         FROM sessions s LEFT JOIN projects p ON p.id = s.project_id
        WHERE s.id = $1`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Phiên chat không tồn tại.' });
    }
    await expireQrSessionIfNeeded(sessionRes.rows[0]);
    if (sessionRes.rows[0].status === 'closed') {
      return res.status(410).json({ error: 'Phiên chat đã bị đóng.' });
    }

    // Báo agent MỌI tin KHÁCH gửi đến (tin nhắn đến). KHÔNG báo tin AI/nhân viên trả lời.
    if (sender === 'visitor') void notifyAgentMessage(sessionRes.rows[0], text);

    // Call Gemini to translate and detect language
    const { translatedText, detectedLang } = await gemini.translateText(text, targetLang);

    // Resolve sender_admin_id if sent by an agent with a valid session token
    let senderAdminId = null;
    if (sender === 'agent') {
      const sendingAdmin = await getAdminFromToken(req);
      if (!sendingAdmin?.is_active || !isChatStaff(sendingAdmin)) {
        return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản nhân viên hợp lệ để trả lời.' });
      }
      if (!canAccessProject(sendingAdmin, sessionRes.rows[0].project_id)) {
        return res.status(403).json({ error: 'Bạn không có quyền trả lời chat của project này.' });
      }

      // QUY ĐỊNH: Agent quản lý ở chế độ Giám sát (Chỉ xem) — KHÔNG tham gia chat trực tiếp với khách
      if (sendingAdmin.role === 'agent') {
        return res.status(403).json({
          error: 'Tài khoản Agent quản lý ở chế độ Giám sát (Chỉ xem) và không tham gia chat trực tiếp. Việc trả lời khách hàng do nhân viên Sale phụ trách.'
        });
      }

      const claim = sessionRes.rows[0].claimed_by_admin_id;
      const assigned = sessionRes.rows[0].assigned_admin_id;
      const isSuper = isSuperAdmin(sendingAdmin);
      const isSale = sendingAdmin.role === 'sale';

      if (!isSuper && !isSale) {
        const isClaimedByMe = claim && Number(claim) === Number(sendingAdmin.id);
        const isAssignedToMe = assigned && Number(assigned) === Number(sendingAdmin.id);

        if (!isClaimedByMe && !isAssignedToMe) {
          if (claim && Number(claim) !== Number(sendingAdmin.id)) {
            return res.status(409).json({ error: 'Cuộc trò chuyện này đã được nhân viên khác tiếp nhận.', claimedByAdminId: claim });
          }
          return res.status(403).json({ error: 'Bạn không có quyền trả lời cuộc trò chuyện này.' });
        }
      }

      // Tự động claim cho Sale hoặc Superadmin khi gửi tin nhắn đầu tiên
      if (!claim) {
        await db.query(
          `UPDATE sessions SET claimed_by_admin_id = $1, claimed_at = NOW()
           WHERE id = $2 AND claimed_by_admin_id IS NULL`,
          [sendingAdmin.id, sessionId]
        );
      }
      senderAdminId = sendingAdmin.id;
    }

    // Save message to database
    const msgRes = await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language, sender_admin_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [sessionId, sender, text, translatedText, detectedLang, senderAdminId]
    );
    const sessionExpiresAt = await extendQrSessionOnActivity(sessionRes.rows[0]);
    notifyAdminRealtime('new_message', { sessionId, projectId: sessionRes.rows[0].project_id, sender, messageId: msgRes.rows[0]?.id });

    // THÔNG BÁO NGOÀI GIỜ LÀM VIỆC (Dự án QR Concierge):
    // Khi khách nhắn tin mà trong nhóm không có bất kỳ Sale nào đang trong ca trực,
    // và phiên chat chưa có ai tiếp nhận -> gửi 1 thông báo hệ thống lịch sự (tối đa 1 lần / 6 giờ).
    if (sender === 'visitor' && sessionRes.rows[0].group_id && !sessionRes.rows[0].claimed_by_admin_id) {
      const isQr = (await getQrProjectIds()).has(sessionRes.rows[0].project_id);
      if (isQr) {
        const availableSales = await listAvailableSales(sessionRes.rows[0].group_id);
        if (availableSales.length === 0) {
          const recentOffHours = await db.query(
            `SELECT id FROM messages WHERE session_id = $1 AND sender = 'system' AND original_text LIKE '%khung giờ làm việc%' AND created_at > NOW() - INTERVAL '6 hours' LIMIT 1`,
            [sessionId]
          );
          if (recentOffHours.rows.length === 0) {
            const offHoursMsg = `Cảm ơn bạn đã liên hệ! Hiện tại đã hết khung giờ làm việc của nhân viên tư vấn. Tin nhắn của bạn đã được lưu lại và nhân viên ca trực tiếp theo sẽ phản hồi ngay khi vào ca.`;
            const sysMsgRes = await db.query(
              `INSERT INTO messages (session_id, sender, original_text, translated_text, language) VALUES ($1, 'system', $2, $2, 'vi') RETURNING *`,
              [sessionId, offHoursMsg]
            );
            notifyAdminRealtime('new_message', { sessionId, projectId: sessionRes.rows[0].project_id, sender: 'system', messageId: sysMsgRes.rows[0]?.id });
          }
        }
      }
    }

    // Update session detected language — prioritize the language actually detected from the message text
    // over the widget's static UI language (visitorLang), so the AI replies in the language the visitor is typing in.
    //
    // Ngoại lệ: dự án QR Concierge. Khách đã tự chọn ngôn ngữ lúc đăng nhập, nên
    // nhắn xen một câu tiếng khác (tên riêng, một từ tiếng Anh…) không được phép
    // đổi ngôn ngữ của cả phiên — nếu không hóa đơn và giao diện sẽ nhảy lung tung.
    if (sender === 'visitor' && !sessionRes.rows[0].qr_account_id) {
      const updateLang = detectedLang || visitorLang;
      if (updateLang) {
        await db.query('UPDATE sessions SET detected_language = $1 WHERE id = $2', [updateLang, sessionId]);
      }
    }

    // Lock conversation admin_language on first agent reply
    if (sender === 'agent') {
      const currentAdminLang = sessionRes.rows[0].admin_language;
      if (!currentAdminLang) {
        const lockLang = adminLang || targetLang || 'vi';
        await db.query('UPDATE sessions SET admin_language = $1 WHERE id = $2', [lockLang, sessionId]);
      }

      // MULTI-CHANNEL: If this is an agent reply in a multi-channel session, automatically forward it to Meta APIs
      if (sessionRes.rows[0].platform && sessionRes.rows[0].platform !== 'widget') {
        const platform = sessionRes.rows[0].platform;
        const recipientId = sessionRes.rows[0].platform_sender_id;
        await sendMultichannelMessage(platform, recipientId, translatedText);
      }
    }

    let aiReplyMsg = null;

    // AI CHATBOT: If visitor sends a message and no human agent has taken over yet, auto-respond using the Knowledge Base!
    if (sender === 'visitor' && sessionRes.rows[0].ai_enabled !== false) {
      const sessionData = sessionRes.rows[0];
      // Use the language just detected from THIS message first (most accurate), fall back to session's stored language
      const visitorLang = detectedLang || sessionData?.detected_language || 'vi';

      // Keyword detection: visitor wants to speak to a human agent
      const AGENT_KEYWORDS = /\b(cskh|gặp cskh|gap cskh|chăm sóc|cham soc|nhân viên|nhan vien|agent|support|tư vấn|tu van|gặp người|gap nguoi|người thật|nguoi that|con người|con nguoi|speak to|talk to|human|help me|trực tiếp|truc tiep|kết nối|ket noi|оператор|поддержка|помогите|помощь|сотрудник|консультант|связаться|человек|живой|клиентская|客服|人工|转人工|帮助|联系|工作人员|真人|支持)\b/i;
      const wantsAgent = AGENT_KEYWORDS.test(text);

      console.log(`[LiveChat] Session ${sessionId} | requested_agent=${sessionData.requested_agent} | wantsAgent=${wantsAgent} | text="${text.substring(0, 50)}"`);

      if (wantsAgent && !sessionData.requested_agent) {
        // Flag session so AI won't respond from now on
        await db.query(`UPDATE sessions SET requested_agent = true WHERE id = $1`, [sessionId]);
        // (Không báo riêng ở đây: tin khách "gặp CSKH" đã được notifyAgentMessage báo ở trên)
        const transferMsgs = {
          vi: 'Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ trong giây lát ⏳',
          en: 'Connecting you with a support agent, please hold on ⏳',
          ru: 'Соединяем вас с оператором поддержки, подождите ⏳',
          zh: '正在为您连接客服人员，请稍候 ⏳',
          ko: '상담원과 연결 중입니다. 잠시만 기다려 주세요 ⏳',
        };
        const transferMsg = transferMsgs[visitorLang] || transferMsgs['vi'];
        const aiMsgRes = await db.query(
          `INSERT INTO messages (session_id, sender, original_text, translated_text, language)
           VALUES ($1, 'system', $2, $2, $3) RETURNING *`,
          [sessionId, transferMsg, visitorLang]
        );
        aiReplyMsg = aiMsgRes.rows[0];
      } else if (sessionData.requested_agent) {
        // Agent was requested — check if human has replied yet
        const agentRepliedCheck = await db.query(
          "SELECT id FROM messages WHERE session_id = $1 AND sender = 'agent' LIMIT 1",
          [sessionId]
        );
        if (agentRepliedCheck.rows.length === 0) {
          // No agent reply yet — send a waiting reminder
          const waitMsgs = {
            vi: 'Nhân viên đang tiếp nhận, vui lòng chờ trong giây lát ⏳',
            en: 'An agent will be with you shortly, please hold on ⏳',
            ru: 'Оператор уже принимает вашу заявку, подождите ⏳',
            zh: '客服人员正在接待中，请稍候 ⏳',
            ko: '상담원이 확인 중입니다. 잠시만 기다려 주세요 ⏳',
          };
          const waitMsg = waitMsgs[visitorLang] || waitMsgs['vi'];
          const aiMsgRes = await db.query(
            `INSERT INTO messages (session_id, sender, original_text, translated_text, language)
             VALUES ($1, 'system', $2, $2, $3) RETURNING *`,
            [sessionId, waitMsg, visitorLang]
          );
          aiReplyMsg = aiMsgRes.rows[0];
        }
        // If agent has replied → true silence, agent handles it
      } else if (!wantsAgent && !sessionData.requested_agent) {
        // Only run AI if agent hasn't taken over and user hasn't requested agent
        const agentMsgCheck = await db.query(
          "SELECT id FROM messages WHERE session_id = $1 AND sender = 'agent' LIMIT 1",
          [sessionId]
        );
        const isHumanAgentActive = agentMsgCheck.rows.length > 0;

        if (!isHumanAgentActive) {
          // Check transfer keywords before running AI
          try {
            const kwRes = await db.query('SELECT keywords FROM transfer_keywords WHERE project_id = $1', [sessionData.project_id]);
            const keywords = kwRes.rows[0]?.keywords || [];
            const msgLower = text.toLowerCase();
            const triggered = keywords.find(kw => kw && msgLower.includes(kw.toLowerCase()));
            if (triggered) {
              const transferMsgs = {
                vi: `Cảm ơn bạn! Tôi sẽ kết nối bạn với nhân viên hỗ trợ ngay bây giờ ⏳`,
                en: `Thank you! Connecting you with a support agent now ⏳`,
                ru: `Спасибо! Соединяю вас с оператором ⏳`,
                zh: `谢谢！正在为您转接客服人员 ⏳`,
                ko: `감사합니다! 지금 상담원에게 연결해 드리겠습니다 ⏳`,
              };
              const transferMsg = transferMsgs[visitorLang] || transferMsgs['vi'];
              await db.query(`UPDATE sessions SET requested_agent = true WHERE id = $1`, [sessionId]);
              const kwMsgRes = await db.query(
                `INSERT INTO messages (session_id, sender, original_text, translated_text, language) VALUES ($1, 'system', $2, $2, $3) RETURNING *`,
                [sessionId, transferMsg, visitorLang]
              );
              aiReplyMsg = kwMsgRes.rows[0];
              console.log(`[LiveChat] Keyword "${triggered}" triggered agent transfer for session ${sessionId}`);
              return res.json({ success: true, message: msgRes.rows[0], aiReply: aiReplyMsg });
            }
          } catch (kwErr) { /* table may not exist yet — ignore */ }

          const kbRes = await db.query(
            `SELECT source_url, cleaned_content FROM knowledge_base WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 5`,
            [sessionData.project_id]
          );
          const websiteKb = kbRes.rows.find(r => r.source_url !== 'chat-synthesis')?.cleaned_content || "Bạn là một trợ lý ảo hỗ trợ nhiệt tình cho thương hiệu Pastie.";
          const chatKb = kbRes.rows.find(r => r.source_url === 'chat-synthesis')?.cleaned_content || '';
          const rawKb = chatKb
            ? `${websiteKb}\n\n=== TRI THỨC TỪ HỘI THOẠI THỰC TẾ ===\n${chatKb}`
            : websiteKb;
          const knowledgeContext = rawKb.substring(0, 10000);
          const langNameMap = { vi: 'Tiếng Việt', en: 'English', ru: 'Русский (Russian)', zh: '中文 (Chinese)', ko: '한국어 (Korean)' };
          const replyLangName = langNameMap[visitorLang] || 'Tiếng Việt';

          const systemInstruction = `
            Bạn TÊN LÀ "Pat", trợ lý tư vấn dịch vụ du lịch và phòng nghỉ cao cấp cực kỳ chuyên nghiệp, thân thiện và vui vẻ của thương hiệu Pastie. Luôn tự xưng là Pat, TUYỆT ĐỐI không tự gọi mình là "AI", "trợ lý ảo" hay "chatbot".

            Hãy trả lời các câu hỏi của khách hàng một cách ngắn gọn, súc tích (dưới 3 câu) để hiển thị tốt nhất trên thiết bị di động.
            QUY TẮC NGÔN NGỮ BẮT BUỘC: Khách hàng đang viết bằng ${replyLangName}. Bạn PHẢI trả lời TOÀN BỘ bằng ${replyLangName}, tuyệt đối không trộn lẫn ngôn ngữ khác.

            Dưới đây là TOÀN BỘ CƠ SỞ TRI THỨC được lấy từ trang web chính thức của chúng tôi. CHỈ trả lời dựa trên tài liệu này, không tự bịa thông tin:

            === CƠ SỞ TRI THỨC CHÍNH THỨC ===
            ${knowledgeContext}
            === HẾT CƠ SỞ TRI THỨC ===

            QUY TẮC BẮT BUỘC: Nếu câu hỏi nằm ngoài cơ sở tri thức trên, BẮT BUỘC bắt đầu câu trả lời bằng "[TRANSFER]" rồi mới viết nội dung. Ví dụ: "[TRANSFER] Câu hỏi này cần nhân viên hỗ trợ trực tiếp, vui lòng chờ trong giây lát ⏳"
          `;

          const historyRes = await db.query(
            `SELECT sender, original_text FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 10`,
            [sessionId]
          );

          if (isAiRateLimited(sessionId)) return res.json({ success: true, message: msgRes.rows[0], aiReply: null });
          console.log(`[LiveChat] Calling AI for session ${sessionId} | lang=${visitorLang} | KB=${kbRes.rows.length > 0 ? 'found' : 'empty'}`);
          const rawAiReply = await gemini.generateChatbotResponse(systemInstruction, historyRes.rows.slice(0, -1), text.substring(0, AI_TEXT_MAX_LEN), visitorLang);
          console.log(`[LiveChat] AI reply for ${sessionId}: "${rawAiReply?.substring(0, 80)}"`);

          // Detect [TRANSFER] → auto set requested_agent flag
          let finalAiReply = rawAiReply;
          if (rawAiReply.startsWith('[TRANSFER]')) {
            finalAiReply = rawAiReply.replace('[TRANSFER]', '').trim();
            await db.query(`UPDATE sessions SET requested_agent = true WHERE id = $1`, [sessionId]);
            console.log(`[LiveChat] AI cannot answer → auto-flagged session ${sessionId} for agent transfer.`);
          }

          const aiMsgRes = await db.query(
            `INSERT INTO messages (session_id, sender, original_text, translated_text, language)
             VALUES ($1, 'ai', $2, $2, $3) RETURNING *`,
            [sessionId, finalAiReply, visitorLang]
          );
          aiReplyMsg = aiMsgRes.rows[0];
          notifyAdminRealtime('new_message', { sessionId, projectId: sessionRes.rows[0].project_id, sender: 'ai', messageId: aiReplyMsg.id });
        } else {
          console.log(`[LiveChat] Session ${sessionId}: human agent active, skipping AI.`);
        }
      }
    }

    if (aiReplyMsg && !res.headersSent) {
      notifyAdminRealtime('new_message', { sessionId, projectId: sessionRes.rows[0].project_id, sender: aiReplyMsg.sender || 'system', messageId: aiReplyMsg.id });
    }

    res.json({
      success: true,
      message: msgRes.rows[0],
      aiReply: aiReplyMsg,
      expiresAt: sessionExpiresAt
    });
  } catch (error) {
    console.error('Message translation/logging error:', error);
    res.status(500).json({ error: 'Lỗi khi dịch thuật/lưu tin nhắn.' });
  }
});

// Gửi file đính kèm (hình ảnh / video / tài liệu) trong một cuộc chat.
// Dùng chung cho cả khách (widget) và nhân viên (dashboard) — sender phân biệt qua field 'sender'.
// File lưu trên bucket S3-compatible theo cấu trúc thư mục {project_id}/{session_id}/...
// Đọc để nhập chữ: nhận bản ghi âm, trả về chữ. KHÔNG tạo tin nhắn, KHÔNG lưu
// audio — chữ được trả về cho client điền vào ô nhập, người dùng sửa rồi tự bấm
// gửi như gõ tay bình thường. Nhờ vậy toàn bộ đường dịch/lưu hiện có giữ nguyên.
app.post('/api/chats/:sessionId/transcribe', uploadVoiceMiddleware, async (req, res) => {
  const { sessionId } = req.params;

  if (!speech.isConfigured) {
    return res.status(503).json({ error: 'Tính năng nhập bằng giọng nói chưa được cấu hình.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Không nhận được bản ghi âm.' });
  }

  try {
    // Chỉ cho phép trên phiên chat đang hoạt động — tránh bị gọi bừa từ bên ngoài.
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Phiên chat không tồn tại.' });
    }
    await expireQrSessionIfNeeded(sessionRes.rows[0]);
    if (sessionRes.rows[0].status === 'closed') {
      return res.status(410).json({ error: 'Phiên chat đã bị đóng.' });
    }
    const session = sessionRes.rows[0];

    // Ngôn ngữ người nói: client gửi lên (nhân viên dùng ngôn ngữ dashboard,
    // khách dùng ngôn ngữ đã chọn lúc đăng nhập QR); không có thì lấy của phiên.
    const language = req.body?.language || session.admin_language || session.detected_language;

    const { text } = await speech.transcribeAudio(
      req.file.buffer,
      req.file.originalname || 'voice.webm',
      req.file.mimetype,
      language
    );

    if (!text) {
      return res.status(422).json({ error: 'Không nghe rõ, vui lòng thử lại.' });
    }
    res.json({ success: true, text });
  } catch (error) {
    console.error('Transcribe error:', error.message);
    res.status(500).json({ error: error.message || 'Không thể nhận diện giọng nói.' });
  }
});

app.post('/api/chats/:sessionId/attachments', uploadAttachmentMiddleware, async (req, res) => {
  const { sessionId } = req.params;
  const { sender } = req.body;

  if (await blockStaffOutOfHours(req, res, sender)) return;
  if (!sessionId || (sender !== 'visitor' && sender !== 'agent')) {
    return res.status(400).json({ error: 'Thiếu thông số đầu vào bắt buộc.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Không có file được gửi lên.' });
  }
  if (!s3.isConfigured) {
    return res.status(503).json({ error: 'Tính năng gửi file đính kèm hiện chưa được cấu hình.' });
  }

  const attachmentType = classifyAttachment(req.file.mimetype);
  if (!attachmentType) {
    return res.status(415).json({ error: 'Định dạng file không được hỗ trợ.' });
  }
  const sizeLimit = ATTACHMENT_LIMITS_BYTES[attachmentType];
  if (req.file.size > sizeLimit) {
    const limitMb = Math.round(sizeLimit / (1024 * 1024));
    return res.status(413).json({ error: `File ${attachmentType === 'video' ? 'video' : attachmentType === 'image' ? 'hình ảnh' : 'tài liệu'} vượt quá giới hạn ${limitMb}MB.` });
  }

  try {
    const sessionRes = await db.query(
      `SELECT s.*, COALESCE(p.ai_enabled, p.project_type <> 'qr_concierge') AS ai_enabled
         FROM sessions s LEFT JOIN projects p ON p.id = s.project_id
        WHERE s.id = $1`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Phiên chat không tồn tại.' });
    }
    await expireQrSessionIfNeeded(sessionRes.rows[0]);
    if (sessionRes.rows[0].status === 'closed') {
      return res.status(410).json({ error: 'Phiên chat đã bị đóng.' });
    }
    const session = sessionRes.rows[0];

    // Same claim/assignment/project-access rules as sending a text reply.
    let senderAdminId = null;
    if (sender === 'agent') {
      const sendingAdmin = await getAdminFromToken(req);
      if (!sendingAdmin?.is_active || !isChatStaff(sendingAdmin)) {
        return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản nhân viên hợp lệ để gửi file.' });
      }
      if (!canAccessProject(sendingAdmin, session.project_id)) {
        return res.status(403).json({ error: 'Bạn không có quyền gửi file trong chat của project này.' });
      }
      const claim = session.claimed_by_admin_id;
      const assigned = session.assigned_admin_id;
      const isSale = sendingAdmin.role === 'sale';
      if (!isSuperAdmin(sendingAdmin) && !isSale) {
        const isClaimedByMe = claim && Number(claim) === Number(sendingAdmin.id);
        const isAssignedToMe = assigned && Number(assigned) === Number(sendingAdmin.id);
        if (!isClaimedByMe && !isAssignedToMe) {
          return res.status(403).json({ error: 'Bạn không có quyền gửi file trong cuộc trò chuyện này.' });
        }
      }
      if (!claim) {
        await db.query(
          `UPDATE sessions SET claimed_by_admin_id = $1, claimed_at = NOW()
           WHERE id = $2 AND claimed_by_admin_id IS NULL`,
          [sendingAdmin.id, sessionId]
        );
      }
      senderAdminId = sendingAdmin.id;
    }

    const key = s3.buildAttachmentKey(session.project_id, sessionId, req.file.originalname);
    await s3.uploadBuffer(key, req.file.buffer, req.file.mimetype);
    const url = await s3.getPresignedUrl(key, 6 * 3600);

    const captionByType = { image: '📷 [Hình ảnh]', video: '🎥 [Video]', document: '📎 [Tài liệu]' };
    const placeholderText = captionByType[attachmentType];

    const msgRes = await db.query(
      `INSERT INTO messages
         (session_id, sender, original_text, translated_text, sender_admin_id,
          attachment_key, attachment_url, attachment_name, attachment_mime, attachment_size, attachment_type)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [sessionId, sender, placeholderText, senderAdminId, key, url, req.file.originalname, req.file.mimetype, req.file.size, attachmentType]
    );

    const sessionExpiresAt = await extendQrSessionOnActivity(session);
    notifyAdminRealtime('new_message', { sessionId, projectId: session.project_id, sender, messageId: msgRes.rows[0]?.id });

    if (sender === 'visitor') void notifyAgentMessage(session, placeholderText);
    if (sender === 'agent' && session.platform && session.platform !== 'widget') {
      try { await sendMultichannelMessage(session.platform, session.platform_sender_id, placeholderText); } catch (e) {}
    }

    res.json({ success: true, message: msgRes.rows[0], expiresAt: sessionExpiresAt });
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải file lên.' });
  }
});

/**
 * @openapi
 * /api/chats/session/language:
 *   post:
 *     summary: Cập nhật ngôn ngữ được chọn/phát hiện của một phiên chat
 *     description: Cập nhật trường `detected_language` của phiên chat để định hướng dịch thuật cho phản hồi tiếp theo của Agent.
 *     tags:
 *       - Tin nhắn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - language
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật ngôn ngữ thành công
 *       400:
 *         description: Thiếu dữ liệu đầu vào
 *       404:
 *         description: Không tìm thấy phiên chat
 *       500:
 *         description: Lỗi hệ thống
 */
app.post('/api/chats/session/language', async (req, res) => {
  const { sessionId, language } = req.body;
  if (!sessionId || !language) {
    return res.status(400).json({ error: 'Thiếu sessionId hoặc language.' });
  }

  try {
    const validLangs = ['vi', 'en', 'ru', 'zh', 'ko', 'unknown'];
    const updateLang = validLangs.includes(language.toLowerCase()) ? language.toLowerCase() : 'unknown';

    const existing = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    }

    // Dự án QR: ngôn ngữ do khách tự chọn lúc đăng nhập và phải giữ nguyên cả
    // phiên (hóa đơn, giao diện đều bám theo nó). Chặn ngay ở server để Agent
    // không đổi được, kể cả khi gọi thẳng API.
    if (existing.rows[0].qr_account_id) {
      return res.json({ success: true, session: existing.rows[0], locked: true });
    }

    const result = await db.query(
      'UPDATE sessions SET detected_language = $1 WHERE id = $2 RETURNING *',
      [updateLang, sessionId]
    );

    res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Update session language error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật ngôn ngữ.' });
  }
});


/**
 * @openapi
 * /api/chats/session/close:
 *   post:
 *     summary: Đóng cuộc trò chuyện và phân tích hội thoại bằng AI
 *     description: Đóng phòng chat. Sau khi đóng, Gemini AI sẽ tự động phân tích toàn bộ nội dung tin nhắn để viết tóm tắt (`ai_summary`) và gắn nhãn phân loại khách hàng (`intent_tags`).
 *     tags:
 *       - Quản trị viên
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Đóng phòng chat và phân tích thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 summary:
 *                   type: string
 *                   example: Khách hàng hỏi về chính sách đặt phòng và đã được hỗ trợ thành công.
 *                 tags:
 *                   type: string
 *                   example: "Đặt phòng, Hỗ trợ"
 *       400:
 *         description: Thiếu sessionId
 *       404:
 *         description: Không tìm thấy phiên chat
 *       500:
 *         description: Lỗi hệ thống
 */
// 4. Close Session (triggers AI conversation summarization & tagging)
app.post('/api/chats/session/close', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Thiếu sessionId.' });
  }

  try {
    // Check if session exists
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    }
    const session = sessionRes.rows[0];

    // PHÂN QUYỀN: chỉ NHÂN VIÊN ĐANG TIẾP NHẬN (claimed_by_admin_id) hoặc SUPER ADMIN mới được kết thúc.
    // (Khách KHÔNG có token nhân viên nên không thể đóng.)
    const admin = await getAdminFromToken(req);
    if (!admin?.is_active || !isChatStaff(admin)) {
      return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản nhân viên để kết thúc phiên.' });
    }
    const claim = session.claimed_by_admin_id;
    const isClaimer = claim && Number(claim) === Number(admin.id);
    if (!isClaimer && !isSuperAdmin(admin)) {
      return res.status(403).json({ error: 'Chỉ nhân viên đang tiếp nhận cuộc trò chuyện hoặc Super Admin mới được kết thúc.' });
    }

    // Get all messages in this session
    const msgRes = await db.query(
      'SELECT sender, original_text as text FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    // Call Gemini to analyze conversation (vẫn tóm tắt lại đoạn có nhân viên hỗ trợ).
    // Nếu Gemini lỗi (hết quota/timeout) vẫn phải ĐÓNG được -> dùng mặc định.
    let summary = null, tags = null;
    try {
      const r = await gemini.analyzeSession(msgRes.rows);
      summary = r?.summary ?? null; tags = r?.tags ?? null;
    } catch (e) { console.warn('[Close] analyzeSession failed:', e.message); }

    const isQrSession = !!session.qr_account_id;
    const nextStatus = isQrSession ? 'closed' : 'active';
    await db.query(
      `UPDATE sessions
       SET status = $1, ai_summary = $2, intent_tags = $3,
           claimed_by_admin_id = NULL, requested_agent = FALSE,
           routing_status = CASE WHEN $1 = 'closed' THEN 'closed' ELSE routing_status END
       WHERE id = $4`,
      [nextStatus, summary, tags, sessionId]
    );
    // Reset số tổng đài viên (best-effort; cột operator_no có thể chưa migrate -> bỏ qua lỗi)
    await db.query('UPDATE sessions SET operator_no = NULL WHERE id = $1', [sessionId]).catch(() => {});

    // Chèn tin hệ thống báo cho khách đã chuyển lại cho AI
    const lang = session.detected_language || 'vi';
    const backMsgs = {
      vi: 'Nhân viên đã tạm biệt bạn. Pat quay lại đồng hành cùng bạn đây! 🌴',
      en: 'The agent has wrapped up. Pat is back to keep you company! 🌴',
      ru: 'Оператор завершил. Pat снова с вами! 🌴',
      zh: '客服已结束，Pat 回来继续陪伴您！🌴',
      ko: '상담이 종료되었습니다. Pat이 계속 도와드릴게요! 🌴',
    };
    const backMsg = backMsgs[lang] || backMsgs.vi;
    await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language)
       VALUES ($1, 'system', $2, $2, $3)`,
      [sessionId, backMsg, lang]
    ).catch((e) => console.error('Insert handback message failed:', e.message));

    notifyAdminRealtime('session_update', { sessionId, projectId: session.project_id, action: 'close' });

    res.json({ success: true, summary, tags, mode: 'ai' });
  } catch (error) {
    console.error('Session Close Error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đóng phiên chat.' });
  }
});

// Trạng thái phiên cho WIDGET: để đổi nút/chế độ (human khi đang có/chờ nhân viên; ai khi đã trả về AI).
app.get('/api/chats/:sessionId/state', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT id, status, claimed_by_admin_id, requested_agent, qr_account_id, expires_at, group_id, routing_status FROM sessions WHERE id = $1',
      [req.params.sessionId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    const s = await expireQrSessionIfNeeded(r.rows[0]);
    const mode = (s.claimed_by_admin_id || s.requested_agent) ? 'human' : 'ai';
    // Khách cần biết đang chờ hay đã có người tiếp nhận (mục 13 kế hoạch).
    // waitingForStaff = chưa ai nhận VÀ hiện không có Sale nào trong ca, để portal
    // hiện đúng "đang chờ tư vấn viên" thay vì im lặng.
    let routingStatus = s.routing_status || null;
    let waitingForStaff = false;
    if (routingStatus === 'waiting' && s.group_id) {
      const available = await listAvailableSales(s.group_id);
      waitingForStaff = available.length === 0;
    }
    res.json({ status: s.status, mode, routingStatus, waitingForStaff });
  } catch (e) {
    res.status(500).json({ error: 'state error' });
  }
});

// Link WhatsApp trực tiếp cho widget: kèm mã ref project để webhook phân loại nguồn.
app.get('/api/chats/whatsapp-link', async (req, res) => {
  try {
    const projectId = String(req.query.projectId || '').trim();
    const r = await db.query('SELECT whatsapp_business_phone FROM channel_configs WHERE project_id = $1 LIMIT 1', [projectId]);
    const phone = (r.rows[0]?.whatsapp_business_phone || process.env.WHATSAPP_BUSINESS_PHONE || '').replace(/[^0-9]/g, '');
    if (!phone || !projectId) return res.json({ enabled: false });
    const text = `Xin chào! Mình cần tư vấn dịch vụ. (mã: #ref:${projectId})`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    res.json({ enabled: true, url });
  } catch (e) {
    res.json({ enabled: false });
  }
});

// 4b. Create Anonymous Session (no OTP, for AI-first chat widget)
app.post('/api/chats/session/anonymous', async (req, res) => {
  const { projectId = 'pastie-landingpage', visitorLang = 'vi' } = req.body;
  if (projectId === 'dealphuquoc') {
    return res.status(403).json({
      code: 'LOGIN_REQUIRED',
      error: 'Vui lòng đăng nhập tài khoản DealPhuQuoc để sử dụng chat.'
    });
  }
  const ua = req.headers['user-agent'] || '';
  const { browser, device } = parseUserAgent(ua);
  const clientIp = getClientIp(req);
  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // Serialise creates for the same anonymous client. This prevents duplicate
    // sessions when the widget is initialised more than once simultaneously.
    const fingerprint = `anonymous:${projectId}:${clientIp}:${browser}:${device}`;
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [fingerprint]);

    const existingSession = await findActiveAnonymousSessionForClient(
      projectId, clientIp, browser, device, client
    );
    if (existingSession) {
      await client.query('COMMIT');
      return res.json({ success: true, sessionId: existingSession.id, reused: true });
    }

    const sessionId = randomUUID();
    let assignedAdminId = null;
    try {
      const leastLoadRes = await client.query(`
      SELECT a.id, a.full_name, COUNT(s.id) as active_count
      FROM admins a
      LEFT JOIN sessions s ON s.assigned_admin_id = a.id AND s.status = 'active'
      WHERE a.role = 'subadmin' AND a.is_active = TRUE
        AND (a.project_id = $1 OR a.project_id IS NULL)
      GROUP BY a.id, a.full_name ORDER BY active_count ASC, a.id ASC LIMIT 1
    `, [projectId]);
      if (leastLoadRes.rows.length > 0) assignedAdminId = leastLoadRes.rows[0].id;
      else {
        const superRes = await client.query("SELECT id FROM admins WHERE role = 'superadmin' AND is_active = TRUE LIMIT 1");
        if (superRes.rows.length > 0) assignedAdminId = superRes.rows[0].id;
      }
    } catch {}

    await client.query(
      `INSERT INTO sessions (id, project_id, visitor_name, detected_language, is_verified, status, browser, device, client_ip, assigned_admin_id)
       VALUES ($1, $2, 'Khách ẩn danh', $3, FALSE, 'active', $4, $5, $6, $7)`,
      [sessionId, projectId, visitorLang, browser, device, clientIp, assignedAdminId]
    );
    await client.query('COMMIT');
    res.json({ success: true, sessionId });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Anonymous session create error:', error);
    res.status(500).json({ error: 'Lỗi tạo phiên chat.' });
  } finally {
    client?.release();
  }
});

// 4b-identified. Tạo session ĐÃ XÁC THỰC từ danh tính có sẵn (user đã đăng nhập ở web ngoài) — bỏ OTP.
app.post('/api/chats/session/identified', async (req, res) => {
  const { projectId = 'pastie-landingpage', name, email, phone, qrCode, visitorLang = 'vi' } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Thiếu email.' });
  const sessionId = randomUUID();
  const ua = req.headers['user-agent'] || '';
  const { browser, device } = parseUserAgent(ua);
  const clientIp = getClientIp(req);
  let qrAccount = null;

  try {
    qrAccount = await resolveQrChatAccount(projectId, qrCode);
    if (qrCode && !qrAccount) return res.status(404).json({ error: 'Mã QR không hợp lệ hoặc đã bị vô hiệu hóa.' });
    const existingSession = qrAccount ? null : await findActiveSessionForClient(projectId, email, clientIp, browser, device);
    if (existingSession) {
      // Phiên cũ có thể đang ẩn danh -> gắn danh tính khách đăng nhập (không ghi đè bằng chuỗi rỗng)
      await db.query(
        `UPDATE sessions
           SET visitor_name = COALESCE(NULLIF($1, ''), visitor_name),
               visitor_email = COALESCE(NULLIF($2, ''), visitor_email),
               visitor_phone = COALESCE(NULLIF($3, ''), visitor_phone),
               is_verified = TRUE
         WHERE id = $4`,
        [name || '', email || '', phone || '', existingSession.id]
      ).catch((e) => console.error('Update reused session identity failed:', e.message));
      return res.json({ success: true, sessionId: existingSession.id, reused: true });
    }
  } catch (error) {
    console.error('Identified session lookup error:', error);
    return res.status(500).json({ error: 'Lỗi kiểm tra phiên chat.' });
  }

  let assignedAdminId = qrAccount?.owner_admin_id || null;
  try {
    if (assignedAdminId) throw new Error('QR account has an assigned agent');
    const leastLoadRes = await db.query(`
      SELECT a.id, COUNT(s.id) as active_count
      FROM admins a
      LEFT JOIN sessions s ON s.assigned_admin_id = a.id AND s.status = 'active'
      WHERE a.role = 'subadmin' AND a.is_active = TRUE
        AND (a.project_id = $1 OR a.project_id IS NULL)
      GROUP BY a.id ORDER BY active_count ASC, a.id ASC LIMIT 1
    `, [projectId]);
    if (leastLoadRes.rows.length > 0) assignedAdminId = leastLoadRes.rows[0].id;
    else {
      const superRes = await db.query("SELECT id FROM admins WHERE role = 'superadmin' AND is_active = TRUE LIMIT 1");
      if (superRes.rows.length > 0) assignedAdminId = superRes.rows[0].id;
    }
  } catch {}

  try {
    if (qrAccount) await closeActiveQrSession(qrAccount.id);
    await db.query(
      // Định tuyến QR: chat vào hàng đợi của nhóm gắn với QR. routing_status chỉ
      // được đặt cho phiên QR có nhóm — phiên của flow cũ vẫn để NULL nên không
      // lọt vào bộ lọc "đang chờ / đang xử lý" của Agent.
      `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, visitor_phone, detected_language, is_verified, status, browser, device, client_ip, assigned_admin_id, qr_account_id, expires_at, group_id, routing_status)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, 'active', $7, $8, $9, $10, $11, $12, $13, $14)`,
      [sessionId, projectId, name || 'Khách', email, phone || null, visitorLang, browser, device, clientIp, assignedAdminId, qrAccount?.id || null, qrAccount ? new Date(Date.now() + QR_CHAT_SESSION_MS) : null,
       qrAccount?.group_id || null, qrAccount?.group_id ? 'waiting' : null]
    );
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Identified session create error:', error);
    res.status(500).json({ error: 'Lỗi tạo phiên chat.' });
  }
});

// 4c-direct. Request Agent — for an already-verified session, skip OTP entirely (email/name were verified at chat start)
app.post('/api/chats/session/request-agent-direct', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Thiếu sessionId.' });
  try {
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    const session = sessionRes.rows[0];
    if (!session.is_verified) return res.status(400).json({ error: 'Phiên chat chưa được xác thực.' });

    await db.query('UPDATE sessions SET requested_agent = TRUE WHERE id = $1', [sessionId]);
    const lang = session.detected_language || 'vi';
    const waitMsgs = { vi: 'Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ trong giây lát ⏳', en: 'Connecting you with a support agent, please hold on ⏳', ru: 'Соединяем вас с оператором, подождите ⏳', zh: '正在为您连接客服，请稍候 ⏳', ko: '상담원과 연결 중입니다. 잠시만 기다려 주세요 ⏳' };
    await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language) VALUES ($1, 'system', $2, $2, $3)`,
      [sessionId, waitMsgs[lang] || waitMsgs['vi'], lang]
    );
    void notifyAgentTransfer(session, 'Khách yêu cầu gặp nhân viên hỗ trợ.');
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Request agent (direct) error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

// 4c. Request Agent — OTP verify then update existing session (for GẶP CSKH from AI chat)
app.post('/api/chats/session/request-agent', async (req, res) => {
  const { sessionId, email, name, code } = req.body;
  if (!sessionId || !email || !code) {
    return res.status(400).json({ error: 'Thiếu sessionId, email hoặc code.' });
  }
  try {
    const otpRes = await db.query('SELECT * FROM otps WHERE email = $1', [email]);
    if (otpRes.rows.length === 0) return res.status(400).json({ error: 'Không tìm thấy mã OTP cho email này.' });
    const { code: savedCode, expires_at: expiresAt } = otpRes.rows[0];
    if (savedCode !== code) return res.status(400).json({ error: 'Mã OTP không chính xác.' });
    if (new Date() > new Date(expiresAt)) return res.status(400).json({ error: 'Mã OTP đã hết hạn.' });

    await db.query('DELETE FROM otps WHERE email = $1', [email]);
    const finalName = name || 'Khách hàng';
    const updatedSession = await db.query(
      `UPDATE sessions SET visitor_email = $1, visitor_name = $2, is_verified = TRUE, requested_agent = TRUE WHERE id = $3 RETURNING *`,
      [email, finalName, sessionId]
    );
    const lang = (await db.query('SELECT detected_language FROM sessions WHERE id = $1', [sessionId])).rows[0]?.detected_language || 'vi';
    const waitMsgs = { vi: 'Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ trong giây lát ⏳', en: 'Connecting you with a support agent, please hold on ⏳', ru: 'Соединяем вас с оператором, подождите ⏳', zh: '正在为您连接客服，请稍候 ⏳', ko: '상담원과 연결 중입니다. 잠시만 기다려 주세요 ⏳' };
    await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language) VALUES ($1, 'system', $2, $2, $3)`,
      [sessionId, waitMsgs[lang] || waitMsgs['vi'], lang]
    );
    void notifyAgentTransfer(updatedSession.rows[0], 'Khách yêu cầu gặp nhân viên hỗ trợ.');
    res.json({ success: true, sessionId, name: finalName });
  } catch (error) {
    console.error('Request agent error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

// 4d. Update Session Language
// (Route '/api/chats/session/language' TRÙNG LẶP đã được gỡ bỏ tại đây.
//  Express chỉ chạy handler đăng ký ĐẦU TIÊN, nên khối này chưa bao giờ được
//  gọi tới — giữ lại chỉ gây hiểu nhầm khi sửa logic ngôn ngữ. Xem định nghĩa
//  thật ở phía trên, nơi có kiểm tra 'ko' và khóa ngôn ngữ cho phiên QR.)

/**
 * @openapi
 * /api/chats/{sessionId}/messages:
 *   get:
 *     summary: Lấy lịch sử tin nhắn của cuộc trò chuyện (Dùng cho khách hàng)
 *     description: Lấy danh sách toàn bộ các tin nhắn song ngữ trong phiên chat này. Nếu phiên chat đã bị đóng bởi quản trị viên, trả về status `410 Gone`.
 *     tags:
 *       - Khách hàng
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của phiên chat (UUID)
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn tải thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: Phiên chat không tồn tại
 *       410:
 *         description: Phiên chat đã đóng
 *       500:
 *         description: Lỗi hệ thống
 */
// Helper to retrieve cached translation or translate using Gemini and cache it
async function getOrTranslateMessage(msg, targetLang) {
  // Attachment messages carry a fixed placeholder caption ("[Đính kèm] ...") —
  // translating it every time would just waste Gemini calls for no benefit.
  if (msg.attachment_key) return msg.translated_text || msg.original_text;
  if (!targetLang) return msg.translated_text || msg.original_text;
  
  const msgLang = (msg.language || '').toLowerCase();
  const targetLangCode = targetLang.toLowerCase();

  if (msgLang === targetLangCode) {
    return msg.original_text;
  }

  // Check message_translations cache first
  try {
    const cacheRes = await db.query(
      'SELECT translated_text FROM message_translations WHERE message_id = $1 AND target_lang = $2',
      [msg.id, targetLangCode]
    );
    if (cacheRes.rows.length > 0) {
      return cacheRes.rows[0].translated_text;
    }
  } catch (err) {
    console.error('[Cache Read Error]:', err.message);
  }

  // For legacy 'vi' translation that was already saved on messages table
  if (targetLangCode === 'vi' && msg.translated_text && msg.translated_text !== msg.original_text) {
    try {
      await db.query(
        `INSERT INTO message_translations (message_id, target_lang, translated_text) 
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [msg.id, 'vi', msg.translated_text]
      );
    } catch (e) {}
    return msg.translated_text;
  }

  // Call Gemini API to translate (with timeout to never block UI)
  try {
    // Ngôn ngữ nguồn đã lưu sẵn trên tin nhắn thì truyền vào để bỏ hẳn một lượt
    // gọi phát hiện ngôn ngữ mỗi lần dịch lại sang ngôn ngữ khác.
    const translatePromise = gemini.translateText(msg.original_text, targetLangCode, { sourceLang: msg.language });
    // Ngưỡng này phải lớn hơn timeout của Gemini (mặc định 2500ms) cộng thời
    // gian gọi NMT dự phòng, nếu không sẽ cắt ngang đúng lúc bản dự phòng sắp trả về.
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Translate timeout')), 4500));
    const { translatedText, detectedLang } = await Promise.race([translatePromise, timeoutPromise]);
    if (translatedText) {
      // Save to cache
      await db.query(
        `INSERT INTO message_translations (message_id, target_lang, translated_text) 
         VALUES ($1, $2, $3)
         ON CONFLICT (message_id, target_lang) DO UPDATE SET translated_text = $3`,
        [msg.id, targetLangCode, translatedText]
      );
      if (detectedLang && detectedLang !== 'unknown' && !msg.language) {
        await db.query('UPDATE messages SET language = $1 WHERE id = $2', [detectedLang, msg.id]);
        msg.language = detectedLang;
      }
      return translatedText;
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return msg.translated_text || msg.original_text;
}

// 5. Get messages for a session (Public route for the Visitor Widget)
// Secure because sessionId is a secure UUIDv4
app.get('/api/chats/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;
  const visitorLang = req.query.visitorLang || '';
  const limit = parseInt(req.query.limit) || 15;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // Verify session exists
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Phiên chat không tồn tại.' });
    }
    await expireQrSessionIfNeeded(sessionRes.rows[0]);
    if (sessionRes.rows[0].status === 'closed') {
      return res.status(410).json({ error: 'Phiên chat đã bị đóng.' });
    }

    const session = sessionRes.rows[0];
    const email = (session.visitor_email || '').trim();
    const phone = (session.visitor_phone || '').trim();
    let result;
    if (session.qr_account_id) {
      // Mỗi lần đăng nhập QR là một cuộc chat độc lập. Không gộp lịch sử theo
      // email như widget cũ, nếu không khách sẽ thấy lại tin của phiên đã đóng.
      result = await db.query(
        `SELECT * FROM messages
         WHERE session_id = $1
           AND NOT (sender = 'system' AND (
             original_text ILIKE '[Hệ thống] Cuộc trò chuyện đã được chỉ định cho:%'
             OR original_text ILIKE '[System] The conversation has been assigned to:%'
             OR original_text ILIKE 'The conversation has been assigned to:%'
           ))
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [sessionId, limit, offset]
      );
    } else if (email || phone) {
      const identityConditions = [];
      const identityParams = [session.project_id];

      if (email) {
        identityParams.push(email);
        identityConditions.push(`LOWER(s.visitor_email) = LOWER($${identityParams.length})`);
      }
      if (phone) {
        identityParams.push(phone);
        identityConditions.push(`s.visitor_phone = $${identityParams.length}`);
      }
      identityParams.push(limit, offset);

      result = await db.query(
        `SELECT m.* FROM messages m 
         JOIN sessions s ON m.session_id = s.id 
         WHERE s.project_id = $1
           AND (${identityConditions.join(' OR ')})
           -- Assignment logs are internal operational notes, never visitor-facing.
           AND NOT (m.sender = 'system' AND (
             m.original_text ILIKE '[Hệ thống] Cuộc trò chuyện đã được chỉ định cho:%'
             OR m.original_text ILIKE '[System] The conversation has been assigned to:%'
             OR m.original_text ILIKE 'The conversation has been assigned to:%'
           ))
         ORDER BY m.created_at DESC
         LIMIT $${identityParams.length - 1} OFFSET $${identityParams.length}`,
        identityParams
      );
    } else {
      result = await db.query(
        `SELECT * FROM messages 
         WHERE session_id = $1 
           -- Assignment logs are internal operational notes, never visitor-facing.
           AND NOT (sender = 'system' AND (
             original_text ILIKE '[Hệ thống] Cuộc trò chuyện đã được chỉ định cho:%'
             OR original_text ILIKE '[System] The conversation has been assigned to:%'
             OR original_text ILIKE 'The conversation has been assigned to:%'
           ))
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [sessionId, limit, offset]
      );
    }
    
    const messages = result.rows.reverse();

    // Dịch song song các tin nhắn nếu ngôn ngữ khách hàng được chỉ định
    await Promise.all(messages.map(async (msg) => {
      msg.translated_text = await getOrTranslateMessage(msg, visitorLang);
      // Presigned S3 URLs expire — always hand back a fresh one instead of a stale cached value.
      if (msg.attachment_key) {
        msg.attachment_url = await s3.getPresignedUrl(msg.attachment_key, 6 * 3600).catch(() => msg.attachment_url);
      }
    }));

    res.json(messages);
  } catch (error) {
    console.error('Fetch visitor messages error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tin nhắn.' });
  }
});



/**
 * @openapi
 * /api/admin/orders:
 *   post:
 *     summary: Tạo đơn hàng và bill mẫu từ phiên chat
 *     tags: [Đơn hàng / Bill]
 *     security: [{ ApiKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, items]
 *             properties:
 *               sessionId: { type: string, format: uuid }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, quantity, unitPrice]
 *                   properties:
 *                     name: { type: string, example: "Nước suối" }
 *                     quantity: { type: number, example: 2 }
 *                     unitPrice: { type: number, example: 10000 }
 *     responses:
 *       201: { description: Đơn được tạo, có invoice JSON/HTML mẫu }
 *       403: { description: Không có quyền với project của phiên chat }
 *
 * /samplebill:
 *   post:
 *     summary: Tạo và gửi nhanh hóa đơn mẫu 2 chai nước vào chat
 *     description: Endpoint test. Agent/Admin truyền sessionId, hệ thống tạo bill mẫu và chèn thông báo hóa đơn vào lịch sử chat.
 *     tags: [Đơn hàng / Bill]
 *     security: [{ ApiKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId]
 *             properties:
 *               sessionId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Đã tạo bill và gửi tin mẫu vào chat }
 *
 * /api/admin/orders/{orderId}/invoice:
 *   put:
 *     summary: Phần mềm bill cập nhật hóa đơn JSON, HTML, PNG hoặc PDF
 *     tags: [Đơn hàng / Bill]
 *     security: [{ ApiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoice]
 *             properties:
 *               totalAmount: { type: number, example: 20000 }
 *               items: { type: array, items: { type: object } }
 *               invoice:
 *                 type: object
 *                 example:
 *                   invoiceNo: "POS-20260825-001"
 *                   html: "<article>Hóa đơn</article>"
 *                   pngUrl: "https://billing.example.com/bill.png"
 *                   pdfUrl: "https://billing.example.com/bill.pdf"
 *     responses:
 *       200: { description: Đã lưu hóa đơn }
 *
 * /api/admin/orders/{orderId}/received-payment:
 *   post:
 *     summary: Agent xác nhận đã nhận tiền
 *     tags: [Đơn hàng / Bill]
 *     security: [{ ApiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reference: { type: string, example: "Giao dịch MB 123456" }
 *     responses:
 *       200: { description: Đơn đã thanh toán; client hiển thị popup cảm ơn }
 *
 * /api/chats/{sessionId}/order:
 *   get:
 *     summary: Lấy hóa đơn hiện tại để customer portal render
 *     tags: [Đơn hàng / Bill]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Đơn và phương thức thanh toán hỗ trợ }
 *       404: { description: Chưa có đơn hoạt động }
 *
 * /api/chats/{sessionId}/order/payment-method:
 *   post:
 *     summary: Khách chọn phương thức thanh toán
 *     tags: [Đơn hàng / Bill]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method]
 *             properties:
 *               method: { type: string, enum: [cash, bank_qr, card] }
 *     responses:
 *       200: { description: Đã ghi nhận phương thức thanh toán }
 *
 * /api/chats/{sessionId}/order/finish:
 *   post:
 *     summary: Khách kết thúc sau khi thanh toán, xóa bill và chat session
 *     tags: [Đơn hàng / Bill]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Đã xóa dữ liệu phiên để logout }
 *       409: { description: Đơn chưa được Agent xác nhận thanh toán }
 */
// ── Sample order / billing API ─────────────────────────────────────────────
// This is intentionally provider-neutral. A POS/billing system can later call
// these endpoints or supply the invoice JSON/HTML/PNG/PDF URLs in `invoice`.
const PAYMENT_METHODS = new Set(['cash', 'bank_qr', 'card']);
const escapeInvoiceHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const formatVnd = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ₫`;

// htmlToPlainText / prepareInvoiceDelivery / sinh PDF đã chuyển sang
// ./invoice-helper.js để hóa đơn được vẽ lại theo đúng ngôn ngữ khách chọn.
const htmlToPlainText = invoiceHelper.htmlToPlainText;
const prepareInvoiceDelivery = invoiceHelper.prepareInvoiceDelivery;

// Ngôn ngữ dùng để vẽ hóa đơn cho khách: ưu tiên ngôn ngữ khách đang chọn ở
// portal (query ?lang=), sau đó tới ngôn ngữ phát hiện được của phiên chat.
function invoiceLanguageFor(session, requestedLanguage) {
  return invoiceHelper.normalizeLanguage(requestedLanguage || session?.detected_language || 'vi');
}

function buildSampleInvoice(orderId, session, items, totalAmount) {
  const invoiceNo = `BILL-${orderId.slice(0, 8).toUpperCase()}`;
  const rows = items.map((item) => `<tr><td>${escapeInvoiceHtml(item.name)}</td><td>${item.quantity}</td><td>${formatVnd(item.unitPrice)}</td><td>${formatVnd(item.lineTotal)}</td></tr>`).join('');
  // Dữ liệu lưu vào DB là JSON có cấu trúc (items/tổng tiền) — PDF chỉ được vẽ
  // lúc khách mở hóa đơn, theo ngôn ngữ khách, nên KHÔNG lưu PDF ở đây.
  return {
    version: '1.0', invoiceNo, issuedAt: new Date().toISOString(),
    buyerName: session.visitor_name || 'Khách hàng',
    buyerPhone: session.visitor_phone || '',
    items, totalAmount, currency: 'VND',
    html: `<article class="pastie-bill"><h2>Hóa đơn ${invoiceNo}</h2><p>Khách hàng: ${escapeInvoiceHtml(session.visitor_name || 'Khách hàng')}</p><table><thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${rows}</tbody></table><h3>Tổng cộng: ${formatVnd(totalAmount)}</h3></article>`,
    pngUrl: null, pdfUrl: null,
  };
}

async function getChatOrderForVisitor(sessionId) {
  const result = await db.query(
    `SELECT o.* FROM chat_orders o JOIN sessions s ON s.id = o.session_id
      WHERE o.session_id = $1 AND s.status = 'active'
      ORDER BY o.created_at DESC LIMIT 1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

// Agent creates a draft bill. Example body: { sessionId, items:[{name:'Nước',quantity:2,unitPrice:10000}] }
app.post('/api/admin/orders', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const { sessionId, items } = req.body || {};
  if (!sessionId || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cần sessionId và ít nhất một sản phẩm.' });
  const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1 AND status = $2', [sessionId, 'active']);
  const session = sessionRes.rows[0];
  if (!session) return res.status(404).json({ error: 'Phiên chat không hoạt động.' });
  if (!canAccessProject(req.admin, session.project_id)) return res.status(403).json({ error: 'Bạn không có quyền tạo đơn cho project này.' });
  const normalizedItems = items.map((item) => {
    const name = String(item?.name || '').trim().slice(0, 255);
    const quantity = Number(item?.quantity);
    const unitPrice = Number(item?.unitPrice);
    if (!name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
    return { name, quantity, unitPrice, lineTotal: Math.round(quantity * unitPrice) };
  });
  if (normalizedItems.some((item) => !item)) return res.status(400).json({ error: 'Sản phẩm cần có tên, số lượng và đơn giá hợp lệ.' });
  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const orderId = randomUUID();
  // Lưu JSON có cấu trúc; PDF được vẽ lúc khách mở hóa đơn theo ngôn ngữ của khách.
  const invoice = buildSampleInvoice(orderId, session, normalizedItems, totalAmount);
  const created = await db.query(
    `INSERT INTO chat_orders (id, session_id, project_id, created_by_admin_id, total_amount, items, invoice)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [orderId, sessionId, session.project_id, req.admin.id, totalAmount, JSON.stringify(normalizedItems), JSON.stringify(invoice)]
  );
  res.status(201).json({ success: true, order: created.rows[0] });
});

// Fast test endpoint requested for the first billing integration demo.
// It is intentionally staff-only; the customer portal can only read the order.
app.post('/samplebill', checkAdminAuth, async (req, res) => {
  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) return res.status(400).json({ error: 'Cần sessionId của cuộc chat.' });
  const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1 AND status = $2', [sessionId, 'active']);
  const session = sessionRes.rows[0];
  if (!session) return res.status(404).json({ error: 'Phiên chat không hoạt động.' });
  if (!canAccessProject(req.admin, session.project_id)) return res.status(403).json({ error: 'Bạn không có quyền tạo bill cho project này.' });

  const items = [{ name: 'Nước suối', quantity: 2, unitPrice: 10000, lineTotal: 20000 }];
  const orderId = randomUUID();
  // Lưu JSON có cấu trúc; PDF được vẽ lúc khách mở hóa đơn theo ngôn ngữ của khách.
  const invoice = buildSampleInvoice(orderId, session, items, 20000);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query(
      `INSERT INTO chat_orders (id, session_id, project_id, created_by_admin_id, total_amount, items, invoice)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [orderId, sessionId, session.project_id, req.admin.id, 20000, JSON.stringify(items), JSON.stringify(invoice)]
    );
    // KHÔNG chèn tin nhắn mô tả hóa đơn nữa.
    //
    // Khách đã thấy chính bản PDF hóa đơn ngay trong khung chat, kèm ba nút chọn
    // phương thức thanh toán ngay dưới đó. Thêm một dòng chữ lặp lại số tiền chỉ
    // gây trùng thông tin — mà lại là dòng tiếng Việt cứng, không dịch theo ngôn
    // ngữ khách như phần còn lại của hóa đơn.
    const expiresAt = await extendQrSessionOnActivity(session, client);
    await client.query('COMMIT');
    res.status(201).json({ success: true, order: orderRes.rows[0], chatMessage: null, expiresAt });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create sample bill error:', error);
    res.status(500).json({ error: 'Không thể tạo hóa đơn mẫu.' });
  } finally {
    client.release();
  }
});

// Integration hand-off: a future POS/billing service can replace the sample
// payload with its own structured bill and optional image/PDF URLs. It uses the
// existing staff authentication for now; a dedicated integration key can be
// added when the external system is connected.
app.put('/api/admin/orders/:orderId/invoice', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const { invoice, items, totalAmount } = req.body || {};
  if (!invoice || typeof invoice !== 'object' || Array.isArray(invoice)) {
    return res.status(400).json({ error: 'invoice phải là một JSON object.' });
  }
  const orderRes = await db.query('SELECT * FROM chat_orders WHERE id = $1', [req.params.orderId]);
  const order = orderRes.rows[0];
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  if (!canAccessProject(req.admin, order.project_id)) return res.status(403).json({ error: 'Bạn không có quyền cập nhật hóa đơn này.' });
  if (order.status !== 'awaiting_payment') return res.status(409).json({ error: 'Chỉ cập nhật được hóa đơn đang chờ thanh toán.' });
  const nextTotal = totalAmount === undefined ? Number(order.total_amount) : Number(totalAmount);
  if (!Number.isFinite(nextTotal) || nextTotal < 0) return res.status(400).json({ error: 'totalAmount không hợp lệ.' });
  const nextItems = items === undefined ? order.items : items;
  if (!Array.isArray(nextItems)) return res.status(400).json({ error: 'items phải là mảng nếu được gửi.' });
  // Giữ nguyên payload POS gửi sang (kể cả pdfUrl/pngUrl). Nếu POS chỉ gửi
  // HTML/JSON thì PDF sẽ được sinh lúc khách mở hóa đơn, theo ngôn ngữ khách.
  const preparedInvoice = invoice;
  const updated = await db.query(
    `UPDATE chat_orders SET invoice = $1, items = $2, total_amount = $3, updated_at = NOW()
      WHERE id = $4 RETURNING *`,
    [JSON.stringify(preparedInvoice), JSON.stringify(nextItems), nextTotal, order.id]
  );
  res.json({ success: true, order: updated.rows[0] });
});

// Customer portal polls this endpoint. Hóa đơn được vẽ lại thành PDF theo đúng
// ngôn ngữ khách đang chọn (?lang=), nên đổi ngôn ngữ là hóa đơn đổi theo.
app.get('/api/chats/:sessionId/order', async (req, res) => {
  const order = await getChatOrderForVisitor(req.params.sessionId);
  if (!order) return res.status(404).json({ error: 'Chưa có đơn hàng đang hoạt động.' });

  const sessionRes = await db.query('SELECT detected_language FROM sessions WHERE id = $1', [req.params.sessionId]);
  const language = invoiceLanguageFor(sessionRes.rows[0], req.query.lang);
  const invoice = await prepareInvoiceDelivery(order.invoice || {}, language);

  res.json({
    order: { ...order, invoice },
    paymentMethods: ['cash', 'bank_qr', 'card'],
    paymentMethodLabels: invoiceHelper.PAYMENT_METHOD_I18N[language] || invoiceHelper.PAYMENT_METHOD_I18N.vi,
    language,
  });
});

app.post('/api/chats/:sessionId/order/payment-method', async (req, res) => {
  const method = String(req.body?.method || '');
  if (!PAYMENT_METHODS.has(method)) return res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ.' });
  const order = await getChatOrderForVisitor(req.params.sessionId);
  if (!order || order.status !== 'awaiting_payment') return res.status(409).json({ error: 'Đơn hàng không ở trạng thái chờ thanh toán.' });
  const updated = await db.query('UPDATE chat_orders SET payment_method = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [method, order.id]);

  // Báo cho Agent biết khách đã chọn phương thức nào: ghi thẳng vào cuộc chat
  // (tiếng Việt để Agent đọc ngay; khách vẫn thấy bản dịch theo ngôn ngữ họ chọn)
  // và bắn thông báo đẩy như một tin nhắn đến bình thường.
  try {
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [req.params.sessionId]);
    const session = sessionRes.rows[0];
    const label = invoiceHelper.paymentMethodLabel(method, 'vi');
    const text = `[Thanh toán] Khách đã chọn phương thức: ${label}.`;
    await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language)
       VALUES ($1, 'system', $2, $2, 'vi')`,
      [req.params.sessionId, text]
    );
    if (session) {
      void notifyAgentMessage(session, text);
      await extendQrSessionOnActivity(session);
    }
  } catch (error) {
    // Ghi chú cho Agent là việc phụ — không được làm hỏng thao tác chọn thanh toán của khách.
    console.error('[Order] Không thể ghi tin nhắn phương thức thanh toán:', error.message);
  }

  res.json({ success: true, order: updated.rows[0] });
});

app.post('/api/admin/orders/:orderId/received-payment', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const orderRes = await db.query('SELECT o.*, s.project_id FROM chat_orders o JOIN sessions s ON s.id = o.session_id WHERE o.id = $1', [req.params.orderId]);
  const order = orderRes.rows[0];
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  if (!canAccessProject(req.admin, order.project_id)) return res.status(403).json({ error: 'Bạn không có quyền xác nhận đơn này.' });
  if (order.status !== 'awaiting_payment') return res.status(409).json({ error: 'Đơn không ở trạng thái chờ thanh toán.' });
  const updated = await db.query(
    `UPDATE chat_orders SET status = 'paid', payment_reference = $1, paid_at = NOW(), updated_at = NOW()
      WHERE id = $2 RETURNING *`,
    [String(req.body?.reference || '').trim().slice(0, 255) || null, order.id]
  );
  res.json({ success: true, order: updated.rows[0], nextAction: 'customer_thank_you' });
});

// Customer chooses "Kết thúc": close and remove the current QR conversation and order.
app.post('/api/chats/:sessionId/order/finish', async (req, res) => {
  const order = await getChatOrderForVisitor(req.params.sessionId);
  if (!order || order.status !== 'paid') return res.status(409).json({ error: 'Chỉ có thể kết thúc sau khi đơn đã được xác nhận thanh toán.' });
  try {
    // Khách bấm "Kết thúc" => CHỈ đóng cuộc trò chuyện. Tin nhắn, hóa đơn và file
    // đính kèm được giữ nguyên để Agent/Superadmin còn tra cứu lại sau này.
    await db.query(
      `UPDATE sessions SET status = 'closed',
              routing_status = CASE WHEN routing_status IS NULL THEN NULL ELSE 'closed' END
        WHERE id = $1`,
      [req.params.sessionId]
    );
    void autoSummarizeClosedSession(req.params.sessionId);
    res.json({ success: true, action: 'logout_and_close_chat' });
  } catch (error) {
    console.error('Finish order error:', error);
    res.status(500).json({ error: 'Không thể kết thúc đơn hàng.' });
  }
});

// --- ADMIN AUTHENTICATION ENDPOINTS ---

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    const result = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const admin = result.rows[0];
    if (!admin.is_active) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.' });
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const hoursError = await checkWorkingHours(admin);
    if (hoursError) return res.status(403).json({ error: hoursError, code: 'OUT_OF_HOURS' });

    // Create single active session token (8 hours)
    const { token } = await issueSingleActiveAdminSession(admin, req);

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        full_name: admin.full_name,
        avatar_url: admin.avatar_url,
        is_active: admin.is_active,
        project_id: admin.project_id,
        sale_limit: admin.sale_limit
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập.' });
  }
});

// --- UNIFIED DIRECT AUTHENTICATION (GOOGLE OAUTH & EMAIL OTP) ---

/**
 * Shared helper to verify DealPhuQuoc user / local admin status,
 * provision/sync admin record and issue an 8-hour admin session.
 */
async function resolveAdminUserAndLogin({ email, name, avatarUrl }, req = null) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    const err = new Error('Email không hợp lệ.');
    err.status = 400;
    throw err;
  }

  let determinedRole = 'agent';
  let determinedProjectId = 'dealphuquoc';
  let determinedFullName = name || cleanEmail.split('@')[0];
  let determinedAvatar = avatarUrl || null;
  let isSuperAdminUser = false;

  // 1. Kiểm tra tài khoản trong bảng local `admins`
  const localAdminRes = await db.query('SELECT * FROM admins WHERE LOWER(username) = LOWER($1)', [cleanEmail]);
  const localAdmin = localAdminRes.rows[0];
  // Accounts provisioned for a non-DealPhuQuoc project are managed locally.
  // Their email may also exist in DealPhuQuoc, but that must not override the
  // project membership or require DealPhuQuoc chatAccess.
  const isLocalProjectAccount = Boolean(localAdmin?.project_id && localAdmin.project_id !== 'dealphuquoc');
  if (localAdmin && localAdmin.role === 'superadmin') {
    isSuperAdminUser = true;
    determinedRole = 'superadmin';
    determinedProjectId = null;
    determinedFullName = localAdmin.full_name || determinedFullName;
  }

  // 2. Tra cứu đối soát với Database DealPhuQuoc
  if (isLocalProjectAccount) {
    determinedRole = localAdmin.role;
    determinedProjectId = localAdmin.project_id;
    determinedFullName = localAdmin.full_name || determinedFullName;
    determinedAvatar = localAdmin.avatar_url || determinedAvatar;
  } else if (process.env.DEALPHUQUOC_DATABASE_URL) {
    try {
      const dealPool = dealSync.getDealPool();
      const dealUserRes = await dealPool.query(
        'SELECT id, name, email, role, "chatAccess", locked, "avatarUrl" FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [cleanEmail]
      );
      await dealPool.end();

      if (dealUserRes.rows.length > 0) {
        const dealUser = dealUserRes.rows[0];
        if (dealUser.locked) {
          const err = new Error('Tài khoản DealPhuQuoc của bạn đang bị tạm khóa.');
          err.status = 403;
          throw err;
        }

        const isDealSuperAdmin = dealUser.role === 'SUPERADMIN';
        const hasChatPermission = isDealSuperAdmin || dealUser.chatAccess === true;
        if (!hasChatPermission && !isSuperAdminUser) {
          const err = new Error('Tài khoản chưa được cấp quyền sử dụng hệ thống Chat trên DealPhuQuoc (chưa bật chatAccess).');
          err.status = 403;
          throw err;
        }

        determinedFullName = dealUser.name || determinedFullName;
        if (dealUser.avatarUrl) determinedAvatar = dealUser.avatarUrl;

        if (isDealSuperAdmin) {
          determinedRole = 'superadmin';
          determinedProjectId = null;
        } else if (['ADMIN', 'HOST', 'SALE'].includes(dealUser.role)) {
          determinedRole = 'project_admin';
          determinedProjectId = 'dealphuquoc';
        } else {
          determinedRole = 'agent';
          determinedProjectId = 'dealphuquoc';
        }
      } else {
        // Không tìm thấy trên DealPhuQuoc
        if (!isSuperAdminUser && !localAdmin) {
          const err = new Error('Tài khoản này chưa được đăng ký trên DealPhuQuoc hoặc hệ thống Pastie AI.');
          err.status = 403;
          throw err;
        }
        if (localAdmin) {
          determinedRole = localAdmin.role;
          determinedProjectId = localAdmin.project_id;
        }
      }
    } catch (err) {
      if (err.status) throw err;
      console.warn('[DirectAuth] Không thể kết nối DealPhuQuoc DB, dùng thông tin local:', err.message);
      if (!localAdmin) {
        const fallbackErr = new Error('Không thể kết nối cơ sở dữ liệu DealPhuQuoc để xác thực tài khoản.');
        fallbackErr.status = 500;
        throw fallbackErr;
      }
      determinedRole = localAdmin.role;
      determinedProjectId = localAdmin.project_id;
    }
  } else if (localAdmin) {
    determinedRole = localAdmin.role;
    determinedProjectId = localAdmin.project_id;
  }

  // 3. Upsert vào bảng `admins`
  let admin = (await db.query('SELECT * FROM admins WHERE LOWER(username) = LOWER($1)', [cleanEmail])).rows[0];
  if (!admin) {
    const ph = await hashPassword(randomUUID());
    admin = (await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, avatar_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
      [cleanEmail, ph, determinedFullName, determinedRole, determinedProjectId, determinedAvatar]
    )).rows[0];
  } else {
    admin = (await db.query(
      `UPDATE admins SET full_name = $1, role = $2, project_id = $3, avatar_url = COALESCE($4, avatar_url), is_active = TRUE WHERE id = $5 RETURNING *`,
      [determinedFullName, determinedRole, determinedProjectId, determinedAvatar, admin.id]
    )).rows[0];
  }

  // 4. Tạo token session
    // Chặn cấp token ngoài khung giờ (mục 8 kế hoạch). Không có đệm ở bước đăng
    // nhập: đệm chỉ dành cho người đang làm dở, không phải để vào ca muộn.
  // Chặn cấp token ngoài khung giờ (mục 8 kế hoạch). Không có đệm ở bước đăng
  // nhập: đệm chỉ dành cho người đang làm dở, không phải để vào ca muộn.
  // Ném lỗi thay vì trả về object vì cả hai nơi gọi hàm này đều bắt lỗi theo
  // error.status, giống nhánh tài khoản DealPhuQuoc bị khóa ở trên.
  const hoursError = await checkWorkingHours(admin);
  if (hoursError) {
    const err = new Error(hoursError);
    err.status = 403;
    throw err;
  }

  // 4. Phát hành phiên đăng nhập duy nhất (Single Active Session)
  const { token: sessionToken } = await issueSingleActiveAdminSession(admin, req);

  return {
    token: sessionToken,
    admin: {
      id: admin.id,
      username: admin.username,
      email: cleanEmail,
      full_name: admin.full_name,
      role: admin.role,
      project_id: admin.project_id,
      avatar_url: admin.avatar_url,
      sale_limit: admin.sale_limit
    }
  };
}

// 1. POST Google OAuth Sign-In
app.post('/api/admin/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Thiếu Google credential token.' });
  }

  try {
    // Verify token with Google TokenInfo API
    const googleVerifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleVerifyRes.ok) {
      return res.status(401).json({ error: 'Token Google không hợp lệ hoặc đã hết hạn.' });
    }

    const payload = await googleVerifyRes.json();
    if (!payload.email || (payload.email_verified !== 'true' && payload.email_verified !== true)) {
      return res.status(401).json({ error: 'Email Google chưa được xác thực.' });
    }

    const result = await resolveAdminUserAndLogin({
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture
    }, req);

    console.log(`[GoogleAuth] Đăng nhập thành công: ${payload.email} (${result.admin.role})`);
    res.json({
      success: true,
      token: result.token,
      admin: result.admin
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Lỗi hệ thống khi đăng nhập bằng Google.' });
  }
});

// 2. POST Send Email OTP for Admin
app.post('/api/admin/auth/otp/send', async (req, res) => {
  const { email } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email hợp lệ.' });
  }

  try {
    // Pre-check permissions before sending OTP
    let userName = cleanEmail.split('@')[0];
    const localCheck = (await db.query('SELECT * FROM admins WHERE LOWER(username) = LOWER($1)', [cleanEmail])).rows[0];
    const isLocalProjectAccount = Boolean(localCheck?.project_id && localCheck.project_id !== 'dealphuquoc');

    // Kiểm tra khung giờ NGAY Ở BƯỚC NHẬP EMAIL, trước khi gửi OTP.
    //
    // Trước đây việc này chỉ xảy ra lúc xác thực OTP, nên Sale ngoài ca vẫn nhận
    // được mã, gõ đủ 6 số rồi mới bị từ chối — vừa tốn một email, vừa khiến người
    // dùng tưởng mình nhập sai mã. Chặn sớm cũng tránh gửi email vô ích.
    //
    // Chỉ chặn khi CHẮC CHẮN tài khoản ngoài ca; tài khoản chưa tồn tại hoặc lỗi
    // tra cứu thì để luồng cũ xử lý, không tiết lộ thêm gì về sự tồn tại của email.
    if (localCheck) {
      const hoursError = await checkWorkingHours(localCheck);
      if (hoursError) return res.status(403).json({ error: hoursError, code: 'OUT_OF_HOURS' });
      if (!localCheck.is_active) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên.' });
      }
    }

    if (isLocalProjectAccount) {
      userName = localCheck.full_name || userName;
    } else if (process.env.DEALPHUQUOC_DATABASE_URL) {
      try {
        const dealPool = dealSync.getDealPool();
        const dealUserRes = await dealPool.query(
          'SELECT id, name, role, "chatAccess", locked FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [cleanEmail]
        );
        await dealPool.end();

        if (dealUserRes.rows.length > 0) {
          const u = dealUserRes.rows[0];
          if (u.locked) {
            return res.status(403).json({ error: 'Tài khoản của bạn trên DealPhuQuoc đang bị tạm khóa.' });
          }
          if (u.role !== 'SUPERADMIN' && u.chatAccess !== true) {
            return res.status(403).json({ error: 'Tài khoản chưa được cấp quyền sử dụng hệ thống Chat trên DealPhuQuoc (chưa bật chatAccess).' });
          }
          if (u.name) userName = u.name;
        } else {
          // Check local admins
          if (!localCheck) {
            return res.status(403).json({ error: 'Tài khoản email này chưa được cấp quyền trên DealPhuQuoc hoặc Pastie AI.' });
          }
          if (localCheck.full_name) userName = localCheck.full_name;
        }
      } catch (checkErr) {
        console.warn('[AdminOTP] Pre-check failed:', checkErr.message);
      }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert into admin_otps table
    await db.query(`
      INSERT INTO admin_otps (email, code, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP
    `, [cleanEmail, otpCode, expiresAt]);

    // Send email via Resend
    const sendResult = await resend.sendAdminOTPEmail(cleanEmail, otpCode, userName);
    if (!sendResult.ok) {
      return res.status(500).json({ error: 'Không thể gửi email OTP: ' + (sendResult.reason || 'Lỗi dịch vụ email') });
    }

    res.json({
      success: true,
      message: `Đã gửi mã xác thực 6 số đến email ${cleanEmail}. Mã có hiệu lực trong 5 phút.`
    });
  } catch (error) {
    console.error('Send admin OTP error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi gửi mã OTP: ' + error.message });
  }
});

// 3. POST Verify Email OTP for Admin
app.post('/api/admin/auth/otp/verify', async (req, res) => {
  const { email, otpCode } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOtp = String(otpCode || '').trim();

  if (!cleanEmail || !cleanOtp) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mã OTP.' });
  }

  try {
    const otpRes = await db.query(
      'SELECT * FROM admin_otps WHERE email = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP LIMIT 1',
      [cleanEmail, cleanOtp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Mã xác thực OTP không chính xác hoặc đã hết hạn.' });
    }

    // Delete used OTP
    await db.query('DELETE FROM admin_otps WHERE email = $1', [cleanEmail]);

    // Resolve user and log in with Single Active Session
    const result = await resolveAdminUserAndLogin({ email: cleanEmail }, req);

    console.log(`[AdminOTP] Đăng nhập thành công: ${cleanEmail} (${result.admin.role})`);
    res.json({
      success: true,
      token: result.token,
      admin: result.admin
    });
  } catch (error) {
    console.error('Verify admin OTP error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Lỗi hệ thống khi xác thực OTP.' });
  }
});

// 4. Public auth config for Google Client ID
app.get('/api/admin/auth/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    resendConfigured: Boolean(process.env.RESEND_API_KEY)
  });
});

// SSO đăng nhập từ hệ thống ngoài (vd DealPhuQuoc). Token ký HMAC-SHA256 bằng CHAT_SSO_SECRET chung.
// Payload: base64url(JSON{email,name,project,role,exp}) + '.' + base64url(hmac).
// SSO may provision only agent or project_admin, never superadmin.
app.post('/api/admin/sso', async (req, res) => {
  const secret = process.env.CHAT_SSO_SECRET;
  if (!secret) return res.status(500).json({ error: 'SSO chưa được cấu hình (thiếu CHAT_SSO_SECRET).' });
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Thiếu token SSO.' });

  const rawToken = String(token).trim();
  const [rawBody, rawSig] = rawToken.split('.');
  if (!rawBody || !rawSig) return res.status(400).json({ error: 'Token SSO không đúng định dạng (thiếu phần thân hoặc chữ ký).' });

  // Chuẩn hoá an toàn base64 / base64url
  const body = rawBody.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const sig = rawSig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  // so sánh an toàn theo thời gian
  const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) {
    console.warn('[SSO] Chữ ký HMAC không khớp.');
    return res.status(401).json({ error: 'Chữ ký SSO không hợp lệ.' });
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (parseErr) {
    console.warn('[SSO] Lỗi parse payload JSON:', parseErr.message);
    return res.status(400).json({ error: 'Payload SSO không đúng định dạng JSON.' });
  }

  if (!payload.exp || Date.now() > Number(payload.exp)) {
    console.warn('[SSO] Token đã hết hạn:', payload.exp, 'Hiện tại:', Date.now());
    return res.status(401).json({ error: 'Token SSO đã hết hạn.' });
  }
  if (!payload.email) return res.status(400).json({ error: 'Thiếu email trong token SSO.' });

  const project = payload.project || 'dealphuquoc';

  // 1. Kiểm tra cờ chatAccess từ token SSO
  if (payload.chatAccess === false || payload.can_chat === false) {
    return res.status(403).json({
      error: 'Tài khoản của bạn chưa được cấp quyền sử dụng hệ thống Chat trên DealPhuQuoc.'
    });
  }

  // 2. Tra cứu trực tiếp bảng User trên Database DealPhuQuoc để xác thực quyền chatAccess & trạng thái khóa
  if (process.env.DEALPHUQUOC_DATABASE_URL && (project === 'dealphuquoc' || !payload.project)) {
    try {
      const dealPool = dealSync.getDealPool();
      const dealUserRes = await dealPool.query(
        'SELECT id, email, role, "chatAccess", locked FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [String(payload.email).trim()]
      );
      await dealPool.end();

      if (dealUserRes.rows.length > 0) {
        const dealUser = dealUserRes.rows[0];
        if (dealUser.locked) {
          return res.status(403).json({ error: 'Tài khoản của bạn trên DealPhuQuoc đang bị tạm khóa.' });
        }
        
        const isDealSuperAdmin = dealUser.role === 'SUPERADMIN';
        const hasChatPermission = isDealSuperAdmin || dealUser.chatAccess === true || payload.chatAccess === true;
        if (!hasChatPermission) {
          console.warn(`[SSO] Tài khoản ${payload.email} chưa được cấp quyền chatAccess trên DealPhuQuoc.`);
          return res.status(403).json({
            error: 'Tài khoản của bạn chưa được cấp quyền sử dụng hệ thống Chat trên DealPhuQuoc (chưa bật chatAccess). Vui lòng liên hệ Quản trị viên DealPhuQuoc.'
          });
        }
      } else {
        // Tài khoản không tồn tại trên DealPhuQuoc và không phải token superadmin
        if (payload.role !== 'SUPERADMIN' && payload.chatAccess !== true) {
          return res.status(403).json({
            error: 'Không tìm thấy tài khoản hợp lệ trên DealPhuQuoc hoặc tài khoản chưa được cấp quyền Chat.'
          });
        }
      }
    } catch (dbErr) {
      console.warn('[SSO] Không thể kết nối DealPhuQuoc DB để kiểm tra chatAccess:', dbErr.message);
      if (payload.chatAccess === false) {
        return res.status(403).json({ error: 'Tài khoản chưa được cấp quyền sử dụng hệ thống Chat trên DealPhuQuoc.' });
      }
    }
  }

  // project_owner là quyền quản lý chat cao nhất nhưng vẫn bị khóa trong project,
  // không phải Superadmin toàn cục của Pastie.
  const ssoRole = payload.role === 'project_owner'
    ? 'project_owner'
    : ['project_admin', 'ADMIN', 'SUPERADMIN'].includes(payload.role)
      ? 'project_admin'
      : 'agent';
  const username = `sso:${String(payload.email).toLowerCase()}`;
  const fullName = payload.name || payload.email;

  try {
    // Provision/cập nhật scoped account đúng project. The signed role is limited
    // to project_admin/agent so an external SSO token can never elevate to superadmin.
    let admin = (await db.query('SELECT * FROM admins WHERE username = $1', [username])).rows[0];
    if (!admin) {
      const ph = await hashPassword(randomUUID()); // mật khẩu ngẫu nhiên, không dùng để đăng nhập trực tiếp
      admin = (await db.query(
        `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
        [username, ph, fullName, ssoRole, project]
      )).rows[0];
    } else {
      admin = (await db.query(
        `UPDATE admins SET full_name = $1, role = $2, project_id = $3, is_active = TRUE WHERE id = $4 RETURNING *`,
        [fullName, ssoRole, project, admin.id]
      )).rows[0];
    }

    const ssoHoursError = await checkWorkingHours(admin);
    if (ssoHoursError) return res.status(403).json({ error: ssoHoursError, code: 'OUT_OF_HOURS' });

    // Create single active session token (8 hours)
    const { token: sessionToken } = await issueSingleActiveAdminSession(admin, req);

    console.log(`[SSO] Đăng nhập thành công: ${username} (${ssoRole}) cho project ${project}`);
    res.json({
      success: true,
      token: sessionToken,
      admin: { id: admin.id, username: admin.username, role: admin.role, full_name: admin.full_name, project_id: admin.project_id }
    });
  } catch (error) {
    console.error('SSO login error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập SSO.' });
  }
});

// Điểm bắt đầu đăng nhập từ form dashboard. Sau khi DealPhuQuoc xác thực
// người dùng, hệ thống nguồn sẽ phát token SSO 5 phút và chuyển về return_to.
app.get('/api/admin/sso-login-url', (req, res) => {
  const dealAdminUrl = String(process.env.DEALPHUQUOC_ADMIN_URL || 'https://admin.dealphuquoc.com').replace(/\/$/, '');
  const dealHostUrl = String(process.env.DEALPHUQUOC_HOST_URL || 'https://host.dealphuquoc.com').replace(/\/$/, '');
  const dashboardUrl = String(req.query.return_to || process.env.DASHBOARD_PUBLIC_URL || `${req.protocol}://${req.get('host')}/admin`).replace(/\/$/, '');
  const portal = String(req.query.portal || 'superadmin');
  try {
    const isHostPortal = portal === 'host' || portal === 'sale';
    const loginUrl = new URL(isHostPortal ? '/' : '/admin/chat', isHostPortal ? dealHostUrl : dealAdminUrl);
    loginUrl.searchParams.set('return_to', dashboardUrl);
    loginUrl.searchParams.set('returnUrl', dashboardUrl);
    loginUrl.searchParams.set('redirect_to', dashboardUrl);
    if (portal === 'sale') loginUrl.searchParams.set('login_as', 'sale');
    return res.json({ url: loginUrl.toString() });
  } catch {
    return res.status(500).json({ error: 'Cấu hình URL đăng nhập DealPhuQuoc không hợp lệ.' });
  }
});

// ── Web Push cho dashboard/PWA ─────────────────────────────────────────────
app.get('/api/admin/push/public-key', checkAdminAuth, (_req, res) => {
  res.json({ enabled: vapidConfigured, publicKey: vapidConfigured ? VAPID_PUBLIC_KEY : null });
});

app.post('/api/admin/push/subscribe', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const subscription = req.body?.subscription;
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Push subscription không hợp lệ.' });
  try {
    await db.query(
      `INSERT INTO push_subscriptions (admin_id, endpoint, p256dh, auth, user_agent, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (endpoint) DO UPDATE SET admin_id = EXCLUDED.admin_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, updated_at = NOW()`,
      [req.admin.id, endpoint, keys.p256dh, keys.auth, String(req.headers['user-agent'] || '').slice(0, 500)]
    );
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Không thể lưu thiết bị nhận notification.' }); }
});

app.post('/api/admin/push/unsubscribe', checkAdminAuth, async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (!endpoint) return res.status(400).json({ error: 'Thiếu endpoint.' });
  await db.query('DELETE FROM push_subscriptions WHERE admin_id = $1 AND endpoint = $2', [req.admin.id, endpoint]);
  res.json({ success: true });
});

// Admin Logout
app.post('/api/admin/logout', checkAdminAuth, async (req, res) => {
  const authHeader = req.headers['authorization'];
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(400).json({ error: 'Không tìm thấy token đăng nhập.' });
  }

  try {
    await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    res.json({ success: true, message: 'Đăng xuất thành công.' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng xuất.' });
  }
});

// ===== Quản lý DỰ ÁN (multi-project) =====
// Liệt kê dự án: superadmin thấy tất cả; subadmin scoped chỉ thấy dự án của mình.
app.get('/api/admin/projects', checkAdminAuth, async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin' && req.admin.project_id) {
      const one = await db.query("SELECT id, name, display_name, website_url, project_type, COALESCE(ai_enabled, project_type <> 'qr_concierge') AS ai_enabled FROM projects WHERE id = $1", [req.admin.project_id]);
      return res.json(one.rows);
    }
    const all = await db.query("SELECT id, name, display_name, website_url, project_type, COALESCE(ai_enabled, project_type <> 'qr_concierge') AS ai_enabled, created_at FROM projects ORDER BY created_at ASC, id ASC");
    res.json(all.rows);
  } catch (e) {
    console.error('List projects error:', e);
    res.status(500).json({ error: 'Lỗi tải danh sách dự án.' });
  }
});

// Google sign-in for QR Concierge visitors. Google proves the customer's email;
// the resulting chat session is still constrained to the QR owner's 15-minute slot.
app.post('/api/qr-chat/google', async (req, res) => {
  const { credential, projectId = 'qr-concierge', qrCode } = req.body || {};
  if (!credential || !qrCode) return res.status(400).json({ error: 'Thiếu thông tin đăng nhập Google hoặc mã QR.' });
  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) return res.status(401).json({ error: 'Google credential không hợp lệ hoặc đã hết hạn.' });
    const profile = await googleRes.json();
    if (!profile.email || (profile.email_verified !== 'true' && profile.email_verified !== true)) return res.status(401).json({ error: 'Email Google chưa được xác thực.' });
    const account = await resolveQrChatAccount(projectId, qrCode);
    if (!account) return res.status(404).json({ error: 'Mã QR không hợp lệ hoặc đã bị vô hiệu hóa.' });
    await closeActiveQrSessionsForVisitor(projectId, profile.email);
    await closeActiveQrSession(account.id);
    const sessionId = randomUUID();
    const { browser, device } = parseUserAgent(req.headers['user-agent'] || '');
    await db.query(
      // Định tuyến QR: chat vào hàng đợi của nhóm gắn với QR. routing_status chỉ
      // được đặt cho phiên QR có nhóm — phiên của flow cũ vẫn để NULL nên không
      // lọt vào bộ lọc "đang chờ / đang xử lý" của Agent.
      `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, detected_language, is_verified, status, browser, device, client_ip, assigned_admin_id, qr_account_id, expires_at, group_id, routing_status)
       VALUES ($1, $2, $3, $4, 'vi', TRUE, 'active', $5, $6, $7, $8, $9, $10, $11, $12)`,
      [sessionId, projectId, profile.name || 'Khách hàng', profile.email, browser, device, getClientIp(req), account.owner_admin_id, account.id, new Date(Date.now() + QR_CHAT_SESSION_MS),
       account.group_id || null, account.group_id ? 'waiting' : null]
    );
    await upsertCustomer({
      projectId,
      email: profile.email,
      fullName: profile.name || 'Khách hàng',
      authProvider: 'google',
      qrAccountId: account.id
    }).catch((error) => console.error('Customer profile save failed after Google login:', error.message));
    res.json({ success: true, sessionId, expiresAt: new Date(Date.now() + QR_CHAT_SESSION_MS) });
  } catch (error) {
    console.error('[QR Concierge] Google customer sign-in failed:', error.message);
    res.status(500).json({ error: 'Không thể đăng nhập Google.' });
  }
});

// QR Concierge account management. Each agent has exactly one active customer
// QR. Legacy QR rows may be retained for session history but are never shown.
app.get('/api/admin/customers', checkAdminAuth, async (req, res) => {
  const projectId = String(req.query.projectId || req.admin.project_id || '');
  if (!projectId || !canAccessProject(req.admin, projectId)) return res.status(403).json({ error: 'Bạn không có quyền xem khách hàng của project này.' });
  try {
    const onlyAssignedAgent = req.admin.role === 'agent';
    const result = await db.query(
      `SELECT c.id, c.email, c.full_name, c.auth_provider, c.first_login_at, c.last_login_at,
              q.label AS last_qr_label, a.full_name AS assigned_agent_name
         FROM customers c
         LEFT JOIN qr_chat_accounts q ON q.id = c.last_qr_account_id
         LEFT JOIN admins a ON a.id = q.owner_admin_id
        WHERE c.project_id = $1 ${onlyAssignedAgent ? 'AND q.owner_admin_id = $2' : ''}
        ORDER BY c.last_login_at DESC`,
      onlyAssignedAgent ? [projectId, req.admin.id] : [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List customers error:', error.message);
    res.status(500).json({ error: 'Không thể tải danh sách khách hàng.' });
  }
});

app.get('/api/admin/qr-accounts', checkAdminAuth, async (req, res) => {
  const projectId = String(req.query.projectId || 'qr-concierge');
  if (!canAccessProject(req.admin, projectId)) return res.status(403).json({ error: 'Bạn không có quyền xem QR của project này.' });
  const onlyOwner = req.admin.role === 'agent';
  const result = await db.query(
    `SELECT q.id, q.code, q.label, q.is_active, q.created_at, a.id AS owner_admin_id, a.full_name AS owner_name
       FROM qr_chat_accounts q JOIN admins a ON a.id = q.owner_admin_id
      WHERE q.project_id = $1 AND q.is_active = TRUE ${onlyOwner ? 'AND q.owner_admin_id = $2' : ''}
      ORDER BY q.created_at DESC`,
    onlyOwner ? [projectId, req.admin.id] : [projectId]
  );
  res.json(result.rows.map((account) => ({ ...account, chat_url: qrCustomerChatUrl(req, account.code) })));
});

app.post('/api/admin/qr-accounts', checkAdminAuth, async (req, res) => {
  const { projectId = 'qr-concierge', ownerAdminId, label } = req.body || {};
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) return res.status(403).json({ error: 'Chỉ quản trị viên dự án được tạo QR.' });
  if (!canAccessProject(req.admin, projectId)) return res.status(403).json({ error: 'Bạn không có quyền tạo QR cho project này.' });
  const project = await db.query(`SELECT id FROM projects WHERE id = $1 AND project_type = 'qr_concierge'`, [projectId]);
  if (!project.rows[0]) return res.status(400).json({ error: 'Project này không phải QR Concierge.' });
  const owner = await db.query(`SELECT id, project_id, is_active FROM admins WHERE id = $1`, [ownerAdminId]);
  if (!owner.rows[0] || !owner.rows[0].is_active || owner.rows[0].project_id !== projectId) return res.status(400).json({ error: 'Agent sở hữu QR không hợp lệ.' });

  const existing = await db.query(
    `SELECT * FROM qr_chat_accounts
      WHERE project_id = $1 AND owner_admin_id = $2 AND is_active = TRUE
      ORDER BY created_at DESC, id DESC LIMIT 1`,
    [projectId, ownerAdminId]
  );
  if (existing.rows[0]) {
    return res.json({ success: true, reused: true, account: existing.rows[0], chat_url: qrCustomerChatUrl(req, existing.rows[0].code) });
  }

  const code = `qr_${randomUUID().replace(/-/g, '')}`;
  const created = await db.query(
    `INSERT INTO qr_chat_accounts (project_id, owner_admin_id, code, label) VALUES ($1, $2, $3, $4) RETURNING *`,
    [projectId, ownerAdminId, code, String(label || 'QR chat').trim().slice(0, 255)]
  );
  res.status(201).json({ success: true, account: created.rows[0], chat_url: qrCustomerChatUrl(req, code) });
});

// Tạo dự án mới (chỉ superadmin). id = slug không dấu, dùng làm project_id ở widget (data-project).
app.post('/api/admin/projects', checkAdminAuth, async (req, res) => {
  if (req.admin.role !== 'superadmin') return res.status(403).json({ error: 'Chỉ Admin tổng được tạo dự án.' });
  let { id, name, websiteUrl } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Cần tên dự án.' });
  const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  id = slug(id || name); // không nhập mã -> tự sinh từ tên
  if (!id) return res.status(400).json({ error: 'Mã dự án không hợp lệ.' });
  try {
    const exists = await db.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (exists.rows.length) return res.status(400).json({ error: 'Mã dự án đã tồn tại.' });
    const r = await db.query('INSERT INTO projects (id, name, display_name, website_url, ai_enabled) VALUES ($1, $2, $2, $3, TRUE) RETURNING id, name, display_name, website_url, ai_enabled, created_at', [id, name.trim(), String(websiteUrl || '').trim() || null]);
    res.status(201).json({ success: true, project: r.rows[0] });
  } catch (e) {
    console.error('Create project error:', e);
    res.status(500).json({ error: 'Lỗi tạo dự án.' });
  }
});

// Superadmin sets the brand shown in the console header for all users scoped
// to a project (for example: "Hộ kinh doanh Đan Trinh").
app.put('/api/admin/projects/:id/display-name', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin)) return res.status(403).json({ error: 'Chỉ Superadmin được đổi tên hiển thị.' });
  const displayName = String(req.body?.displayName || '').trim();
  if (!displayName || displayName.length > 255) return res.status(400).json({ error: 'Tên hiển thị cần từ 1 đến 255 ký tự.' });
  const result = await db.query('UPDATE projects SET display_name = $1 WHERE id = $2 RETURNING id, name, display_name', [displayName, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Không tìm thấy project.' });
  res.json({ success: true, project: result.rows[0] });
});

app.put('/api/admin/projects/:id/settings', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin)) return res.status(403).json({ error: 'Chỉ Superadmin được cập nhật project.' });
  const name = String(req.body?.name || '').trim();
  const displayName = String(req.body?.displayName || '').trim();
  const websiteUrl = String(req.body?.websiteUrl || '').trim();
  const aiEnabled = req.body?.aiEnabled !== false;
  if (!name || !displayName) return res.status(400).json({ error: 'Cần nhập tên project và tên hiển thị.' });
  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    } catch { return res.status(400).json({ error: 'Link website phải bắt đầu bằng http:// hoặc https://.' }); }
  }
  const result = await db.query(
    'UPDATE projects SET name = $1, display_name = $2, website_url = $3, ai_enabled = $4 WHERE id = $5 RETURNING id, name, display_name, website_url, project_type, ai_enabled',
    [name, displayName, websiteUrl || null, aiEnabled, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Không tìm thấy project.' });
  res.json({ success: true, project: result.rows[0] });
});

// Xoá dự án (chỉ superadmin). Không xoá chat/KB cũ; chỉ gỡ khỏi registry.
app.delete('/api/admin/projects/:id', checkAdminAuth, async (req, res) => {
  if (req.admin.role !== 'superadmin') return res.status(403).json({ error: 'Chỉ Admin tổng được xoá dự án.' });
  try {
    await db.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete project error:', e);
    res.status(500).json({ error: 'Lỗi xoá dự án.' });
  }
});

// Get Current Admin Info
app.get('/api/admin/me', checkAdminAuth, async (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

// Tự đổi tên hiển thị của chính mình. Cố tình tách riêng khỏi
// PUT /api/admin/users/:id (route đó điều khiển cả role/project/is_active và
// chỉ dành cho Superadmin/Project Admin) — ở đây chỉ cho sửa đúng full_name của
// chính người đang đăng nhập, nên Agent dùng được mà không mở thêm quyền nào khác.
app.put('/api/admin/me/display-name', checkAdminAuth, async (req, res) => {
  // Agent không được tự đổi tên hiển thị — tên này là thứ khách nhìn thấy nên
  // do Superadmin/Project Admin quản lý. Chặn ở server chứ không chỉ ẩn ô nhập.
  if (req.admin.role === 'agent') {
    return res.status(403).json({ error: 'Bạn không có quyền đổi tên hiển thị. Vui lòng liên hệ quản trị viên.' });
  }

  const fullName = String(req.body?.full_name || '').trim();

  if (!fullName) {
    return res.status(400).json({ error: 'Tên hiển thị không được để trống.' });
  }
  if (fullName.length > 255) {
    return res.status(400).json({ error: 'Tên hiển thị quá dài (tối đa 255 ký tự).' });
  }

  try {
    const result = await db.query(
      `UPDATE admins SET full_name = $1
       WHERE id = $2 AND is_active = TRUE
       RETURNING id, username, full_name, role, project_id, avatar_url, is_active`,
      [fullName, req.admin.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }
    res.json({ success: true, message: 'Đã cập nhật tên hiển thị.', admin: result.rows[0] });
  } catch (error) {
    console.error('Update display name error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật tên hiển thị.' });
  }
});

// Danh sách nhân viên có thể phân công hội thoại
app.get('/api/admin/assignees', checkAdminAuth, async (req, res) => {
  try {
    const projectId = req.query.projectId || req.admin.project_id;
    let result;
    if (isSuperAdmin(req.admin) || isProjectOwner(req.admin)) {
      result = await db.query(
        `SELECT id, username, full_name, role, project_id, avatar_url 
         FROM admins 
         WHERE is_active = TRUE
           AND role IN ('project_admin', 'agent')
           AND ($1::text IS NULL OR project_id = $1)
         ORDER BY role = 'project_admin' DESC, full_name ASC`,
        [projectId || null]
      );
    } else if (isProjectAdmin(req.admin)) {
      result = await db.query(
        `SELECT id, username, full_name, role, project_id, avatar_url
         FROM admins
         WHERE is_active = TRUE AND project_id = $1 AND role = 'agent'
         ORDER BY full_name ASC`,
        [projectId]
      );
    } else {
      // Agent: không có quyền phân công lại, nhưng vẫn cần thấy chính mình trong
      // dropdown "Phân công" (readonly) để tên hiển thị đúng thay vì trống rỗng.
      result = await db.query(
        `SELECT id, username, full_name, role, project_id, avatar_url
         FROM admins
         WHERE id = $1 AND is_active = TRUE`,
        [req.admin.id]
      );
    }
    res.json(result.rows);
  } catch (error) {
    console.error('List assignees error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải danh sách nhân viên phân công.' });
  }
});

// List all sub-admins
app.get('/api/admin/users', checkAdminAuth, async (req, res) => {
  try {
    const result = isSuperAdmin(req.admin)
      ? await db.query(`
        SELECT a.id, a.username, a.role, a.full_name, a.avatar_url, a.is_active, a.project_id, 
               a.created_by_admin_id, a.managed_by_admin_id, a.sale_limit, a.created_at,
               m.full_name AS manager_name, m.username AS manager_username,
               (SELECT COUNT(*)::int FROM admins s WHERE s.managed_by_admin_id = a.id AND s.role = 'sale') AS used_sales_count
        FROM admins a
        LEFT JOIN admins m ON m.id = a.managed_by_admin_id
        ORDER BY 
          CASE WHEN a.role = 'superadmin' THEN 1
               WHEN a.role = 'project_admin' THEN 2
               WHEN a.role = 'agent' THEN 3
               WHEN a.role = 'sale' THEN 4
               ELSE 5 END,
          COALESCE(a.managed_by_admin_id, a.id),
          a.role = 'agent' DESC,
          a.username ASC
      `)
      : isProjectAdmin(req.admin) ? await db.query(
        `SELECT a.id, a.username, a.role, a.full_name, a.avatar_url, a.is_active, a.project_id, 
                a.created_by_admin_id, a.managed_by_admin_id, a.sale_limit, a.created_at,
                m.full_name AS manager_name, m.username AS manager_username,
                (SELECT COUNT(*)::int FROM admins s WHERE s.managed_by_admin_id = a.id AND s.role = 'sale') AS used_sales_count
         FROM admins a
         LEFT JOIN admins m ON m.id = a.managed_by_admin_id
         WHERE ((a.created_by_admin_id = $1 AND a.role IN ('agent', 'sale')) OR a.id = $1) AND a.project_id = $2 
         ORDER BY a.role DESC, a.username ASC`,
        [req.admin.id, req.admin.project_id]
      ) : await db.query(
        `SELECT a.id, a.username, a.role, a.full_name, a.avatar_url, a.is_active, a.project_id, 
                a.created_by_admin_id, a.managed_by_admin_id, a.sale_limit, a.created_at,
                m.full_name AS manager_name, m.username AS manager_username,
                (SELECT COUNT(*)::int FROM admins s WHERE s.managed_by_admin_id = a.id AND s.role = 'sale') AS used_sales_count
         FROM admins a
         LEFT JOIN admins m ON m.id = a.managed_by_admin_id
         WHERE a.id = $1`, [req.admin.id]
      );
    res.json(result.rows);
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải danh sách nhân viên.' });
  }
});

// Create a new sub-admin
app.post('/api/admin/users', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền tạo tài khoản.' });
  }

  const { email, full_name, role, avatar_url, project_id, sale_limit } = req.body || {};
  const username = String(email || '').trim().toLowerCase();
  if (!username || !username.includes('@') || !full_name?.trim()) {
    return res.status(400).json({ error: 'Vui lòng cung cấp Họ tên và Email hợp lệ.' });
  }

  try {
    // Project Admin CHỈ ĐƯỢC PHÉP tạo tài khoản Agent thuộc chính admin đó
    const effectiveRole = isProjectAdmin(req.admin) ? 'agent' : (role || 'agent');
    if (!ADMIN_ROLES.has(effectiveRole)) return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    if (isProjectAdmin(req.admin) && role && role !== 'agent') {
      return res.status(403).json({ error: 'Project Admin chỉ được phép tạo tài khoản Agent (Tư vấn viên).' });
    }
    if (!isSuperAdmin(req.admin) && !req.admin.project_id) {
      return res.status(400).json({ error: 'Project Admin phải thuộc một project hợp lệ.' });
    }

    // Email is the account identifier for Google and Email OTP sign-in.
    const checkRes = await db.query('SELECT id FROM admins WHERE username = $1', [username]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Email này đã tồn tại trong hệ thống.' });
    }

    const passwordHash = await hashPassword(randomUUID());
    const avatar = avatar_url || 'gradient-1';
    const scope = isSuperAdmin(req.admin)
      ? (effectiveRole === 'superadmin' ? null : (project_id && project_id.trim() ? project_id.trim() : null))
      : req.admin.project_id;
    if (effectiveRole !== 'superadmin' && !scope) return res.status(400).json({ error: 'Nhân viên phải thuộc một dự án cụ thể.' });

    const creatorId = isProjectAdmin(req.admin) ? req.admin.id : null;
    const saleLimit = (effectiveRole === 'agent' && sale_limit !== undefined && sale_limit !== '' && sale_limit !== null)
      ? Math.max(0, parseInt(sale_limit, 10))
      : null;

    const insertRes = await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, avatar_url, project_id, created_by_admin_id, is_active, sale_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8) 
       RETURNING id, username, role, full_name, avatar_url, project_id, created_by_admin_id, is_active, sale_limit, created_at`,
      [username, passwordHash, full_name.trim(), effectiveRole, avatar, scope, creatorId, saleLimit]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản nhân viên thành công.',
      user: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tạo tài khoản nhân viên.' });
  }
});

// Update an admin / sub-admin
app.put('/api/admin/users/:id', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền cập nhật tài khoản.' });
  }

  const { id } = req.params;
  const { email, full_name, role, avatar_url, is_active, project_id, sale_limit } = req.body || {};
  const username = email === undefined ? undefined : String(email || '').trim().toLowerCase();

  try {
    // Verify admin exists
    const checkRes = await db.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nhân viên cần sửa.' });
    }

    const currentAdmin = checkRes.rows[0];
    if (isProjectAdmin(req.admin)) {
      const isSelf = Number(currentAdmin.id) === Number(req.admin.id);
      const isCreatedByMe = currentAdmin.created_by_admin_id && Number(currentAdmin.created_by_admin_id) === Number(req.admin.id);
      if (!isSelf && !isCreatedByMe) {
        return res.status(403).json({ error: 'Bạn chỉ được quản lý tài khoản Agent do chính mình tạo ra.' });
      }
      if (!isSelf && currentAdmin.role !== 'agent') {
        return res.status(403).json({ error: 'Project Admin chỉ được quản lý Agent thuộc dự án của mình.' });
      }
    }

    if (username !== undefined && (!username || !username.includes('@'))) {
      return res.status(400).json({ error: 'Email đăng nhập không hợp lệ.' });
    }
    // If email changes, check if it is already registered.
    if (username && username !== currentAdmin.username) {
      const uRes = await db.query('SELECT id FROM admins WHERE username = $1', [username]);
      if (uRes.rows.length > 0) {
        return res.status(400).json({ error: 'Email này đã tồn tại trong hệ thống.' });
      }
    }

    const updatedUsername = username || currentAdmin.username;
    const updatedFullName = full_name || currentAdmin.full_name;
    const updatedRole = isProjectAdmin(req.admin) ? (Number(currentAdmin.id) === Number(req.admin.id) ? 'project_admin' : 'agent') : (role || currentAdmin.role);
    if (!ADMIN_ROLES.has(updatedRole)) return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    const updatedAvatar = avatar_url !== undefined ? avatar_url : currentAdmin.avatar_url;
    const updatedIsActive = is_active !== undefined ? is_active : currentAdmin.is_active;
    const updatedProject = isProjectAdmin(req.admin)
      ? req.admin.project_id
      : updatedRole === 'superadmin'
      ? null
      : (project_id !== undefined ? (project_id && project_id.trim() ? project_id.trim() : null) : currentAdmin.project_id);

    const updatedSaleLimit = (updatedRole === 'agent' && sale_limit !== undefined)
      ? (sale_limit === '' || sale_limit === null ? null : Math.max(0, parseInt(sale_limit, 10)))
      : currentAdmin.sale_limit;

    // Do not allow deactivating themselves
    if (Number(id) === Number(req.admin.id) && !updatedIsActive) {
      return res.status(400).json({ error: 'Bạn không thể tự vô hiệu hóa tài khoản của chính mình.' });
    }

    const updateRes = await db.query(
      `UPDATE admins
       SET username = $1, full_name = $2, role = $3, avatar_url = $4, is_active = $5, project_id = $6, sale_limit = $7
       WHERE id = $8 
       RETURNING id, username, role, full_name, avatar_url, project_id, created_by_admin_id, is_active, sale_limit, created_at`,
      [updatedUsername, updatedFullName, updatedRole, updatedAvatar, updatedIsActive, updatedProject, updatedSaleLimit, id]
    );

    res.json({
      success: true,
      message: 'Cập nhật tài khoản nhân viên thành công.',
      user: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật tài khoản nhân viên.' });
  }
});

// Delete a sub-admin
app.delete('/api/admin/users/:id', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền xóa tài khoản.' });
  }

  const { id } = req.params;

  if (Number(id) === Number(req.admin.id)) {
    return res.status(400).json({ error: 'Bạn không thể tự xóa tài khoản của chính mình.' });
  }

  try {
    const checkRes = await db.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nhân viên để xóa.' });
    }
    if (isProjectAdmin(req.admin)) {
      const isCreatedByMe = checkRes.rows[0].created_by_admin_id && Number(checkRes.rows[0].created_by_admin_id) === Number(req.admin.id);
      if (!isCreatedByMe || checkRes.rows[0].role !== 'agent' || checkRes.rows[0].project_id !== req.admin.project_id) {
        return res.status(403).json({ error: 'Project Admin chỉ được xóa tài khoản Agent do chính mình tạo ra.' });
      }
    }

    // Delete all sessions for this admin first (or unassign them)
    await db.query('UPDATE sessions SET assigned_admin_id = NULL WHERE assigned_admin_id = $1', [id]);
    await db.query('UPDATE sessions SET claimed_by_admin_id = NULL WHERE claimed_by_admin_id = $1', [id]);
    await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [id]);

    await db.query('DELETE FROM admins WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Đã xóa tài khoản nhân viên thành công.'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xóa tài khoản nhân viên.' });
  }
});

// (Đã gộp vào định nghĩa /api/admin/assignees phía trên — route trùng lặp này từng
// bị Express bỏ qua vì đăng ký sau, khiến nhánh "Agent chỉ thấy chính mình" không
// bao giờ chạy. Xem sửa lỗi ở định nghĩa đầu tiên của '/api/admin/assignees'.)

// Reassign a session to an admin (Super-Admin or Sub-Admin can reassign)
app.put('/api/admin/chats/:sessionId/assign', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const { sessionId } = req.params;
  const { assignedAdminId } = req.body; // Can be ID or null

  try {
    // Verify session exists
    const sessionCheck = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });
    }
    if (!canAccessProject(req.admin, sessionCheck.rows[0].project_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền chuyển chat của project này.' });
    }
    if (!isSuperAdmin(req.admin) && !isProjectOwner(req.admin) && !isProjectAdmin(req.admin)) {
      return res.status(403).json({ error: 'Chỉ Project Admin hoặc Superadmin được chuyển chat.' });
    }

    let adminName = 'Chưa chỉ định';
    if (assignedAdminId) {
      const adminCheck = await db.query('SELECT id, full_name, project_id, role, created_by_admin_id FROM admins WHERE id = $1 AND is_active = TRUE', [assignedAdminId]);
      if (adminCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy nhân viên được chỉ định hoặc tài khoản đang bị vô hiệu hóa.' });
      }

      const target = adminCheck.rows[0];
      const sameProject = target.project_id === sessionCheck.rows[0].project_id;
      if (!sameProject) {
        return res.status(403).json({ error: 'Không thể phân công nhân viên thuộc dự án khác.' });
      }
      if (isProjectAdmin(req.admin) && target.role !== 'agent') {
        return res.status(403).json({ error: 'Admin chỉ được phân công chat cho Agent.' });
      }
      if ((isSuperAdmin(req.admin) || isProjectOwner(req.admin)) && !['project_admin', 'agent'].includes(target.role)) {
        return res.status(403).json({ error: 'Superadmin chỉ được phân công chat cho Admin hoặc Agent.' });
      }
      adminName = adminCheck.rows[0].full_name;
    }

    // Update assignment
    await db.query(
      'UPDATE sessions SET assigned_admin_id = $1 WHERE id = $2',
      [assignedAdminId || null, sessionId]
    );

    // Save a system log message inside the chat
    const logText = `[Hệ thống] Cuộc trò chuyện đã được chỉ định cho: ${adminName}.`;
    await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language) 
       VALUES ($1, 'system', $2, $2, 'vi')`,
      [sessionId, logText]
    );

    notifyAdminRealtime('session_update', { sessionId, projectId: sessionCheck.rows[0].project_id, action: 'assign' });

    res.json({
      success: true,
      message: `Đã chuyển cuộc hội thoại cho: ${adminName}.`
    });
  } catch (error) {
    console.error('Reassign chat error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi chuyển giao cuộc hội thoại.' });
  }
});

// Claim an unassigned chat. Once claimed, only the owner or a superadmin can reply.
app.post('/api/admin/chats/:sessionId/claim', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const { sessionId } = req.params;
  if (!isChatStaff(req.admin)) return res.status(403).json({ error: 'Bạn không có quyền tiếp nhận chat.' });

  if (req.isDrainingGraceMode) {
    return res.status(403).json({
      error: 'Ca làm việc của bạn đã kết thúc. Bạn đang trong thời gian gia hạn để hoàn tất các cuộc trò chuyện dở dang và không thể tiếp nhận thêm cuộc trò chuyện mới.',
      code: 'SHIFT_DRAINING'
    });
  }

  try {
    const sessionResult = await db.query('SELECT project_id, claimed_by_admin_id, operator_no, detected_language FROM sessions WHERE id = $1', [sessionId]);
    if (sessionResult.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });
    const session = sessionResult.rows[0];
    if (!canAccessProject(req.admin, session.project_id)) return res.status(403).json({ error: 'Bạn không có quyền tiếp nhận chat của project này.' });
    if (session.claimed_by_admin_id && session.claimed_by_admin_id !== req.admin.id && !isSuperAdmin(req.admin)) {
      return res.status(409).json({ error: 'Chat này đã được nhân viên khác tiếp nhận.' });
    }
    const firstClaim = !session.claimed_by_admin_id;
    // Gán số tổng đài viên ngẫu nhiên (giữ ổn định cho phiên); chỉ đặt lần đầu
    const operatorNo = session.operator_no || (100 + Math.floor(Math.random() * 900));

    // Claim NGUYÊN TỬ. Câu kiểm tra ở trên chỉ để trả thông báo đẹp; nó không đủ
    // để tránh tranh chấp vì giữa SELECT và UPDATE có thể có Sale khác chen vào.
    // Điều kiện claimed_by_admin_id IS NULL nằm ngay trong UPDATE mới là thứ bảo
    // đảm chỉ đúng một người nhận được chat.
    const claimResult = await db.query(
      `UPDATE sessions
          SET claimed_by_admin_id = $1,
              claimed_at = NOW(),
              operator_no = COALESCE(operator_no, $3),
              routing_status = CASE WHEN routing_status IS NULL THEN NULL ELSE 'assigned' END
        WHERE id = $2
          AND (claimed_by_admin_id IS NULL OR claimed_by_admin_id = $1 OR $4)
        RETURNING claimed_by_admin_id`,
      [req.admin.id, sessionId, operatorNo, isSuperAdmin(req.admin)]
    );
    if (claimResult.rows.length === 0) {
      return res.status(409).json({ error: 'Chat này đã được nhân viên khác tiếp nhận.' });
    }
    // Lần đầu tiếp nhận -> chèn tin hệ thống hiển thị cho khách "Tổng đài viên số XXX đã tiếp nhận"
    if (firstClaim) {
      const lang = session.detected_language || 'vi';
      const msgs = {
        vi: `Tổng đài viên số ${operatorNo} đã tiếp nhận. Rất vui được hỗ trợ bạn! 👋`,
        en: `Operator #${operatorNo} has joined. Happy to help you! 👋`,
        ru: `Оператор №${operatorNo} подключился. Рад помочь вам! 👋`,
        zh: `${operatorNo}号客服已接入，很高兴为您服务！👋`,
      };
      const msg = msgs[lang] || msgs.vi;
      await db.query(
        `INSERT INTO messages (session_id, sender, original_text, translated_text, language)
         VALUES ($1, 'system', $2, $2, $3)`,
        [sessionId, msg, lang]
      ).catch((e) => console.error('Insert operator-claim message failed:', e.message));
    }

    notifyAdminRealtime('session_update', { sessionId, projectId: session.project_id, action: 'claim', claimedByAdminId: req.admin.id });

    res.json({ success: true, claimedByAdminId: req.admin.id, operatorNo });
  } catch (error) {
    console.error('Claim chat error:', error);
    res.status(500).json({ error: 'Không thể tiếp nhận chat.' });
  }
});

// Bàn giao cuộc trò chuyện cho Sale ca tiếp theo (hoặc nhả quyền tiếp nhận)
app.post('/api/admin/chats/:sessionId/handover', checkAdminAuth, async (req, res) => {
  const { sessionId } = req.params;
  const { note } = req.body || {};

  try {
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });
    }
    const session = sessionRes.rows[0];

    if (!isSuperAdmin(req.admin)) {
      if (!session.claimed_by_admin_id || Number(session.claimed_by_admin_id) !== Number(req.admin.id)) {
        return res.status(403).json({ error: 'Chỉ nhân viên đang tiếp nhận cuộc trò chuyện này mới có quyền bàn giao.' });
      }
    }

    // Nhả claim, đưa về waiting
    await db.query(
      `UPDATE sessions
          SET claimed_by_admin_id = NULL,
              claimed_at = NULL,
              routing_status = 'waiting'
        WHERE id = $1`,
      [sessionId]
    );

    // Chèn tin nhắn hệ thống thông báo cho khách và ghi log bàn giao
    const handoverText = note
      ? `[Bàn giao ca] Nhân viên ${req.admin.full_name || req.admin.username} đã bàn giao ca: "${note}". Đang chờ nhân viên ca tiếp theo tiếp nhận ⏳`
      : `[Bàn giao ca] Nhân viên ${req.admin.full_name || req.admin.username} đã bàn giao ca cho đồng nghiệp tiếp tục hỗ trợ bạn ⏳`;

    await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language)
       VALUES ($1, 'system', $2, $2, 'vi')`,
      [sessionId, handoverText]
    );

    notifyAdminRealtime('session_update', { sessionId, projectId: session.project_id, action: 'handover' });
    notifyAdminRealtime('new_message', { sessionId, projectId: session.project_id, sender: 'system' });

    res.json({ success: true, message: 'Đã bàn giao ca thành công.' });
  } catch (error) {
    console.error('Handover session error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi bàn giao ca.' });
  }
});


// ----------------------------------------------------
// ADMIN API ENDPOINTS (DASHBOARD)
// ----------------------------------------------------

/**
 * @openapi
 * /api/admin/chats:
 *   get:
 *     summary: Lấy danh sách tất cả các phiên chat (Yêu cầu quyền Admin)
 *     description: Lấy danh sách toàn bộ phiên chat trong hệ thống, bao gồm thông tin chi tiết như tóm tắt AI, các tag phân loại và trạng thái của từng phòng chat.
 *     tags:
 *       - Quản trị viên
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Lọc danh sách theo dự án/trang web cụ thể (ví dụ pastie-landingpage)
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Nhập mật khẩu quản trị thay cho Bearer Authorization Header
 *     responses:
 *       200:
 *         description: Tải danh sách phòng chat thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Chưa xác thực (thiếu token hoặc mật khẩu sai)
 *       500:
 *         description: Lỗi hệ thống
 */

// SSE Stream endpoint cho Admin Dashboard
app.get('/api/admin/events', async (req, res) => {
  const admin = await getAdminFromToken(req);
  if (!admin) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(':connected\n\n');

  const client = { req, res, admin };
  adminEventClients.add(client);

  const keepAliveInterval = setInterval(() => {
    try {
      res.write(':keepalive\n\n');
    } catch (e) {
      clearInterval(keepAliveInterval);
      adminEventClients.delete(client);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    adminEventClients.delete(client);
  });
});

// 1. Get all sessions (grouped by email + projectId to avoid duplicates in sidebar)
app.get('/api/admin/chats', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const { projectId } = req.query;
  
  try {
    const adminId = req.admin.id;
    const params = [adminId];

    let queryText = `
      SELECT s.*, a.full_name as assigned_admin_name, a.avatar_url as assigned_admin_avatar,
        ca.full_name as claimed_by_admin_name,
        g.name as group_name,
        q.label as qr_label,
        (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count,
        (SELECT MAX(created_at) FROM messages WHERE session_id = s.id) as last_message_at,
        (SELECT original_text FROM messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message_preview,
        (SELECT sender FROM messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message_sender,
        (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id AND m.sender = 'visitor'
           AND m.created_at > COALESCE(rr.last_seen_at, to_timestamp(0))) as unread_visitor,
        COALESCE(rr.seen_message_count, -1) as seen_message_count
      FROM sessions s
      LEFT JOIN admins a ON s.assigned_admin_id = a.id
      LEFT JOIN admins ca ON s.claimed_by_admin_id = ca.id
      LEFT JOIN agent_groups g ON s.group_id = g.id
      LEFT JOIN qr_chat_accounts q ON s.qr_account_id = q.id
      LEFT JOIN session_read_receipts rr ON rr.session_id = s.id AND rr.admin_id = $1
    `;

    // Chỉ hiện multichannel session khi đã chuyển sang agent (show_in_dashboard=true)
    // Live chat widget (platform='widget' hoặc null) luôn hiện
    const conditions = [`(s.platform IS NULL OR s.platform = 'widget' OR s.show_in_dashboard = true)`];
    // Phân quyền: tài khoản gắn project (không phải superadmin) BẮT BUỘC chỉ xem project của mình.
    const scopedProject = req.admin.role !== 'superadmin' && req.admin.project_id ? req.admin.project_id : projectId;
    if (scopedProject) {
      conditions.push(`s.project_id = $${params.length + 1}`);
      params.push(scopedProject);
    }
    // Sale chỉ thấy chat của những nhóm mình thuộc về, và chỉ trong khung giờ
    // nhận chat của chính nhóm đó. Chat đã tự tay tiếp nhận thì luôn thấy, kể cả
    // sau khi hết ca — nếu không thì cuộc đang dở sẽ biến mất giữa chừng.
    if (isSale(req.admin)) {
      const groups = await db.query(
        'SELECT group_id FROM agent_group_sales WHERE sale_id = $1 AND is_active = TRUE',
        [req.admin.id]
      );
      const openGroups = [];
      for (const row of groups.rows) {
        if (await isSaleAvailableForGroup(req.admin.id, row.group_id)) openGroups.push(row.group_id);
      }
      conditions.push(`(s.group_id = ANY($${params.length + 1}::int[]) OR s.claimed_by_admin_id = $${params.length + 2})`);
      params.push(openGroups, req.admin.id);
    } else if (isAgentManager(req.admin)) {
      // Agent quản lý thấy toàn bộ chat của các nhóm mình sở hữu, cộng các phiên
      // QR cũ chưa được gắn nhóm (dữ liệu trước migration).
      conditions.push(`(
        s.project_id <> 'qr-concierge'
        OR s.assigned_admin_id = $${params.length + 1}
        OR s.group_id IN (SELECT id FROM agent_groups WHERE agent_id = $${params.length + 1})
      )`);
      params.push(req.admin.id);
    }
    // Bộ lọc trạng thái định tuyến cho giao diện Agent: đang chờ / đang xử lý / đã đóng.
    const routing = String(req.query.routing || '').trim();
    if (['waiting', 'assigned', 'closed'].includes(routing)) {
      conditions.push(`s.routing_status = $${params.length + 1}`);
      params.push(routing);
    }

    queryText += ' WHERE ' + conditions.join(' AND ');
    queryText += ' ORDER BY s.created_at DESC';

    const result = await db.query(queryText, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải danh sách hội thoại.' });
  }
});

/**
 * @openapi
 * /api/admin/chats/{sessionId}/messages:
 *   get:
 *     summary: Lấy lịch sử tin nhắn chi tiết của một cuộc trò chuyện (Yêu cầu quyền Admin)
 *     description: Lấy danh sách toàn bộ các tin nhắn song ngữ trong một phiên chat. Không bị giới hạn bởi trạng thái phòng chat đã đóng hay đang mở.
 *     tags:
 *       - Quản trị viên
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của phiên chat (UUID)
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Nhập mật khẩu quản trị thay cho Bearer Authorization Header
 *     responses:
 *       200:
 *         description: Tải danh sách tin nhắn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Chưa xác thực (thiếu token hoặc mật khẩu sai)
 *       500:
 *         description: Lỗi hệ thống
 */
app.get('/api/admin/chats/:sessionId/messages', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const { sessionId } = req.params;
  const adminLang = req.query.adminLang || 'vi';
  const limit = parseInt(req.query.limit) || 15;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // Check if session has a locked admin_language
    const sessionRes = await db.query('SELECT admin_language, project_id, assigned_admin_id, group_id, claimed_by_admin_id, qr_account_id FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    }
    const sess = sessionRes.rows[0];

    // Phân quyền: tài khoản gắn project không được xem hội thoại của project khác.
    if (
      req.admin.role !== 'superadmin' && req.admin.project_id &&
      sess.project_id !== req.admin.project_id
    ) {
      return res.status(403).json({ error: 'Bạn không có quyền xem hội thoại thuộc project khác.' });
    }

    if (req.admin.role === 'agent' && sess.project_id === 'qr-concierge') {
      const isDirectOwner = Number(sess.assigned_admin_id) === Number(req.admin.id);
      let isMySale = false;
      if (sess.claimed_by_admin_id) {
        const saleCheck = await db.query('SELECT id FROM admins WHERE id = $1 AND managed_by_admin_id = $2', [sess.claimed_by_admin_id, req.admin.id]);
        isMySale = saleCheck.rows.length > 0;
      }
      let isMyGroup = false;
      if (sess.group_id) {
        const groupCheck = await db.query('SELECT id FROM agent_groups WHERE id = $1 AND agent_id = $2', [sess.group_id, req.admin.id]);
        isMyGroup = groupCheck.rows.length > 0;
      }
      let isMyQr = false;
      if (sess.qr_account_id) {
        const qrCheck = await db.query('SELECT id FROM qr_chat_accounts WHERE id = $1 AND owner_admin_id = $2', [sess.qr_account_id, req.admin.id]);
        isMyQr = qrCheck.rows.length > 0;
      }
      if (!isDirectOwner && !isMySale && !isMyGroup && !isMyQr) {
        return res.status(403).json({ error: 'Hội thoại này không thuộc phạm vi quản lý của bạn.' });
      }
    }
    let targetLang = adminLang;
    if (sess.admin_language) {
      targetLang = sess.admin_language;
    }

    const result = await db.query(
      `SELECT m.*, a.full_name as sender_admin_name, a.avatar_url as sender_admin_avatar 
       FROM messages m
       LEFT JOIN admins a ON m.sender_admin_id = a.id
       WHERE m.session_id = $1 
       ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    );
    
    const messages = result.rows.reverse();

    // Dịch song song các tin nhắn theo ngôn ngữ được khóa của cuộc trò chuyện
    await Promise.all(messages.map(async (msg) => {
      msg.translated_text = await getOrTranslateMessage(msg, targetLang);
      // Presigned S3 URLs expire — always hand back a fresh one instead of a stale cached value.
      if (msg.attachment_key) {
        msg.attachment_url = await s3.getPresignedUrl(msg.attachment_key, 6 * 3600).catch(() => msg.attachment_url);
      }
    }));

    res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tin nhắn.' });
  }
});

/**
 * @openapi
 * /api/admin/chats/{sessionId}:
 *   delete:
 *     summary: Xóa cuộc trò chuyện vĩnh viễn (Yêu cầu quyền Admin)
 *     description: Xóa toàn bộ dữ liệu của phiên chat (bao gồm tin nhắn, các bản dịch) khỏi cơ sở dữ liệu.
 *     tags:
 *       - Quản trị viên
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của phiên chat cần xóa (UUID)
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Nhập mật khẩu quản trị thay cho Bearer Authorization Header
 *     responses:
 *       200:
 *         description: Xóa phiên chat thành công
 *       401:
 *         description: Chưa xác thực (thiếu token hoặc mật khẩu sai)
 *       404:
 *         description: Không tìm thấy phiên chat
 *       500:
 *         description: Lỗi hệ thống
 */
app.delete('/api/admin/chats/:sessionId', checkAdminAuth, async (req, res) => {
  const { sessionId } = req.params;

  // RBAC: Only superadmin can delete conversations!
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Quyền hạn bị từ chối. Chỉ Admin tổng (Super-admin) mới có quyền xóa cuộc hội thoại.' });
  }

  try {
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat để xóa.' });
    }

    // Since the database tables (messages, message_translations) have ON DELETE CASCADE foreign key constraints,
    // deleting the session row will automatically delete all associated messages and translations!
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    // Dọn file đính kèm trên bucket luôn nếu đây là chat QR Concierge (chỉ áp dụng dự án QR).
    if (sessionRes.rows[0].qr_account_id) {
      void s3.deleteSessionAttachments(sessionRes.rows[0].project_id, sessionId);
    }

    notifyAdminRealtime('session_update', { sessionId, projectId: sessionRes.rows[0].project_id, action: 'delete' });

    res.json({ success: true, message: 'Đã xóa cuộc trò chuyện thành công.' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xóa cuộc trò chuyện.' });
  }
}); 

/**
 * @openapi
 * /api/admin/export:
 *   get:
 *     summary: Xuất dữ liệu các phòng chat (Yêu cầu quyền Admin)
 *     description: Xuất toàn bộ dữ liệu các phiên chat và tin nhắn dưới định dạng **CSV** (để quản lý / đọc bằng Excel) hoặc **JSONL** (để training, fine-tune mô hình AI).
 *     tags:
 *       - Quản trị viên
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [csv, jsonl]
 *         description: Định dạng file xuất dữ liệu
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Lọc theo dự án/trang web cụ thể
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Nhập mật khẩu quản trị thay cho Bearer Authorization Header
 *     responses:
 *       200:
 *         description: Tải xuống file xuất dữ liệu thành công (application/x-jsonlines hoặc text/csv)
 *       400:
 *         description: Yêu cầu định dạng không được hỗ trợ
 *       401:
 *         description: Chưa xác thực (thiếu token hoặc mật khẩu sai)
 *       404:
 *         description: Không tìm thấy dữ liệu hội thoại phù hợp
 *       500:
 *         description: Lỗi hệ thống
 */
// 3. Export data (JSONL for Fine-tuning / CSV for Sales Scripting)
app.get('/api/admin/export', checkAdminAuth, async (req, res) => {
  const { format, projectId } = req.query; // format = 'jsonl' | 'csv'
  
  try {
    // 1. Get sessions
    let sessionsQuery = 'SELECT * FROM sessions';
    const params = [];
    if (projectId) {
      sessionsQuery += ' WHERE project_id = $1';
      params.push(projectId);
    }
    const sessionsRes = await db.query(sessionsQuery, params);
    const sessions = sessionsRes.rows;

    if (sessions.length === 0) {
      return res.status(404).send('Không có dữ liệu hội thoại nào để xuất.');
    }

    // 2. Export as JSONL (Training format)
    if (format === 'jsonl') {
      let jsonlContent = '';
      
      for (const session of sessions) {
        // Get messages
        const msgRes = await db.query(
          'SELECT sender, original_text, translated_text FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
          [session.id]
        );
        
        // Skip sessions with no conversation
        if (msgRes.rows.length === 0) continue;

        // Build a training model row (ChatML style)
        const chatml = {
          session_id: session.id,
          project_id: session.project_id,
          intent_tags: session.intent_tags ? session.intent_tags.split(',').map(t => t.trim()) : [],
          summary: session.ai_summary,
          messages: msgRes.rows.map(m => ({
            role: m.sender === 'visitor' ? 'user' : 'assistant',
            content: m.original_text,
            translation: m.translated_text
          }))
        };
        
        jsonlContent += JSON.stringify(chatml) + '\n';
      }

      res.setHeader('Content-Type', 'application/x-jsonlines');
      res.setHeader('Content-Disposition', `attachment; filename=chat_logs_${projectId || 'all'}_${Date.now()}.jsonl`);
      return res.send(jsonlContent);
    }

    // 3. Export as CSV (Sales Script style)
    if (format === 'csv') {
      let csvContent = '\uFEFF'; // UTF-8 BOM for Excel display
      csvContent += 'Session ID,Project ID,Visitor Name,Visitor Email,Sender,Original Text,Translated Text,Created At\n';

      for (const session of sessions) {
        const msgRes = await db.query(
          'SELECT sender, original_text, translated_text, created_at FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
          [session.id]
        );

        for (const msg of msgRes.rows) {
          const escapeCsv = (str) => {
            if (!str) return '""';
            return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
          };

          csvContent += `${session.id},${session.project_id},${escapeCsv(session.visitor_name)},${escapeCsv(session.visitor_email)},${msg.sender},${escapeCsv(msg.original_text)},${escapeCsv(msg.translated_text)},${msg.created_at.toISOString()}\n`;
        }
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=chat_logs_${projectId || 'all'}_${Date.now()}.csv`);
      return res.send(csvContent);
    }

    return res.status(400).json({ error: 'Định dạng xuất file không hỗ trợ. Sử dụng "jsonl" hoặc "csv".' });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xuất dữ liệu.' });
  }
});

/**
 * @openapi
 * /api/admin/reports/data:
 *   get:
 *     summary: Tổng hợp & Xuất báo cáo hoạt động tư vấn Sale (Yêu cầu quyền Admin/Agent)
 *     description: Trích xuất thống kê năng suất, số lượng hội thoại và xuất file CSV báo cáo chi tiết.
 */
app.get('/api/admin/reports/data', checkAdminAuth, async (req, res) => {
  const { format = 'json', projectId, saleId, status, datePreset, fromDate, toDate } = req.query;

  // Báo cáo là công cụ quản lý. Sale chỉ trả lời chat, không được xem năng suất
  // của cả đội — kể cả khi tự gọi thẳng endpoint. Ẩn nút ở frontend là chưa đủ.
  if (isSale(req.admin)) {
    return res.status(403).json({ error: 'Tài khoản Sale không có quyền xem báo cáo.' });
  }

  try {
    const isSuper = isSuperAdmin(req.admin);
    const isAgent = isAgentManager(req.admin);

    let queryText = `
      SELECT 
        s.id AS session_id,
        s.created_at,
        -- LƯU Ý: bảng sessions KHÔNG có cột updated_at. Trước đây câu truy vấn này
        -- chọn s.updated_at nên toàn bộ báo cáo văng lỗi 500 và giao diện chỉ hiện
        -- "Lỗi hệ thống khi tải dữ liệu báo cáo". Mốc thời gian gần nhất lấy từ
        -- last_message_at ở dưới, hoặc claimed_at.
        s.status,
        s.routing_status,
        s.project_id,
        s.visitor_name,
        s.visitor_email,
        s.visitor_phone,
        s.detected_language,
        s.ai_summary,
        s.intent_tags,
        s.claimed_at,
        ca.id AS sale_id,
        ca.full_name AS sale_name,
        ca.username AS sale_email,
        ag.full_name AS agent_name,
        ag.username AS agent_email,
        q.label AS qr_label,
        q.code AS qr_code,
        (SELECT COUNT(*)::int FROM messages WHERE session_id = s.id) AS total_messages,
        (SELECT COUNT(*)::int FROM messages WHERE session_id = s.id AND sender = 'visitor') AS visitor_messages,
        (SELECT COUNT(*)::int FROM messages WHERE session_id = s.id AND sender = 'agent') AS staff_messages,
        (SELECT COUNT(*)::int FROM messages WHERE session_id = s.id AND sender = 'ai') AS ai_messages,
        (SELECT MAX(created_at) FROM messages WHERE session_id = s.id) AS last_message_at
      FROM sessions s
      LEFT JOIN admins ca ON ca.id = s.claimed_by_admin_id
      LEFT JOIN admins ag ON ag.id = COALESCE(s.assigned_admin_id, ca.managed_by_admin_id)
      LEFT JOIN qr_chat_accounts q ON q.id = s.qr_account_id
    `;

    const conditions = [];
    const params = [];

    // Project scope
    const scopedProject = !isSuper && req.admin.project_id ? req.admin.project_id : (projectId || null);
    if (scopedProject) {
      conditions.push(`s.project_id = $${params.length + 1}`);
      params.push(scopedProject);
    }

    // Role-based scope: Agent only gets sessions from their QR, groups, or managed sales
    if (isAgent) {
      conditions.push(`(
        s.assigned_admin_id = $${params.length + 1}
        OR ca.managed_by_admin_id = $${params.length + 1}
        OR s.qr_account_id IN (SELECT id FROM qr_chat_accounts WHERE owner_admin_id = $${params.length + 1})
        OR s.group_id IN (SELECT id FROM agent_groups WHERE agent_id = $${params.length + 1})
      )`);
      params.push(req.admin.id);
    }

    // Sale filter
    if (saleId && Number(saleId)) {
      conditions.push(`s.claimed_by_admin_id = $${params.length + 1}`);
      params.push(Number(saleId));
    }

    // Status filter
    if (status && status !== 'all') {
      conditions.push(`s.status = $${params.length + 1}`);
      params.push(status);
    }

    // Date range filter
    if (fromDate) {
      conditions.push(`s.created_at >= $${params.length + 1}::timestamptz`);
      params.push(`${fromDate} 00:00:00`);
    } else if (datePreset === 'today') {
      conditions.push(`s.created_at >= CURRENT_DATE`);
    } else if (datePreset === '7days') {
      conditions.push(`s.created_at >= NOW() - INTERVAL '7 days'`);
    } else if (datePreset === '30days') {
      conditions.push(`s.created_at >= NOW() - INTERVAL '30 days'`);
    }

    if (toDate) {
      conditions.push(`s.created_at <= $${params.length + 1}::timestamptz`);
      params.push(`${toDate} 23:59:59`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY s.created_at DESC';

    const result = await db.query(queryText, params);
    const sessions = result.rows;

    // Aggregate summary metrics
    const totalSessions = sessions.length;
    const totalVisitors = new Set(sessions.map(s => s.visitor_email || s.visitor_name || s.session_id)).size;
    const totalMessages = sessions.reduce((sum, s) => sum + (Number(s.total_messages) || 0), 0);
    const staffMessages = sessions.reduce((sum, s) => sum + (Number(s.staff_messages) || 0), 0);
    const visitorMessages = sessions.reduce((sum, s) => sum + (Number(s.visitor_messages) || 0), 0);
    const aiMessages = sessions.reduce((sum, s) => sum + (Number(s.ai_messages) || 0), 0);

    // Sales breakdown
    const salesMap = {};
    for (const s of sessions) {
      const sId = s.sale_id || 'unassigned';
      const sName = s.sale_name || 'Chưa tiếp nhận';
      const sEmail = s.sale_email || '—';
      if (!salesMap[sId]) {
        salesMap[sId] = {
          sale_id: s.sale_id || null,
          sale_name: sName,
          sale_email: sEmail,
          sessions_count: 0,
          staff_messages_count: 0
        };
      }
      salesMap[sId].sessions_count++;
      salesMap[sId].staff_messages_count += Number(s.staff_messages) || 0;
    }
    const salesBreakdown = Object.values(salesMap).sort((a, b) => b.sessions_count - a.sessions_count);

    if (format === 'csv') {
      const BOM = '\uFEFF';
      const headers = [
        'Mã phiên chat',
        'Thời gian tạo',
        'Tin nhắn cuối lúc',
        'Dự án',
        'Mã QR',
        'Tên khách',
        'Email khách',
        'Số điện thoại',
        'Nhân viên Sale',
        'Agent quản lý',
        'Trạng thái',
        'Tổng tin nhắn',
        'Tin khách',
        'Tin Sale',
        'Tin AI',
        'Tóm tắt nội dung AI'
      ];

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = sessions.map(s => [
        escapeCSV(s.session_id),
        escapeCSV(new Date(s.created_at).toLocaleString('vi-VN')),
        escapeCSV(s.last_message_at ? new Date(s.last_message_at).toLocaleString('vi-VN') : '—'),
        escapeCSV(s.project_id),
        escapeCSV(s.qr_label || s.qr_code || '—'),
        escapeCSV(s.visitor_name || 'Khách vãng lai'),
        escapeCSV(s.visitor_email || '—'),
        escapeCSV(s.visitor_phone || '—'),
        escapeCSV(s.sale_name || 'Chưa tiếp nhận'),
        escapeCSV(s.agent_name || '—'),
        escapeCSV(s.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'),
        s.total_messages || 0,
        s.visitor_messages || 0,
        s.staff_messages || 0,
        s.ai_messages || 0,
        escapeCSV(s.ai_summary || '')
      ].join(','));

      const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=bao_cao_tu_van_${Date.now()}.csv`);
      return res.send(csvContent);
    }

    res.json({
      success: true,
      summary: {
        total_sessions: totalSessions,
        total_visitors: totalVisitors,
        total_messages: totalMessages,
        staff_messages: staffMessages,
        visitor_messages: visitorMessages,
        ai_messages: aiMessages
      },
      sales_breakdown: salesBreakdown,
      sessions: sessions.slice(0, 100)
    });
  } catch (error) {
    console.error('Reports data error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải dữ liệu báo cáo.' });
  }
});


// --- MULTI-CHANNEL WEBHOOK & ROUTING (PHASE 3) ---

/**
 * Sends a message back to the customer on their respective platform using the Meta Graph APIs.
 * Supports WhatsApp, Messenger, and Instagram.
 */
async function sendMultichannelMessage(platform, recipientId, text, projectId = 'pastie-landingpage') {
  try {
    // 1. Fetch channel config for this project from Database
    const configRes = await db.query('SELECT * FROM channel_configs WHERE project_id = $1', [projectId]);
    const config = configRes.rows[0];

    if (platform === 'whatsapp') {
      const whatsappPhoneId = config?.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const whatsappToken = config?.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN;
      if (!whatsappPhoneId || !whatsappToken) {
        console.warn(`WARNING: WhatsApp credentials missing for project ${projectId}. Cannot send message.`);
        return;
      }
      
      const url = `https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientId,
          type: "text",
          text: { body: text }
        })
      });
      const data = await response.json();
      console.log('WhatsApp send response:', data);
    } 
    else if (platform === 'messenger' || platform === 'instagram') {
      let pageToken = '';
      if (platform === 'instagram') {
        pageToken = config?.instagram_access_token || process.env.INSTAGRAM_ACCESS_TOKEN;
      } else {
        pageToken = config?.messenger_page_access_token || process.env.MESSENGER_PAGE_ACCESS_TOKEN;
      }
      if (!pageToken) {
        console.warn(`WARNING: Page access token for ${platform} missing for project ${projectId}. Cannot send message.`);
        return;
      }
        
      const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${pageToken}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text }
        })
      });
      const data = await response.json();
      console.log(`${platform} send response:`, data);
    }
  } catch (error) {
    console.error(`Error sending message to multi-channel platform ${platform}:`, error.message);
  }
}

/**
 * Trả về tin nhắn xác thực OTP đa ngôn ngữ cho multi-channel.
 * Hỗ trợ: vi, en, ru, zh — mặc định en nếu ngôn ngữ khác.
 */
/**
 * Lấy tên thật của người dùng Messenger qua Graph API.
 * Trả về { name, avatarUrl } hoặc null nếu thất bại.
 */
async function fetchMessengerUserProfile(psid, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/v20.0/${psid}?fields=name,profile_pic&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      console.warn(`[Profile] PSID=${psid} error:`, data.error.message, '| code:', data.error.code);
      return null;
    }
    console.log(`[Profile] PSID=${psid} → name="${data.name}", hasPic=${!!data.profile_pic}`);
    return {
      name: data.name || null,
      avatarUrl: data.profile_pic || null
    };
  } catch (e) {
    console.warn(`[Profile] PSID=${psid} fetch failed:`, e.message);
    return null;
  }
}

/**
 * Parses disparate Meta payloads into a unified format.
 */
function parseWebhookEvent(body) {
  // 1. WhatsApp Cloud API Payload
  if (body.object === 'whatsapp_business_account') {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    const phoneId = change?.metadata?.phone_number_id;
    if (message) {
      return {
        platform: 'whatsapp',
        senderId: message.from, // Visitor's phone number
        targetId: phoneId || '', // Target business phone number ID
        name: change.contacts?.[0]?.profile?.name || `WhatsApp User (${message.from})`,
        text: message.text?.body || '[Phương tiện/Media]',
        messageId: message.id
      };
    }
  }

  // 2. Facebook Messenger or Instagram Graph API Payload
  if (body.object === 'page' || body.object === 'instagram') {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (messaging && messaging.message) {
      const isInstagram = body.object === 'instagram';
      return {
        platform: isInstagram ? 'instagram' : 'messenger',
        senderId: messaging.sender.id, // PSID (Page-Scoped ID) or IGSID
        targetId: messaging.recipient.id, // Target Page ID receiving message
        name: isInstagram ? `Instagram User` : `Facebook User`,
        text: messaging.message.text || '[Phương tiện/Media]',
        messageId: messaging.message.mid
      };
    }
  }

  return null;
}

/**
 * @openapi
 * /api/multichannel/webhook:
 *   get:
 *     summary: Xac thuc Webhook Meta (Facebook/Instagram/WhatsApp)
 *     description: Meta goi endpoint nay de xac minh webhook. Ho tro verify token qua env META_VERIFY_TOKEN hoac bang channel_configs.
 *     tags:
 *       - Multi-channel Webhook
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         required: true
 *         schema:
 *           type: string
 *           example: subscribe
 *       - in: query
 *         name: hub.verify_token
 *         required: true
 *         schema:
 *           type: string
 *           example: pastie_verify_token_2026
 *       - in: query
 *         name: hub.challenge
 *         required: true
 *         schema:
 *           type: string
 *           example: chal_12345
 *     responses:
 *       200:
 *         description: Xac thuc thanh cong, tra ve hub.challenge
 *       403:
 *         description: Token khong khop
 *       400:
 *         description: Thieu tham so bat buoc
 *   post:
 *     summary: Nhan tin nhan tu Meta (Messenger / Instagram / WhatsApp)
 *     description: Nhan su kien webhook tu Meta. Tu dong phan luong Gemini AI hoac human agent.
 *     tags:
 *       - Multi-channel Webhook
 *     security:
 *       - MetaSignature: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               object:
 *                 type: string
 *                 enum: [whatsapp_business_account, page, instagram]
 *               entry:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Da nhan su kien (luon tra ve 200 de Meta khong retry)
 *       401:
 *         description: Signature khong hop le
 */
// Verification Webhook for Meta (GET)
app.get('/api/multichannel/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const defaultVerifyToken = process.env.META_VERIFY_TOKEN || 'pastie_verify_token_2026';

  if (mode && token) {
    if (mode === 'subscribe') {
      // 1. Check default env verify token first
      if (token === defaultVerifyToken) {
        console.log('WEBHOOK_VERIFIED: Webhook Meta successfully verified via Env Token!');
        return res.status(200).send(challenge);
      }
      
      // 2. Search database channel configurations for matching verification tokens
      try {
        const dbVerifyRes = await db.query('SELECT project_id FROM channel_configs WHERE meta_verify_token = $1 LIMIT 1', [token]);
        if (dbVerifyRes.rows.length > 0) {
          console.log(`WEBHOOK_VERIFIED: Webhook Meta successfully verified via DB Token for project ${dbVerifyRes.rows[0].project_id}!`);
          return res.status(200).send(challenge);
        }
      } catch (err) {
        console.error('Error during DB verify token verification:', err.message);
      }

      console.warn('WEBHOOK_VERIFICATION_FAILED: Tokens mismatch.');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// Middleware to verify Meta Webhook signature (security check)
function verifyMetaSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;

  // If App Secret is not configured, we skip signature verification (dev fallback)
  if (!appSecret) {
    console.warn('WARNING: META_APP_SECRET is not configured in .env. Skipping webhook signature verification.');
    return next();
  }

  if (!signature) {
    console.error('Signature verification failed: Missing x-hub-signature-256 header.');
    return res.status(401).send('Missing signature');
  }

  const parts = signature.split('=');
  const signatureHash = parts[1];

  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody || '')
    .digest('hex');

  if (signatureHash !== expectedHash) {
    console.error('Signature verification failed: Hashes mismatch.');
    return res.status(401).send('Invalid signature');
  }

  next();
}

// Tách mã ref project từ tin nhắn đầu tiên của WhatsApp (link wa.me có gắn "#ref:<project>").
function parseProjectRef(text) {
  const m = /#ref:([a-z0-9_-]+)/i.exec(text || '');
  return m ? m[1].toLowerCase() : null;
}

// In-memory webhook log (last 20 calls) — view at GET /api/debug/webhook-log
const _webhookLog = [];
app.get('/api/debug/webhook-log', (req, res) => res.json(_webhookLog));

// Incoming message handling (POST)
app.post('/api/multichannel/webhook', verifyMetaSignature, async (req, res) => {
  // Always respond 200 OK immediately to Meta to acknowledge receipt and prevent retries
  res.sendStatus(200);

  const entry = { time: new Date().toISOString(), body: req.body };
  _webhookLog.unshift(entry);
  if (_webhookLog.length > 20) _webhookLog.pop();

  const event = parseWebhookEvent(req.body);
  if (!event) return;

  const { platform, senderId, targetId, name, text } = event;
  console.log(`Webhook received message from ${platform} (senderId: ${senderId}, targetId: ${targetId}): ${text}`);
  
  try {
    // 1. Resolve project_id based on targetId dynamically
    let projectId = 'pastie-landingpage'; // Default/fallback project
    let resolvedPageToken = null;
    if (targetId) {
      const configLookup = await db.query(
        `SELECT project_id, messenger_page_access_token, instagram_access_token
         FROM channel_configs
         WHERE whatsapp_phone_number_id = $1
            OR messenger_page_id = $1
            OR instagram_page_id = $1
         LIMIT 1`,
        [targetId]
      );
      if (configLookup.rows.length > 0) {
        projectId = configLookup.rows[0].project_id;
        resolvedPageToken = configLookup.rows[0].messenger_page_access_token
          || configLookup.rows[0].instagram_access_token || null;
      }
    }
    console.log(`Mapped targetId ${targetId} → project: ${projectId}, hasToken: ${!!resolvedPageToken}`);

    // WHATSAPP: phân loại nguồn theo project. Giữ project của phiên đang có; phiên mới lấy từ mã
    // "#ref:<project>" trong tin đầu (từ link wa.me của widget). Không rõ nguồn -> gom vào 'unknown'.
    if (platform === 'whatsapp') {
      const existingWa = await db.query(
        `SELECT project_id FROM sessions WHERE platform = 'whatsapp' AND platform_sender_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [senderId]
      );
      if (existingWa.rows[0]) {
        projectId = existingWa.rows[0].project_id;
      } else {
        const ref = parseProjectRef(text);
        if (ref) {
          const chk = await db.query('SELECT id FROM projects WHERE id = $1', [ref]);
          projectId = chk.rows.length ? ref : 'unknown';
        } else {
          projectId = 'unknown';
        }
      }
      console.log(`[WhatsApp] senderId ${senderId} → project: ${projectId}`);
    }

    // 2. Get the most recent session for this user (any status) to check verify state
    const sessionRes = await db.query(
      `SELECT * FROM sessions WHERE platform = $1 AND platform_sender_id = $2 AND project_id = $3 ORDER BY created_at DESC LIMIT 1`,
      [platform, senderId, projectId]
    );

    let session = sessionRes.rows[0];
    let sessionId;
    let sessionLang = session?.detected_language || null;

    // ── BRAND NEW USER: tạo session ẩn khỏi dashboard ──────────────
    if (!session) {
      let visitorName = name;
      let visitorAvatar = null;
      if ((platform === 'messenger' || platform === 'instagram') && resolvedPageToken) {
        const profile = await fetchMessengerUserProfile(senderId, resolvedPageToken);
        if (profile?.name) visitorName = profile.name;
        if (profile?.avatarUrl) visitorAvatar = profile.avatarUrl;
      }
      sessionId = `mc-${platform}-${randomUUID()}`;
      await db.query(`
        INSERT INTO sessions (id, project_id, visitor_name, visitor_phone, visitor_avatar, detected_language, status, platform, platform_sender_id, is_verified, show_in_dashboard, mc_verify_state)
        VALUES ($1, $2, $3, $4, $5, null, 'active', $6, $7, true, true, $8)
      `, [sessionId, projectId, visitorName, platform === 'whatsapp' ? senderId : null, visitorAvatar, platform, senderId, null]);
    } else {
      if (session.status !== 'active') {
        await db.query(`UPDATE sessions SET status = 'active', claimed_by_admin_id = NULL, requested_agent = FALSE WHERE id = $1`, [session.id]);
        session.status = 'active';
        session.claimed_by_admin_id = null;
        session.requested_agent = false;
      }
      sessionId = session.id;

      // Cập nhật tên thật nếu vẫn là tên mặc định
      const isDefaultName = !session.visitor_name
        || session.visitor_name === 'Facebook User'
        || session.visitor_name === 'Instagram User';
      if (isDefaultName && (platform === 'messenger' || platform === 'instagram') && resolvedPageToken) {
        const profile = await fetchMessengerUserProfile(senderId, resolvedPageToken);
        if (profile?.name) {
          await db.query(
            `UPDATE sessions SET visitor_name = $1, visitor_avatar = COALESCE(visitor_avatar, $2) WHERE id = $3`,
            [profile.name, profile.avatarUrl, sessionId]
          );
        }
      }
    }

    // Dịch + detect ngôn ngữ trong 1 call duy nhất
    const { translatedText, detectedLang } = await gemini.translateText(text, 'vi');
    const finalLang = detectedLang || sessionLang || 'vi';
    if (!sessionLang) {
      await db.query(`UPDATE sessions SET detected_language = $1 WHERE id = $2`, [finalLang, sessionId]);
    }

    // Helper: lưu tin nhắn system + gửi về platform
    const sendAndSave = async (msgText) => {
      await db.query(`
        INSERT INTO messages (session_id, sender, original_text, translated_text, language)
        VALUES ($1, 'system', $2, $2, $3)
      `, [sessionId, msgText, finalLang]);
      await sendMultichannelMessage(platform, senderId, msgText, projectId);
    };

    // Helper: lưu tin nhắn visitor
    const saveVisitor = async () => {
      await db.query(`
        INSERT INTO messages (session_id, sender, original_text, translated_text, language)
        VALUES ($1, 'visitor', $2, $3, $4)
      `, [sessionId, text, translatedText, finalLang]);
    };

    // WhatsApp cũng phải qua xác minh email/OTP như các kênh khác (không tự bỏ qua nữa)
    const verifyState = session?.mc_verify_state || null;

    // State: null → chưa hỏi email
    if (verifyState === null) {
      await saveVisitor();
      await db.query(`UPDATE sessions SET mc_verify_state = 'awaiting_email' WHERE id = $1`, [sessionId]);
      await sendAndSave(getMsg('ask_email', finalLang));
      return;
    }

    // State: awaiting_email → user vừa gửi email
    if (verifyState === 'awaiting_email') {
      await saveVisitor();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text.trim())) {
        await sendAndSave(getMsg('invalid_email', finalLang));
        return;
      }
      const email = text.trim().toLowerCase();
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await db.query(
        `INSERT INTO otps (email, code, expires_at) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
        [email, code, expiresAt]
      );
      await resend.sendOTPEmail(email, code);
      await db.query(`UPDATE sessions SET mc_verify_state = 'awaiting_otp', visitor_email = $1 WHERE id = $2`, [email, sessionId]);
      await sendAndSave(getMsg('otp_sent', finalLang, email));
      return;
    }

    // State: awaiting_otp → user vừa gửi mã OTP
    if (verifyState === 'awaiting_otp') {
      await saveVisitor();
      const email = session.visitor_email;
      const otpRes = await db.query('SELECT * FROM otps WHERE email = $1', [email]);
      const otp = otpRes.rows[0];
      if (!otp || otp.code !== text.trim() || new Date() > new Date(otp.expires_at)) {
        await sendAndSave(getMsg('invalid_otp', finalLang));
        return;
      }
      await db.query('DELETE FROM otps WHERE email = $1', [email]);
      await db.query(`UPDATE sessions SET mc_verify_state = 'verified', is_verified = true WHERE id = $1`, [sessionId]);
      await sendAndSave(getMsg('verified_ok', finalLang));
      return;
    }

    // State: verified → flow bình thường
    // ── Lưu tin nhắn visitor ─────────────────────────────────────────────
    await saveVisitor();
    await db.query(`UPDATE sessions SET detected_language = $1 WHERE id = $2`, [finalLang, sessionId]);

    // Kênh Meta đã hiển thị trên dashboard: báo ngay khi khách nhắn tin mới.
    if (session?.show_in_dashboard === true) void notifyAgentMessage(session, text);

    // ── DETECT: khách muốn gặp nhân viên ────────────────────────────────
    const AGENT_KEYWORDS = /\b(cskh|gặp cskh|gap cskh|chăm sóc|cham soc|nhân viên|nhan vien|agent|support|tư vấn trực tiếp|tu van truc tiep|gặp người|gap nguoi|người thật|nguoi that|con người|con nguoi|speak to human|talk to human|trực tiếp|kết nối nhân viên|оператор|поддержка|помогите|помощь|сотрудник|консультант|связаться|человек|живой|клиентская|客服|人工|转人工|帮助|联系|工作人员|真人|支持)\b/i;
    const wantsAgent = AGENT_KEYWORDS.test(text);

    if (wantsAgent && !session?.claimed_by_admin_id && !session?.requested_agent) {
      await db.query(`UPDATE sessions SET requested_agent = true, show_in_dashboard = true WHERE id = $1`, [sessionId]);
      console.log(`[MC] Session ${sessionId} transferred to agent.`);
      const transferMsg = {
        vi: 'Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ trong giây lát ⏳',
        en: 'Connecting you with a support agent, please hold on ⏳',
        ru: 'Соединяем вас с оператором поддержки, подождите ⏳',
        zh: '正在为您连接客服人员，请稍候 ⏳',
      }[finalLang] || 'Connecting you with a support agent ⏳';
      await sendAndSave(transferMsg);
      void notifyAgentTransfer(session, text);
      return;
    }

    // ── Nếu nhân viên đã tiếp nhận (claimed) hoặc khách đang chờ gặp nhân viên → bỏ qua AI ───
    if (session?.claimed_by_admin_id || session?.requested_agent) {
      console.log(`[MC] Session ${sessionId} handled by human agent — skipping AI.`);
      return;
    }

    // ── AI CHATBOT ────────────────────────────────────────────────────────
    const kbRes = await db.query(
      `SELECT source_url, cleaned_content FROM knowledge_base WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 5`,
      [projectId]
    );
    const websiteKb = kbRes.rows.find(r => r.source_url !== 'chat-synthesis')?.cleaned_content || 'Bạn là trợ lý hỗ trợ thương hiệu Pastie.';
    const chatKb = kbRes.rows.find(r => r.source_url === 'chat-synthesis')?.cleaned_content || '';
    const knowledgeContext = chatKb
      ? `${websiteKb}\n\n=== TRI THỨC TỪ HỘI THOẠI THỰC TẾ ===\n${chatKb}`.substring(0, 10000)
      : websiteKb.substring(0, 8000);
    const langNameMap = { vi: 'Vietnamese', en: 'English', ru: 'Russian', zh: 'Chinese', ko: 'Korean' };
    const replyLangName = langNameMap[finalLang] || 'the same language as the customer';

    const systemInstruction = `You are a professional and friendly customer support assistant for Pastie brand.
Reply concisely (max 3 sentences) for best display on mobile devices.
IMPORTANT: You MUST reply in ${replyLangName} only.

=== OFFICIAL KNOWLEDGE BASE ===
${knowledgeContext}
=== END OF KNOWLEDGE BASE ===

CRITICAL RULE: If the customer's question cannot be answered using the knowledge base above, you MUST start your reply with exactly "[TRANSFER]" followed by a polite message telling them a human agent will assist them. Example: "[TRANSFER] Câu hỏi này cần nhân viên hỗ trợ trực tiếp, vui lòng chờ trong giây lát ⏳"`;

    const historyRes = await db.query(
      `SELECT sender, original_text FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 10`,
      [sessionId]
    );

    if (isAiRateLimited(sessionId)) return;
    const rawAiReply = await gemini.generateChatbotResponse(systemInstruction, historyRes.rows.slice(0, -1), text.substring(0, AI_TEXT_MAX_LEN), finalLang);

    // Detect [TRANSFER] marker → auto transfer to agent
    if (rawAiReply.startsWith('[TRANSFER]')) {
      const aiReply = rawAiReply.replace('[TRANSFER]', '').trim();
      await db.query(`UPDATE sessions SET show_in_dashboard = true WHERE id = $1`, [sessionId]);
      console.log(`[MC] AI cannot answer → auto-transferred session ${sessionId} to dashboard.`);
      await sendAndSave(aiReply);
      void notifyAgentTransfer(session, text);
      return;
    }

    await sendAndSave(rawAiReply);

  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});


// ── PANCAKE INTEGRATION ────────────────────────────────────────────────────
// Flow: poll page IDs → get conversations → create sessions → sync messages → dashboard

function pancakePlatformFromPageId(pageId) {
  if (!pageId) return process.env.PANCAKE_PAGE_PLATFORM || 'facebook';
  if (pageId.startsWith('fb_')) return 'facebook';
  if (pageId.startsWith('ig_')) return 'instagram';
  if (pageId.startsWith('zalo_')) return 'zalo';
  if (pageId.startsWith('tt_')) return 'tiktok';
  return process.env.PANCAKE_PAGE_PLATFORM || 'facebook';
}

async function sendPancakeMessage(pageId, conversationId, text) {
  const token = process.env.PANCAKE_PAGE_ACCESS_TOKEN;
  if (!token) { console.warn('[Pancake] PANCAKE_PAGE_ACCESS_TOKEN not set'); return; }
  try {
    const url = `https://pages.fm/api/public_api/v1/pages/${encodeURIComponent(pageId)}/conversations/${encodeURIComponent(conversationId)}/messages?page_access_token=${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    if (!data.success) console.warn('[Pancake] Send warning:', data);
    else console.log(`[Pancake] Sent reply → conversation ${conversationId}`);
  } catch (err) {
    console.error('[Pancake] Send error:', err.message);
  }
}

// Sync one conversation: upsert session + all messages into DB
async function syncPancakeConversation(pageId, conv, token) {
  const conversationId = conv.id;
  const platform       = pancakePlatformFromPageId(pageId);
  const projectId      = 'pastie-landingpage';

  // Customer name — try customers array first, fallback to from
  const customer     = conv.customers?.[0] || {};
  const customerName = customer.name || conv.from?.name || 'Pancake User';
  const customerId   = customer.fb_id || customer.id || conv.from?.id || '';

  // 1. Find or create session keyed by conversation_id
  const sessionRes = await db.query(
    `SELECT * FROM sessions WHERE platform = $1 AND platform_sender_id = $2 AND project_id = $3 ORDER BY created_at DESC LIMIT 1`,
    [platform, conversationId, projectId]
  );
  let session = sessionRes.rows[0];
  let sessionId;

  if (!session) {
    sessionId = `pc-${platform}-${randomUUID()}`;
    await db.query(`
      INSERT INTO sessions (id, project_id, visitor_name, detected_language, status, platform, platform_sender_id, is_verified, show_in_dashboard)
      VALUES ($1, $2, $3, null, 'active', $4, $5, true, true)
    `, [sessionId, projectId, customerName, platform, conversationId]);
    session = { id: sessionId, project_id: projectId, show_in_dashboard: true, detected_language: null };
    console.log(`[Pancake] New session created: ${sessionId} for conversation ${conversationId}`);
  } else {
    sessionId = session.id;
    if (session.status !== 'active') {
      await db.query(`UPDATE sessions SET status = 'active' WHERE id = $1`, [sessionId]);
    }
  }

  // 2. Fetch messages for this conversation
  const msgRes = await fetch(
    `https://pages.fm/api/public_api/v1/pages/${encodeURIComponent(pageId)}/conversations/${encodeURIComponent(conversationId)}/messages?page_access_token=${token}`
  );
  if (!msgRes.ok) return;
  const msgData = await msgRes.json();

  // Messages come newest-first; reverse to process chronologically
  const messages = (msgData.messages || []).slice().reverse();
  if (!messages.length) return;

  // Get latest message timestamp already in DB to avoid re-inserting old messages
  const latestRes = await db.query(
    `SELECT MAX(created_at) AS latest FROM messages WHERE session_id = $1`,
    [sessionId]
  );
  const dbLatest = latestRes.rows[0]?.latest ? new Date(latestRes.rows[0].latest) : null;

  for (const msg of messages) {
    if (!msg.message || msg.is_removed) continue;
    if (_pancakeSeenIds.has(msg.id)) continue;

    const msgTime = new Date(msg.inserted_at);

    // Skip messages already stored (timestamp-based dedup)
    if (dbLatest && msgTime <= dbLatest) {
      _pancakeSeenIds.add(msg.id);
      continue;
    }

    _pancakeSeenIds.add(msg.id);

    // Determine direction: customer vs staff/page
    // Customer: from.id matches the known customer ID in the conversation
    const isFromCustomer = customerId
      ? msg.from?.id === customerId
      : (msg.from?.id && msg.from.id !== pageId);
    const sender = isFromCustomer ? 'visitor' : 'system';

    // Save to DB
    await db.query(`
      INSERT INTO messages (session_id, sender, original_text, translated_text, language)
      VALUES ($1, $2, $3, $3, 'vi')
    `, [sessionId, sender, msg.message]);

    if (sender === 'visitor') void notifyAgentMessage(session, msg.message);

    // Log new messages
    _pancakeLog.unshift({ time: new Date().toISOString(), session: sessionId, sender, text: msg.message });
    if (_pancakeLog.length > 100) _pancakeLog.pop();
  }
}

// Polling state
let _pancakeLastPollAt = Date.now() - 30_000; // start 30s in past to catch recent convs
const _pancakeSeenIds  = new Set();
const _pancakeLog      = [];

app.get('/api/debug/pancake-log', (_req, res) => res.json(_pancakeLog));

// Helper: list Pancake pages (pass ?access_token=PERSONAL_TOKEN)
app.get('/api/debug/pancake-pages', async (req, res) => {
  const token = req.query.access_token;
  if (!token) return res.status(400).json({ error: 'Missing ?access_token=YOUR_PERSONAL_TOKEN' });
  try {
    const r    = await fetch(`https://pages.fm/api/v1/pages?access_token=${token}`);
    const data = await r.json();
    const pages = (data.pages || []).map(p => ({ id: p.id, platform: p.platform, name: p.name }));
    res.json({ pages, hint: 'Dùng id làm PANCAKE_PAGE_ID trong .env' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function pollPancakeConversations() {
  const token  = process.env.PANCAKE_PAGE_ACCESS_TOKEN;
  const pageId = process.env.PANCAKE_PAGE_ID;
  if (!token || !pageId) return;

  const now   = Date.now();
  const since = Math.floor((_pancakeLastPollAt - 5000) / 1000); // 5s overlap
  _pancakeLastPollAt = now;

  try {
    // Get conversations updated since last poll
    const convRes = await fetch(
      `https://pages.fm/api/public_api/v2/pages/${encodeURIComponent(pageId)}/conversations?page_access_token=${token}&since=${since}`
    );
    if (!convRes.ok) {
      console.warn('[Pancake Poll] HTTP', convRes.status);
      return;
    }
    const convData      = await convRes.json();
    const conversations = convData.conversations || [];

    // Sync each conversation (create session + import messages)
    for (const conv of conversations) {
      await syncPancakeConversation(pageId, conv, token).catch(err =>
        console.error(`[Pancake] syncConversation ${conv.id} error:`, err.message)
      );
    }
  } catch (err) {
    console.error('[Pancake Poll] Error:', err.message);
  }
}

// Clear seen IDs every hour
setInterval(() => { _pancakeSeenIds.clear(); }, 60 * 60 * 1000);

// Pancake polling disabled in favor of Meta WhatsApp Cloud API
// To re-enable Pancake, uncomment:
// setTimeout(() => { setInterval(pollPancakeConversations, 5000); }, 5000);

// ──────────────────────────────────────────────────────────────────────────────

function cleanHtmlToText(html) {
  let text = html;
  // Remove noise elements entirely
  text = text.replace(/<(script|style|nav|header|footer|aside|noscript|iframe|svg|form|button)[^>]*>([\s\S]*?)<\/\1>/gi, '');
  text = text.replace(/<(script|style|nav|header|footer|aside)[^>]*\/>/gi, '');
  // Block tags → newlines
  text = text.replace(/<\/?(h[1-6]|p|div|section|article|li|tr|br)[^>]*>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode entities
  text = text.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
             .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
  // Remove lines that are just icons, arrows, short nav words (< 4 chars or pure symbols)
  text = text.split('\n').filter(line => {
    const t = line.trim();
    return t.length > 4 && !/^[→←↑↓▶►•·–—\-–\/\\|<>{}[\]()#*@]+$/.test(t);
  }).join('\n');
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

async function extractKBWithAI(roughText, sourceUrl) {
  const prompt = `Bạn là chuyên gia trích xuất nội dung website cho hệ thống chatbot AI.

Dưới đây là nội dung text được lấy từ trang web: ${sourceUrl}

NHIỆM VỤ: Trích xuất CHỈ những thông tin hữu ích để trả lời câu hỏi của khách hàng:
- Mô tả dịch vụ / sản phẩm
- Bảng giá, gói dịch vụ
- Thông tin liên hệ, địa chỉ, email, số điện thoại
- FAQ / câu hỏi thường gặp
- Về chúng tôi, lịch sử, đội ngũ
- Tính năng nổi bật

LOẠI BỎ HOÀN TOÀN: menu điều hướng, tên button, copyright, social links, "Bắt đầu", "Đăng nhập", icon text, cookie notice, loading text.

Viết lại dưới dạng cấu trúc rõ ràng dùng ## cho tiêu đề, - cho bullet points. Ngắn gọn, xúc tích.

NỘI DUNG WEB:
"""
${roughText.substring(0, 10000)}
"""`;

  try {
    const result = await gemini.generateChatbotResponse('Bạn là chuyên gia xử lý nội dung. Chỉ trả về nội dung được yêu cầu, không giải thích.', [], prompt, 'vi');
    return result || roughText.substring(0, 6000);
  } catch (e) {
    console.warn('[KB] AI extraction failed, using rough text:', e.message);
    return roughText.substring(0, 6000);
  }
}

// 4. GET Knowledge Base status & text
app.get('/api/admin/knowledge', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập cơ sở tri thức.' });
  }
  let { projectId = 'pastie-landingpage' } = req.query;
  if (isProjectAdmin(req.admin)) {
    projectId = req.admin.project_id || projectId;
  }
  try {
    const result = await db.query(
      'SELECT source_url, cleaned_content, updated_at FROM knowledge_base WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [projectId]
    );
    if (result.rows.length === 0) {
      return res.json({ message: 'Chưa có cơ sở dữ liệu tri thức nào được cấu hình.', project_id: projectId });
    }
    res.json({ ...result.rows[0], project_id: projectId });
  } catch (error) {
    console.error('Fetch knowledge error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải cơ sở tri thức.' });
  }
});

// Helper: fetch page content using Jina AI Reader (handles JS/SPA sites)
async function fetchWithJina(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
        'X-With-Images-Summary': 'false',
        'X-With-Links-Summary': 'false'
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
    const text = await res.text();
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// 5. POST Knowledge Base sync from URL
app.post('/api/admin/knowledge/sync', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền cập nhật cơ sở tri thức.' });
  }
  let { url, projectId = 'pastie-landingpage' } = req.body;
  if (isProjectAdmin(req.admin)) {
    projectId = req.admin.project_id || projectId;
  }
  if (!url) {
    return res.status(400).json({ error: 'Vui lòng cung cấp tham số URL.' });
  }

  try {
    console.log(`[KB] Syncing from: ${url} for project: ${projectId}`);
    let rawText = '';
    let fetchMethod = 'jina';

    // 1. Try Jina AI Reader first (handles SPA/JS-rendered sites)
    try {
      rawText = await fetchWithJina(url);
      console.log(`[KB] Jina fetch OK: ${rawText.length} chars`);
    } catch (jinaErr) {
      console.warn(`[KB] Jina failed (${jinaErr.message}), falling back to direct fetch`);
      fetchMethod = 'direct';
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PastieBot/1.0)' },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      rawText = cleanHtmlToText(html);
    }

    if (rawText.length < 100) {
      return res.status(400).json({ error: 'Không lấy được nội dung từ trang web. Vui lòng kiểm tra URL hoặc nhập thủ công.' });
    }

    console.log(`[KB] Raw content: ${rawText.length} chars via ${fetchMethod}. Running AI extraction...`);

    // 2. AI extraction — filter to business-relevant content only
    const cleanedContent = await extractKBWithAI(rawText, url);

    console.log(`[KB] AI extracted: ${cleanedContent.length} chars`);

    // 3. Upsert to database
    const existsRes = await db.query('SELECT id FROM knowledge_base WHERE project_id = $1 LIMIT 1', [projectId]);
    if (existsRes.rows.length > 0) {
      await db.query(
        'UPDATE knowledge_base SET source_url = $1, raw_html = $2, cleaned_content = $3, updated_at = CURRENT_TIMESTAMP WHERE project_id = $4',
        [url, rawText.substring(0, 50000), cleanedContent, projectId]
      );
    } else {
      await db.query(
        'INSERT INTO knowledge_base (project_id, source_url, raw_html, cleaned_content) VALUES ($1, $2, $3, $4)',
        [projectId, url, rawText.substring(0, 50000), cleanedContent]
      );
    }

    res.json({
      success: true,
      message: `Đồng bộ thành công qua ${fetchMethod === 'jina' ? 'Jina AI Reader' : 'direct fetch'}!`,
      characterCount: cleanedContent.length,
      rawLength: rawText.length,
      projectId
    });
  } catch (error) {
    console.error('[KB] Sync error:', error);
    res.status(500).json({ error: 'Lỗi khi đồng bộ: ' + error.message });
  }
});

// 5.1 POST Sync Knowledge Base directly from DealPhuQuoc Database
app.post('/api/admin/knowledge/sync-deal-db', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền quản lý cơ sở tri thức.' });
  }
  let { projectId = 'dealphuquoc' } = req.body;
  if (isProjectAdmin(req.admin)) {
    projectId = req.admin.project_id || projectId;
  }
  try {
    const result = await dealSync.syncDealDatabaseToKnowledgeBase(db, projectId);
    res.json({
      success: true,
      message: `Đã đồng bộ thành công ${result.stats.vendors} cơ sở kinh doanh, ${result.stats.products} loại phòng & tour, ${result.stats.vouchers} voucher từ Database!`,
      stats: result.stats,
      sample: result.sample
    });
  } catch (error) {
    console.error('Deal DB Sync Error:', error);
    res.status(500).json({ error: 'Lỗi khi đồng bộ database: ' + error.message });
  }
});

// 6. POST Knowledge Base manual update
app.post('/api/admin/knowledge/manual', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền cập nhật cơ sở tri thức.' });
  }
  let { cleanedContent, projectId = 'pastie-landingpage' } = req.body;
  if (isProjectAdmin(req.admin)) {
    projectId = req.admin.project_id || projectId;
  }
  if (!cleanedContent || cleanedContent.trim().length === 0) {
    return res.status(400).json({ error: 'Vui lòng điền nội dung tri thức.' });
  }

  try {
    const existsRes = await db.query('SELECT id FROM knowledge_base WHERE project_id = $1 LIMIT 1', [projectId]);
    
    if (existsRes.rows.length > 0) {
      await db.query(
        "UPDATE knowledge_base SET source_url = 'manual', raw_html = '', cleaned_content = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2",
        [cleanedContent, projectId]
      );
    } else {
      await db.query(
        "INSERT INTO knowledge_base (project_id, source_url, raw_html, cleaned_content) VALUES ($1, 'manual', '', $2)",
        [projectId, cleanedContent]
      );
    }

    res.json({ success: true, message: 'Đã lưu tri thức tư vấn thủ công thành công!', projectId });
  } catch (error) {
    console.error('Manual knowledge save error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi lưu tri thức thủ công.' });
  }
});


// --- DYNAMIC MULTI-TENANT CHANNEL CONFIG API ENDPOINTS ---

// 1. GET Channel configurations for a project (WhatsApp Cloud API)
app.get('/api/admin/channels', checkAdminAuth, async (req, res) => {
  const projectId = req.query.projectId || req.admin.project_id || 'pastie-landingpage';
  try {
    const configRes = await db.query('SELECT * FROM channel_configs WHERE project_id = $1', [projectId]);
    const row = configRes.rows[0];
    const origin = process.env.DASHBOARD_PUBLIC_URL
      ? new URL(process.env.DASHBOARD_PUBLIC_URL).origin
      : `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${origin}/api/multichannel/webhook`;

    res.json({
      success: true,
      config: {
        whatsapp_phone_number_id: row?.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        whatsapp_waba_id: row?.whatsapp_waba_id || process.env.WHATSAPP_WABA_ID || '',
        whatsapp_business_phone: row?.whatsapp_business_phone || process.env.WHATSAPP_BUSINESS_PHONE || '',
        whatsapp_access_token: row?.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || '',
        meta_verify_token: row?.meta_verify_token || process.env.META_VERIFY_TOKEN || 'pastie_verify_token_2026',
        webhook_url: webhookUrl,
        direct_link: (row?.whatsapp_business_phone || process.env.WHATSAPP_BUSINESS_PHONE) ? `https://wa.me/${(row?.whatsapp_business_phone || process.env.WHATSAPP_BUSINESS_PHONE).replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Xin chào! Tôi cần tư vấn thông tin dịch vụ.')}` : ''
      }
    });
  } catch (error) {
    console.error('Fetch channel configurations error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải cấu hình kênh.' });
  }
});

// Public endpoint for Website Visitors & Chat Widget to get social channels (WhatsApp, etc.)
app.get('/api/chats/channels', async (req, res) => {
  const projectId = req.query.projectId || 'pastie-landingpage';
  try {
    const configRes = await db.query('SELECT * FROM channel_configs WHERE project_id = $1', [projectId]);
    const row = configRes.rows[0];
    const rawPhone = row?.whatsapp_business_phone || process.env.WHATSAPP_BUSINESS_PHONE || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    let whatsappData = null;
    if (cleanPhone) {
      whatsappData = {
        phone: rawPhone,
        cleanPhone: cleanPhone,
        directLink: `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Xin chào! Tôi cần tư vấn thông tin dịch vụ.')}`
      };
    }

    res.json({
      success: true,
      projectId,
      whatsapp: whatsappData
    });
  } catch (error) {
    console.error('Fetch public channels error:', error);
    res.status(500).json({ error: 'Lỗi khi tải thông tin kênh kết nối.' });
  }
});

// POST Save WhatsApp channel config
app.post('/api/admin/channels', checkAdminAuth, async (req, res) => {
  const {
    projectId = req.admin.project_id || 'pastie-landingpage',
    whatsappPhoneNumberId = '',
    whatsappWabaId = '',
    whatsappBusinessPhone = '',
    whatsappAccessToken = '',
    metaVerifyToken = ''
  } = req.body;

  const phoneId = String(whatsappPhoneNumberId || '').trim();
  const wabaId = String(whatsappWabaId || '').trim();
  const phone = String(whatsappBusinessPhone || '').trim();
  const token = String(whatsappAccessToken || '').trim();
  const verifyToken = String(metaVerifyToken || '').trim() || 'pastie_verify_token_2026';

  try {
    const existsRes = await db.query('SELECT project_id FROM channel_configs WHERE project_id = $1 LIMIT 1', [projectId]);
    if (existsRes.rows.length > 0) {
      await db.query(`
        UPDATE channel_configs
        SET platform = 'whatsapp',
            whatsapp_phone_number_id = $1,
            whatsapp_waba_id = $2,
            whatsapp_business_phone = $3,
            whatsapp_access_token = $4,
            meta_verify_token = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = $6
      `, [phoneId, wabaId, phone, token, verifyToken, projectId]);
    } else {
      await db.query(`
        INSERT INTO channel_configs (project_id, platform, whatsapp_phone_number_id, whatsapp_waba_id, whatsapp_business_phone, whatsapp_access_token, meta_verify_token)
        VALUES ($1, 'whatsapp', $2, $3, $4, $5, $6)
      `, [projectId, phoneId, wabaId, phone, token, verifyToken]);
    }

    // Update runtime env immediately
    if (phoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = phoneId;
    if (wabaId) process.env.WHATSAPP_WABA_ID = wabaId;
    if (phone) process.env.WHATSAPP_BUSINESS_PHONE = phone;
    if (token) process.env.WHATSAPP_ACCESS_TOKEN = token;
    if (verifyToken) process.env.META_VERIFY_TOKEN = verifyToken;

    res.json({ success: true, message: 'Đã lưu cấu hình WhatsApp thành công.' });
  } catch (error) {
    console.error('Save channel configurations error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống: ' + error.message });
  }
});


// ── Debug: test AI endpoint ───────────────────────────────────────────────────
app.get('/api/test-ai', async (req, res) => {
  const msg = req.query.msg || 'xin chào';
  const start = Date.now();
  try {
    const reply = await gemini.generateChatbotResponse(
      'Bạn là trợ lý AI của Pastie. Hãy trả lời ngắn gọn bằng tiếng Việt.',
      [], msg, 'vi'
    );
    res.json({ ok: true, reply, ms: Date.now() - start, groq_key: process.env.GROQ_API_KEY ? 'SET' : 'MISSING' });
  } catch (e) {
    res.json({ ok: false, error: e.message, ms: Date.now() - start });
  }
});

// ── Debug: test Gemini directly ───────────────────────────────────────────────
app.get('/api/test-gemini', async (req, res) => {
  const msg = req.query.msg || 'say hello in one sentence';
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ ok: false, error: 'GEMINI_API_KEY not set', key_prefix: null });
  const start = Date.now();
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const result = await model.generateContent(msg);
    const text = result.response.text().trim();
    res.json({ ok: true, reply: text, ms: Date.now() - start, key_prefix: apiKey.substring(0, 6), model: 'gemini-3.6-flash' });
  } catch (e) {
    res.json({ ok: false, error: e.message, ms: Date.now() - start, key_prefix: apiKey.substring(0, 6) });
  }
});

// ── Debug: test Resend email sending ─────────────────────────────────────────
app.get('/api/test-resend', async (req, res) => {
  const to = req.query.to || process.env.SENDER_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  if (!apiKey) return res.json({ ok: false, error: 'RESEND_API_KEY not set', sender, to });
  const result = await resend.sendOTPEmail(to, '123456');
  res.json({ ok: result.ok, reason: result.reason, key_prefix: apiKey.substring(0, 6), sender, to });
});

// ── Debug: check session state ────────────────────────────────────────────────
app.get('/api/debug/session/:sessionId', async (req, res) => {
  try {
    const s = await db.query('SELECT id, project_id, status, requested_agent, show_in_dashboard, detected_language, platform FROM sessions WHERE id = $1', [req.params.sessionId]);
    if (s.rows.length === 0) return res.json({ error: 'session not found' });
    const msgs = await db.query("SELECT sender, LEFT(original_text,50) as text FROM messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 5", [req.params.sessionId]);
    res.json({ session: s.rows[0], last_messages: msgs.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ── Transfer Keywords API ─────────────────────────────────────────────────────
app.get('/api/admin/keywords', checkAdminAuth, async (req, res) => {
  const { projectId = 'pastie-landingpage' } = req.query;
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS transfer_keywords (
      project_id TEXT PRIMARY KEY,
      keywords JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const r = await db.query('SELECT keywords FROM transfer_keywords WHERE project_id = $1', [projectId]);
    res.json({ keywords: r.rows[0]?.keywords || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/keywords', checkAdminAuth, async (req, res) => {
  const { keywords = [], projectId = 'pastie-landingpage' } = req.body;
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS transfer_keywords (
      project_id TEXT PRIMARY KEY,
      keywords JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.query(
      `INSERT INTO transfer_keywords (project_id, keywords) VALUES ($1, $2)
       ON CONFLICT (project_id) DO UPDATE SET keywords = $2, updated_at = NOW()`,
      [projectId, JSON.stringify(keywords)]
    );
    res.json({ success: true, count: keywords.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Debug: check KB content ───────────────────────────────────────────────────
app.get('/api/debug/kb', async (req, res) => {
  try {
    const projectId = req.query.project || 'pastie-landingpage';
    const kb = await db.query(
      'SELECT project_id, source_url, updated_at, LENGTH(cleaned_content) as content_len, LEFT(cleaned_content, 500) as preview FROM knowledge_base WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [projectId]
    );
    if (kb.rows.length === 0) return res.json({ found: false, project_id: projectId });
    res.json({ found: true, ...kb.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Chat History → Knowledge Base Synthesis (runs every 3 days) ───────────────
async function synthesizeChatKnowledge(projectId) {
  try {
    console.log(`[KB Synthesis] Starting for project: ${projectId}`);

    // Fetch sessions from the last 3 days
    const sessionsRes = await db.query(
      `SELECT id FROM sessions WHERE project_id = $1 AND status = 'closed'
       AND updated_at >= NOW() - INTERVAL '3 days'`,
      [projectId]
    );
    if (sessionsRes.rows.length === 0) {
      console.log(`[KB Synthesis] No closed sessions in last 3 days for ${projectId}.`);
      return;
    }

    const sessionIds = sessionsRes.rows.map(r => r.id);

    // Fetch all messages for these sessions
    const msgsRes = await db.query(
      `SELECT s.id as session_id, m.sender, m.original_text
       FROM messages m
       JOIN sessions s ON m.session_id = s.id
       WHERE m.session_id = ANY($1)
         AND m.sender IN ('visitor', 'agent', 'ai')
         AND LENGTH(COALESCE(m.original_text, '')) > 5
       ORDER BY s.id, m.created_at ASC`,
      [sessionIds]
    );

    if (msgsRes.rows.length === 0) {
      console.log(`[KB Synthesis] No messages found for synthesis.`);
      return;
    }

    // Group messages into conversations
    const conversations = {};
    for (const msg of msgsRes.rows) {
      if (!conversations[msg.session_id]) conversations[msg.session_id] = [];
      const role = msg.sender === 'visitor' ? 'Khách' : 'Hỗ trợ';
      conversations[msg.session_id].push(`${role}: ${msg.original_text}`);
    }

    const rawConversations = Object.values(conversations)
      .map((lines, i) => `--- Hội thoại ${i + 1} ---\n${lines.join('\n')}`)
      .join('\n\n');

    const prompt = `Bạn là chuyên gia tổng hợp tri thức từ lịch sử chat thực tế của khách hàng.

NHIỆM VỤ: Đọc các cuộc hội thoại bên dưới và trích xuất ra các cặp Q&A hữu ích cùng thông tin hay được hỏi.
Định dạng đầu ra: danh sách các mục "Câu hỏi: ... | Trả lời: ..." + phần "Các chủ đề hay gặp".
Bỏ qua những câu tầm thường, ngắn, hoặc không liên quan đến dịch vụ.

LỊCH SỬ CHAT:
${rawConversations.substring(0, 12000)}

Tổng hợp:`;

    const synthesized = await gemini.generateChatbotResponse(
      'Bạn là chuyên gia tổng hợp nội dung, chỉ trả về nội dung được yêu cầu.',
      [], prompt, 'vi'
    );

    if (!synthesized || synthesized.length < 50) {
      console.log(`[KB Synthesis] Synthesized content too short, skipping save.`);
      return;
    }

    // Save as a separate KB row (source_url = 'chat-synthesis')
    const existsRes = await db.query(
      `SELECT id FROM knowledge_base WHERE project_id = $1 AND source_url = 'chat-synthesis' LIMIT 1`,
      [projectId]
    );
    if (existsRes.rows.length > 0) {
      await db.query(
        `UPDATE knowledge_base SET cleaned_content = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2 AND source_url = 'chat-synthesis'`,
        [synthesized, projectId]
      );
    } else {
      await db.query(
        `INSERT INTO knowledge_base (project_id, source_url, raw_html, cleaned_content) VALUES ($1, 'chat-synthesis', '', $2)`,
        [projectId, synthesized]
      );
    }

    console.log(`[KB Synthesis] Done for ${projectId}. Saved ${synthesized.length} chars.`);
  } catch (err) {
    console.error(`[KB Synthesis] Error for ${projectId}:`, err.message);
  }
}

async function runSynthesisForAllProjects() {
  try {
    const projects = await db.query(`SELECT DISTINCT project_id FROM sessions WHERE status = 'closed'`);
    for (const row of projects.rows) {
      await synthesizeChatKnowledge(row.project_id);
    }
  } catch (err) {
    console.error('[KB Synthesis] Failed to fetch projects:', err.message);
  }
}

// Run every 3 days at 02:00 AM
cron.schedule('0 2 */3 * *', () => {
  console.log('[KB Synthesis] Cron triggered — synthesizing chat history into KB...');
  runSynthesisForAllProjects();
});

// Manual trigger endpoint for admin
app.post('/api/admin/kb/synthesize', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin) && !isProjectAdmin(req.admin)) {
    return res.status(403).json({ error: 'Bạn không có quyền tổng hợp tri thức.' });
  }
  let { projectId } = req.body;
  if (isProjectAdmin(req.admin)) {
    projectId = req.admin.project_id;
  }
  if (projectId) {
    synthesizeChatKnowledge(projectId).catch(console.error);
    return res.json({ success: true, message: `Bắt đầu tổng hợp tri thức cho dự án ${projectId}` });
  }
  if (isSuperAdmin(req.admin)) {
    runSynthesisForAllProjects().catch(console.error);
    return res.json({ success: true, message: 'Bắt đầu tổng hợp tri thức cho tất cả dự án' });
  }
  return res.status(400).json({ error: 'Thiếu projectId' });
});

// ── Read receipts table (created synchronously before server starts) ──────────
async function ensureReadReceiptsTable() {
  // Migration: drop table if admin_id column has wrong type (uuid or text) — safe since it's pure tracking data
  try {
    await db.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'session_read_receipts'
            AND column_name = 'admin_id'
            AND data_type <> 'integer'
        ) THEN
          DROP TABLE IF EXISTS session_read_receipts;
        END IF;
      END $$;
    `);
  } catch (e) {
    console.error('[ReadReceipts] Migration check error:', e.message);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS session_read_receipts (
      session_id TEXT NOT NULL,
      admin_id INT NOT NULL,
      seen_message_count INTEGER NOT NULL DEFAULT 0,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (session_id, admin_id)
    )
  `);
  console.log('[ReadReceipts] Table ready.');
}

// Mark session as read for current admin
app.post('/api/admin/chats/:sessionId/read', checkAdminAuth, requireWorkingHours, async (req, res) => {
  const { sessionId } = req.params;
  const adminId = req.admin.id;
  try {
    const countRes = await db.query('SELECT COUNT(*) FROM messages WHERE session_id = $1', [sessionId]);
    const count = parseInt(countRes.rows[0].count) || 0;
    await db.query(
      `INSERT INTO session_read_receipts (session_id, admin_id, seen_message_count, last_seen_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (session_id, admin_id) DO UPDATE
       SET seen_message_count = $3, last_seen_at = NOW()`,
      [sessionId, adminId, count]
    );
    res.json({ success: true, seen_message_count: count });
  } catch (e) {
    console.error('[Read receipt] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// Phân cấp Agent - Sale - Nhóm - QR  (chỉ áp dụng project qr_concierge)
//
// Quy tắc chung cho cả khối này:
//  - Mọi kiểm tra quyền đều ở backend. Frontend ẩn nút chỉ là lớp trang trí.
//  - Agent chỉ thao tác được trên dữ liệu thuộc phạm vi của chính mình:
//    Sale do mình tạo (admins.managed_by_admin_id) và nhóm do mình sở hữu
//    (agent_groups.agent_id). Superadmin đi qua mọi ràng buộc này.
// ============================================================================

// Chuẩn hóa một khung giờ người dùng gửi lên. Trả về null nếu không hợp lệ.
function normalizeHourWindow(entry) {
  if (!entry) return null;
  const clean = (value) => {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
  };
  const start = clean(entry.start_time ?? entry.start);
  const end = clean(entry.end_time ?? entry.end);
  if (!start || !end) return null;
  return { start, end, timezone: String(entry.timezone || DEFAULT_WORK_TIMEZONE).slice(0, 60) };
}

// Ghi đè toàn bộ khung giờ của một tài khoản trong một transaction: xóa hết rồi
// chèn lại. Đơn giản hơn điều chỉnh từng dòng và không bao giờ để lại dòng mồ côi.
async function replaceAccessHours(adminId, windows) {
  const rows = (Array.isArray(windows) ? windows : []).map(normalizeHourWindow).filter(Boolean);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM account_access_hours WHERE admin_id = $1', [adminId]);
    for (const row of rows) {
      await client.query(
        `INSERT INTO account_access_hours (admin_id, start_time, end_time, timezone) VALUES ($1, $2, $3, $4)`,
        [adminId, row.start, row.end, row.timezone]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return rows;
}

async function replaceGroupSaleHours(groupId, saleId, windows) {
  const rows = (Array.isArray(windows) ? windows : []).map(normalizeHourWindow).filter(Boolean);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM group_sale_hours WHERE group_id = $1 AND sale_id = $2', [groupId, saleId]);
    for (const row of rows) {
      await client.query(
        `INSERT INTO group_sale_hours (group_id, sale_id, start_time, end_time, timezone) VALUES ($1, $2, $3, $4, $5)`,
        [groupId, saleId, row.start, row.end, row.timezone]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return rows;
}

// CHỈ Agent quản lý của một project QR Concierge.
//
// Superadmin cố tình KHÔNG được đi qua đây. Vai trò của superadmin dừng ở việc
// tạo Agent và đặt trần số Sale; Sale, nhóm và QR là việc nội bộ của từng Agent,
// Agent tự sắp xếp. Nhờ vậy phạm vi dữ liệu luôn rõ ràng: mỗi nhóm, mỗi Sale,
// mỗi QR đều truy được về đúng một Agent chịu trách nhiệm.
//
// Kiểm tra loại project là bắt buộc: DealPhuQuoc cũng cấp role 'agent' cho nhân
// viên của họ, nên nếu chỉ xét role thì một nhân viên DealPhuQuoc gọi thẳng
// /api/agent/sales là tạo được tài khoản trong dự án của mình. Frontend đã ẩn
// nút, nhưng ẩn nút không phải là phân quyền.
async function requireAgentManager(req, res) {
  if (isAgentManager(req.admin) && req.admin.project_id
      && (await getQrProjectIds()).has(req.admin.project_id)) return true;
  res.status(403).json({
    error: isSuperAdmin(req.admin)
      ? 'Sale, nhóm và QR do chính Agent tự thiết lập. Admin tổng chỉ tạo Agent và đặt giới hạn số Sale.'
      : 'Chỉ Agent quản lý của dự án QR mới được thực hiện thao tác này.',
  });
  return false;
}

// Nhóm có thuộc phạm vi của Agent đang gọi không.
async function loadOwnedGroup(req, groupId) {
  const result = await db.query('SELECT * FROM agent_groups WHERE id = $1', [groupId]);
  const group = result.rows[0];
  if (!group) return null;
  return group.agent_id === req.admin.id ? group : null;
}

// Sale có thuộc phạm vi của Agent đang gọi không.
async function loadOwnedSale(req, saleId) {
  const result = await db.query(`SELECT * FROM admins WHERE id = $1 AND role = 'sale'`, [saleId]);
  const sale = result.rows[0];
  if (!sale) return null;
  return sale.managed_by_admin_id === req.admin.id ? sale : null;
}

// --- Superadmin: quản lý Agent ----------------------------------------------

app.get('/api/superadmin/agents', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin)) return res.status(403).json({ error: 'Chỉ Admin tổng được xem danh sách Agent.' });
  try {
    const result = await db.query(
      `SELECT a.id, a.username, a.full_name, a.project_id, a.is_active, a.created_at,
              a.sale_limit,
              (SELECT COUNT(*) FROM admins s WHERE s.managed_by_admin_id = a.id AND s.role = 'sale') AS sale_count,
              (SELECT COUNT(*) FROM agent_groups g WHERE g.agent_id = a.id) AS group_count
         FROM admins a
        WHERE a.role = 'agent'
        ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({ error: 'Không tải được danh sách Agent.' });
  }
});

app.post('/api/superadmin/agents', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin)) return res.status(403).json({ error: 'Chỉ Admin tổng được tạo Agent.' });
  const { email, fullName, projectId, saleLimit } = req.body || {};
  const username = String(email || '').trim().toLowerCase();
  if (!username || !fullName || !projectId) return res.status(400).json({ error: 'Cần email, tên Agent và project.' });

  try {
    const project = await db.query(`SELECT id FROM projects WHERE id = $1 AND project_type = 'qr_concierge'`, [projectId]);
    if (!project.rows[0]) return res.status(400).json({ error: 'Project này không phải QR Concierge.' });
    const exists = await db.query('SELECT id FROM admins WHERE LOWER(username) = $1', [username]);
    if (exists.rows[0]) return res.status(400).json({ error: 'Email này đã tồn tại trong hệ thống.' });

    // Schema cũ bắt buộc password_hash; Agent đăng nhập bằng OTP/Google nên mật
    // khẩu chỉ là chuỗi ngẫu nhiên không bao giờ được dùng.
    // Agent KHÔNG có khung giờ đăng nhập — chỉ Sale mới bị ràng buộc ca.
    // Để trống / không gửi = không giới hạn (NULL). Số 0 = KHÔNG được tạo Sale nào.
    // Hai ý nghĩa này phải khác nhau, và phải giống với form nhân viên cũ.
    const limit = saleLimit === undefined || saleLimit === null || saleLimit === ''
      ? null
      : Math.max(0, Number.parseInt(saleLimit, 10));
    const passwordHash = await hashPassword(randomUUID());
    const created = await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, managed_by_admin_id, sale_limit, is_active)
       VALUES ($1, $2, $3, 'agent', $4, $5, $6, TRUE)
       RETURNING id, username, full_name, role, project_id, sale_limit, is_active, created_at`,
      [username, passwordHash, String(fullName).trim().slice(0, 255), projectId, req.admin.id,
       Number.isFinite(limit) ? limit : null]
    );

    // Bàn giao dữ liệu QR cũ chưa có chủ (Sale và QR còn lơ lửng sau migration)
    // cho Agent đầu tiên của project. Bước 6-7 ở mục 19 của kế hoạch.
    const adoptedGroupId = await db.adoptOrphanQrDataForProject(projectId, created.rows[0].id)
      .catch((error) => { console.error('Adopt orphan QR data failed:', error.message); return null; });

    res.status(201).json({ success: true, agent: created.rows[0], adoptedGroupId });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Không tạo được Agent.' });
  }
});

app.put('/api/superadmin/agents/:agentId', checkAdminAuth, async (req, res) => {
  if (!isSuperAdmin(req.admin)) return res.status(403).json({ error: 'Chỉ Admin tổng được sửa Agent.' });
  const agentId = Number(req.params.agentId);
  const { fullName, projectId, isActive, saleLimit } = req.body || {};
  try {
    const agent = await db.query(`SELECT id FROM admins WHERE id = $1 AND role = 'agent'`, [agentId]);
    if (!agent.rows[0]) return res.status(404).json({ error: 'Không tìm thấy Agent.' });

    // saleLimit = 0 nghĩa là bỏ giới hạn (lưu NULL), khác với "không gửi trường
    // này lên" — trường hợp sau giữ nguyên giá trị cũ.
    const nextLimit = saleLimit === undefined ? undefined
      : (saleLimit === null || saleLimit === '' ? null
        : (Number.isFinite(Number.parseInt(saleLimit, 10)) ? Math.max(0, Number.parseInt(saleLimit, 10)) : null));

    const updated = await db.query(
      `UPDATE admins
          SET full_name = COALESCE($2, full_name),
              project_id = COALESCE($3, project_id),
              is_active = COALESCE($4, is_active),
              sale_limit = CASE WHEN $6::boolean THEN $5::int ELSE sale_limit END
        WHERE id = $1
        RETURNING id, username, full_name, role, project_id, sale_limit, is_active`,
      [agentId, fullName ? String(fullName).trim().slice(0, 255) : null, projectId || null,
       typeof isActive === 'boolean' ? isActive : null, nextLimit ?? null, nextLimit !== undefined]
    );
    // Khóa tài khoản thì đóng luôn mọi phiên đang mở, không đợi token hết hạn.
    if (isActive === false) await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [agentId]);
    res.json({ success: true, agent: updated.rows[0] });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Không cập nhật được Agent.' });
  }
});

// --- Agent: quản lý Sale -----------------------------------------------------

app.get('/api/agent/sales', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  try {
    const result = await db.query(
      `SELECT a.id, a.username, a.full_name, a.is_active, a.project_id, a.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'start_time', h.start_time, 'end_time', h.end_time, 'timezone', h.timezone
              )) FILTER (WHERE h.id IS NOT NULL), '[]') AS access_hours,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'group_id', g.id, 'name', g.name
              )) FILTER (WHERE g.id IS NOT NULL), '[]') AS groups
         FROM admins a
         LEFT JOIN account_access_hours h ON h.admin_id = a.id AND h.is_active = TRUE
         LEFT JOIN agent_group_sales gs ON gs.sale_id = a.id AND gs.is_active = TRUE
         LEFT JOIN agent_groups g ON g.id = gs.group_id
        WHERE a.role = 'sale' AND a.managed_by_admin_id = $1
        GROUP BY a.id
        ORDER BY a.full_name`,
      [req.admin.id]
    );
    // Báo thêm Sale nào đang trong giờ, để Agent nhìn phát biết ai trực.
    res.json(result.rows.map((row) => ({ ...row, on_shift: isWithinAnyWindow(row.access_hours) })));
  } catch (error) {
    console.error('List sales error:', error);
    res.status(500).json({ error: 'Không tải được danh sách Sale.' });
  }
});

app.post('/api/agent/sales', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const { email, fullName, accessHours, groupIds } = req.body || {};
  const username = String(email || '').trim().toLowerCase();
  if (!username || !fullName) return res.status(400).json({ error: 'Cần email và tên hiển thị của Sale.' });

  const projectId = req.admin.project_id;
  if (!projectId) return res.status(400).json({ error: 'Sale phải thuộc một project cụ thể.' });

  try {
    const exists = await db.query('SELECT id FROM admins WHERE LOWER(username) = $1', [username]);
    if (exists.rows[0]) return res.status(400).json({ error: 'Email này đã tồn tại trong hệ thống.' });

    // Trần số Sale do superadmin đặt. Đếm cả Sale đang bị khóa: khóa là biện pháp
    // tạm thời, tài khoản vẫn chiếm một suất — nếu không thì Agent chỉ cần khóa
    // rồi tạo mới là vượt trần thoải mái.
    const me = await db.query('SELECT sale_limit FROM admins WHERE id = $1', [req.admin.id]);
    const saleLimit = me.rows[0]?.sale_limit;
    if (Number.isFinite(saleLimit) && saleLimit !== null) {
      const used = await db.query(
        `SELECT COUNT(*)::int AS total FROM admins WHERE managed_by_admin_id = $1 AND role = 'sale'`,
        [req.admin.id]
      );
      if (used.rows[0].total >= saleLimit) {
        return res.status(400).json({
          error: saleLimit === 0
            ? 'Tài khoản của bạn chưa được cấp quyền tạo Sale. Liên hệ quản trị viên để được cấp.'
            : `Bạn đã dùng hết ${saleLimit} tài khoản Sale được cấp. Liên hệ quản trị viên để tăng giới hạn.`,
        });
      }
    }

    // Kiểm tra xung đột khung giờ làm việc với các Sale khác trong cùng nhóm
    const conflict = await findConflictingSaleShift(null, accessHours, groupIds);
    if (conflict) {
      return res.status(400).json({
        error: `Khung giờ ${conflict.myWindow} bị trùng với ca của Sale "${conflict.saleName}" (${conflict.conflictingWindow}) trong nhóm "${conflict.groupName}". Mỗi khung giờ chỉ được phân công cho 1 Sale trực để tránh tranh chấp tin nhắn.`
      });
    }

    const passwordHash = await hashPassword(randomUUID());
    const created = await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, managed_by_admin_id, created_by_admin_id, is_active)
       VALUES ($1, $2, $3, 'sale', $4, $5, $5, TRUE)
       RETURNING id, username, full_name, role, project_id, is_active, created_at`,
      [username, passwordHash, String(fullName).trim().slice(0, 255), projectId, req.admin.id]
    );
    const saleId = created.rows[0].id;
    const hours = await replaceAccessHours(saleId, accessHours);

    // Chỉ nhận những nhóm thuộc phạm vi của chính Agent này.
    for (const groupId of Array.isArray(groupIds) ? groupIds : []) {
      const group = await loadOwnedGroup(req, Number(groupId));
      if (!group) continue;
      await db.query(
        `INSERT INTO agent_group_sales (group_id, sale_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [group.id, saleId]
      );
    }
    res.status(201).json({ success: true, sale: { ...created.rows[0], access_hours: hours } });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Không tạo được tài khoản Sale.' });
  }
});

app.put('/api/agent/sales/:saleId', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const saleId = Number(req.params.saleId);
  const { fullName, accessHours, groupIds } = req.body || {};
  try {
    const sale = await loadOwnedSale(req, saleId);
    if (!sale) return res.status(404).json({ error: 'Không tìm thấy Sale trong phạm vi của bạn.' });

    // Kiểm tra xung đột khung giờ làm việc khi cập nhật
    const currentGroups = (await db.query('SELECT group_id FROM agent_group_sales WHERE sale_id = $1 AND is_active = TRUE', [saleId])).rows.map(r => r.group_id);
    const targetGroups = Array.isArray(groupIds) ? groupIds : currentGroups;
    const currentHours = await getAccessHours(saleId);
    const targetHours = Array.isArray(accessHours) ? accessHours : currentHours;
    const conflict = await findConflictingSaleShift(saleId, targetHours, targetGroups);
    if (conflict) {
      return res.status(400).json({
        error: `Khung giờ ${conflict.myWindow} bị trùng với ca của Sale "${conflict.saleName}" (${conflict.conflictingWindow}) trong nhóm "${conflict.groupName}". Mỗi khung giờ chỉ được phân công cho 1 Sale trực để tránh tranh chấp tin nhắn.`
      });
    }

    const updated = await db.query(
      `UPDATE admins SET full_name = COALESCE($2, full_name) WHERE id = $1
       RETURNING id, username, full_name, is_active`,
      [saleId, fullName ? String(fullName).trim().slice(0, 255) : null]
    );
    if (Array.isArray(accessHours)) await replaceAccessHours(saleId, accessHours);

    if (Array.isArray(groupIds)) {
      await db.query(
        `DELETE FROM agent_group_sales 
         WHERE sale_id = $1 
           AND group_id IN (SELECT id FROM agent_groups WHERE agent_id = $2)`,
        [saleId, req.admin.id]
      );
      for (const groupId of groupIds) {
        const group = await loadOwnedGroup(req, Number(groupId));
        if (!group) continue;
        await db.query(
          `INSERT INTO agent_group_sales (group_id, sale_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [group.id, saleId]
        );
      }
    }

    res.json({ success: true, sale: updated.rows[0] });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Không cập nhật được Sale.' });
  }
});

app.delete('/api/agent/sales/:saleId', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const saleId = Number(req.params.saleId);
  try {
    const sale = await loadOwnedSale(req, saleId);
    if (!sale) return res.status(404).json({ error: 'Không tìm thấy Sale trong phạm vi của bạn.' });

    // Xóa liên kết nhóm, khung giờ và phiên đăng nhập của Sale
    await db.query('DELETE FROM agent_group_sales WHERE sale_id = $1', [saleId]);
    await db.query('DELETE FROM account_access_hours WHERE admin_id = $1', [saleId]);
    await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [saleId]);

    // Xóa tài khoản Sale
    await db.query('DELETE FROM admins WHERE id = $1 AND managed_by_admin_id = $2', [saleId, req.admin.id]);
    res.json({ success: true, message: 'Đã xóa tài khoản Sale.' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Không xóa được tài khoản Sale.' });
  }
});

app.patch('/api/agent/sales/:saleId/status', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const saleId = Number(req.params.saleId);
  const { isActive } = req.body || {};
  if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'Cần trường isActive.' });
  try {
    const sale = await loadOwnedSale(req, saleId);
    if (!sale) return res.status(404).json({ error: 'Không tìm thấy Sale trong phạm vi của bạn.' });
    await db.query('UPDATE admins SET is_active = $2 WHERE id = $1', [saleId, isActive]);
    if (!isActive) await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [saleId]);
    res.json({ success: true, isActive });
  } catch (error) {
    console.error('Toggle sale error:', error);
    res.status(500).json({ error: 'Không đổi được trạng thái Sale.' });
  }
});

// --- Agent: quản lý nhóm -----------------------------------------------------

app.get('/api/agent/groups', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.description, g.is_active, g.project_id, g.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'sale_id', s.id, 'full_name', s.full_name, 'is_active', s.is_active
              )) FILTER (WHERE s.id IS NOT NULL), '[]') AS sales,
              (SELECT COUNT(*) FROM sessions se WHERE se.group_id = g.id AND se.routing_status = 'waiting') AS waiting_count,
              (SELECT COUNT(*) FROM sessions se WHERE se.group_id = g.id AND se.routing_status = 'assigned') AS active_count
         FROM agent_groups g
         LEFT JOIN agent_group_sales gs ON gs.group_id = g.id AND gs.is_active = TRUE
         LEFT JOIN admins s ON s.id = gs.sale_id
        WHERE g.agent_id = $1
        GROUP BY g.id
        ORDER BY g.created_at`,
      [req.admin.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json({ error: 'Không tải được danh sách nhóm.' });
  }
});

app.post('/api/agent/groups', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const { name, description, saleIds } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Cần tên nhóm.' });
  const projectId = req.admin.project_id;
  if (!projectId) return res.status(400).json({ error: 'Nhóm phải thuộc một project cụ thể.' });
  try {
    const created = await db.query(
      `INSERT INTO agent_groups (project_id, agent_id, name, description) VALUES ($1, $2, $3, $4) RETURNING *`,
      [projectId, req.admin.id, String(name).trim().slice(0, 150), String(description || '').trim() || null]
    );
    const group = created.rows[0];

    // Gán ngay các Sale vào nhóm nếu có
    if (Array.isArray(saleIds) && saleIds.length > 0) {
      for (const sId of saleIds) {
        const sale = await loadOwnedSale(req, Number(sId));
        if (sale) {
          await db.query(
            `INSERT INTO agent_group_sales (group_id, sale_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [group.id, sale.id]
          );
        }
      }
    }

    res.status(201).json({ success: true, group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Không tạo được nhóm.' });
  }
});

app.put('/api/agent/groups/:groupId', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const { name, description, isActive } = req.body || {};
  try {
    const group = await loadOwnedGroup(req, Number(req.params.groupId));
    if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm trong phạm vi của bạn.' });
    const updated = await db.query(
      `UPDATE agent_groups SET name = COALESCE($2, name), description = COALESCE($3, description),
              is_active = COALESCE($4, is_active)
        WHERE id = $1 RETURNING *`,
      [group.id, name ? String(name).trim().slice(0, 150) : null,
       description !== undefined ? String(description || '').trim() : null,
       typeof isActive === 'boolean' ? isActive : null]
    );
    res.json({ success: true, group: updated.rows[0] });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Không cập nhật được nhóm.' });
  }
});

app.delete('/api/agent/groups/:groupId', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  try {
    const group = await loadOwnedGroup(req, Number(req.params.groupId));
    if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm trong phạm vi của bạn.' });
    // Còn QR đang trỏ vào thì không cho xóa, nếu không QR sẽ mồ côi và khách quét
    // vào sẽ không biết định tuyến đi đâu.
    const qrCount = await db.query('SELECT COUNT(*)::int AS total FROM qr_chat_accounts WHERE group_id = $1 AND is_active = TRUE', [group.id]);
    if (qrCount.rows[0].total > 0) {
      return res.status(400).json({ error: `Nhóm này đang có ${qrCount.rows[0].total} QR. Hãy chuyển QR sang nhóm khác trước khi xóa.` });
    }
    await db.query('DELETE FROM agent_groups WHERE id = $1', [group.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Không xóa được nhóm.' });
  }
});

app.post('/api/agent/groups/:groupId/sales', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const { saleId } = req.body || {};
  try {
    const group = await loadOwnedGroup(req, Number(req.params.groupId));
    if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm trong phạm vi của bạn.' });
    const sale = await loadOwnedSale(req, Number(saleId));
    if (!sale) return res.status(404).json({ error: 'Không tìm thấy Sale trong phạm vi của bạn.' });

    // Kiểm tra xem Sale này có bị trùng khung giờ với Sale nào đang có trong nhóm không
    const saleHours = await getAccessHours(sale.id);
    const conflict = await findConflictingSaleShift(sale.id, saleHours, [group.id]);
    if (conflict) {
      return res.status(400).json({
        error: `Không thể thêm Sale "${sale.full_name}" vào nhóm "${group.name}" vì ca trực (${conflict.myWindow}) bị trùng với ca của Sale "${conflict.saleName}" (${conflict.conflictingWindow}). Mỗi khung giờ chỉ được phân công cho 1 Sale trực.`
      });
    }

    await db.query(
      `INSERT INTO agent_group_sales (group_id, sale_id) VALUES ($1, $2)
       ON CONFLICT (group_id, sale_id) DO UPDATE SET is_active = TRUE`,
      [group.id, sale.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Add sale to group error:', error);
    res.status(500).json({ error: 'Không thêm được Sale vào nhóm.' });
  }
});

app.delete('/api/agent/groups/:groupId/sales/:saleId', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  try {
    const group = await loadOwnedGroup(req, Number(req.params.groupId));
    if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm trong phạm vi của bạn.' });
    await db.query('DELETE FROM agent_group_sales WHERE group_id = $1 AND sale_id = $2', [group.id, Number(req.params.saleId)]);
    await db.query('DELETE FROM group_sale_hours WHERE group_id = $1 AND sale_id = $2', [group.id, Number(req.params.saleId)]);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove sale from group error:', error);
    res.status(500).json({ error: 'Không gỡ được Sale khỏi nhóm.' });
  }
});

// --- Khung giờ ---------------------------------------------------------------

app.put('/api/agent/accounts/:accountId/access-hours', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const accountId = Number(req.params.accountId);
  try {
    // CHỈ Sale mới có khung giờ. Agent quản lý không bị ràng buộc ca, nên endpoint
    // này chỉ nhận id của Sale thuộc phạm vi Agent đang gọi — không có ngoại lệ.
    const sale = await loadOwnedSale(req, accountId);
    if (!sale) return res.status(403).json({ error: 'Bạn không có quyền sửa giờ của tài khoản này.' });
    const hours = await replaceAccessHours(accountId, req.body?.accessHours);
    // Đổi giờ xong mà tài khoản rơi ra ngoài ca thì đóng phiên đang mở luôn.
    if (!isWithinAnyWindow(hours)) await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [accountId]);
    res.json({ success: true, accessHours: hours });
  } catch (error) {
    console.error('Update access hours error:', error);
    res.status(500).json({ error: 'Không cập nhật được khung giờ.' });
  }
});

app.put('/api/agent/groups/:groupId/sales/:saleId/hours', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  try {
    const group = await loadOwnedGroup(req, Number(req.params.groupId));
    if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm trong phạm vi của bạn.' });
    const sale = await loadOwnedSale(req, Number(req.params.saleId));
    if (!sale) return res.status(404).json({ error: 'Không tìm thấy Sale trong phạm vi của bạn.' });
    const hours = await replaceGroupSaleHours(group.id, sale.id, req.body?.hours);
    res.json({ success: true, hours });
  } catch (error) {
    console.error('Update group sale hours error:', error);
    res.status(500).json({ error: 'Không cập nhật được giờ nhận chat.' });
  }
});

// --- Agent: quản lý QR -------------------------------------------------------

app.get('/api/agent/qr-accounts', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  try {
    const result = await db.query(
      `SELECT q.id, q.code, q.label, q.display_label, q.is_active, q.created_at,
              g.id AS group_id, g.name AS group_name
         FROM qr_chat_accounts q
         JOIN agent_groups g ON g.id = q.group_id
        WHERE q.is_active = TRUE AND g.agent_id = $1
        ORDER BY g.name, q.created_at DESC`,
      [req.admin.id]
    );
    res.json(result.rows.map((row) => ({ ...row, chat_url: qrCustomerChatUrl(req, row.code) })));
  } catch (error) {
    console.error('List agent QR error:', error);
    res.status(500).json({ error: 'Không tải được danh sách QR.' });
  }
});

app.post('/api/agent/qr-accounts', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const { groupId, label } = req.body || {};
  if (!label) return res.status(400).json({ error: 'Cần tên QR.' });
  try {
    const group = await loadOwnedGroup(req, Number(groupId));
    if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm trong phạm vi của bạn.' });

    // Một nhóm có bao nhiêu QR cũng được, phân biệt bằng tên (Bàn 1, Bàn 2,
    // Phòng 101...). QR KHÔNG chỉ định Sale: mọi chat quét từ QR đều vào hàng
    // đợi chung của nhóm, Sale nào đang trong ca thì cùng nhận thông báo.
    const duplicate = await db.query(
      `SELECT 1 FROM qr_chat_accounts WHERE group_id = $1 AND LOWER(label) = LOWER($2) AND is_active = TRUE`,
      [group.id, String(label).trim()]
    );
    if (duplicate.rows[0]) return res.status(400).json({ error: 'Nhóm này đã có QR trùng tên. Hãy đặt tên khác.' });

    const code = `qr_${randomUUID().replace(/-/g, '')}`;
    const created = await db.query(
      `INSERT INTO qr_chat_accounts (project_id, owner_admin_id, code, label, group_id, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $2) RETURNING *`,
      [group.project_id, group.agent_id, code, String(label).trim().slice(0, 255), group.id]
    );
    res.status(201).json({ success: true, account: created.rows[0], chat_url: qrCustomerChatUrl(req, code) });
  } catch (error) {
    console.error('Create agent QR error:', error);
    res.status(500).json({ error: 'Không tạo được QR.' });
  }
});

app.put('/api/agent/qr-accounts/:qrId', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const { label, groupId } = req.body || {};
  try {
    const qr = await db.query('SELECT * FROM qr_chat_accounts WHERE id = $1', [Number(req.params.qrId)]);
    if (!qr.rows[0]) return res.status(404).json({ error: 'Không tìm thấy QR.' });
    const currentGroup = await loadOwnedGroup(req, qr.rows[0].group_id);
    if (!currentGroup) return res.status(403).json({ error: 'QR này không thuộc phạm vi của bạn.' });

    let nextGroupId = qr.rows[0].group_id;
    if (groupId && Number(groupId) !== nextGroupId) {
      const target = await loadOwnedGroup(req, Number(groupId));
      if (!target) return res.status(400).json({ error: 'Nhóm đích không thuộc phạm vi của bạn.' });
      nextGroupId = target.id;
    }

    const updated = await db.query(
      `UPDATE qr_chat_accounts
          SET label = COALESCE($2, label), group_id = $3
        WHERE id = $1 RETURNING *`,
      [qr.rows[0].id, label ? String(label).trim().slice(0, 255) : null, nextGroupId]
    );
    res.json({ success: true, account: updated.rows[0] });
  } catch (error) {
    console.error('Update agent QR error:', error);
    res.status(500).json({ error: 'Không cập nhật được QR.' });
  }
});

app.post('/api/agent/qr-accounts/:qrId/revoke', checkAdminAuth, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  try {
    const qr = await db.query('SELECT * FROM qr_chat_accounts WHERE id = $1', [Number(req.params.qrId)]);
    if (!qr.rows[0]) return res.status(404).json({ error: 'Không tìm thấy QR.' });
    const group = await loadOwnedGroup(req, qr.rows[0].group_id);
    if (!group) return res.status(403).json({ error: 'QR này không thuộc phạm vi của bạn.' });
    await db.query('UPDATE qr_chat_accounts SET is_active = FALSE WHERE id = $1', [qr.rows[0].id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke QR error:', error);
    res.status(500).json({ error: 'Không thu hồi được QR.' });
  }
});

// --- Chuyển chat sang Sale khác ----------------------------------------------

app.post('/api/chats/:sessionId/transfer', checkAdminAuth, requireWorkingHours, async (req, res) => {
  if (!(await requireAgentManager(req, res))) return;
  const { saleId } = req.body || {};
  try {
    const session = await db.query('SELECT id, project_id, group_id FROM sessions WHERE id = $1', [req.params.sessionId]);
    if (!session.rows[0]) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });
    if (!canAccessProject(req.admin, session.rows[0].project_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền với chat của project này.' });
    }
    const sale = await loadOwnedSale(req, Number(saleId));
    if (!sale) return res.status(404).json({ error: 'Không tìm thấy Sale trong phạm vi của bạn.' });
    if (session.rows[0].group_id) {
      const member = await db.query(
        'SELECT 1 FROM agent_group_sales WHERE group_id = $1 AND sale_id = $2 AND is_active = TRUE',
        [session.rows[0].group_id, sale.id]
      );
      if (!member.rows[0]) return res.status(400).json({ error: 'Sale này không thuộc nhóm tiếp nhận của QR.' });
    }
    // Chuyển là ghi đè có chủ đích, không dùng điều kiện IS NULL như claim.
    await db.query(
      `UPDATE sessions SET claimed_by_admin_id = $2, claimed_at = NOW(), routing_status = 'assigned' WHERE id = $1`,
      [session.rows[0].id, sale.id]
    );
    res.json({ success: true, saleId: sale.id });
  } catch (error) {
    console.error('Transfer chat error:', error);
    res.status(500).json({ error: 'Không chuyển được chat.' });
  }
});



// Start Server
async function startServer() {
  // Không nhận request OTP/QR trước khi các migration QR Concierge hoàn tất.
  // Nếu server vừa restart, thiếu cột sessions có thể làm xác thực OTP thất bại
  // sau khi mã đã đúng.
  await db.initPromise;
  await ensureReadReceiptsTable();

  // Quét nền định kỳ mỗi 45s: tự động đóng các phiên hết hạn và gọi AI tóm tắt
  setInterval(async () => {
    try {
      const expiredRes = await db.query(
        `UPDATE sessions SET status = 'closed',
                routing_status = CASE WHEN routing_status IS NULL THEN NULL ELSE 'closed' END
          WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW()
          RETURNING id`
      );
      for (const row of expiredRes.rows) {
        void autoSummarizeClosedSession(row.id);
      }

      // Tự động tóm tắt các phiên đã đóng nhưng chưa có tóm tắt
      const unsummarized = await db.query(
        `SELECT id FROM sessions
          WHERE status = 'closed' AND (ai_summary IS NULL OR ai_summary = '')
          ORDER BY created_at DESC LIMIT 5`
      );
      for (const row of unsummarized.rows) {
        void autoSummarizeClosedSession(row.id);
      }
    } catch (err) {
      // background sweep error
    }
  }, 45000);

  app.listen(PORT, '0.0.0.0', () => {
  console.log(`-----------------------------------------------------`);
  console.log(`Pastie AI Chat Server is running on port ${PORT}`);
  console.log(`Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`API Docs:        http://localhost:${PORT}/docs`);
  console.log(`-----------------------------------------------------`);
  console.log(`[Env Configuration Check]`);
  console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'LOADED (Configured)' : 'MISSING ❌'}`);
  console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'LOADED (Configured)' : 'MISSING ❌'}`);
  console.log(`- GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'LOADED (Configured)' : 'MISSING ❌'}`);
  console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'LOADED (Configured)' : 'MISSING ❌'}`);
  console.log(`- SENDER_EMAIL: ${process.env.SENDER_EMAIL ? `LOADED (${process.env.SENDER_EMAIL})` : 'MISSING (Using onboarding@resend.dev fallback) ⚠️'}`);
  console.log(`-----------------------------------------------------`);
  });
}
startServer().catch(console.error);
