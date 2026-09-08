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

/**
 * Sends a 6-digit OTP code to a visitor's email.
 * @param {string} toEmail The recipient's email address.
 * @param {string} otpCode The 6-digit verification code.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function sendOTPEmail(toEmail, otpCode) {
  if (!resendClient) {
    const msg = 'Resend client not initialized — RESEND_API_KEY missing.';
    console.error(msg);
    return { ok: false, reason: msg };
  }

  const sender = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

  try {
    const data = await resendClient.emails.send({
      from: `Pastie Support <${sender}>`,
      to: [toEmail],
      subject: `[OTP] Mã xác thực: ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center;">Xác Thực Tài Khoản Pastie</h2>
          <p>Chào bạn,</p>
          <p>Vui lòng nhập mã OTP dưới đây vào khung chat để xác thực email và bắt đầu hỗ trợ:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e1b4b; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px; border: 1px solid #d1d5db;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Mã có hiệu lực trong <b>5 phút</b>.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="text-align: center; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} Pastie Support</p>
        </div>
      `
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
async function sendAdminOTPEmail(toEmail, otpCode, recipientName = 'Quản trị viên') {
  if (!resendClient) {
    const msg = 'Resend client not initialized — RESEND_API_KEY missing.';
    console.error(msg);
    return { ok: false, reason: msg };
  }

  const sender = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

  try {
    const data = await resendClient.emails.send({
      from: `Pastie AI Console <${sender}>`,
      to: [toEmail],
      subject: `[Mã Đăng Nhập] OTP: ${otpCode} - Pastie AI Console`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ec4899; margin: 0 0 6px 0; font-size: 22px; font-weight: 700;">Pastie AI Console</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Mã xác thực đăng nhập quản trị viên / nhân viên</p>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #334155;">Chào <b>${recipientName}</b>,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #334155;">Hệ thống nhận được yêu cầu đăng nhập vào Dashboard quản trị. Vui lòng sử dụng mã OTP dưới đây để hoàn tất:</p>
          <div style="text-align: center; margin: 26px 0;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; background: #fdf2f8; padding: 14px 28px; border-radius: 12px; border: 1px solid #fbcfe8; display: inline-block;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0 0 16px 0;">Mã xác thực có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="text-align: center; font-size: 11.5px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} Pastie AI Console &bull; DealPhuQuoc Integration</p>
        </div>
      `
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
  const roleNameMap = {
    superadmin: 'Quản trị viên cấp cao (Superadmin)',
    project_admin: 'Quản trị viên dự án',
    subadmin: 'Quản trị viên (Admin)',
    agent: 'Chủ cơ sở / Quản lý (Agent)',
    sale: 'Nhân viên tư vấn (Sale)'
  };
  const displayRole = roleNameMap[role] || 'Thành viên quản trị';
  const resolvedLoginUrl = loginUrl || `${process.env.FRONTEND_URL || 'https://pastie.dealhot.info'}/admin.html`;

  try {
    const data = await resendClient.emails.send({
      from: `Pastie AI Console <${sender}>`,
      to: [toEmail],
      subject: `[Kích hoạt tài khoản] Chào mừng bạn gia nhập Pastie AI Console (${displayRole})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #ec4899; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">Pastie AI Console</h2>
            <p style="color: #64748b; font-size: 13.5px; margin: 0;">Thông báo kích hoạt tài khoản quản trị & CSKH đa kênh</p>
          </div>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Xin chào <b>${fullName || toEmail}</b>,</p>
          <p style="font-size: 14.5px; line-height: 1.6; color: #334155;">
            Tài khoản của bạn đã được khởi tạo thành công trên hệ thống <b>Pastie AI Console</b>${createdByName ? ` bởi <b>${createdByName}</b>` : ''}.
          </p>
          <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 13.5px; color: #831843;"><b>Email đăng nhập:</b> ${toEmail}</p>
            <p style="margin: 4px 0; font-size: 13.5px; color: #831843;"><b>Vai trò:</b> ${displayRole}</p>
            <p style="margin: 4px 0; font-size: 13.5px; color: #831843;"><b>Trạng thái:</b> <span style="color: #059669; font-weight: 700;">Đã kích hoạt</span></p>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Bạn có thể đăng nhập ngay vào hệ thống bằng địa chỉ email trên thông qua tính năng <b>Đăng nhập bằng Email OTP</b> hoặc <b>Đăng nhập bằng Google</b>:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resolvedLoginUrl}" target="_blank" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14.5px; display: inline-block; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.35);">
              Truy cập Pastie AI Console &rarr;
            </a>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} Pastie AI Console &bull; DealPhuQuoc Integration</p>
        </div>
      `
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

