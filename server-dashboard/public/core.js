// Lõi dùng chung của bảng điều khiển Pastie.
//
// Xác thực, gọi API kèm token, ràng buộc thiết bị, thông báo nổi, hộp xác nhận,
// tiện ích chuỗi, header, và hồ sơ tài khoản của chính người đang đăng nhập.
// Mọi vai trò đều dùng file này.
//
// THỨ TỰ NẠP: core -> chat -> org-console -> project-admin -> menu-console -> admin.
// admin.js nạp sau cùng vì nó chứa toàn bộ câu lệnh chạy lúc nạp; các file này
// chỉ chứa khai báo, không tự chạy gì.

// ----------------------------------------------------
// AUTHENTICATION LOGIC
// ----------------------------------------------------

function getToken() {
    return localStorage.getItem('pastie_admin_token') || '';
}


// =====================================================================
// Thông báo và hộp xác nhận trong ứng dụng
//
// Thay cho alert() / confirm() của trình duyệt, vốn hiện tên miền
// "api.pastiechat.com says", không theo được giao diện, và quan trọng hơn:
// alert() KHÓA hẳn luồng JS — trong lúc hộp thoại mở thì polling chat, ghi âm và
// mọi timer đều đứng.
//
// pastieConfirm() trả về Promise<boolean> nên chỗ gọi vẫn đọc tuần tự như confirm().
// =====================================================================

function ensureToastHost() {
    let host = document.getElementById('app-toast-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'app-toast-host';
        host.className = 'toast-host';
        host.setAttribute('role', 'status');
        host.setAttribute('aria-live', 'polite');
        document.body.appendChild(host);
    }
    return host;
}


/**
 * @param {string} message  Nội dung hiển thị
 * @param {'success'|'error'|'info'} [kind]
 * @param {number} [duration]  ms; lỗi để lâu hơn vì người dùng cần đọc kỹ
 */
function showToast(message, kind = 'info', duration) {
    const text = String(message || '').trim();
    if (!text) return;
    const host = ensureToastHost();

    // Cùng một lỗi lặp lại (ví dụ mỗi vòng poll) thì không xếp chồng, chỉ đếm số lần.
    const existing = [...host.children].find((node) => node.dataset.message === text);
    if (existing) {
        const badge = existing.querySelector('.toast-count');
        const next = Number(badge?.dataset.count || 1) + 1;
        if (badge) { badge.dataset.count = String(next); badge.textContent = `×${next}`; badge.classList.remove('hide'); }
        clearTimeout(Number(existing.dataset.timer));
        existing.dataset.timer = String(setTimeout(() => dismissToast(existing), duration || (kind === 'error' ? 6000 : 3500)));
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${kind}`;
    toast.dataset.message = text;
    toast.innerHTML = `
        <i class="${TOAST_ICONS[kind] || TOAST_ICONS.info}"></i>
        <span class="toast-text"></span>
        <span class="toast-count hide" data-count="1"></span>
        <button type="button" class="toast-close" aria-label="Đóng"><i class="ri-close-line"></i></button>`;
    toast.querySelector('.toast-text').textContent = text;
    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
    host.appendChild(toast);
    toast.dataset.timer = String(setTimeout(() => dismissToast(toast), duration || (kind === 'error' ? 6000 : 3500)));
}


function dismissToast(toast) {
    if (!toast || toast.classList.contains('is-leaving')) return;
    clearTimeout(Number(toast.dataset.timer));
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
}


const toastSuccess = (message) => showToast(message, 'success');

const toastError = (message) => showToast(message, 'error');

const toastInfo = (message) => showToast(message, 'info');


/**
 * Hộp xác nhận thay cho confirm().
 * @returns {Promise<boolean>}
 */
function pastieConfirm(message, options = {}) {
    const {
        title = 'Xác nhận',
        confirmText = 'Đồng ý',
        cancelText = 'Hủy',
        danger = false,
    } = options;

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-card" role="alertdialog" aria-modal="true">
                <div class="confirm-icon ${danger ? 'is-danger' : ''}">
                    <i class="${danger ? 'ri-alert-line' : 'ri-question-line'}"></i>
                </div>
                <h3 class="confirm-title"></h3>
                <p class="confirm-message"></p>
                <div class="confirm-actions">
                    <button type="button" class="confirm-cancel"></button>
                    <button type="button" class="confirm-ok ${danger ? 'is-danger' : ''}"></button>
                </div>
            </div>`;
        overlay.querySelector('.confirm-title').textContent = title;
        overlay.querySelector('.confirm-message').textContent = message;
        overlay.querySelector('.confirm-cancel').textContent = cancelText;
        overlay.querySelector('.confirm-ok').textContent = confirmText;
        document.body.appendChild(overlay);

        const close = (result) => {
            document.removeEventListener('keydown', onKey);
            overlay.classList.add('is-leaving');
            setTimeout(() => overlay.remove(), 180);
            resolve(result);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') close(false);
            if (event.key === 'Enter') close(true);
        };

        overlay.querySelector('.confirm-ok').addEventListener('click', () => close(true));
        overlay.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
        overlay.addEventListener('click', (event) => { if (event.target === overlay) close(false); });
        document.addEventListener('keydown', onKey);
        // Mặc định đặt con trỏ ở nút Hủy: thao tác nguy hiểm không nên chỉ cần Enter.
        setTimeout(() => overlay.querySelector(danger ? '.confirm-cancel' : '.confirm-ok')?.focus(), 30);
    });
}


function getDeviceId() {
    // Cookie do MÁY CHỦ đặt sống lâu hơn localStorage: iOS Safari xoá
    // localStorage sau 7 ngày không mở trang, và tab Riêng tư không lưu gì —
    // mất mã là máy cũ bị tính thành máy mới, đúng lỗi "tự nhiên hết suất".
    // Ba chỗ lưu tự vá cho nhau: cookie ⟷ localStorage.
    let id = '';
    try {
        id = (document.cookie.match(/(?:^|;\s*)pastie_did=([^;]+)/) || [])[1] || '';
        if (id) id = decodeURIComponent(id);
    } catch { id = ''; }
    if (id) {
        try { localStorage.setItem('pastie_device_id', id); } catch {}
        return id;
    }
    id = localStorage.getItem('pastie_device_id');
    if (!id) {
        id = 'dev_' + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
        localStorage.setItem('pastie_device_id', id);
    }
    return id;
}


// Vân tay thiết bị nhẹ. Chỉ để đối chiếu: device_id trùng nhưng vân tay lệch hẳn
// là dấu hiệu ai đó copy device_id sang máy khác. KHÔNG dùng thay device_id vì
// vân tay quá dễ trùng giữa các máy cùng đời, cùng hệ điều hành.
function getDeviceFingerprint() {
    try {
        const parts = [
            navigator.userAgent || '',
            navigator.platform || '',
            `${screen.width}x${screen.height}x${screen.colorDepth || ''}`,
            Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            String(navigator.hardwareConcurrency || ''),
        ].join('|');
        // Hash 32-bit (FNV-1a) — đủ để so sánh, không cần thư viện ngoài.
        let hash = 0x811c9dc5;
        for (let i = 0; i < parts.length; i += 1) {
            hash ^= parts.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
    } catch {
        return '';
    }
}


// Header nhận diện thiết bị cho CÁC REQUEST ĐĂNG NHẬP.
//
// Quan trọng: đăng nhập dùng fetch thuần chứ không qua authFetch (lúc đó chưa có
// token), nên nếu không thêm ở đây thì server không nhận được device_id và lớp 2
// license sẽ không bao giờ kích hoạt — kiểm tra luôn cho qua vì tưởng client cũ.
// Vân tay của MÁY, không phải của trình duyệt.
//
// Cố tình KHÔNG lấy tên và phiên bản trình duyệt: mục đích là Safari và Chrome
// trên cùng một chiếc iPhone cho ra CÙNG một giá trị, để máy chủ nhận ra đó vẫn
// là một máy. Chỉ lấy phần cứng (màn hình, tỉ lệ điểm ảnh, số nhân, RAM) và hệ
// điều hành cùng múi giờ.
//
// Hai máy cùng đời, cùng múi giờ sẽ trùng vân tay — nên máy chủ chỉ dùng nó để
// GOM khi máy cũ đã im hơn 10 phút, không dùng để nhận dạng.
function getMachineFingerprint() {
    try {
        const ua = navigator.userAgent || '';
        const os = (ua.match(/\((?:[^)]*?)(iPhone OS [\d_]+|Android [\d.]+|Mac OS X [\d_]+|Windows NT [\d.]+)[^)]*\)/) || [])[1] || '';
        const parts = [
            os,
            navigator.platform || '',
            `${screen.width}x${screen.height}`,
            String(window.devicePixelRatio || ''),
            String(screen.colorDepth || ''),
            Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            String(navigator.hardwareConcurrency || ''),
            String(navigator.deviceMemory || ''),
            String(navigator.maxTouchPoints || ''),
        ].join('|');
        let hash = 0x811c9dc5;
        for (let i = 0; i < parts.length; i += 1) {
            hash ^= parts.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return 'm' + hash.toString(16).padStart(8, '0');
    } catch {
        return '';
    }
}


function isStandaloneApp() {
    try {
        return Boolean(
            window.matchMedia?.('(display-mode: standalone)').matches
            || window.navigator.standalone === true
            || (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
        );
    } catch {
        return false;
    }
}


function deviceHeaders(extra = {}) {
    return {
        ...extra,
        'X-Device-Id': getDeviceId(),
        'X-Device-Fp': getDeviceFingerprint(),
        'X-Machine-Fp': getMachineFingerprint(),
        'X-App-Mode': isStandaloneApp() ? 'standalone' : 'browser',
    };
}


// LƯỢT GỌI CÓ HẠN GIỜ.
//
// fetch() không bao giờ tự bỏ cuộc. Một endpoint TREO (route async ném lỗi mà
// Express 4 không bắt thì máy chủ không trả gì cả) là lượt await ở đây chờ vĩnh
// viễn — và cả khung chat đứng theo, vì openChat phải chờ đơn và hoá đơn xong
// mới vẽ tin nhắn. Đó chính là spinner "Đang dịch thuật..." đứng mãi.
//
// Hết hạn thì coi như không có dữ liệu và đi tiếp: thà vẽ khung chat thiếu tấm
// hoá đơn trong vài giây còn hơn không vẽ gì.
function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), timeoutMs);
    return fetch(url, { ...options, signal: stop.signal })
        .finally(() => clearTimeout(timer));
}
window.fetchWithTimeout = fetchWithTimeout;

function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
        'X-Device-Id': getDeviceId(),
        'X-Device-Fp': getDeviceFingerprint(),
        'X-Machine-Fp': getMachineFingerprint(),
        'X-App-Mode': isStandaloneApp() ? 'standalone' : 'browser'
    };
    return fetch(url, { ...options, headers }).then(res => {
        if (res.status === 401) {
            res.clone().json().then(data => {
                if (data && data.code === 'SESSION_REVOKED') {
                    handleSessionRevoked('new_login');
                }
            }).catch(() => {});
        }
        const isDraining = res.headers.get('x-shift-draining') === 'true';
        window.CURRENT_SHIFT_DRAINING = isDraining;
        const drainingBanner = document.getElementById('shift-draining-banner');
        if (drainingBanner) {
            drainingBanner.classList.toggle('hide', !isDraining || !currentSessionId);
        }
        return res;
    });
}


function setLoginError(msg) {
    const errBox = document.getElementById('login-error-msg');
    const succBox = document.getElementById('login-success-msg');
    if (succBox) succBox.style.display = 'none';
    if (errBox) {
        if (msg) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
        } else {
            errBox.style.display = 'none';
        }
    }
}


function setLoginSuccess(msg) {
    const errBox = document.getElementById('login-error-msg');
    const succBox = document.getElementById('login-success-msg');
    if (errBox) errBox.style.display = 'none';
    if (succBox) {
        if (msg) {
            succBox.textContent = msg;
            succBox.style.display = 'block';
        } else {
            succBox.style.display = 'none';
        }
    }
}


// Khởi tạo Google Sign-in button (tham khảo DealPhuQuoc)
async function initGoogleAuth() {
    try {
        const configRes = await fetch(`${API_BASE}/api/admin/auth/config`);
        const configData = await configRes.json().catch(() => ({}));
        const googleClientId = (configData.googleClientId || '').trim();

        const slot = document.getElementById('google-signin-btn-container');
        const customBtn = document.getElementById('google-auth-trigger-btn');

        const renderGoogleBtn = () => {
            if (googleClientId && window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: window.handleGoogleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                if (slot) {
                    slot.innerHTML = '';
                    try {
                        window.google.accounts.id.renderButton(slot, {
                            type: 'standard',
                            theme: 'outline',
                            size: 'large',
                            text: 'continue_with',
                            shape: 'pill',
                            logo_alignment: 'left',
                            width: 340
                        });
                    } catch(e) {}
                    if (customBtn && slot.childElementCount > 0) {
                        customBtn.classList.add('hide');
                    }
                }
            }
        };

        if (window.google?.accounts?.id) {
            renderGoogleBtn();
        } else {
            // Wait for script to load if needed
            let gsiScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
            if (gsiScript) {
                gsiScript.addEventListener('load', renderGoogleBtn, { once: true });
            }
        }
    } catch (e) {
        console.warn('Init Google auth error:', e);
    }
}


function handleGoogleAuthTrigger() {
    try {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
        } else {
            setLoginError('Đang tải mô-đun Google Sign-In, vui lòng thử lại sau giây lát hoặc sử dụng OTP Email.');
        }
    } catch(e) {
        setLoginError('Không thể mở đăng nhập Google: ' + e.message);
    }
}


// Bị chặn vì gửi OTP quá nhiều lần: đếm lùi tới lúc được gửi lại.
//
// Một đồng hồ duy nhất cho cả màn đăng nhập, dừng ngay khi người dùng đổi
// email hoặc form được dọn — nếu không, hai lần bị chặn liên tiếp sẽ để lại
// hai setInterval cùng ghi vào một ô chữ và số nhảy loạn.
let loginRetryInterval = null;
function stopLoginRetryCountdown() {
    if (loginRetryInterval) { clearInterval(loginRetryInterval); loginRetryInterval = null; }
}
function startLoginRetryCountdown(seconds) {
    stopLoginRetryCountdown();
    const sendBtn = document.getElementById('send-admin-otp-btn');
    let remaining = Math.max(1, Math.ceil(seconds));
    const tick = () => {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        setLoginError(`Đã gửi mã quá nhiều lần. Thử lại sau ${m}:${s < 10 ? '0' : ''}${s}.`);
        if (sendBtn) sendBtn.disabled = true;
        if (remaining <= 0) {
            stopLoginRetryCountdown();
            setLoginError('');
            if (sendBtn) sendBtn.disabled = false;
        }
        remaining--;
    };
    tick();
    loginRetryInterval = setInterval(tick, 1000);
}


// Bắt đầu đếm ngược OTP (mặc định 60 giây; nếu đang bật bypass thì 0 giây)
async function startOtpCountdown(seconds = 60) {
    if (adminOtpCountdownInterval) clearInterval(adminOtpCountdownInterval);
    const countdownEl = document.getElementById('admin-otp-countdown');
    const resendBtn = document.getElementById('resend-admin-otp-btn');

    // Kiểm tra nhanh xem hệ thống có đang bật chế độ bỏ qua chờ OTP không
    try {
        const checkRes = await fetch(`${API_BASE}/api/auth/otp-bypass-check`).catch(() => null);
        if (checkRes && checkRes.ok) {
            const data = await checkRes.json().catch(() => ({}));
            if (data.bypassEnabled) {
                if (countdownEl) countdownEl.textContent = 'Chế độ bỏ qua chờ đang BẬT: Bạn có thể gửi lại ngay.';
                if (resendBtn) resendBtn.disabled = false;
                return;
            }
        }
    } catch (_) {}

    let remaining = seconds;
    if (resendBtn) resendBtn.disabled = true;

    function update() {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        if (countdownEl) {
            countdownEl.textContent = `Gửi lại sau ${m}:${s < 10 ? '0' : ''}${s}`;
        }
        if (remaining <= 0) {
            clearInterval(adminOtpCountdownInterval);
            if (countdownEl) countdownEl.textContent = 'Bạn có thể gửi lại mã OTP mới.';
            if (resendBtn) resendBtn.disabled = false;
        }
        remaining--;
    }
    update();
    adminOtpCountdownInterval = setInterval(update, 1000);
}


function getAdminOtpDigits() {
    return Array.from(document.querySelectorAll('.dpq-otp-digit'));
}


// Xoá sạch sáu ô OTP và đưa con trỏ về ô đầu.
//
// Nhập sai mà giữ lại mã cũ thì người dùng phải tự xoá từng ô mới gõ lại được —
// đúng lúc họ đang bối rối vì vừa bị báo sai. Gọi syncAdminOtpCode() sau khi
// xoá để nút Xác nhận khoá lại theo, nếu không nút vẫn sáng với một ô rỗng.
function clearAdminOtpDigits() {
    const digits = getAdminOtpDigits();
    digits.forEach((input) => { input.value = ''; });
    syncAdminOtpCode();
    digits[0]?.focus();
}


function syncAdminOtpCode() {
    const digits = getAdminOtpDigits();
    const code = digits.map((input) => input.value.replace(/\D/g, '').slice(-1)).join('');
    const hidden = document.getElementById('admin-otp-code-input');
    const verifyBtn = document.getElementById('verify-admin-otp-btn');
    if (hidden) hidden.value = code;
    if (verifyBtn) verifyBtn.disabled = code.length !== 6;
    digits.forEach((input) => input.classList.toggle('is-filled', !!input.value));
    return code;
}


function fillAdminOtpDigits(value) {
    const numbers = String(value || '').replace(/\D/g, '').slice(0, 6);
    const digits = getAdminOtpDigits();
    digits.forEach((input, index) => { input.value = numbers[index] || ''; });
    syncAdminOtpCode();
    (digits[Math.min(numbers.length, 5)] || digits[0])?.focus();
}


function clearAdminOtpDigits() {
    fillAdminOtpDigits('');
}


function setupAdminOtpDigits() {
    const digits = getAdminOtpDigits();
    digits.forEach((input, index) => {
        input.addEventListener('input', (event) => {
            const raw = event.target.value.replace(/\D/g, '');
            if (raw.length > 1) return fillAdminOtpDigits(raw);
            event.target.value = raw.slice(-1);
            syncAdminOtpCode();
            if (event.target.value && index < digits.length - 1) digits[index + 1].focus();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && !input.value && index > 0) {
                digits[index - 1].value = '';
                digits[index - 1].focus();
                syncAdminOtpCode();
            }
            if (event.key === 'ArrowLeft' && index > 0) digits[index - 1].focus();
            if (event.key === 'ArrowRight' && index < digits.length - 1) digits[index + 1].focus();
        });
        input.addEventListener('focus', () => input.select());
    });
    document.getElementById('admin-otp-digits')?.addEventListener('paste', (event) => {
        const pasted = event.clipboardData?.getData('text') || '';
        if (!/\d/.test(pasted)) return;
        event.preventDefault();
        fillAdminOtpDigits(pasted);
    });
    syncAdminOtpCode();
}


// Xử lý gửi mã OTP Email
async function handleSendAdminOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById('admin-otp-email-input');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) {
        setLoginError('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
    }

    const sendBtn = document.getElementById('send-admin-otp-btn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = 'Đang gửi mã... <i class="ri-loader-4-line ri-spin"></i>';
    }
    setLoginError('');
    setLoginSuccess('');

    try {
        const res = await fetch(`${API_BASE}/api/admin/auth/otp/send`, {
            method: 'POST',
            headers: deviceHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            currentOtpTargetEmail = email;
            document.getElementById('otp-step-email')?.classList.add('hide');
            document.getElementById('otp-step-verify')?.classList.remove('hide');
            const targetDisplay = document.getElementById('otp-target-email-display');
            if (targetDisplay) targetDisplay.textContent = email;
            
            const titleEl = document.getElementById('dpq-login-title');
            if (titleEl) titleEl.textContent = 'Nhập mã xác nhận';

            startOtpCountdown(300);
            clearAdminOtpDigits();
        } else if (res.status === 429) {
            // Máy chủ trả về số giây còn lại ở header Retry-After. In thẳng
            // "thử lại sau 418 giây" thì người dùng phải tự nhẩm, và con số
            // đứng im nên trông như màn hình bị treo — đếm lùi cho thấy nó
            // đang chạy và bao giờ thì hết.
            startLoginRetryCountdown(Number(res.headers.get('Retry-After')) || 600);
        } else {
            setLoginError(data.error || 'Không thể gửi mã OTP.');
        }
    } catch (e) {
        setLoginError('Lỗi kết nối khi gửi OTP: ' + e.message);
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>Tiếp tục</span>';
        }
    }
}


// Xử lý xác thực mã OTP
async function handleVerifyAdminOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const otpCode = syncAdminOtpCode();
    if (!otpCode || otpCode.length < 6) {
        setLoginError('Vui lòng nhập đủ 6 chữ số mã OTP.');
        return;
    }

    const verifyBtn = document.getElementById('verify-admin-otp-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = 'Đang kiểm tra... <i class="ri-loader-4-line ri-spin"></i>';
    }
    setLoginError('');

    try {
        const res = await fetch(`${API_BASE}/api/admin/auth/otp/verify`, {
            method: 'POST',
            headers: deviceHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email: currentOtpTargetEmail, otpCode })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            beginNewAdminSession(data.token);
            setLoginSuccess('Xác thực thành công! Đang vào hệ thống...');
            if (adminOtpCountdownInterval) clearInterval(adminOtpCountdownInterval);
            setTimeout(() => {
                hideLogin();
                initDashboard();
            }, 400);
        } else {
            setLoginError(data.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
            clearAdminOtpDigits();
        }
    } catch (e) {
        setLoginError('Lỗi kết nối khi xác thực OTP: ' + e.message);
        // Lỗi mạng cũng xoá: không biết mã đã tới máy chủ hay chưa, để nguyên
        // sáu số rồi bấm lại là dễ dính giới hạn số lần thử.
        clearAdminOtpDigits();
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<span>Xác nhận</span>';
        }
    }
}


function handleChangeOtpEmail() {
    if (adminOtpCountdownInterval) clearInterval(adminOtpCountdownInterval);
    stopLoginRetryCountdown();
    document.getElementById('otp-step-verify')?.classList.add('hide');
    document.getElementById('otp-step-email')?.classList.remove('hide');
    // Trả tiêu đề về đúng bản dịch của ngôn ngữ đang chọn, thay vì viết cứng một
    // chuỗi tiếng Anh. Viết cứng thì đổi ngôn ngữ console xong tiêu đề đứng im.
    const titleEl = document.getElementById('dpq-login-title');
    if (titleEl) {
        const dict = (typeof TRANSLATIONS === 'object' && TRANSLATIONS)
            ? (TRANSLATIONS[typeof currentLang !== 'undefined' ? currentLang : 'vi'] || TRANSLATIONS.vi)
            : null;
        titleEl.textContent = dict?.loginTitle || 'Pastie AI Console';
    }
    setLoginError('');
    setLoginSuccess('');
    clearAdminOtpDigits();
    document.getElementById('admin-otp-email-input')?.focus();
}


// Gắn sự kiện tương tác Form đăng nhập OTP & Google
function setupAuthEvents() {
    setupAdminOtpDigits();
}


// Đổi token SSO (?sso=) lấy phiên đăng nhập (Hỗ trợ tương thích ngược)
async function doSsoLogin() {
    const params = new URLSearchParams(window.location.search);
    let sso = params.get('sso') || params.get('token') || params.get('sso_token') || params.get('ssoToken');
    
    if (!sso && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^[#?]/, ''));
        sso = hashParams.get('sso') || hashParams.get('token') || hashParams.get('sso_token') || hashParams.get('ssoToken');
    }

    if (!sso) return false;
    try {
        const r = await fetch(`${API_BASE}/api/admin/sso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: sso })
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.token) {
            beginNewAdminSession(d.token);
            params.delete('sso');
            params.delete('token');
            params.delete('sso_token');
            params.delete('ssoToken');
            window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
            return true;
        }
        setLoginError(d.error || 'Đăng nhập SSO DealPhuQuoc thất bại.');
        return false;
    } catch (e) {
        console.error('SSO error:', e);
        setLoginError('Lỗi kết nối khi xác thực SSO: ' + e.message);
        return false;
    }
}


async function verifyAuthAndInit() {
    setupAuthEvents();
    initGoogleAuth();

    await doSsoLogin(); // tự động thử nếu URL có ?sso

    const token = getToken();
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/chats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 200) {
            hideLogin();
            initDashboard();
        } else {
            localStorage.removeItem('pastie_admin_token');
            showLogin();
        }
    } catch (e) {
        console.error('Connection error verifying authentication:', e);
        showLogin();
    }
}


function showLogin() {
    loginModal.classList.remove('hide');
    mainDashboard.classList.add('hide');
    // ĐƯA FORM VỀ BƯỚC ĐẦU.
    //
    // Không làm việc này thì màn đăng nhập mở lại ở đúng trạng thái lúc bị đá ra:
    // bước nhập OTP, sáu ô còn nguyên mã cũ, đồng hồ "Gửi lại sau 4:28" vẫn chạy.
    // Người dùng thấy một mã OTP đã hết hiệu lực và không có đường quay lại ô
    // email — trông như hệ thống treo.
    //
    // Hàm này đã có sẵn cho nút "Đổi email"; chỉ là chưa ai gọi nó ở đây.
    if (typeof handleChangeOtpEmail === 'function') handleChangeOtpEmail();
    if (adminEventSource) {
        adminEventSource.close();
        adminEventSource = null;
    }
    clearTimeout(adminEventReconnectTimer);
    clearTimeout(realtimeRefreshTimer);
    if (pollInterval) clearInterval(pollInterval);
    if (messagePollInterval) clearInterval(messagePollInterval);
    setLoginError('');
    setLoginSuccess('');
    initGoogleAuth();
}


function hideLogin() {
    loginModal.classList.add('hide');
    mainDashboard.classList.remove('hide');
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
}


function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function postToParent(payload) { try { window.parent?.postMessage(payload, '*'); } catch {} }


// True khi sắp tự xin quyền — dùng để setupPushNotifications() không mở hộp thoại
// chồng lên hộp thoại của trình duyệt.
function willAutoRequestPermission() {
    return !inIframe
        && typeof Notification !== 'undefined'
        && Notification.permission === 'default'
        && !getPushSupportIssue();
}

async function initDashboard() {
    await loadAdminProfile();   // biết role + project_id trước khi dựng filter
    await loadProjects();        // tải registry dự án
    await setupPushNotifications();
    // Không await: hộp thoại quyền của trình duyệt không được chặn phần còn lại của dashboard khởi động.
    void requestNotificationPermission();

    // Kết nối Realtime SSE Stream: chỉ nhận sự kiện khi có tin nhắn mới hoặc cập nhật
    connectAdminEvents();

    // Tải danh sách ban đầu
    fetchSessions();

    // Đồng bộ khi người dùng quay lại tab trình duyệt
    if (!isVisibilitySyncSetup) {
        isVisibilitySyncSetup = true;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                fetchSessions();
                if (currentSessionId) {
                    loadMessages(currentSessionId);
                    loadOrderForAdmin(currentSessionId);
                }
            }
        });
    }

    // Safety fallback: chỉ kiểm tra 60s/lần nếu tab đang mở và SSE bị gián đoạn
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
        if (!document.hidden && (!adminEventSource || adminEventSource.readyState !== EventSource.OPEN)) {
            fetchSessions();
        }
    }, 60000);
}


async function loadAdminProfile() {
    try {
        const res = await authFetch(`${API_BASE}/api/admin/me`);
        if (!res.ok) return;
        const data = await res.json();
        const admin = data.admin || data; // /me trả { admin: {...} }
        CURRENT_ADMIN = admin;
        const nameEl = document.getElementById('admin-profile-name');
        const badgeEl = document.getElementById('admin-profile-badge');
        const manageBtn = document.getElementById('manage-admins-btn');
        if (nameEl) nameEl.textContent = admin.full_name || admin.username;
        if (badgeEl) badgeEl.style.display = 'flex';
        const isSuperOrProjectAdmin = ['superadmin', 'project_admin'].includes(admin.role);
        const isAccountRole = ['superadmin', 'project_admin', 'agent', 'sale'].includes(admin.role);
        if (manageBtn) manageBtn.classList.toggle('hide', !isAccountRole);
        const knowledgeBtn = document.getElementById('knowledge-settings-btn');
        if (knowledgeBtn) knowledgeBtn.classList.toggle('hide', admin.role !== 'superadmin');
        // Project Admin and Agent can only open the account/QR workspace; all
        // channel, knowledge and data-export settings stay Superadmin-only.
        ['keyword-settings-btn', 'channel-settings-btn', 'export-csv-btn', 'export-jsonl-btn'].forEach(id => {
            document.getElementById(id)?.classList.toggle('hide', admin.role !== 'superadmin');
        });
        if (deleteSessionBtn) deleteSessionBtn.classList.toggle('hide', admin.role !== 'superadmin');
        if (projectFilter && admin.role !== 'superadmin' && admin.project_id) {
            projectFilter.title = `Dự án được phân quyền: ${admin.project_id}`;
        }

        updateAgentHeaderUI();
    } catch (e) {
        console.error('Failed to load admin profile:', e);
    }
}


function updateProjectFilterDropdown(sessions) {
    const existingValue = projectFilter.value;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    // Nguồn chính = registry dự án (PROJECTS). Kèm project_id lạ từ session (fallback).
    const map = new Map();
    (PROJECTS || []).forEach(p => map.set(p.id, p.name || p.id));
    (sessions || []).forEach(s => { if (s.project_id && !map.has(s.project_id)) map.set(s.project_id, s.project_id); });

    // Chỉ superadmin có tuỳ chọn "Tất cả dự án"; tài khoản scoped thì không.
    const isScoped = CURRENT_ADMIN && CURRENT_ADMIN.role !== 'superadmin' && CURRENT_ADMIN.project_id;
    projectFilter.innerHTML = isScoped ? '' : `<option value="">${dict.allProjects}</option>`;
    map.forEach((name, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        projectFilter.appendChild(opt);
    });

    // Tài khoản scoped: khoá filter về đúng project của mình
    if (isScoped) {
        projectFilter.value = CURRENT_ADMIN.project_id;
        projectFilter.disabled = true;
        currentProjectFilter = CURRENT_ADMIN.project_id;
        projectFilter.setAttribute('aria-label', `Dự án được phân quyền: ${map.get(CURRENT_ADMIN.project_id) || CURRENT_ADMIN.project_id}`);
    }
    else { projectFilter.value = existingValue; }
}


function getProjectDetails(projectId) {
    const project = PROJECTS.find(p => p.id === projectId);
    return {
        name: project?.name || projectId || 'Chưa xác định',
        url: project?.website_url || PROJECT_WEBSITES[projectId] || ''
    };
}


// --- Vai trò -----------------------------------------------------------------
// Sau khi phân cấp lại: 'sale' là người trực tiếp trả lời chat (vai trò mà
// 'agent' đảm nhiệm trước đây), còn 'agent' là cấp quản lý Sale, nhóm và QR.
// Cả hai đều dùng console rút gọn: không dropdown dự án, không menu Cài đặt.
const isSaleRole = () => CURRENT_ADMIN?.role === 'sale';

// Hai khái niệm KHÁC NHAU, đừng gộp:
//
//  isRestrictedConsole() — console rút gọn (không dropdown dự án, không menu Cài
//    đặt, không tự sửa tên). Áp cho mọi role 'agent' và 'sale', kể cả nhân viên
//    DealPhuQuoc — đúng như hành vi trước khi phân cấp lại, không được đổi.
//
//  isAgentManagerRole() — quyền quản lý Sale, nhóm và QR. CHỈ tồn tại trong dự án
//    QR Concierge. DealPhuQuoc cũng cấp role 'agent' cho nhân viên của họ, nên
//    nếu chỉ xét role thì họ sẽ thấy nút quản lý Sale không dùng được.
const isRestrictedConsole = () => CURRENT_ADMIN?.role === 'agent' || isSaleRole();

const isAgentManagerRole = () => CURRENT_ADMIN?.role === 'agent' && isQrConciergeProject(CURRENT_ADMIN?.project_id);


function updateConsoleBrand() {
    const el = document.getElementById('console-brand-name');
    if (!el) return;

    // Không bao giờ hiện tên thương hiệu bằng CHỮ cạnh logo: ảnh logo đã là
    // wordmark "Pastie Chat", viết lại bằng text là lặp đúng một nội dung hai
    // lần — mà bản vẽ bằng font hệ thống thì không thể giống logo thật.
    //
    // Ô chữ này chỉ còn một nhiệm vụ: hiện TÊN DỰ ÁN cho tài khoản quản lý nhiều
    // dự án. Agent/Sale chỉ có một dự án nên bỏ trống.
    el.classList.remove('pastie-chat-wordmark');
    el.removeAttribute('aria-label');

    const project = isRestrictedConsole()
        ? null
        : (PROJECTS || []).find(item => item.id === CURRENT_ADMIN?.project_id);
    const label = project ? (project.display_name || project.name || project.id) : '';
    el.textContent = label;
    el.classList.toggle('hide', !label);
}


// Header dành riêng cho Agent: thương hiệu "Pastie Chat" + tên Agent hiển thị to,
// ẩn dropdown dự án, và tách "Quản lý tài khoản" / "Mã QR" ra 2 nút riêng
// (không nằm trong menu Cài đặt nữa).
// Gọi ở cả loadAdminProfile và loadProjects vì nút QR phụ thuộc PROJECTS đã tải.
function updateAgentHeaderUI() {
    const isAgentRole = isRestrictedConsole();
    const role = CURRENT_ADMIN?.role || 'agent';

    updateConsoleBrand();

    const identityEl = document.getElementById('agent-identity');
    const labelEl = document.getElementById('agent-identity-label');
    const nameEl = document.getElementById('agent-display-name');
    const ownName = isAgentRole ? (CURRENT_ADMIN.full_name || CURRENT_ADMIN.username || '') : '';

    // Giao diện Sale luôn hiển thị thành hai hàng tên riêng, không ghi role:
    //     [tên Agent quản lý]
    //     [tên Sale đang đăng nhập]
    // Giao diện Agent vẫn chỉ hiển thị tên của chính Agent.
    const isSaleView = role === 'sale';
    const managerName = isSaleView
        ? (CURRENT_ADMIN.manager_name || CURRENT_ADMIN.manager_username || 'Chưa xác định')
        : '';
    const visibleName = ownName;

    if (identityEl) identityEl.classList.toggle('sale-identity', isSaleView);
    // Header của Sale có bố cục riêng: nút ở hàng trên bên phải, logo ở góc
    // phải dưới. Đặt class trên chính thẻ <header> để CSS không phải suy ra
    // vai trò từ một thẻ con nằm sâu bên trong.
    // Cùng một bố cục header cho Sale VÀ Agent: cột trái tên, nút hàng trên bên
    // phải, logo góc phải dưới. Giữ tên lớp 'sale-header' để không phải sửa lại
    // toàn bộ CSS đã viết và đã đo.
    document.querySelector('.dashboard-header')?.classList.toggle('sale-header', isAgentRole);
    if (labelEl) {
        labelEl.textContent = isSaleView ? managerName : '';
        labelEl.title = isSaleView ? managerName : '';
        labelEl.classList.toggle('hide', !isSaleView);
    }
    if (nameEl) {
        nameEl.textContent = visibleName;
        nameEl.title = isSaleView
            ? `${managerName}\n${visibleName}`
            : visibleName;
    }
    if (identityEl) identityEl.classList.toggle('hide', !visibleName);

    // Tên đã hiện to ở header trái rồi thì badge tên bên phải là thừa.
    const profileBadge = document.getElementById('admin-profile-badge');
    if (profileBadge) profileBadge.style.display = visibleName ? 'none' : 'flex';

    // Giỏ hàng/Bill trên header: CHỈ dành cho Agent / Sale (và được gom vào bảng Công cụ)
    document.getElementById('order-cart-btn')?.classList.toggle('hide', !isAgentRole);
    document.getElementById('sale-menu-btn')?.classList.toggle('hide', !isSaleView);

    document.getElementById('project-selector-wrap')?.classList.toggle('hide', isAgentRole);

    // Agent/Sale chỉ được XEM ngôn ngữ của cuộc trò chuyện, không được đổi.
    const detailLangEl = document.getElementById('detail-lang-select');
    if (detailLangEl) {
        detailLangEl.disabled = isAgentRole;
        detailLangEl.title = isAgentRole ? 'Chỉ quản trị viên mới đổi được ngôn ngữ' : '';
    }
    
    // Superadmin & Project Admin: gom tất cả công cụ vào menu Quản trị duy nhất
    const isSuperadmin = CURRENT_ADMIN?.role === 'superadmin';
    const isProjectAdmin = CURRENT_ADMIN?.role === 'project_admin';
    const canManageTeam = isSuperadmin || isProjectAdmin;

    // Các nút chức năng gom gọn bên trong menu Quản trị
    document.getElementById('superadmin-team-btn')?.classList.toggle('hide', !canManageTeam);
    document.getElementById('superadmin-monitor-btn')?.classList.toggle('hide', !isSuperadmin);
    document.getElementById('superadmin-order-cart-btn')?.classList.toggle('hide', !(isSuperadmin || isProjectAdmin));
    document.getElementById('superadmin-report-modal-btn')?.classList.toggle('hide', !(isSuperadmin || isProjectAdmin));
    document.getElementById('superadmin-otp-unlock-btn')?.classList.toggle('hide', !isSuperadmin);

    // Ẩn ô chọn ngôn ngữ giao diện với Agent/Sale của dự án QR. Console của họ
    // chỉ dùng tiếng Việt, còn ngôn ngữ hội thoại đã tự nhận diện theo khách —
    // để ô này lại chỉ khiến người dùng tưởng nó đổi ngôn ngữ chat.
    // Chỉ áp cho dự án QR; DealPhuQuoc và Pastie Landing giữ nguyên.
    const hideLangPicker = isRestrictedConsole() && isQrConciergeProject(CURRENT_ADMIN?.project_id);
    document.getElementById('admin-lang-selector-wrap')?.classList.toggle('hide', hideLangPicker);

    // Báo cáo là công cụ quản lý: nút trên header chỉ hiện cho Agent quản lý (gom vào bảng Công cụ)
    document.getElementById('report-modal-btn')?.classList.toggle('hide', !isAgentRole || isSaleRole());

    // Nút quản lý Sale, nhóm và QR (chỉ Agent quản lý của dự án QR)
    const canManageOrg = isAgentManagerRole();
    document.getElementById('org-manage-btn')?.classList.toggle('hide', !canManageOrg);

    // Nút hồ sơ tài khoản: hiển thị cho Agent / Sale
    document.getElementById('agent-account-btn')?.classList.toggle('hide', !isAgentRole);

    // Chỉ Agent quản lý mới tạo và xem QR. Sale không đụng tới QR.
    const hasQr = isAgentManagerRole() && isQrConciergeProject(CURRENT_ADMIN.project_id);
    document.getElementById('agent-qr-btn')?.classList.toggle('hide', !hasQr);

    // Agent không còn dùng dropdown Cài đặt cũ (mọi thứ đã tách thành các nút riêng)
    document.getElementById('settings-dropdown-wrapper')?.classList.toggle('hide', isAgentRole);
    // Ẩn nếu không phải Agent/Sale, đang trong iframe, HOẶC thông báo đã bật (khi
    // đó không còn thao tác nào để làm — xem setPushButtonState).
    document.getElementById('agent-push-btn')?.classList.toggle('hide', !isAgentRole || inIframe || pushHeaderHidden);

    if (isAgentRole) document.getElementById('manage-admins-btn')?.classList.add('hide');

    // Ô avatar: ẢNH của cơ sở nếu Agent đã tải lên, không có thì lấy chữ cái
    // đầu. Sale nhìn thấy ảnh của Agent quản lý mình, không phải ảnh của chính
    // mình — header là để nhận ra ĐANG Ở CƠ SỞ NÀO.
    const badge = document.getElementById('agent-avatar-badge');
    const avatarChar = document.getElementById('agent-avatar-char');
    const avatarUrl = isSaleView
        ? (CURRENT_ADMIN.manager_avatar_url || '')
        : (CURRENT_ADMIN.avatar_url || '');
    if (badge) {
        const img = badge.querySelector('img');
        if (/^https?:\/\/|^\//.test(String(avatarUrl))) {
            if (avatarChar) avatarChar.classList.add('hide');
            if (img) img.src = avatarUrl;
            else badge.insertAdjacentHTML('afterbegin', `<img src="${avatarUrl}" alt="">`);
        } else {
            img?.remove();
            if (avatarChar) {
                avatarChar.classList.remove('hide');
                const src = (isSaleView ? managerName : visibleName) || 'P';
                avatarChar.textContent = src.trim().charAt(0).toUpperCase() || 'P';
            }
        }
    }
    badge?.classList.toggle('hide', !visibleName);

    // Dòng phụ dưới tên. Sale: tên của chính mình đã nằm ở hàng dưới rồi nên
    // dòng này để trống; Agent quản lý: số Sale đang có.
    const subEl = document.getElementById('agent-identity-sub');
    if (subEl && !isSaleView) subEl.classList.toggle('hide', !subEl.textContent);
    if (subEl && isSaleView) subEl.classList.add('hide');
    if (isAgentManagerRole()) void refreshAgentSaleCount();

    layoutHeaderQuickMenu(isAgentRole);
}


// Số Sale hiện có của Agent, hiện ngay dưới tên cơ sở trên header.
// Đếm một lần rồi dùng lại: con số này chỉ đổi khi Agent tự thêm hoặc xoá Sale,
// và chính chỗ đó gọi lại hàm với force = true.
let agentSaleCountLoaded = false;
async function refreshAgentSaleCount(force) {
    if (agentSaleCountLoaded && !force) return;
    const subEl = document.getElementById('agent-identity-sub');
    if (!subEl) return;
    try {
        const res = await authFetch(`${API_BASE}/api/agent/sales`);
        if (!res.ok) return;
        const data = await res.json();
        const n = Array.isArray(data) ? data.length : 0;
        agentSaleCountLoaded = true;
        subEl.innerHTML = `<i class="ri-user-shared-line"></i> ${n} nhân viên Sale`;
        subEl.classList.remove('hide');
    } catch (e) {
        // Không có số thì thôi, không hiện dòng rỗng.
    }
}
window.refreshAgentSaleCount = refreshAgentSaleCount;


// ── Tải lại ứng dụng khi chạy từ shortcut màn hình chính ──────────────────
//
// Ở chế độ standalone không có thanh địa chỉ nên cũng không có nút tải lại:
// người dùng phải tắt hẳn app mới nhận được bản mới. Hai lối ra:
//   1. Nút "Tải lại ứng dụng" trong bảng Công cụ — chủ động, lúc nào cũng dùng được.
//   2. Tự dò phiên bản mỗi 5 phút rồi mời tải lại — để không ai phải nhớ.
//
// Tải lại bằng cách gắn thêm một tham số vào URL: location.reload() ở
// standalone vẫn có thể lấy lại đúng bản HTML đang nằm trong cache.
function reloadApp() {
    const url = new URL(window.location.href);
    url.searchParams.set('_r', String(Date.now()));
    window.location.replace(url.toString());
}
window.reloadApp = reloadApp;

// Phiên bản trang HIỆN ĐANG chạy, lấy từ chính đường dẫn script đã tải.
function currentAppVersion() {
    const src = document.querySelector('script[src*="admin.js?v="]')?.getAttribute('src') || '';
    return (src.match(/[?&]v=(r\d+)/) || [])[1] || '';
}

async function checkAppVersion() {
    const mine = currentAppVersion();
    if (!mine) return;
    try {
        const res = await fetch(`${API_BASE}/api/app-version`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (!version || version === 'unknown' || version === mine) return;
        // NÓI RÕ HAI CON SỐ.
        //
        // "Đã có bản cập nhật mới" không trả lời được câu hỏi quan trọng nhất
        // lúc đi soi lỗi: MÁY NÀY ĐANG CHẠY BẢN NÀO? Thiếu nó thì một lỗi đã sửa
        // rồi vẫn bị báo đi báo lại, vì không ai biết máy đang chạy bản cũ.
        const line = document.getElementById('app-update-text');
        if (line) line.textContent = `Đã có bản mới ${version} — máy này đang chạy ${mine}.`;
        document.getElementById('app-update-bar')?.classList.remove('hide');
    } catch {
        // Mất mạng thì thôi, lần sau kiểm lại. Không làm phiền người dùng.
    }
}

document.getElementById('app-reload-btn')?.addEventListener('click', reloadApp);
document.getElementById('app-update-reload')?.addEventListener('click', reloadApp);
document.getElementById('app-update-dismiss')?.addEventListener('click', () => {
    document.getElementById('app-update-bar')?.classList.add('hide');
    // Ẩn là ẩn TẠM. Bỏ qua một lần rồi im luôn thì máy đó ở lại bản cũ vô thời
    // hạn — và mọi lỗi đã sửa vẫn còn nguyên trên đúng máy ấy.
    setTimeout(() => { void checkAppVersion(); }, 10 * 60 * 1000);
});
// Kiểm khi mở app, mỗi 5 phút, và mỗi lần quay lại app từ nền — lúc quay lại
// mới là lúc hay gặp bản mới nhất.
setTimeout(checkAppVersion, 4000);
setInterval(checkAppVersion, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkAppVersion(); });


// Gom các nút công cụ của Agent/Sale vào một bảng thả xuống.
//
// CHUYỂN CHÍNH các nút cũ vào bảng chứ không dựng nút mới: mọi id, nhãn và
// trình xử lý sự kiện đã gắn ở nơi khác vẫn còn nguyên, kể cả các chỗ gọi
// classList.toggle('hide', ...) để ẩn nút theo vai trò.
const HEADER_MENU_BTN_IDS = [
    'org-manage-btn', 'order-cart-btn', 'sale-menu-btn', 'agent-qr-btn',
    'report-modal-btn', 'agent-account-btn', 'agent-push-btn',
];
const headerBtnHome = new Map();
function layoutHeaderQuickMenu(grouped) {
    const wrap = document.getElementById('header-menu-wrap');
    const panel = document.getElementById('header-menu-panel');
    if (!wrap || !panel) return;

    for (const id of HEADER_MENU_BTN_IDS) {
        const btn = document.getElementById(id);
        if (!btn) continue;
        // Nhớ chỗ cũ ngay lần đầu, để còn trả về đúng vị trí cho các vai trò khác.
        if (btn.classList.contains('header-menu-fixed')) continue;
        if (!headerBtnHome.has(id)) headerBtnHome.set(id, { parent: btn.parentElement, next: btn.nextElementSibling });
        if (grouped) {
            btn.classList.add('header-menu-item');
            if (btn.parentElement !== panel) panel.appendChild(btn);
        } else {
            btn.classList.remove('header-menu-item');
            const home = headerBtnHome.get(id);
            if (home?.parent && btn.parentElement !== home.parent) home.parent.insertBefore(btn, home.next);
        }
    }
    wrap.classList.toggle('hide', !grouped);
    if (!grouped) closeHeaderQuickMenu();
}

function closeHeaderQuickMenu() {
    document.getElementById('header-menu-panel')?.classList.add('hide');
    document.getElementById('header-menu-btn')?.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', (event) => {
    const trigger = event.target.closest('#header-menu-btn');
    const panel = document.getElementById('header-menu-panel');
    if (!panel) return;
    if (trigger) {
        const open = panel.classList.contains('hide');
        panel.classList.toggle('hide', !open);
        document.getElementById('header-menu-btn')?.setAttribute('aria-expanded', String(open));
        return;
    }
    // Bấm vào một mục trong bảng cũng đóng bảng: mục nào cũng mở một cửa sổ
    // khác, để bảng mở chồng lên trên là che mất thứ vừa mở.
    if (!panel.classList.contains('hide')) closeHeaderQuickMenu();
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeHeaderQuickMenu(); });


function getBrowserIcon(browser) {
    const b = (browser || '').toLowerCase();
    if (b.includes('chrome')) return 'ri-chrome-fill';
    if (b.includes('safari')) return 'ri-safari-fill';
    if (b.includes('firefox')) return 'ri-firefox-fill';
    if (b.includes('edge')) return 'ri-edge-fill';
    if (b.includes('opera')) return 'ri-opera-fill';
    return 'ri-global-line';
}


function getDeviceIcon(device) {
    const d = (device || '').toLowerCase();
    if (d.includes('iphone') || d.includes('android')) return 'ri-smartphone-line';
    if (d.includes('ipad') || d.includes('tablet')) return 'ri-tablet-line';
    if (d.includes('windows') || d.includes('macos') || d.includes('linux') || d.includes('desktop')) return 'ri-computer-line';
    return 'ri-question-line';
}


// ----------------------------------------------------
// EVENT LISTENERS & UTILS
// ----------------------------------------------------

// Escaping helper
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function closeSettingsDropdown() {
    settingsDropdownMenu && settingsDropdownMenu.classList.add('hide');
    settingsTriggerBtn && settingsTriggerBtn.classList.remove('open');
}


function isQrConciergeProject(projectId) {
    return (PROJECTS || []).some(p => p.id === projectId && p.project_type === 'qr_concierge');
}


function setSelfProfileStatus(message, kind = '') {
    const el = document.getElementById('self-profile-status');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('is-ok', 'is-error');
    if (kind) el.classList.add(kind === 'ok' ? 'is-ok' : 'is-error');
}


async function handleSelfDisplayNameSubmit(event) {
    event.preventDefault();
    if (CURRENT_ADMIN?.role === 'agent') {
        setSelfProfileStatus('Agent không có quyền tự đổi tên hiển thị. Vui lòng liên hệ Superadmin.', 'error');
        return;
    }
    const input = document.getElementById('self-display-name-input');
    const saveBtn = document.getElementById('self-display-name-save');
    const fullName = (input?.value || '').trim();

    if (!fullName) {
        setSelfProfileStatus('Tên hiển thị không được để trống.', 'error');
        return;
    }

    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang lưu...'; }
    setSelfProfileStatus('');

    try {
        const res = await authFetch(`${API_BASE}/api/admin/me/display-name`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Không thể cập nhật tên hiển thị.');

        if (CURRENT_ADMIN) CURRENT_ADMIN.full_name = fullName;
        updateAgentHeaderUI();
        loadAdminUsers();
        setSelfProfileStatus('Đã cập nhật tên hiển thị.', 'ok');
    } catch (error) {
        setSelfProfileStatus(error.message, 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
    }
}


// Trạng thái rỗng nói rõ bước tiếp theo, thay vì chỉ báo "không có gì".
function tableEmptyBlock(selectedGroupId) {
    return selectedGroupId
        ? `<div class="empty-state">
               <span class="empty-state-icon"><i class="ri-qr-scan-2-line"></i></span>
               <h5>Nhóm này chưa có mã QR</h5>
               <p>Chọn “— Tất cả nhóm —” để xem toàn bộ, hoặc tạo mã QR mới cho nhóm này ở form phía trên.</p>
           </div>`
        : `<div class="empty-state">
               <span class="empty-state-icon"><i class="ri-qr-scan-2-line"></i></span>
               <h5>Chưa có mã QR nào</h5>
               <p>Tạo mã QR đầu tiên ở form phía trên. Mỗi vị trí một mã — Bàn 1, Phòng 101, Quầy Bar — khách quét mã nào thì chat vào đúng nhóm tiếp nhận của mã đó.</p>
           </div>`;
}


// Ba trạng thái của một bảng phải trông khác nhau: đang tải, chưa có dữ liệu, và
// hỏng. Trước đây "chưa có dữ liệu" hiện cùng một dòng chữ đỏ như lỗi hệ thống,
// nên người dùng tưởng hệ thống hỏng trong khi chỉ là chưa phát sinh hội thoại.
function tableStateRow(colspan, { icon, title, message, kind = 'empty', retry = false }) {
    return `<tr><td colspan="${colspan}" style="padding:0;">
        <div class="empty-state ${kind === 'error' ? 'is-error' : ''}">
            <span class="empty-state-icon"><i class="${icon}"></i></span>
            <h5>${escapeHtml(title)}</h5>
            <p>${escapeHtml(message)}</p>
            ${retry ? '<button type="button" class="empty-state-retry" onclick="loadReportData()"><i class="ri-refresh-line"></i> Thử lại</button>' : ''}
        </div>
    </td></tr>`;
}


// --- Thiết bị của tôi (Lớp 2 bảo mật license) --------------------------------

function formatDeviceTime(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return '—'; }
}


async function loadMyDevices() {
    const section = document.getElementById('self-devices-section');
    const list = document.getElementById('self-devices-list');
    const count = document.getElementById('self-devices-count');
    const note = document.getElementById('self-devices-note');
    if (!section || !list) return;

    // Chỉ Agent/Sale của dự án QR mới bị ràng theo thiết bị — các vai trò khác
    // không có gì để hiển thị ở đây.
    if (!isRestrictedConsole()) { section.classList.add('hide'); return; }

    section.classList.remove('hide');
    list.innerHTML = '<p class="self-devices-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
    try {
        const res = await authFetch(`${API_BASE}/api/admin/me/devices`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không tải được danh sách thiết bị.');

        const active = (data.devices || []).filter(d => d.status === 'active');
        if (count) count.textContent = `${active.length}/${data.limit} thiết bị`;

        list.innerHTML = active.length ? active.map(device => `
            <article class="self-device${device.is_current ? ' is-current' : ''}">
                <i class="${/iPhone|Android/i.test(device.label || '') ? 'ri-smartphone-line' : 'ri-computer-line'}"></i>
                <div class="self-device-main">
                    <strong>Thiết bị ${escapeHtml(String(device.device_id || device.id || '').slice(-12).toUpperCase())}${device.is_current ? ' <span class="self-device-badge">đang dùng</span>' : ''}</strong>
                    <small>Nhãn tham khảo: ${escapeHtml(device.label || 'Không xác định')}</small>
                    <small>Lần cuối: ${escapeHtml(formatDeviceTime(device.last_seen))}</small>
                </div>
                ${device.is_current ? '' : `<button type="button" class="self-device-remove" data-device-remove="${device.id}" title="Gỡ thiết bị"><i class="ri-delete-bin-line"></i></button>`}
            </article>`).join('') : '<p class="self-devices-empty">Chưa có thiết bị nào được ghi nhận.</p>';

        if (note) {
            // Nói rõ luật cooldown ngay tại đây. Nếu để người dùng chỉ gặp nó lúc
            // bị chặn đăng nhập thì họ sẽ nghĩ hệ thống hỏng.
            note.textContent = active.length >= data.limit
                ? `Đã dùng hết ${data.limit} thiết bị. Gỡ bớt một thiết bị cũ trước khi đăng nhập từ máy mới. `
                  + `Mỗi ${data.cooldownDays} ngày chỉ được đăng ký thêm thiết bị mới một lần. Hệ thống tính theo mã thiết bị, không theo IP hoặc trình duyệt.`
                : `Tài khoản được dùng tối đa ${data.limit} thiết bị. `
                  + `Mỗi ${data.cooldownDays} ngày chỉ được đăng ký thêm thiết bị mới một lần. Đổi Wi-Fi/4G/5G không tạo thiết bị mới.`;
        }
    } catch (error) {
        list.innerHTML = `<p class="self-devices-empty">${escapeHtml(error.message)}</p>`;
    }
}
