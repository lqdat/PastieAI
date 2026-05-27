const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const db = require('./database');
const gemini = require('./gemini-helper');
const resend = require('./resend-helper');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 3000;

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
      },
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Catch uncaught exceptions and unhandled rejections to prevent server from crashing
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err.stack || err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason.stack || reason || reason.message);
});

app.use(cors());
app.use(express.json());

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

// Serve admin dashboard statically from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
// Serve widget files statically (as a fallback)
app.use(express.static(path.join(__dirname, '../widget')));

// Redirect root path to admin dashboard
app.get('/', (req, res) => {
  res.redirect('/admin.html');
});


// Simple Token-based Auth Middleware for admin routes
function checkAdminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers['authorization'];
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (token === adminPassword) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized. Invalid admin password/token.' });
}

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
  const { email } = req.body;
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
    if (!sent) {
      return res.status(500).json({ error: 'Không thể gửi email OTP. Vui lòng liên hệ quản trị viên.' });
    }

    res.json({ success: true, message: 'Mã OTP đã được gửi về email của bạn.' });
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xử lý OTP.' });
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
// 2. Verify OTP and Create/Activate Chat Session
app.post('/api/otp/verify', async (req, res) => {
  const { email, code, name, projectId, language } = req.body;
  
  if (!email || !code || !projectId) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email, mã OTP và projectId.' });
  }

  try {
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

    // Delete OTP after verification to prevent reuse
    await db.query('DELETE FROM otps WHERE email = $1', [email]);

    // Check if there is an existing active session for this email & project
    const activeSessionRes = await db.query(
      `SELECT id, visitor_name FROM sessions 
       WHERE visitor_email = $1 AND project_id = $2 AND status = 'active' 
       LIMIT 1`,
      [email, projectId]
    );

    let sessionId;
    let finalName = name || 'Khách ẩn danh';

    if (activeSessionRes.rows.length > 0) {
      sessionId = activeSessionRes.rows[0].id;
      finalName = activeSessionRes.rows[0].visitor_name || finalName;
      // Update name if new non-default name is provided
      if (name && name !== 'Khách ẩn danh' && name !== activeSessionRes.rows[0].visitor_name) {
        await db.query('UPDATE sessions SET visitor_name = $1 WHERE id = $2', [name, sessionId]);
        finalName = name;
      }
    } else {
      sessionId = randomUUID(); // Node native secure UUID
      await db.query(
        `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, detected_language, is_verified, status) 
         VALUES ($1, $2, $3, $4, $5, TRUE, 'active')`,
        [sessionId, projectId, finalName, email, language || 'vi']
      );
    }

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
// 3. Log Message and Translate (2-way Translation)
app.post('/api/chats/message', async (req, res) => {
  const { sessionId, sender, text, targetLang, visitorLang } = req.body;

  if (!sessionId || !sender || !text || !targetLang) {
    return res.status(400).json({ error: 'Thiếu thông số đầu vào bắt buộc.' });
  }

  try {
    // Verify session is active
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Phiên chat không tồn tại.' });
    }
    if (sessionRes.rows[0].status === 'closed') {
      return res.status(410).json({ error: 'Phiên chat đã bị đóng.' });
    }

    // Call Gemini to translate and detect language
    const { translatedText, detectedLang } = await gemini.translateText(text, targetLang);

    // Save message to database
    const msgRes = await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionId, sender, text, translatedText, detectedLang]
    );

    // Update session detected language if it's the first message from the visitor, or update with visitorLang if provided
    if (sender === 'visitor') {
      const updateLang = visitorLang || detectedLang;
      if (updateLang) {
        await db.query('UPDATE sessions SET detected_language = $1 WHERE id = $2', [updateLang, sessionId]);
      }
    }

    res.json({
      success: true,
      message: msgRes.rows[0]
    });
  } catch (error) {
    console.error('Message translation/logging error:', error);
    res.status(500).json({ error: 'Lỗi khi dịch thuật/lưu tin nhắn.' });
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

    // Get all messages in this session
    const msgRes = await db.query(
      'SELECT sender, original_text as text FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    // Call Gemini to analyze conversation
    const { summary, tags } = await gemini.analyzeSession(msgRes.rows);

    // Update session in DB
    await db.query(
      `UPDATE sessions 
       SET status = 'closed', ai_summary = $1, intent_tags = $2 
       WHERE id = $3`,
      [summary, tags, sessionId]
    );

    res.json({ success: true, summary, tags });
  } catch (error) {
    console.error('Session Close Error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đóng phiên chat.' });
  }
});

// 4b. Update Session Language
app.post('/api/chats/session/language', async (req, res) => {
  const { sessionId, language } = req.body;
  if (!sessionId || !language) {
    return res.status(400).json({ error: 'Thiếu sessionId hoặc language.' });
  }

  try {
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    }

    await db.query('UPDATE sessions SET detected_language = $1 WHERE id = $2', [language, sessionId]);
    res.json({ success: true, language });
  } catch (error) {
    console.error('Update session language error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật ngôn ngữ.' });
  }
});

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
// 5. Get messages for a session (Public route for the Visitor Widget)
// Secure because sessionId is a secure UUIDv4
app.get('/api/chats/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Verify session exists
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Phiên chat không tồn tại.' });
    }
    if (sessionRes.rows[0].status === 'closed') {
      return res.status(410).json({ error: 'Phiên chat đã bị đóng.' });
    }

    const email = sessionRes.rows[0].visitor_email;
    let result;
    if (email && email.trim() !== '') {
      result = await db.query(
        `SELECT m.* FROM messages m 
         JOIN sessions s ON m.session_id = s.id 
         WHERE s.visitor_email = $1 
         ORDER BY m.created_at ASC`,
        [email]
      );
    } else {
      result = await db.query(
        'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch visitor messages error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tin nhắn.' });
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
// 1. Get all sessions
app.get('/api/admin/chats', checkAdminAuth, async (req, res) => {
  const { projectId } = req.query;
  
  try {
    let queryText = 'SELECT * FROM sessions';
    const params = [];

    if (projectId) {
      queryText += ' WHERE project_id = $1';
      params.push(projectId);
    }

    queryText += ' ORDER BY created_at DESC';

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
// 2. Get messages for a session
app.get('/api/admin/chats/:sessionId/messages', checkAdminAuth, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sessionRes = await db.query('SELECT visitor_email FROM sessions WHERE id = $1', [sessionId]);
    const email = sessionRes.rows[0]?.visitor_email;

    let result;
    if (email && email.trim() !== '') {
      result = await db.query(
        `SELECT m.* FROM messages m 
         JOIN sessions s ON m.session_id = s.id 
         WHERE s.visitor_email = $1 
         ORDER BY m.created_at ASC`,
        [email]
      );
    } else {
      result = await db.query(
        'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tin nhắn.' });
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


// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`-----------------------------------------------------`);
  console.log(`Pastie AI Chat Server is running on port ${PORT}`);
  console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`-----------------------------------------------------`);
  console.log(`[Env Configuration Check]`);
  console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'LOADED (Configured)' : 'MISSING ❌'}`);
  console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'LOADED (Configured)' : 'MISSING ❌'}`);
  console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'LOADED (Configured)' : 'MISSING ❌'}`);
  console.log(`- SENDER_EMAIL: ${process.env.SENDER_EMAIL ? `LOADED (${process.env.SENDER_EMAIL})` : 'MISSING (Using onboarding@resend.dev fallback) ⚠️'}`);
  console.log(`-----------------------------------------------------`);
});
