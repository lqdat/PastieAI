const { Resend } = require('resend');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.RESEND_API_KEY;
let resendClient = null;

if (apiKey) {
  resendClient = new Resend(apiKey);
} else {
  console.error('WARNING: RESEND_API_KEY is not defined. OTP emails cannot be sent.');
}

// URL gốc phục vụ ảnh logo và liên kết
const DEFAULT_AGENT_URL = 'https://agent.pastiechat.com';
const DEFAULT_SALE_URL = 'https://sale.pastiechat.com';
const MAIN_WEBSITE_URL = 'https://pastiechat.com';
const MAIN_WEBSITE_DISPLAY = 'pastiechat.com';

function getAgentUrl() {
  return (process.env.AGENT_PUBLIC_URL || DEFAULT_AGENT_URL).replace(/\/$/, '');
}

function getSaleUrl() {
  return (process.env.SALE_PUBLIC_URL || DEFAULT_SALE_URL).replace(/\/$/, '');
}

function getBaseUrl(role) {
  if (role === 'sale') return getSaleUrl();
  return (process.env.DASHBOARD_PUBLIC_URL || process.env.FRONTEND_URL || getAgentUrl()).replace(/\/$/, '');
}

/**
 * Sends a 6-digit OTP code to a visitor's email for Chat Verification.
 * @param {string} toEmail The recipient's email address.
 * @param {string} otpCode The 6-digit verification code.
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
async function sendOTPEmail(toEmail, otpCode) {
  if (!resendClient) {
    const msg = 'Resend client not initialized — RESEND_API_KEY missing.';
    console.error(msg);
    return { ok: false, reason: msg };
  }

  const sender = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const customerUrl = (process.env.QR_CHAT_PORTAL_URL || 'https://chat.pastiechat.com').replace(/\/$/, '');
  const logoUrl = `${getAgentUrl()}/pastie-chat-biz-compact.png`;

  try {
    const data = await resendClient.emails.send({
      from: `Pastie Chat <${sender}>`,
      to: [toEmail],
      subject: `[Mã OTP] ${otpCode} - Thông báo mã xác thực Pastie Chat biz`,
      html: `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pastie Chat</title></head><body style="margin:0;padding:0;background-color:#eef0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background-color:#eef0f3;margin:0;padding:24px 10px;border-collapse:collapse">
  <tr>
    <td align="center" style="padding:0">
      <!-- MAIN CARD CONTAINER -->
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e7e8ee;border-radius:14px;border-collapse:separate;overflow:hidden;text-align:left">
        <tr>
          <td style="height:5px;background:linear-gradient(90deg,#F438A1,#C90C6C);font-size:0;line-height:0;margin:0;padding:0" height="5">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:26px 30px 0;background-color:#ffffff">
            <img src="${logoUrl}" alt="Pastie Chat" height="42" style="height:42px;width:auto;display:block;border:0" />
          </td>
        </tr>
        <tr>
          <td style="padding:20px 30px 6px;background-color:#ffffff">
            <h1 style="margin:0;font-size:21px;line-height:1.35;color:#16161f;font-weight:800;text-transform:uppercase">Thông báo mã đăng nhập<br>Pastie Chat biz</h1>
            <p style="margin:10px 0 0;color:#9a9aa6;font-size:12px;font-style:italic">* Vui lòng không phản hồi email này. Đây là email được gửi tự động từ hệ thống của Pastie Chat.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 30px 6px;background-color:#ffffff;color:#3a3a48;font-size:15px;line-height:1.7">
            <p style="margin:0 0 12px">Xin chào Quý khách,</p>
            <p style="margin:0">Pastie Chat cảm ơn Quý khách đã sử dụng dịch vụ. Mã đăng nhập một lần (OTP) của Quý khách như sau:</p>
            
            <div style="text-align:center;background:#faf7f8;border:1px solid #f1dfe9;border-radius:12px;padding:24px;margin:20px 0">
              <div style="font-size:12px;letter-spacing:2px;color:#8a8a96;font-weight:700;text-transform:uppercase">Mã đăng nhập (OTP)</div>
              <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#C90C6C;margin-top:10px">${otpCode}</div>
            </div>
            
            <p style="margin:0">Mã có hiệu lực trong <b>5 phút</b> và chỉ sử dụng được một lần.</p>
            <p style="margin:12px 0 0;color:#8a8a96;font-size:13px">Nếu cần thêm sự hỗ trợ, quý khách vui lòng liên hệ theo thông tin bên dưới.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 30px 22px;background-color:#ffffff;color:#3a3a48;font-size:15px;line-height:1.7">
            <p style="margin:0 0 2px">Trân trọng,</p>
            <p style="margin:0;font-weight:700;color:#C90C6C">Pastie Chat</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 30px;background-color:#ffffff">
            <div style="border-top:1px solid #ececf0;height:1px;line-height:1px;font-size:1px">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 30px 26px;background-color:#ffffff;color:#9a9aa6;font-size:12px;line-height:1.9">
            <div><b style="color:#7c7c8a">Hotline:</b> 0984 448 834</div>
            <div><b style="color:#7c7c8a">Email:</b> <a href="mailto:ai@pastie.vn" style="color:#C90C6C;text-decoration:none">ai@pastie.vn</a></div>
            <div><b style="color:#7c7c8a">Website:</b> <a href="${MAIN_WEBSITE_URL}" style="color:#C90C6C;text-decoration:none">${MAIN_WEBSITE_DISPLAY}</a></div>
            <div style="margin-top:10px;color:#b6b6c0">© 2026 Pastie Chat — Nền tảng tư vấn &amp; CSKH đa kênh thông minh.</div>
          </td>
        </tr>
      </table>
      <!-- END MAIN CARD CONTAINER -->
    </td>
  </tr>
</table>
</body></html>`
    });

    if (data.error) {
      const msg = `Resend API error: ${JSON.stringify(data.error)}`;
      console.error(msg);
      return { ok: false, reason: msg };
    }

    console.log(`OTP email sent to ${toEmail}. ID: ${data.data?.id}`);
    return { ok: true };
  } catch (error) {
    const msg = `Resend exception: ${error.message}`;
    console.error(msg);
    return { ok: false, reason: msg };
  }
}

/**
 * Sends a 6-digit OTP code for Admin / Staff Login.
 */
async function sendAdminOTPEmail(toEmail, otpCode, recipientName = 'Quản trị viên', options = {}) {
  if (!resendClient) {
    const msg = 'Resend client not initialized — RESEND_API_KEY missing.';
    console.error(msg);
    return { ok: false, reason: msg };
  }

  const { loginUrl, role } = typeof options === 'string' ? { loginUrl: options } : (options || {});
  const sender = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  // Nút đăng nhập theo role: agent.pastiechat.com hoặc sale.pastiechat.com
  const targetUrl = (role === 'sale' ? getSaleUrl() : getAgentUrl()).replace(/\/$/, '');
  const logoUrl = `${getAgentUrl()}/pastie-chat-biz-compact.png`;

  try {
    const data = await resendClient.emails.send({
      from: `Pastie Chat <${sender}>`,
      to: [toEmail],
      subject: `[Mã Đăng Nhập] OTP: ${otpCode} - Pastie Chat biz`,
      html: `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pastie Chat</title></head><body style="margin:0;padding:0;background-color:#eef0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background-color:#eef0f3;margin:0;padding:24px 10px;border-collapse:collapse">
  <tr>
    <td align="center" style="padding:0">
      <!-- MAIN CARD CONTAINER -->
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e7e8ee;border-radius:14px;border-collapse:separate;overflow:hidden;text-align:left">
        <tr>
          <td style="height:5px;background:linear-gradient(90deg,#F438A1,#C90C6C);font-size:0;line-height:0;margin:0;padding:0" height="5">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:26px 30px 0;background-color:#ffffff">
            <img src="${logoUrl}" alt="Pastie Chat" height="42" style="height:42px;width:auto;display:block;border:0" />
          </td>
        </tr>
        <tr>
          <td style="padding:20px 30px 6px;background-color:#ffffff">
            <h1 style="margin:0;font-size:21px;line-height:1.35;color:#16161f;font-weight:800;text-transform:uppercase">Thông báo mã đăng nhập<br>Pastie Chat biz</h1>
            <p style="margin:10px 0 0;color:#9a9aa6;font-size:12px;font-style:italic">* Vui lòng không phản hồi email này. Đây là email được gửi tự động từ hệ thống của Pastie Chat.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 30px 6px;background-color:#ffffff;color:#3a3a48;font-size:15px;line-height:1.7">
            <p style="margin:0 0 12px">Xin chào <b>${recipientName}</b>,</p>
            <p style="margin:0">Pastie Chat cảm ơn Quý khách đã sử dụng dịch vụ. Mã đăng nhập một lần (OTP) của Quý khách như sau:</p>
            
            <div style="text-align:center;background:#faf7f8;border:1px solid #f1dfe9;border-radius:12px;padding:24px;margin:20px 0">
              <div style="font-size:12px;letter-spacing:2px;color:#8a8a96;font-weight:700;text-transform:uppercase">Mã đăng nhập (OTP)</div>
              <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#C90C6C;margin-top:10px">${otpCode}</div>
            </div>
            
            <p style="margin:0">Mã có hiệu lực trong <b>5 phút</b> và chỉ sử dụng được một lần.</p>
            <div style="text-align:center;margin:22px 0 6px">
              <a href="${targetUrl}" style="display:inline-block;background:linear-gradient(90deg,#F438A1,#C90C6C);color:#ffffff;padding:13px 30px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Đăng nhập PastieChat ngay! &rarr;</a>
            </div>
            <p style="margin:16px 0 0;color:#8a8a96;font-size:13px">Nếu cần thêm sự hỗ trợ, quý khách vui lòng liên hệ theo thông tin bên dưới.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 30px 22px;background-color:#ffffff;color:#3a3a48;font-size:15px;line-height:1.7">
            <p style="margin:0 0 2px">Trân trọng,</p>
            <p style="margin:0;font-weight:700;color:#C90C6C">Pastie Chat</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 30px;background-color:#ffffff">
            <div style="border-top:1px solid #ececf0;height:1px;line-height:1px;font-size:1px">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 30px 26px;background-color:#ffffff;color:#9a9aa6;font-size:12px;line-height:1.9">
            <div><b style="color:#7c7c8a">Hotline:</b> 0984 448 834</div>
            <div><b style="color:#7c7c8a">Email:</b> <a href="mailto:ai@pastie.vn" style="color:#C90C6C;text-decoration:none">ai@pastie.vn</a></div>
            <div><b style="color:#7c7c8a">Website:</b> <a href="${MAIN_WEBSITE_URL}" style="color:#C90C6C;text-decoration:none">${MAIN_WEBSITE_DISPLAY}</a></div>
            <div style="margin-top:10px;color:#b6b6c0">© 2026 Pastie Chat — Nền tảng tư vấn &amp; CSKH đa kênh thông minh.</div>
          </td>
        </tr>
      </table>
      <!-- END MAIN CARD CONTAINER -->
    </td>
  </tr>
</table>
</body></html>`
    });

    if (data.error) {
      console.error(`Resend Admin OTP error: ${JSON.stringify(data.error)}`);
      return { ok: false, reason: data.error };
    }

    console.log(`Admin OTP email sent to ${toEmail}. ID: ${data.data?.id}`);
    return { ok: true };
  } catch (error) {
    console.error(`Resend Admin OTP exception: ${error.message}`);
    return { ok: false, reason: error.message };
  }
}

/**
 * Sends an Account Activation / Welcome email when an Agent, Sale, or Admin account is created.
 */
async function sendAccountActivationEmail({ toEmail, fullName, role, createdByName, loginUrl }) {
  if (!resendClient) {
    const msg = 'Resend client not initialized — RESEND_API_KEY missing.';
    console.error(msg);
    return { ok: false, reason: msg };
  }

  const sender = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  // Nút đăng nhập theo role: agent.pastiechat.com hoặc sale.pastiechat.com
  const resolvedLoginUrl = (role === 'sale' ? getSaleUrl() : getAgentUrl()).replace(/\/$/, '');
  const logoUrl = `${getAgentUrl()}/pastie-chat-biz-compact.png`;
  const guideUrl = `${getAgentUrl()}/guide`;

  const roleNameMap = {
    superadmin: 'Quản trị viên cấp cao',
    project_admin: 'Quản trị viên dự án',
    subadmin: 'Quản trị viên',
    agent: 'Quản lý cơ sở',
    sale: 'Chuyên viên tư vấn'
  };
  const displayRole = roleNameMap[role] || 'Thành viên quản trị';

  try {
    const data = await resendClient.emails.send({
      from: `Pastie Chat <${sender}>`,
      to: [toEmail],
      subject: `[Thông báo kích hoạt] Thông báo kích hoạt tài khoản quản trị & CSKH Pastie Chat biz`,
      html: `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pastie Chat</title></head><body style="margin:0;padding:0;background-color:#eef0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background-color:#eef0f3;margin:0;padding:24px 10px;border-collapse:collapse">
  <tr>
    <td align="center" style="padding:0">
      <!-- MAIN CARD CONTAINER -->
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e7e8ee;border-radius:14px;border-collapse:separate;overflow:hidden;text-align:left">
        <tr>
          <td style="height:5px;background:linear-gradient(90deg,#F438A1,#C90C6C);font-size:0;line-height:0;margin:0;padding:0" height="5">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:26px 30px 0;background-color:#ffffff">
            <img src="${logoUrl}" alt="Pastie Chat" height="42" style="height:42px;width:auto;display:block;border:0" />
          </td>
        </tr>
        <tr>
          <td style="padding:20px 30px 6px;background-color:#ffffff">
            <h1 style="margin:0;font-size:21px;line-height:1.35;color:#16161f;font-weight:800;text-transform:uppercase">Thông báo kích hoạt<br>tài khoản quản trị &amp; CSKH</h1>
            <p style="margin:10px 0 0;color:#9a9aa6;font-size:12px;font-style:italic">* Vui lòng không phản hồi email này. Đây là email được gửi tự động từ hệ thống của Pastie Chat.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 30px 6px;background-color:#ffffff;color:#3a3a48;font-size:15px;line-height:1.7">
            <p style="margin:0 0 12px">Xin chào <b>${fullName || toEmail}</b>,</p>
            <p style="margin:0">Tài khoản quản trị của bạn đã được khởi tạo thành công trên PastieChat.</p>
            
            <div style="background:#faf7f8;border:1px solid #f1dfe9;border-radius:12px;padding:16px 20px;margin:20px 0">
              <div style="font-size:14px;color:#3a3a48;margin-bottom:6px"><b>Email đăng nhập:</b> ${toEmail}</div>
              <div style="font-size:14px;color:#3a3a48;margin-bottom:6px"><b>Vai trò:</b> <span style="color:#C90C6C;font-weight:700">${displayRole}</span></div>
              <div style="font-size:14px;color:#3a3a48"><b>Trạng thái:</b> <span style="color:#059669;font-weight:700">Đã kích hoạt</span></div>
            </div>

            <p style="margin:0 0 10px">Dùng email trên để đăng nhập và quản lý hoạt động kinh doanh trên PastieChat.</p>

            <div style="text-align:center;margin:22px 0 6px">
              <a href="${resolvedLoginUrl}" style="display:inline-block;background:linear-gradient(90deg,#F438A1,#C90C6C);color:#ffffff;padding:13px 30px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Đăng nhập PastieChat ngay! &rarr;</a>
            </div>
            <div style="text-align:center;margin-top:8px;font-size:13px">
              <a href="${guideUrl}" style="color:#C90C6C;text-decoration:none;font-weight:600">📖 Sổ tay &amp; Video hướng dẫn sử dụng: ${guideUrl}</a>
            </div>

            <p style="margin:16px 0 0;color:#8a8a96;font-size:13px">Nếu cần thêm sự hỗ trợ, quý khách vui lòng liên hệ theo thông tin bên dưới.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 30px 22px;background-color:#ffffff;color:#3a3a48;font-size:15px;line-height:1.7">
            <p style="margin:0 0 2px">Trân trọng,</p>
            <p style="margin:0;font-weight:700;color:#C90C6C">Pastie Chat</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 30px;background-color:#ffffff">
            <div style="border-top:1px solid #ececf0;height:1px;line-height:1px;font-size:1px">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 30px 26px;background-color:#ffffff;color:#9a9aa6;font-size:12px;line-height:1.9">
            <div><b style="color:#7c7c8a">Hotline:</b> 0984 448 834</div>
            <div><b style="color:#7c7c8a">Email:</b> <a href="mailto:ai@pastie.vn" style="color:#C90C6C;text-decoration:none">ai@pastie.vn</a></div>
            <div><b style="color:#7c7c8a">Website:</b> <a href="${MAIN_WEBSITE_URL}" style="color:#C90C6C;text-decoration:none">${MAIN_WEBSITE_DISPLAY}</a></div>
            <div style="margin-top:10px;color:#b6b6c0">© 2026 Pastie Chat — Nền tảng tư vấn &amp; CSKH đa kênh thông minh.</div>
          </td>
        </tr>
      </table>
      <!-- END MAIN CARD CONTAINER -->
    </td>
  </tr>
</table>
</body></html>`
    });

    if (data.error) {
      console.error(`Resend Activation error: ${JSON.stringify(data.error)}`);
      return { ok: false, reason: data.error };
    }

    console.log(`[Resend] Account activation email sent to ${toEmail}. ID: ${data.data?.id}`);
    return { ok: true };
  } catch (error) {
    console.error(`Resend Activation exception: ${error.message}`);
    return { ok: false, reason: error.message };
  }
}

module.exports = {
  sendOTPEmail,
  sendAdminOTPEmail,
  sendAccountActivationEmail
};
