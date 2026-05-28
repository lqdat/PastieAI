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

    // Always create a new distinct device/browser session
    const sessionId = randomUUID(); // Node native secure UUID
    const finalName = name || 'Khách ẩn danh';
    const finalLang = language || 'vi';

    // Parse User-Agent
    const ua = req.headers['user-agent'] || '';
    const { browser, device } = parseUserAgent(ua);

    await db.query(
      `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, detected_language, is_verified, status, browser, device) 
       VALUES ($1, $2, $3, $4, $5, TRUE, 'active', $6, $7)`,
      [sessionId, projectId, finalName, email, finalLang, browser, device]
    );

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
app.post('/api/chats/message', async (req, res) => {
  const { sessionId, sender, text, targetLang, visitorLang, adminLang } = req.body;

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
    if (sender === 'visitor') {
      const agentMsgCheck = await db.query(
        "SELECT id FROM messages WHERE session_id = $1 AND sender = 'agent' LIMIT 1",
        [sessionId]
      );
      const isHumanAgentActive = agentMsgCheck.rows.length > 0;

      if (!isHumanAgentActive) {
        // Load latest knowledge base context
        const kbRes = await db.query(
          `SELECT cleaned_content FROM knowledge_base WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1`,
          [sessionRes.rows[0].project_id]
        );
        const knowledgeContext = kbRes.rows[0]?.cleaned_content || "Bạn là một trợ lý ảo hỗ trợ nhiệt tình cho thương hiệu Pastie.";

        const systemInstruction = `
          Bạn là một trợ lý tư vấn dịch vụ du lịch và phòng nghỉ cao cấp cực kỳ chuyên nghiệp và thân thiện của thương hiệu Pastie.
          
          Hãy trả lời các câu hỏi của khách hàng một cách ngắn gọn, súc tích (dưới 3 câu) để hiển thị tốt nhất trên thiết bị di động.
          Giao tiếp bằng chính ngôn ngữ mà khách hàng đang sử dụng.
          
          Dưới đây là TOÀN BỘ CƠ SỞ TRI THỨC được lấy từ trang web chính thức của chúng tôi. CHỈ trả lời dựa trên tài liệu này, không tự bịa thông tin:
          
          === CƠ SỞ TRI THỨC CHÍNH THỨC ===
          ${knowledgeContext}
          === HẾT CƠ SỞ TRI THỨC ===
          
          Nếu thông tin khách hỏi nằm ngoài cơ sở tri thức trên, hãy khéo léo từ chối và đề xuất chuyển gặp nhân viên hỗ trợ trực tiếp.
        `;

        // Get conversation history (last 10 turns)
        const historyRes = await db.query(
          `SELECT sender, original_text FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 10`,
          [sessionId]
        );

        // Generate response using gemini-helper (slice to exclude the visitor's message we just inserted)
        const aiReply = await gemini.generateChatbotResponse(systemInstruction, historyRes.rows.slice(0, -1), text);

        // Save AI reply as system sender
        const aiMsgRes = await db.query(
          `INSERT INTO messages (session_id, sender, original_text, translated_text, language) 
           VALUES ($1, 'system', $2, $2, 'vi') RETURNING *`,
          [sessionId, aiReply]
        );
        aiReplyMsg = aiMsgRes.rows[0];
      }
    }

    res.json({
      success: true,
      message: msgRes.rows[0],
      aiReply: aiReplyMsg
    });
  } catch (error) {
    console.error('Message translation/logging error:', error);
    res.status(500).json({ error: 'Lỗi khi dịch thuật/lưu tin nhắn.' });
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
    const validLangs = ['vi', 'en', 'ru', 'zh', 'unknown'];
    const updateLang = validLangs.includes(language.toLowerCase()) ? language.toLowerCase() : 'unknown';

    const result = await db.query(
      'UPDATE sessions SET detected_language = $1 WHERE id = $2 RETURNING *',
      [updateLang, sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    }

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

    // Get all messages in this session
    const msgRes = await db.query(
      'SELECT sender, original_text as text FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    // Call Gemini to analyze conversation
    const { summary, tags } = await gemini.analyzeSession(msgRes.rows);

    // Update session in DB
    const email = sessionRes.rows[0].visitor_email;
    const projectId = sessionRes.rows[0].project_id;
    if (email && email.trim() !== '') {
      await db.query(
        `UPDATE sessions 
         SET status = 'closed', ai_summary = $1, intent_tags = $2 
         WHERE visitor_email = $3 AND project_id = $4 AND status = 'active'`,
        [summary, tags, email, projectId]
      );
    }

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
// Helper to retrieve cached translation or translate using Gemini and cache it
async function getOrTranslateMessage(msg, targetLang) {
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

  // Call Gemini API to translate
  try {
    const { translatedText, detectedLang } = await gemini.translateText(msg.original_text, targetLangCode);
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
    console.error(`[Gemini Translate Error] Message ID ${msg.id}:`, err.message);
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
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [email, limit, offset]
      );
    } else {
      result = await db.query(
        `SELECT * FROM messages 
         WHERE session_id = $1 
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [sessionId, limit, offset]
      );
    }
    
    const messages = result.rows.reverse();

    // Dịch các tin nhắn nếu ngôn ngữ khách hàng được chỉ định
    for (let msg of messages) {
      msg.translated_text = await getOrTranslateMessage(msg, visitorLang);
    }

    res.json(messages);
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
// 1. Get all sessions (grouped by email + projectId to avoid duplicates in sidebar)
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
app.get('/api/admin/chats/:sessionId/messages', checkAdminAuth, async (req, res) => {
  const { sessionId } = req.params;
  const adminLang = req.query.adminLang || 'vi';
  const limit = parseInt(req.query.limit) || 15;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // Check if session has a locked admin_language
    const sessionRes = await db.query('SELECT admin_language FROM sessions WHERE id = $1', [sessionId]);
    let targetLang = adminLang;
    if (sessionRes.rows.length > 0 && sessionRes.rows[0].admin_language) {
      targetLang = sessionRes.rows[0].admin_language;
    }

    const result = await db.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [sessionId, limit, offset]
    );
    
    const messages = result.rows.reverse();

    // Dịch tin nhắn theo ngôn ngữ được khóa (admin_language) của cuộc trò chuyện
    for (let msg of messages) {
      msg.translated_text = await getOrTranslateMessage(msg, targetLang);
    }

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
  try {
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat để xóa.' });
    }

    // Since the database tables (messages, message_translations) have ON DELETE CASCADE foreign key constraints,
    // deleting the session row will automatically delete all associated messages and translations!
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);

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

// Incoming message handling (POST)
app.post('/api/multichannel/webhook', async (req, res) => {
  // Always respond 200 OK immediately to Meta to acknowledge receipt and prevent retries
  res.sendStatus(200);

  const event = parseWebhookEvent(req.body);
  if (!event) return;

  const { platform, senderId, targetId, name, text } = event;
  console.log(`Webhook received message from ${platform} (senderId: ${senderId}, targetId: ${targetId}): ${text}`);
  
  try {
    // 1. Resolve project_id based on targetId dynamically
    let projectId = 'pastie-landingpage'; // Default/fallback project
    if (targetId) {
      const configLookup = await db.query(
        `SELECT project_id FROM channel_configs 
         WHERE (platform = 'whatsapp' AND whatsapp_phone_number_id = $1)
            OR (platform = 'messenger' AND messenger_page_id = $1)
            OR (platform = 'instagram' AND instagram_page_id = $1)
         LIMIT 1`,
        [targetId]
      );
      if (configLookup.rows.length > 0) {
        projectId = configLookup.rows[0].project_id;
      } else {
        const fieldLookup = await db.query(
          `SELECT project_id FROM channel_configs
           WHERE whatsapp_phone_number_id = $1
              OR messenger_page_id = $1
              OR instagram_page_id = $1
           LIMIT 1`,
          [targetId]
        );
        if (fieldLookup.rows.length > 0) {
          projectId = fieldLookup.rows[0].project_id;
        }
      }
    }
    console.log(`Mapped multi-channel targetId ${targetId} to project_id: ${projectId}`);

    // 2. Check if there is an active (human agent-led) session for this user on this platform and project
    const sessionRes = await db.query(
      `SELECT * FROM sessions WHERE platform = $1 AND platform_sender_id = $2 AND project_id = $3 AND status = 'active' LIMIT 1`,
      [platform, senderId, projectId]
    );

    let session = sessionRes.rows[0];
    let sessionId;

    if (!session) {
      // No active agent session. Let's trigger the Gemini AI Chatbot!
      // First, see if there is any existing session for this user to append history
      const lastSessionRes = await db.query(
        `SELECT id FROM sessions WHERE platform = $1 AND platform_sender_id = $2 AND project_id = $3 ORDER BY created_at DESC LIMIT 1`,
        [platform, senderId, projectId]
      );

      if (lastSessionRes.rows.length > 0) {
        sessionId = lastSessionRes.rows[0].id;
        // Keep/reopen it active so it displays on the active chat feed of dashboard
        await db.query(`UPDATE sessions SET status = 'active' WHERE id = $1`, [sessionId]);
      } else {
        // Create a new session
        sessionId = `mc-${platform}-${randomUUID()}`;
        await db.query(`
          INSERT INTO sessions (id, project_id, visitor_name, status, platform, platform_sender_id, is_verified)
          VALUES ($1, $2, $3, 'active', $4, $5, true)
        `, [sessionId, projectId, name, platform, senderId]);
      }

      // Save customer's incoming message
      await db.query(`
        INSERT INTO messages (session_id, sender, original_text, translated_text, language)
        VALUES ($1, 'visitor', $2, $2, 'auto')
      `, [sessionId, text]);

      // Call Gemini Chatbot with Scraped Knowledge Base context!
      // Fetch latest synced knowledge base for the resolved project ID
      const kbRes = await db.query(
        `SELECT cleaned_content FROM knowledge_base WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1`,
        [projectId]
      );
      const knowledgeContext = kbRes.rows[0]?.cleaned_content || "Bạn là một trợ lý ảo hỗ trợ nhiệt tình.";

      const systemInstruction = `
        Bạn là một trợ lý tư vấn dịch vụ và sản phẩm cực kỳ chuyên nghiệp và thân thiện.
        
        Hãy trả lời câu hỏi của khách hàng một cách ngắn gọn, súc tích (dưới 3 câu) để hiển thị tốt nhất trên thiết bị di động.
        Giao tiếp bằng ngôn ngữ mà khách hàng đang sử dụng.
        
        Dưới đây là TOÀN BỘ CƠ SỞ TRI THỨC được lấy từ trang web chính thức của chúng tôi. CHỈ trả lời dựa trên tài liệu này, không tự bịa thông tin:
        
        === CƠ SỞ TRI THỨC CHÍNH THỨC ===
        ${knowledgeContext}
        === HẾT CƠ SỞ TRI THỨC ===
        
        Nếu thông tin khách hỏi nằm ngoài cơ sở tri thức trên, hãy khéo léo phản hồi: "Dạ, thông tin này em xin phép ghi nhận để chuyển cho nhân viên hỗ trợ trực tiếp tư vấn kỹ hơn cho anh/chị nhé!" và đề xuất chuyển gặp nhân viên.
      `;

      // Load conversation history (last 10 messages) to provide memory to Gemini
      const historyRes = await db.query(
        `SELECT sender, original_text FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 10`,
        [sessionId]
      );

      // Generate response using gemini-helper
      const aiReply = await gemini.generateChatbotResponse(systemInstruction, historyRes.rows.slice(0, -1), text);

      // Save AI's response to DB as 'system'
      await db.query(`
        INSERT INTO messages (session_id, sender, original_text, translated_text, language)
        VALUES ($1, 'system', $2, $2, 'vi')
      `, [sessionId, aiReply]);

      // Send AI response back to the customer on Facebook/WhatsApp
      await sendMultichannelMessage(platform, senderId, aiReply, projectId);

    } else {
      // An active session is assigned to a human agent.
      sessionId = session.id;

      // Save customer's message
      await db.query(`
        INSERT INTO messages (session_id, sender, original_text, translated_text, language)
        VALUES ($1, 'visitor', $2, $2, 'auto')
      `, [sessionId, text]);

      console.log(`Active human session found for ${platform}:${senderId} on project ${projectId}. Message saved to trigger dashboard refresh.`);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});


function cleanHtmlToText(html) {
  // 1. Remove script and style tags completely
  let text = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
  
  // 2. Replace heading and block tags with newlines to preserve structural spacing
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<li>/gi, '\n- ');
  
  // 3. Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // 4. Decode common HTML entities
  text = text.replace(/&nbsp;/gi, ' ')
             .replace(/&amp;/gi, '&')
             .replace(/&lt;/gi, '<')
             .replace(/&gt;/gi, '>')
             .replace(/&quot;/gi, '"')
             .replace(/&#39;/gi, "'");

  // 5. Compress spacing and newlines
  text = text.replace(/[ \t]+/g, ' '); // Horizontal spaces
  text = text.replace(/\n\s*\n+/g, '\n\n'); // Multiple newlines
  return text.trim();
}

// 4. GET Knowledge Base status & text
app.get('/api/admin/knowledge', checkAdminAuth, async (req, res) => {
  const { projectId = 'pastie-landingpage' } = req.query;
  try {
    const result = await db.query(
      'SELECT source_url, cleaned_content, updated_at FROM knowledge_base WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [projectId]
    );
    if (result.rows.length === 0) {
      return res.json({ message: 'Chưa có cơ sở dữ liệu tri thức nào được cấu hình.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch knowledge error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải cơ sở tri thức.' });
  }
});

// 5. POST Knowledge Base sync from URL
app.post('/api/admin/knowledge/sync', checkAdminAuth, async (req, res) => {
  const { url, projectId = 'pastie-landingpage' } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Vui lòng cung cấp tham số URL.' });
  }

  try {
    console.log(`Bắt đầu cào dữ liệu tri thức tự động từ: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Không thể tải trang web. Mã lỗi HTTP: ${response.status}` });
    }

    const html = await response.text();
    const cleanedContent = cleanHtmlToText(html);

    if (cleanedContent.length < 50) {
      return res.status(400).json({ error: 'Nội dung trang web quá ngắn hoặc không thể cào được văn bản hữu ích.' });
    }

    // Upsert record
    const existsRes = await db.query('SELECT id FROM knowledge_base WHERE project_id = $1 LIMIT 1', [projectId]);
    
    if (existsRes.rows.length > 0) {
      await db.query(
        'UPDATE knowledge_base SET source_url = $1, raw_html = $2, cleaned_content = $3, updated_at = CURRENT_TIMESTAMP WHERE project_id = $4',
        [url, html, cleanedContent, projectId]
      );
    } else {
      await db.query(
        'INSERT INTO knowledge_base (project_id, source_url, raw_html, cleaned_content) VALUES ($1, $2, $3, $4)',
        [projectId, url, html, cleanedContent]
      );
    }

    res.json({ 
      success: true, 
      message: 'Đồng bộ cơ sở tri thức từ Landing Page thành công!', 
      characterCount: cleanedContent.length 
    });
  } catch (error) {
    console.error('Knowledge sync error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đồng bộ tri thức: ' + error.message });
  }
});

// 6. POST Knowledge Base manual update
app.post('/api/admin/knowledge/manual', checkAdminAuth, async (req, res) => {
  const { cleanedContent, projectId = 'pastie-landingpage' } = req.body;
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

    res.json({ success: true, message: 'Đã lưu tri thức tư vấn thủ công thành công!' });
  } catch (error) {
    console.error('Manual knowledge save error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi lưu tri thức thủ công.' });
  }
});


// --- DYNAMIC MULTI-TENANT CHANNEL CONFIG API ENDPOINTS ---

// 1. GET Channel configurations for a project
app.get('/api/admin/channels', checkAdminAuth, async (req, res) => {
  const projectId = req.query.projectId || 'pastie-landingpage';
  try {
    const configRes = await db.query('SELECT * FROM channel_configs WHERE project_id = $1', [projectId]);
    res.json({
      success: true,
      config: configRes.rows[0] || null
    });
  } catch (error) {
    console.error('Fetch channel configurations error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải cấu hình kênh.' });
  }
});

// 2. POST Save/Upsert Channel configurations for a project
app.post('/api/admin/channels', checkAdminAuth, async (req, res) => {
  const {
    projectId = 'pastie-landingpage',
    platform = 'whatsapp',
    whatsappPhoneNumberId = '',
    whatsappAccessToken = '',
    messengerPageId = '',
    messengerPageAccessToken = '',
    instagramPageId = '',
    instagramAccessToken = '',
    metaVerifyToken = 'pastie_verify_token_2026'
  } = req.body;

  try {
    const existsRes = await db.query('SELECT id FROM channel_configs WHERE project_id = $1 LIMIT 1', [projectId]);
    
    if (existsRes.rows.length > 0) {
      await db.query(`
        UPDATE channel_configs 
        SET platform = $1, 
            whatsapp_phone_number_id = $2, 
            whatsapp_access_token = $3, 
            messenger_page_id = $4, 
            messenger_page_access_token = $5, 
            instagram_page_id = $6, 
            instagram_access_token = $7, 
            meta_verify_token = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = $9
      `, [
        platform,
        whatsappPhoneNumberId.trim(),
        whatsappAccessToken.trim(),
        messengerPageId.trim(),
        messengerPageAccessToken.trim(),
        instagramPageId.trim(),
        instagramAccessToken.trim(),
        metaVerifyToken.trim(),
        projectId
      ]);
    } else {
      await db.query(`
        INSERT INTO channel_configs (
          project_id, platform, 
          whatsapp_phone_number_id, whatsapp_access_token, 
          messenger_page_id, messenger_page_access_token, 
          instagram_page_id, instagram_access_token, 
          meta_verify_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        projectId,
        platform,
        whatsappPhoneNumberId.trim(),
        whatsappAccessToken.trim(),
        messengerPageId.trim(),
        messengerPageAccessToken.trim(),
        instagramPageId.trim(),
        instagramAccessToken.trim(),
        metaVerifyToken.trim()
      ]);
    }

    res.json({ success: true, message: 'Lưu cấu hình tích hợp đa kênh thành công!' });
  } catch (error) {
    console.error('Save channel configurations error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi lưu cấu hình tích hợp kênh: ' + error.message });
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
