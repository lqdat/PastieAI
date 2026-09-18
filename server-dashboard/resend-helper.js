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

// ─── NỘI DUNG MAIL OTP CHO KHÁCH, THEO NGÔN NGỮ KHÁCH CHỌN ─────────────────
//
// Mail này trước đây viết cứng tiếng Việt — cả tiêu đề lẫn thân mail. Khách
// chọn tiếng Hàn hay Kazakh ở màn đăng nhập vẫn nhận một lá thư tiếng Việt,
// và đây là thứ ĐẦU TIÊN họ nhận được từ hệ thống, trước cả khi vào được chat.
//
// Dịch sẵn chứ không gọi máy dịch: mail phải gửi đi ngay, không chờ được một
// lượt gọi mạng nữa, và lượt đó hỏng thì khách không nhận được mã.
const NOI_DUNG_OTP = {
  vi: { tieuDe: 'Mã xác thực', dau: 'Xác thực tài khoản Pastie', chao: 'Chào bạn,',
        huong: 'Vui lòng nhập mã dưới đây vào khung chat để xác thực email và bắt đầu được hỗ trợ:',
        hetHan: 'Mã có hiệu lực trong <b>5 phút</b>.' },
  en: { tieuDe: 'Verification code', dau: 'Verify your Pastie account', chao: 'Hello,',
        huong: 'Enter the code below in the chat to verify your email and start getting help:',
        hetHan: 'The code is valid for <b>5 minutes</b>.' },
  ru: { tieuDe: 'Код подтверждения', dau: 'Подтверждение аккаунта Pastie', chao: 'Здравствуйте,',
        huong: 'Введите код ниже в чат, чтобы подтвердить почту и начать получать помощь:',
        hetHan: 'Код действителен <b>5 минут</b>.' },
  zh: { tieuDe: '验证码', dau: '验证您的 Pastie 账户', chao: '您好，',
        huong: '请在聊天框中输入以下验证码，以验证邮箱并开始咨询：',
        hetHan: '验证码有效期为 <b>5 分钟</b>。' },
  ko: { tieuDe: '인증번호', dau: 'Pastie 계정 인증', chao: '안녕하세요,',
        huong: '이메일 인증을 위해 아래 번호를 채팅창에 입력해 주세요:',
        hetHan: '인증번호는 <b>5분</b> 동안 유효합니다.' },
  kk: { tieuDe: 'Растау коды', dau: 'Pastie тіркелгісін растау', chao: 'Сәлеметсіз бе,',
        huong: 'Поштаңызды растап, көмек алуды бастау үшін төмендегі кодты чатқа енгізіңіз:',
        hetHan: 'Код <b>5 минут</b> жарамды.' },
};

function chuOtp(lang) {
  const ma = String(lang || '').trim().toLowerCase().slice(0, 2);
  return NOI_DUNG_OTP[ma] || NOI_DUNG_OTP.vi;
}

/**
 * Sends a 6-digit OTP code to a visitor's email.
 * @param {string} toEmail The recipient's email address.
 * @param {string} otpCode The 6-digit verification code.
 * @param {string} [lang] Mã ngôn ngữ khách đang chọn (vi/en/ru/zh/ko/kk).
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
async function sendOTPEmail(toEmail, otpCode, lang) {
  if (!resendClient) {
    const msg = 'Resend client not initialized — RESEND_API_KEY missing.';
    console.error(msg);
    return { ok: false, reason: msg };
  }

  const sender = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const chu = chuOtp(lang);

  try {
    const data = await resendClient.emails.send({
      from: `Pastie Support <${sender}>`,
      to: [toEmail],
      subject: `[OTP] ${chu.tieuDe}: ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center;">${chu.dau}</h2>
          <p>${chu.chao}</p>
          <p>${chu.huong}</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e1b4b; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px; border: 1px solid #d1d5db;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">${chu.hetHan}</p>
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

// Xuất ra để bài đo đọc được nội dung mail mà KHÔNG phải gửi mail thật: gửi
// thật thì cần khoá Resend, tốn tiền, và không đọc lại được thư đã đi.
module.exports = {
  NOI_DUNG_OTP,
  chuOtp,
  sendOTPEmail,
  sendAdminOTPEmail
};
