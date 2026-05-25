const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const db = require('./database');
const gemini = require('./gemini-helper');
const resend = require('./resend-helper');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const path = require('path');
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

// 2. Verify OTP and Create/Activate Chat Session
app.post('/api/otp/verify', async (req, res) => {
  const { email, code, name, projectId } = req.body;
  
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

    // Create a new session in PostgreSQL
    const sessionId = randomUUID(); // Node native secure UUID

    
    await db.query(
      `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, is_verified, status) 
       VALUES ($1, $2, $3, $4, TRUE, 'active')`,
      [sessionId, projectId, name || 'Khách ẩn danh', email]
    );

    res.json({ success: true, sessionId, name: name || 'Khách ẩn danh' });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi xác thực OTP.' });
  }
});

// 3. Log Message and Translate (2-way Translation)
app.post('/api/chats/message', async (req, res) => {
  const { sessionId, sender, text, targetLang } = req.body;

  if (!sessionId || !sender || !text || !targetLang) {
    return res.status(400).json({ error: 'Thiếu thông số đầu vào bắt buộc.' });
  }

  try {
    // Verify session is active
    const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Phiên chat không tồn tại hoặc đã bị đóng.' });
    }

    // Call Gemini to translate and detect language
    const { translatedText, detectedLang } = await gemini.translateText(text, targetLang);

    // Save message to database
    const msgRes = await db.query(
      `INSERT INTO messages (session_id, sender, original_text, translated_text, language) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionId, sender, text, translatedText, detectedLang]
    );

    // Update session detected language if it's the first message from the visitor
    if (sender === 'visitor' && !sessionRes.rows[0].detected_language) {
      await db.query('UPDATE sessions SET detected_language = $1 WHERE id = $2', [detectedLang, sessionId]);
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

// 5. Get messages for a session (Public route for the Visitor Widget)
// Secure because sessionId is a secure UUIDv4
app.get('/api/chats/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch visitor messages error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tin nhắn.' });
  }
});



// ----------------------------------------------------
// ADMIN API ENDPOINTS (DASHBOARD)
// ----------------------------------------------------

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

// 2. Get messages for a session
app.get('/api/admin/chats/:sessionId/messages', checkAdminAuth, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tin nhắn.' });
  }
});

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
});
