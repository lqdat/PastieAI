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

module.exports = {
  sendOTPEmail
};
