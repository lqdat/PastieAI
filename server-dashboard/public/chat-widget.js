(function() {
    // --- Widget Configuration ---
    // Detect backend URL dynamically from the script source
    const CONFIG = {
        BACKEND_URL: (function() {
            const scriptEl = document.querySelector('script[src*="chat-widget.js"]');
            if (scriptEl && scriptEl.src) {
                try {
                    const url = new URL(scriptEl.src);
                    if (url.origin && url.origin !== 'null' && url.protocol.startsWith('http')) {
                        return url.origin;
                    }
                } catch(e) {}
            }
            return 'http://localhost:3000'; // fallback
        })(),
        PROJECT_ID: 'pastie-landingpage', // unique ID for this landing page
        POLL_INTERVAL: 4000 // poll every 4 seconds for new agent replies
    };

    // --- State Management ---
    let state = {
        isOpen: false,
        step: 'init', // 'init' | 'otp' | 'chat'
        mode: sessionStorage.getItem('pastie_chat_session_id') ? 'human' : 'tidio', // 'tidio' | 'otp' | 'human'
        sessionId: sessionStorage.getItem('pastie_chat_session_id') || null,
        visitorName: sessionStorage.getItem('pastie_chat_visitor_name') || '',
        visitorEmail: sessionStorage.getItem('pastie_chat_visitor_email') || '',
        lastMessageCount: 0,
        pollInterval: null,
        otpCooldown: 0,
        otpCooldownTimer: null,
        detectedLang: 'vi', // default language detected
        tidioHistory: JSON.parse(sessionStorage.getItem('pastie_tidio_history') || '[]'),
        isTyping: false,
        typingTimeout: null
    };

    const TRANSLATIONS = {
        vi: {
            headerTitle: 'Hỗ Trợ Trực Tuyến',
            headerStatus: 'Đang hoạt động • AI song ngữ',
            initTitle: 'Trò chuyện trực tiếp',
            initDesc: 'Vui lòng điền thông tin để kết nối trực tiếp với nhân viên hỗ trợ của chúng tôi.',
            initNameLabel: 'Họ tên của bạn',
            initNamePlaceholder: 'Nguyễn Văn A...',
            initEmailLabel: 'Địa chỉ Email',
            initEmailPlaceholder: 'email@cua-ban.com...',
            initBtnSubmit: 'Tiếp tục',
            initBtnTidio: 'Quay lại AI Chatbot',
            initErrorFields: 'Vui lòng điền đúng Họ tên và Email.',
            initErrorConn: 'Không thể kết nối đến máy chủ.',
            otpTitle: 'Xác thực Email',
            otpDesc: 'Chúng tôi vừa gửi mã OTP 6 số vào email của bạn. Vui lòng nhập mã vào ô dưới đây để xác thực.',
            otpLabel: 'Mã xác thực OTP',
            otpPlaceholder: '------',
            otpBtnSubmit: 'Xác nhận kết nối',
            otpBtnResend: 'Gửi lại mã OTP',
            otpBtnResendCooldown: 'Gửi lại mã',
            otpErrorEmpty: 'Vui lòng nhập đủ mã OTP 6 số.',
            otpErrorInvalid: 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
            otpErrorConn: 'Lỗi kết nối máy chủ.',
            chatInputPlaceholder: 'Nhập tin nhắn...',
            chatWelcome: 'Chào mừng! Chatbot hỗ trợ tự động của chúng tôi đã sẵn sàng.',
            chatThinking: 'AI đang suy nghĩ...',
            systemTidioRedirect: '[Chuyển hướng Tidio] Khách hàng chuyển sang chat trực tiếp',
            systemKeywordsRedirect: '[Chuyển hướng Chatbot] Khách hàng chuyển sang chat trực tiếp (Lý do: Khách yêu cầu gặp nhân viên)',
            btnBackToTidio: 'Quay lại AI Chatbot',
            redirectingDesc: 'Chatbot đang chuyển hướng bạn gặp nhân viên hỗ trợ. Vui lòng điền thông tin để kết nối trực tiếp.',
            loadingSend: 'Đang xử lý...',
            loadingVerify: 'Xác thực...',
            defaultError: 'Có lỗi xảy ra.',
            typingText: 'Nhân viên đang nhập...',
            chatStartWelcome: 'Chào mừng! Vui lòng gửi câu hỏi của bạn. Hệ thống AI dịch thuật tự động đã sẵn sàng.'
        },
        en: {
            headerTitle: 'Live Support',
            headerStatus: 'Online • Bilingual AI',
            initTitle: 'Direct Live Chat',
            initDesc: 'Please fill in the information to connect directly with our support agent.',
            initNameLabel: 'Your Full Name',
            initNamePlaceholder: 'John Doe...',
            initEmailLabel: 'Email Address',
            initEmailPlaceholder: 'your-email@domain.com...',
            initBtnSubmit: 'Continue',
            initBtnTidio: 'Back to AI Chatbot',
            initErrorFields: 'Please fill in Name and Email correctly.',
            initErrorConn: 'Cannot connect to server.',
            otpTitle: 'Email Verification',
            otpDesc: 'We have sent a 6-digit OTP code to your email. Please enter it below to verify.',
            otpLabel: 'OTP Verification Code',
            otpPlaceholder: '------',
            otpBtnSubmit: 'Confirm Connection',
            otpBtnResend: 'Resend OTP Code',
            otpBtnResendCooldown: 'Resend in',
            otpErrorEmpty: 'Please enter all 6 digits of the OTP.',
            otpErrorInvalid: 'Invalid or expired verification code.',
            otpErrorConn: 'Server connection error.',
            chatInputPlaceholder: 'Type a message...',
            chatWelcome: 'Welcome! Our automated support chatbot is ready.',
            chatThinking: 'AI is thinking...',
            systemTidioRedirect: '[Tidio Redirect] Customer switched to live chat',
            systemKeywordsRedirect: '[Chatbot Redirect] Customer switched to live chat (Reason: Requested human agent)',
            btnBackToTidio: 'Back to AI Chatbot',
            redirectingDesc: 'Chatbot is transferring you to a support agent. Please fill in the details below.',
            loadingSend: 'Processing...',
            loadingVerify: 'Verifying...',
            defaultError: 'An error occurred.',
            typingText: 'Agent is typing...',
            chatStartWelcome: 'Welcome! Please send your question. Automated AI translation is ready.'
        },
        ru: {
            headerTitle: 'Живая поддержка',
            headerStatus: 'В сети • Двуязычный ИИ',
            initTitle: 'Прямой чат',
            initDesc: 'Пожалуйста, заполните информацию, чтобы связаться с нашим агентом поддержки напрямую.',
            initNameLabel: 'Ваше имя',
            initNamePlaceholder: 'Иван Иванов...',
            initEmailLabel: 'Адрес эл. почты',
            initEmailPlaceholder: 'email@domain.ru...',
            initBtnSubmit: 'Продолжить',
            initBtnTidio: 'Назад к ИИ-боту',
            initErrorFields: 'Пожалуйста, правильно заполните имя и адрес электронной почты.',
            initErrorConn: 'Не удалось подключиться к серверу.',
            otpTitle: 'Подтверждение Email',
            otpDesc: 'Мы отправили 6-значный код OTP на ваш email. Введите его ниже для подтверждения.',
            otpLabel: 'Код подтверждения OTP',
            otpPlaceholder: '------',
            otpBtnSubmit: 'Подтвердить подключение',
            otpBtnResend: 'Отправить код еще раз',
            otpBtnResendCooldown: 'Отправить еще раз через',
            otpErrorEmpty: 'Пожалуйста, введите все 6 цифр OTP.',
            otpErrorInvalid: 'Неверный или просроченный код подтверждения.',
            otpErrorConn: 'Ошибка подключения к серверу.',
            chatInputPlaceholder: 'Введите сообщение...',
            chatWelcome: 'Добро пожаловать! Наш автоматический ИИ-чатбот готов к работе.',
            chatThinking: 'ИИ думает...',
            systemTidioRedirect: '[Перенаправление Tidio] Клиент переключился на живой чат',
            systemKeywordsRedirect: '[Перенаправление чат-бота] Клиент переключился на живой чат (Причина: Запрос человека)',
            btnBackToTidio: 'Назад к ИИ-боту',
            redirectingDesc: 'Чат-бот переводит вас на агента поддержки. Заполните данные ниже для подключения.',
            loadingSend: 'Обработка...',
            loadingVerify: 'Проверка...',
            defaultError: 'Произошла ошибка.',
            typingText: 'Агент печатает...',
            chatStartWelcome: 'Добро пожаловать! Отправьте ваш вопрос. Автоматический ИИ-перевод готов.'
        },
        zh: {
            headerTitle: '在线客服',
            headerStatus: '在线 • 双语 AI',
            initTitle: '直接人工对话',
            initDesc: '请填写以下信息，以便直接 với 人工客服建立连接。',
            initNameLabel: '您的姓名',
            initNamePlaceholder: '张三...',
            initEmailLabel: '电子邮箱',
            initEmailPlaceholder: 'email@domain.com...',
            initBtnSubmit: '继续',
            initBtnTidio: '返回 AI 机器人',
            initErrorFields: '请正确填写姓名和邮箱。',
            initErrorConn: '无法连接到服务器。',
            otpTitle: '邮箱验证',
            otpDesc: '我们已向您的邮箱发送了 6 位数的 OTP 验证码。请输入该验证码进行验证。',
            otpLabel: 'OTP 验证码',
            otpPlaceholder: '------',
            otpBtnSubmit: '确认连接',
            otpBtnResend: '重新发送验证码',
            otpBtnResendCooldown: '重新发送',
            otpErrorEmpty: '请输入完整的 6 位 OTP 验证码。',
            otpErrorInvalid: '验证码无效或已过期。',
            otpErrorConn: '服务器连接错误。',
            chatInputPlaceholder: '输入消息...',
            chatWelcome: '欢迎！我们的自动客服机器人已就绪。',
            chatThinking: 'AI 正在思考...',
            systemTidioRedirect: '[Tidio 重定向] 客户切换到人工客服',
            systemKeywordsRedirect: '[机器人重定向] 客户切换到人工客服（原因：客户请求人工）',
            btnBackToTidio: '返回 AI 机器人',
            redirectingDesc: '机器人正在为您转接人工客服，请填写以下信息以直接连接。',
            loadingSend: '处理中...',
            loadingVerify: '验证中...',
            defaultError: '发生错误。',
            typingText: '客服正在输入...',
            chatStartWelcome: '欢迎！请发送您的问题。自动 AI 翻译已就绪。'
        }
    };

    // DOM Elements
    let togglePill = null;
    let launcher = null;
    let chatWindow = null;
    let hasBoundDocumentTidioEvents = false;

    // Auto detect browser/landing page language
    try {
        state.detectedLang = localStorage.getItem('pastie-lang') || navigator.language.split('-')[0] || 'vi';
        if (!TRANSLATIONS[state.detectedLang]) {
            state.detectedLang = 'vi';
        }
    } catch(e) {}

    // --- UI Dynamic Injection ---
    // Inject Stylesheets and Font
    function injectAssets() {
        // Outfit Font
        if (!document.querySelector('link[href*="Outfit"]')) {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap';
            document.head.appendChild(fontLink);
        }
        
        // Remix Icons
        if (!document.querySelector('link[href*="remixicon"]')) {
            const iconLink = document.createElement('link');
            iconLink.rel = 'stylesheet';
            iconLink.href = 'https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css';
            document.head.appendChild(iconLink);
        }

        // Widget CSS (Load from backend/public/widget CSS or local path)
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = `${CONFIG.BACKEND_URL}/chat-widget.css`; // loaded dynamically from the backend server
        document.head.appendChild(styleLink);
    }

    // Programmatically create widget HTML markup
    function createWidgetDOM() {
        const root = document.createElement('div');
        root.id = 'pastie-chat-widget-root';
        
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
        
        root.innerHTML = `
            <!-- Chat Window -->
            <div class="pastie-chat-window" id="pastie-chat-window">
                <!-- Header -->
                <div class="pastie-chat-header">
                    <div class="pastie-chat-avatar"><i class="ri-customer-service-2-fill"></i></div>
                    <div class="pastie-chat-header-info">
                        <h4 id="pastie-chat-header-title">${t.headerTitle}</h4>
                        <p id="pastie-chat-header-status"><span class="pastie-chat-status-dot"></span> ${t.headerStatus}</p>
                    </div>
                </div>
                
                <!-- Body (Dynamic Views) -->
                <div class="pastie-chat-body" id="pastie-chat-body">
                    
                    <!-- Screen 1: Contact Form -->
                    <div class="pastie-chat-view" id="view-init">
                        <h3 id="view-init-title">${t.initTitle}</h3>
                        <p id="view-init-desc">${t.initDesc}</p>
                        <div class="pastie-chat-error" id="init-error"></div>
                        <div class="pastie-chat-form-group">
                            <label id="lbl-input-name">${t.initNameLabel}</label>
                            <input type="text" id="input-name" placeholder="${t.initNamePlaceholder}" required>
                        </div>
                        <div class="pastie-chat-form-group">
                            <label id="lbl-input-email">${t.initEmailLabel}</label>
                            <input type="email" id="input-email" placeholder="${t.initEmailPlaceholder}" required>
                        </div>
                        <button class="pastie-chat-btn" id="btn-submit-init">
                            <span id="txt-btn-submit-init">${t.initBtnSubmit}</span> <i class="ri-arrow-right-line"></i>
                        </button>
                        <button class="pastie-chat-btn-link" id="btn-open-tidio" style="margin-top: 12px; margin-bottom: 0;">
                            <i class="ri-robot-2-line"></i> <span id="txt-btn-open-tidio">${t.initBtnTidio}</span>
                        </button>
                    </div>


                    <!-- Screen 2: OTP Verification -->
                    <div class="pastie-chat-view pastie-chat-hide" id="view-otp">
                        <h3 id="view-otp-title">${t.otpTitle}</h3>
                        <p id="view-otp-desc">${t.otpDesc}</p>
                        <div class="pastie-chat-error" id="otp-error"></div>
                        <div class="pastie-chat-form-group">
                            <label id="lbl-input-otp">${t.otpLabel}</label>
                            <input type="text" id="input-otp" placeholder="${t.otpPlaceholder}" maxlength="6" style="text-align: center; letter-spacing: 4px; font-weight: bold; font-size: 18px;" required>
                        </div>
                        <button class="pastie-chat-btn" id="btn-submit-otp">
                            <span id="txt-btn-submit-otp">${t.otpBtnSubmit}</span> <i class="ri-checkbox-circle-line"></i>
                        </button>
                        <button class="pastie-chat-btn-link" id="btn-resend-otp">${t.otpBtnResend}</button>
                    </div>

                    <!-- Screen 3: Active Conversation Thread -->
                    <div class="pastie-chat-view pastie-chat-hide" id="view-chat" style="padding: 0;">
                        <div class="pastie-chat-thread" id="pastie-chat-thread"></div>
                        
                        <!-- Input Footer -->
                        <div class="pastie-chat-footer">
                            <form id="pastie-chat-form" onsubmit="event.preventDefault();">
                                <div class="pastie-chat-input-row">
                                    <input type="text" id="pastie-chat-input" placeholder="${t.chatInputPlaceholder}" autocomplete="off">
                                    <button type="submit" class="pastie-chat-send-btn" id="btn-send-message">
                                        <i class="ri-send-plane-2-fill"></i>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Launcher Button -->
            <button class="pastie-chat-launcher" id="pastie-chat-launcher">
                <i class="ri-chat-3-line" id="launcher-icon"></i>
                <div class="pastie-chat-badge" id="pastie-chat-badge"></div>
            </button>

            <!-- Toggle Pill to switch to AI Chat -->
            <button class="pastie-ai-toggle-pill pastie-chat-hide" id="pastie-ai-toggle-pill">
                <i class="ri-robot-2-line"></i> <span id="txt-ai-toggle-pill">${t.btnBackToTidio}</span>
            </button>
        `;

        document.body.appendChild(root);
    }

    function applyTranslations() {
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
        
        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        const safeSetPlaceholder = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.placeholder = text;
        };
        
        safeSetText('pastie-chat-header-title', t.headerTitle);
        const statusEl = document.getElementById('pastie-chat-header-status');
        if (statusEl) {
            statusEl.innerHTML = `<span class="pastie-chat-status-dot"></span> ${t.headerStatus}`;
        }
        
        safeSetText('view-init-title', t.initTitle);
        
        if (state.redirectedFromTidio) {
            const descEl = document.getElementById('view-init-desc');
            if (descEl) {
                descEl.innerHTML = `<span style="color: #ef4444; font-weight: 500;"><i class="ri-error-warning-line"></i> ${t.redirectingDesc}</span>`;
            }
        } else {
            safeSetText('view-init-desc', t.initDesc);
        }
        
        safeSetText('lbl-input-name', t.initNameLabel);
        safeSetPlaceholder('input-name', t.initNamePlaceholder);
        safeSetText('lbl-input-email', t.initEmailLabel);
        safeSetPlaceholder('input-email', t.initEmailPlaceholder);
        safeSetText('txt-btn-submit-init', t.initBtnSubmit);
        safeSetText('txt-btn-open-tidio', t.initBtnTidio);
        
        safeSetText('view-otp-title', t.otpTitle);
        safeSetText('view-otp-desc', t.otpDesc);
        safeSetText('lbl-input-otp', t.otpLabel);
        safeSetPlaceholder('input-otp', t.otpPlaceholder);
        safeSetText('txt-btn-submit-otp', t.otpBtnSubmit);
        
        const resendBtn = document.getElementById('btn-resend-otp');
        if (resendBtn) {
            if (state.otpCooldown <= 0) {
                resendBtn.textContent = t.otpBtnResend;
            } else {
                resendBtn.textContent = `${t.otpBtnResendCooldown} (${state.otpCooldown}s)`;
            }
        }
        
        safeSetPlaceholder('pastie-chat-input', t.chatInputPlaceholder);
        safeSetText('txt-ai-toggle-pill', t.btnBackToTidio);
        
        // Re-render chat view welcome message if the thread is empty
        const threadContainer = document.getElementById('pastie-chat-thread');
        if (threadContainer && threadContainer.children.length === 1 && threadContainer.children[0].classList.contains('system')) {
            threadContainer.children[0].innerHTML = `<div class="pastie-msg-bubble">${t.chatStartWelcome}</div>`;
        }
    }

    async function changeWidgetLanguage(lang) {
        if (!TRANSLATIONS[lang]) return;
        state.detectedLang = lang;
        applyTranslations();

        // Sync with backend if session is active
        if (state.sessionId) {
            try {
                await fetch(`${CONFIG.BACKEND_URL}/api/chats/session/language`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: state.sessionId,
                        language: lang
                    })
                });
            } catch(e) {
                console.error('Failed to sync language selection with backend:', e);
            }
        }
    }
    window.changeWidgetLanguage = changeWidgetLanguage;


    // --- DOM Actions & Navigation ---
    
    function switchView(step) {
        state.step = step;
        const views = {
            'init': document.getElementById('view-init'),
            'otp': document.getElementById('view-otp'),
            'chat': document.getElementById('view-chat')
        };

        // Hide all views
        Object.values(views).forEach(v => v.classList.add('pastie-chat-hide'));
        // Show active view
        views[step].classList.remove('pastie-chat-hide');

        if (step === 'chat') {
            if (state.mode === 'human') {
                startPolling();
                loadMessageHistory();
            } else {
                stopPolling();
                renderTidioHistory();
            }
        }
    }

    function toggleChatWindow() {
        const windowEl = document.getElementById('pastie-chat-window');
        const iconEl = document.getElementById('launcher-icon');
        const badgeEl = document.getElementById('pastie-chat-badge');
        
        state.isOpen = !state.isOpen;
        
        if (state.isOpen) {
            windowEl.classList.add('open');
            iconEl.className = 'ri-close-line active';
            badgeEl.style.display = 'none'; // hide notification dot when chat opens

            // Route view based on mode/session
            if (state.sessionId) {
                state.mode = 'human';
                switchView('chat');
            } else if (state.mode === 'otp') {
                switchView('otp');
            } else if (state.mode === 'init') {
                switchView('init');
            } else {
                state.mode = 'tidio';
                switchView('chat');
            }
        } else {
            windowEl.classList.remove('open');
            iconEl.className = 'ri-chat-3-line';
            stopPolling();
        }
    }

    // --- OTP Countdown Timer ---
    function startOtpCooldown() {
        const resendBtn = document.getElementById('btn-resend-otp');
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
        state.otpCooldown = 60;
        resendBtn.disabled = true;
        
        if (state.otpCooldownTimer) clearInterval(state.otpCooldownTimer);
        
        state.otpCooldownTimer = setInterval(() => {
            state.otpCooldown--;
            if (state.otpCooldown <= 0) {
                clearInterval(state.otpCooldownTimer);
                resendBtn.textContent = t.otpBtnResend;
                resendBtn.disabled = false;
            } else {
                resendBtn.textContent = `${t.otpBtnResendCooldown} (${state.otpCooldown}s)`;
            }
        }, 1000);
    }

    // ----------------------------------------------------
    // API NETWORK CALLS
    // ----------------------------------------------------

    // 1. Request OTP
    async function sendOTP() {
        const name = document.getElementById('input-name').value.trim();
        const email = document.getElementById('input-email').value.trim();
        const errorEl = document.getElementById('init-error');
        const submitBtn = document.getElementById('btn-submit-init');
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];

        if (!name || !email || !email.includes('@')) {
            errorEl.textContent = t.initErrorFields;
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${t.loadingSend}`;

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, language: state.detectedLang })
            });
            const data = await res.json();

            if (res.ok) {
                state.visitorName = name;
                state.visitorEmail = email;
                sessionStorage.setItem('pastie_chat_visitor_name', name);
                sessionStorage.setItem('pastie_chat_visitor_email', email);
                
                switchView('otp');
                startOtpCooldown();
            } else {
                errorEl.textContent = data.error || t.defaultError;
                errorEl.style.display = 'block';
            }
        } catch (e) {
            errorEl.textContent = t.initErrorConn;
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${t.initBtnSubmit} <i class="ri-arrow-right-line"></i>`;
        }
    }

    // 2. Verify OTP
    async function verifyOTP() {
        const code = document.getElementById('input-otp').value.trim();
        const errorEl = document.getElementById('otp-error');
        const submitBtn = document.getElementById('btn-submit-otp');
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];

        if (code.length < 6) {
            errorEl.textContent = t.otpErrorEmpty;
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${t.loadingVerify}`;

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: state.visitorEmail,
                    code,
                    name: state.visitorName,
                    projectId: CONFIG.PROJECT_ID,
                    language: state.detectedLang
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                state.mode = 'human';
                state.sessionId = data.sessionId;
                sessionStorage.setItem('pastie_chat_session_id', data.sessionId);
                
                switchView('chat');

                // Send system redirect log if redirected from Tidio
                if (state.redirectedFromTidio) {
                    await sendSystemNotification(`[Chuyển hướng Tidio] Khách hàng chuyển sang chat trực tiếp (Lý do: ${state.tidioRedirectReason})`);
                    state.redirectedFromTidio = false;
                    loadMessageHistory();
                }
            } else {
                errorEl.textContent = data.error || t.otpErrorInvalid;
                errorEl.style.display = 'block';
            }
        } catch (e) {
            errorEl.textContent = t.otpErrorConn;
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${t.otpBtnSubmit} <i class="ri-checkbox-circle-line"></i>`;
        }
    }

    // Helper to send system notification messages
    async function sendSystemNotification(text) {
        if (!state.sessionId) return;
        try {
            await fetch(`${CONFIG.BACKEND_URL}/api/chats/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: state.sessionId,
                    sender: 'system',
                    text: text,
                    targetLang: state.detectedLang || 'vi'
                })
            });
        } catch (e) {
            console.error('Failed to send system notification:', e);
        }
    }

    // 3. Send Message
    async function sendMessage() {
        const inputEl = document.getElementById('pastie-chat-input');
        const text = inputEl.value.trim();
        if (!text) return;

        inputEl.value = '';

        if (state.mode === 'tidio') {
            // Check keywords directly in client first for instant redirection
            const visitorKeywords = [
                'nhân viên', 'nhan vien', 'gặp nhân viên', 'gap nhan vien',
                'gặp admin', 'gap admin', 'human', 'agent', 'support',
                'live chat', 'live support', 'người thật', 'nguoi that',
                'nói chuyện với người', 'noi chuyen voi nguoi',
                'gặp tư vấn viên', 'gap tu van vien', 'gặp hỗ trợ', 'gap ho tro',
                'tư vấn viên', 'tu van vien', 'chat với người', 'chat voi nguoi',
                'gặp trực tiếp', 'gap truc tiep', 'nhân viên hỗ trợ', 'nhan vien ho tro',
                'talk to human', 'real person', 'speak to someone',
                'gặp nv', 'gap nv', 'nv', 'cskh', 'chăm sóc khách hàng', 'ho tro viên'
            ];
            const lowerText = text.toLowerCase();
            const matches = visitorKeywords.some(keyword => lowerText.includes(keyword));
            if (matches) {
                console.log(`[Tidio Integration] Direct switch triggered in sendMessage by keyword: "${text}"`);
                activateAIChat('Khách yêu cầu gặp nhân viên trên Tidio');
                return;
            }

            // Append and save locally
            const newMsg = {
                text: text,
                sender: 'visitor',
                timestamp: Date.now()
            };
            state.tidioHistory.push(newMsg);
            sessionStorage.setItem('pastie_tidio_history', JSON.stringify(state.tidioHistory));
            
            // Show typing indicator
            state.isTyping = true;
            renderTidioHistory();

            // Safety timeout to clear indicator after 12 seconds
            if (state.typingTimeout) clearTimeout(state.typingTimeout);
            state.typingTimeout = setTimeout(() => {
                if (state.isTyping && state.mode === 'tidio') {
                    state.isTyping = false;
                    renderTidioHistory();
                }
            }, 12000);

            // Send to hidden Tidio API
            if (window.tidioChatApi && typeof window.tidioChatApi.messageFromVisitor === 'function') {
                try {
                    window.tidioChatApi.messageFromVisitor(text);
                } catch(e) {
                    console.error('[Tidio Error] Failed to send visitor message:', e);
                }
            } else {
                console.warn('[Tidio Warning] tidioChatApi not available to proxy visitor message.');
            }
        } else if (state.mode === 'human' && state.sessionId) {
            // Append user message instantly in client
            appendMessageBubble({
                sender: 'visitor',
                original_text: text,
                created_at: new Date()
            });

            try {
                const res = await fetch(`${CONFIG.BACKEND_URL}/api/chats/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: state.sessionId,
                        sender: 'visitor',
                        text,
                        visitorLang: state.detectedLang || 'vi',
                        targetLang: 'vi' // visitor translates their language to agent's Vietnamese
                    })
                });
                
                if (res.status === 404 || res.status === 410) {
                    console.warn(`[Session Verify] Session status ${res.status} on server during message send. Transitioning back to Tidio.`);
                    activateTidioChat();
                    return;
                }
                
                const data = await res.json();
                if (data.success) {
                    loadMessageHistory(); // reload messages to update database state
                }
            } catch(e) {
                console.error('Failed to send message:', e);
            }
        }
    }

    function clearActiveSession() {
        console.log('[Session Reset] Clearing active custom chat session.');
        state.sessionId = null;
        state.step = 'chat';
        state.mode = 'tidio';
        state.lastMessageCount = 0;
        sessionStorage.removeItem('pastie_chat_session_id');
        
        stopPolling();

        // Close custom chat window if open
        if (chatWindow && chatWindow.classList.contains('open')) {
            chatWindow.classList.remove('open');
            state.isOpen = false;
            
            const iconEl = document.getElementById('launcher-icon');
            if (iconEl) {
                iconEl.className = 'ri-chat-3-line';
            }
        }

        // Re-evaluate initial state (shows custom launcher)
        handleInitialState();
        switchView('chat');
    }

    function handleInitialState() {
        // Custom widget launcher is always visible in headless mode
        if (launcher) launcher.classList.remove('pastie-chat-hide');
        if (togglePill) togglePill.classList.add('pastie-chat-hide');
        
        // Unconditionally call Tidio hide/close to be sure the hidden widget doesn't attempt to pop up
        if (window.tidioChatApi) {
            try {
                if (typeof window.tidioChatApi.hide === 'function') window.tidioChatApi.hide();
                if (typeof window.tidioChatApi.close === 'function') window.tidioChatApi.close();
            } catch(e) {}
        }
    }

    function activateAIChat(reason = '') {
        // Switch state to registration form
        state.mode = 'init';
        
        if (window.tidioChatApi) {
            try {
                if (typeof window.tidioChatApi.close === 'function') window.tidioChatApi.close();
                if (typeof window.tidioChatApi.hide === 'function') window.tidioChatApi.hide();
            } catch(e) {}
        }
        if (togglePill) togglePill.classList.add('pastie-chat-hide');
        if (launcher) launcher.classList.remove('pastie-chat-hide');

        if (reason) {
            state.redirectedFromTidio = true;
            state.tidioRedirectReason = reason;

            // Update form description if on init step
            const descEl = document.getElementById('view-init-desc') || document.querySelector('#view-init p');
            if (descEl) {
                descEl.innerHTML = `<span style="color: #ef4444; font-weight: 500;"><i class="ri-error-warning-line"></i> Chatbot đang chuyển hướng bạn gặp nhân viên hỗ trợ.</span><br/>Vui lòng điền thông tin để kết nối trực tiếp.`;
            }

            // If session is already active, send a system message to database
            if (state.sessionId) {
                sendSystemNotification(`[Chuyển hướng Chatbot] Khách hàng chuyển sang chat trực tiếp (Lý do: ${reason})`).then(() => {
                    loadMessageHistory();
                });
            }
        }

        if (!state.isOpen) {
            toggleChatWindow();
        } else {
            switchView('init');
        }
    }

    // --- Tidio Helper & Integration Functions ---
    function getOrCreateTidioDistinctId(forceNew = false) {
        let distinctId = localStorage.getItem('pastie_tidio_distinct_id');
        if (!distinctId || forceNew) {
            distinctId = 'visitor_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
            localStorage.setItem('pastie_tidio_distinct_id', distinctId);
            console.log('[Tidio Integration] Generated new distinct_id:', distinctId);
        }
        return distinctId;
    }

    function injectTidioScript(forceNewId = false) {
        // 1. Remove existing Tidio script if present
        const oldScript = document.querySelector('script[src*="tidio.co"]');
        if (oldScript) {
            try {
                oldScript.remove();
            } catch(e) {}
        }

        // 2. Remove old Tidio iframe and container to reset the widget UI
        const iframe = document.getElementById('tidio-chat-iframe');
        if (iframe) {
            try {
                iframe.remove();
            } catch(e) {}
        }
        const container = document.getElementById('tidio-chat');
        if (container) {
            try {
                container.remove();
            } catch(e) {}
        }
        const codeIframe = document.getElementById('tidio-chat-code');
        if (codeIframe) {
            try {
                codeIframe.remove();
            } catch(e) {}
        }

        // Remove extra style tags or elements injected by Tidio
        document.querySelectorAll('[id*="tidio"], [class*="tidio"]').forEach(el => {
            if (!el.id.includes('pastie') && !el.className.includes('pastie')) {
                try { el.remove(); } catch(e) {}
            }
        });
        document.querySelectorAll('link[href*="tidio"]').forEach(el => {
            try { el.remove(); } catch(e) {}
        });

        // 3. Delete the tidioChatApi and other global objects so the fresh script can recreate them
        delete window.tidioChatApi;
        delete window.tidioChatCode;
        delete window.TidioChat;
        delete window.tidioChat;
        delete window.TidioChatApi;

        // 4. Set document.tidioIdentify with the distinct_id
        const distinctId = getOrCreateTidioDistinctId(forceNewId);
        document.tidioIdentify = {
            distinct_id: distinctId
        };

        // 5. Inject fresh script tag
        const newScript = document.createElement('script');
        newScript.src = "https://code.tidio.co/plnbt3py3nupfabcl8uzw3ip0zxlsdhy.js";
        newScript.async = true;

        // 6. Bind events on the new Tidio instance once it's ready
        let isReadyCalled = false;
        let checkInterval = null;

        const onReady = () => {
            if (isReadyCalled) return;
            isReadyCalled = true;
            document.removeEventListener('tidioChat-ready', onReady);
            if (checkInterval) {
                clearInterval(checkInterval);
            }
            console.log('[Tidio Integration] Tidio instance ready with distinct_id:', distinctId);
            handleInitialState();
            bindTidioEvents();

            // Force open the chatbot widget if we explicitly requested a reset/open
            if (forceNewId && window.tidioChatApi && typeof window.tidioChatApi.open === 'function') {
                try {
                    window.tidioChatApi.open();
                } catch(e) {}
            }
        };

        if (window.tidioChatApi && typeof window.tidioChatApi.on === 'function') {
            onReady();
        } else {
            document.addEventListener('tidioChat-ready', onReady);
        }
            // Safety fallback: poll up to 20 times (10 seconds) to detect if tidioChatApi becomes ready
        let checks = 0;
        checkInterval = setInterval(() => {
            checks++;
            if (window.tidioChatApi && typeof window.tidioChatApi.on === 'function') {
                onReady();
            } else if (checks >= 20) {
                clearInterval(checkInterval);
            }
        }, 500);

        document.body.appendChild(newScript);
    }

    function activateTidioChat() {
        console.log('[Tidio Integration] Returning to AI Chatbot. Clearing session and resetting Tidio...');
        
        // 1. Clear the active custom agent session
        state.sessionId = null;
        state.step = 'chat';
        state.mode = 'tidio';
        state.lastMessageCount = 0;
        sessionStorage.removeItem('pastie_chat_session_id');
        
        stopPolling();

        // 2. Reset Tidio local history
        state.tidioHistory = [];
        sessionStorage.removeItem('pastie_tidio_history');
        state.isTyping = true; // Show thinking indicator immediately

        // 3. Clear Tidio keys from localStorage & sessionStorage to force a new chatbot flow
        try {
            Object.keys(localStorage).forEach((key) => {
                if (key.toLowerCase().includes('tidio')) {
                    localStorage.removeItem(key);
                }
            });
            Object.keys(sessionStorage).forEach((key) => {
                if (key.toLowerCase().includes('tidio')) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch(e) {
            console.error('[Tidio Reset Error] Failed to clear storage keys:', e);
        }

        // 4. Clear Tidio cookies
        try {
            document.cookie.split(";").forEach((c) => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
                if (name.toLowerCase().includes('tidio')) {
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
                }
            });
        } catch(e) {
            console.error('[Tidio Reset Error] Failed to clear cookies:', e);
        }

        // 5. Inject Tidio script with fresh distinctId
        injectTidioScript(true);

        // 6. Refresh the view
        handleInitialState();
        switchView('chat');
    }

    function renderTidioHistory() {
        const threadContainer = document.getElementById('pastie-chat-thread');
        if (!threadContainer) return;
        threadContainer.innerHTML = '';

        if (state.tidioHistory.length === 0) {
            threadContainer.innerHTML = '<div class="pastie-msg system"><div class="pastie-msg-bubble">Chào mừng! Chatbot hỗ trợ tự động của chúng tôi đã sẵn sàng.</div></div>';
        } else {
            state.tidioHistory.forEach(msg => {
                const bubbleWrap = document.createElement('div');
                const cssClass = msg.sender === 'visitor' ? 'visitor' : 'agent';
                bubbleWrap.className = `pastie-msg ${cssClass}`;

                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                bubbleWrap.innerHTML = `
                    <div class="pastie-msg-bubble">
                        <div>${escapeHtml(msg.text)}</div>
                    </div>
                    <div class="pastie-msg-time">${timeStr}</div>
                `;
                threadContainer.appendChild(bubbleWrap);
            });
        }

        // Add typing indicator if chatbot is thinking
        if (state.isTyping) {
            const typingBubble = document.createElement('div');
            typingBubble.className = 'pastie-msg agent';
            typingBubble.innerHTML = `
                <div class="pastie-msg-bubble pastie-typing-indicator-bubble">
                    <div class="pastie-typing-indicator">
                        <span class="pastie-typing-dot"></span>
                        <span class="pastie-typing-dot"></span>
                        <span class="pastie-typing-dot"></span>
                        <span class="pastie-typing-text" style="font-size: 11.5px; margin-left: 6px; color: var(--widget-text-sec); font-weight: 500;">AI đang suy nghĩ...</span>
                    </div>
                </div>
            `;
            threadContainer.appendChild(typingBubble);
        }

        threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    function onTidioMessage(text, senderType) {
        if (!text) return;
        console.log(`[Tidio Headless Bridge] Received message from ${senderType}: "${text}"`);
        const lowerText = text.toLowerCase();

        // Keywords from visitor that ask for human agent
        const visitorKeywords = [
            'nhân viên', 'nhan vien', 'gặp nhân viên', 'gap nhan vien',
            'gặp admin', 'gap admin', 'human', 'agent', 'support',
            'live chat', 'live support', 'người thật', 'nguoi that',
            'nói chuyện với người', 'noi chuyen voi nguoi',
            'gặp tư vấn viên', 'gap tu van vien', 'gặp hỗ trợ', 'gap ho tro',
            'tư vấn viên', 'tu van vien', 'chat với người', 'chat voi nguoi',
            'gặp trực tiếp', 'gap truc tiep', 'nhân viên hỗ trợ', 'nhan vien ho tro',
            'talk to human', 'real person', 'speak to someone',
            'gặp nv', 'gap nv', 'nv', 'cskh', 'chăm sóc khách hàng', 'ho tro viên'
        ];

        // Keywords from chatbot indicating fallback or transfer
        const operatorKeywords = [
            'không tìm thấy', 'khong tim thay', 'chưa được thiết lập', 'chua duoc thiet lap',
            'chưa được setup', 'chua duoc setup', 'không hiểu', 'khong hieu',
            'chưa có câu trả lời', 'chua co cau tra loi', 'sorry', "don't know",
            "don't understand", "can't help", 'kết nối với nhân viên', 'ket noi voi nhan vien',
            'gặp nhân viên', 'gap nhan vien', 'chuyển sang nhân viên', 'chuyen sang nhan vien',
            'chuyển tiếp', 'chuyen tiep', 'đang kết nối', 'dang ket noi', 'chưa có sẵn', 'chua duoc san',
            'chuyển tới nhân viên', 'chuyen toi nhan vien', 'không thể trả lời', 'khong the tra loi',
            'chưa được cài đặt', 'chua duoc cai dat',
            'tư vấn viên', 'tu van vien', 'kết nối tư vấn viên', 'nhân viên hỗ trợ', 'hỗ trợ viên',
            'kết nối trực tiếp', 'chat với nhân viên', 'chuyển cho nhân viên'
        ];

        const keywords = senderType === 'visitor' ? visitorKeywords : operatorKeywords;
        const matches = keywords.some(keyword => lowerText.includes(keyword));

        if (matches) {
            console.log(`[Tidio Integration] Auto-switch triggered by ${senderType} message: "${text}"`);
            activateAIChat(senderType === 'visitor' ? 'Khách yêu cầu gặp nhân viên trên Tidio' : 'Hệ thống Tidio chuyển giao cho nhân viên');
            return;
        }

        // Add to Tidio Chatbot Mode history if applicable
        if (state.mode === 'tidio') {
            if (senderType === 'operator') {
                state.isTyping = false;
                if (state.typingTimeout) {
                    clearTimeout(state.typingTimeout);
                    state.typingTimeout = null;
                }
            }
            const isDuplicate = state.tidioHistory.some(m => m.text === text && m.sender === senderType && (Date.now() - m.timestamp < 1000));
            if (!isDuplicate) {
                const newMsg = {
                    text: text,
                    sender: senderType,
                    timestamp: Date.now()
                };
                state.tidioHistory.push(newMsg);
                sessionStorage.setItem('pastie_tidio_history', JSON.stringify(state.tidioHistory));

                if (state.step === 'chat') {
                    renderTidioHistory();
                } else {
                    playNotificationAlert();
                }
            }
        }
    }

    function extractTextFromTidioData(data) {
        if (!data) return '';
        if (typeof data === 'string') return data;
        if (data.detail) {
            if (typeof data.detail === 'string') return data.detail;
            if (data.detail.text) return data.detail.text;
            if (data.detail.message) return data.detail.message;
        }
        if (data.text) return data.text;
        if (data.message) return data.message;
        return '';
    }

    function handleTidioVisitorDOMEvent(event) {
        console.log('[Tidio DOM Event] messageFromVisitor event:', event);
        const text = extractTextFromTidioData(event);
        onTidioMessage(text, 'visitor');
    }

    function handleTidioOperatorDOMEvent(event) {
        console.log('[Tidio DOM Event] messageFromOperator event:', event);
        const text = extractTextFromTidioData(event);
        onTidioMessage(text, 'operator');
    }

    function bindTidioEvents() {
        // Method 1: Bind via window.tidioChatApi
        if (window.tidioChatApi && typeof window.tidioChatApi.on === 'function') {
            try {
                if (typeof window.tidioChatApi.off === 'function') {
                    window.tidioChatApi.off('messageFromVisitor');
                    window.tidioChatApi.off('messageFromOperator');
                }
                window.tidioChatApi.on('messageFromVisitor', function(data) {
                    console.log('[Tidio Event] messageFromVisitor data:', data);
                    const text = extractTextFromTidioData(data);
                    onTidioMessage(text, 'visitor');
                });
                
                window.tidioChatApi.on('messageFromOperator', function(data) {
                    console.log('[Tidio Event] messageFromOperator data:', data);
                    const text = extractTextFromTidioData(data);
                    onTidioMessage(text, 'operator');
                });
                console.log('[Tidio Integration] Events bound successfully.');
            } catch(e) {
                console.error('[Tidio Error] Failed to bind API events:', e);
            }
        }

        // Method 2: Bind via document event listeners (Tidio custom DOM events) - Bind only once!
        if (!hasBoundDocumentTidioEvents) {
            document.addEventListener('tidioChat-messageFromVisitor', handleTidioVisitorDOMEvent);
            document.addEventListener('tidioChat-messageFromOperator', handleTidioOperatorDOMEvent);
            hasBoundDocumentTidioEvents = true;
        }
    }

    // Listen for hash change to trigger AI chat from Tidio chatbot buttons/links
    function checkHashForAIChat() {
        if (window.location.hash === '#chat-with-human' || window.location.hash === '#ai-chat') {
            console.log('[Tidio Link Trigger] Detected URL hash match. Switching to AI Chat...');
            activateAIChat('Khách hàng click link chuyển hướng trên Tidio');
            // Remove hash from address bar without reloading the page
            try {
                history.pushState("", document.title, window.location.pathname + window.location.search);
            } catch(e) {
                window.location.hash = '';
            }
        }
    }

    // 4. Poll and Load Message Thread
    async function loadMessageHistory() {
        if (!state.sessionId) return;

        try {
            // Fetch messages using public session endpoint
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/chats/${state.sessionId}/messages`);
            if (res.status === 404 || res.status === 410) {
                console.warn(`[Session Verify] Session status ${res.status} on server. Transitioning back to Tidio.`);
                activateTidioChat();
                return;
            }
            const messages = await res.json();

            if (!Array.isArray(messages)) return;

            const threadContainer = document.getElementById('pastie-chat-thread');
            
            // Check for new messages from the agent to trigger notification sound/dot
            if (messages.length > state.lastMessageCount) {
                const latestMsg = messages[messages.length - 1];
                if (latestMsg.sender === 'agent' && state.lastMessageCount > 0) {
                    playNotificationAlert();
                }
                state.lastMessageCount = messages.length;
            }

            threadContainer.innerHTML = '';
            
            if (messages.length === 0) {
                const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
                threadContainer.innerHTML = `<div class="pastie-msg system"><div class="pastie-msg-bubble">${t.chatStartWelcome}</div></div>`;
                return;
            }

            messages.forEach(msg => {
                appendMessageBubble(msg);
            });

            // Show typing indicator if agent is thinking/typing (visitor sent last message)
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender === 'visitor') {
                state.isTyping = true;
                appendTypingBubble();
            } else {
                state.isTyping = false;
            }
        } catch(e) {
            console.error('Failed to load message history:', e);
        }
    }

    function appendMessageBubble(msg) {
        const threadContainer = document.getElementById('pastie-chat-thread');
        const bubbleWrap = document.createElement('div');
        bubbleWrap.className = `pastie-msg ${msg.sender}`;

        const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let displayHtml = '';
        
        if (msg.sender === 'visitor') {
            displayHtml = `
                <div class="pastie-msg-bubble">
                    <div>${escapeHtml(msg.original_text)}</div>
                </div>
                <div class="pastie-msg-time">${timeStr}</div>
            `;
        } else if (msg.sender === 'agent') {
            // Agent writes Vietnamese, but client sees translated text!
            // Show only the translated/primary text in the client's language
            const primaryText = msg.translated_text || msg.original_text;

            displayHtml = `
                <div class="pastie-msg-bubble">
                    <div>${escapeHtml(primaryText)}</div>
                </div>
                <div class="pastie-msg-time">${timeStr}</div>
            `;
        } else {
            // System message
            displayHtml = `
                <div class="pastie-msg-bubble">
                    <div>${escapeHtml(msg.original_text)}</div>
                </div>
            `;
        }

        bubbleWrap.innerHTML = displayHtml;
        threadContainer.appendChild(bubbleWrap);
        threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    function appendTypingBubble() {
        const threadContainer = document.getElementById('pastie-chat-thread');
        if (!threadContainer) return;
        
        // Remove existing typing indicators to prevent duplicates
        const existing = threadContainer.querySelector('.pastie-typing-indicator-bubble');
        if (existing) return;

        const typingBubble = document.createElement('div');
        typingBubble.className = 'pastie-msg agent';
        typingBubble.innerHTML = `
            <div class="pastie-msg-bubble pastie-typing-indicator-bubble">
                <div class="pastie-typing-indicator">
                    <span class="pastie-typing-dot"></span>
                    <span class="pastie-typing-dot"></span>
                    <span class="pastie-typing-dot"></span>
                    <span class="pastie-typing-text" style="font-size: 11.5px; margin-left: 6px; color: var(--widget-text-sec); font-weight: 500;">${t.typingText}</span>
                </div>
            </div>
        `;
        threadContainer.appendChild(typingBubble);
        threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    // --- Helpers & Utilities ---

    function playNotificationAlert() {
        // Show notification dot on launcher button if closed
        if (!state.isOpen) {
            document.getElementById('pastie-chat-badge').style.display = 'block';
        }
        
        // Audio sound chime
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            
            osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
            osc.frequency.setValueAtTime(880.00, context.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
            
            osc.start();
            osc.stop(context.currentTime + 0.4);
        } catch(e) {}
    }

    function startPolling() {
        loadMessageHistory();
        if (state.pollInterval) clearInterval(state.pollInterval);
        state.pollInterval = setInterval(loadMessageHistory, CONFIG.POLL_INTERVAL);
    }

    function stopPolling() {
        if (state.pollInterval) {
            clearInterval(state.pollInterval);
            state.pollInterval = null;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- App Setup & Event listeners ---
    
    function init() {
        injectAssets();
        createWidgetDOM();

        // Assign global elements
        togglePill = document.getElementById('pastie-ai-toggle-pill');
        launcher = document.getElementById('pastie-chat-launcher');
        chatWindow = document.getElementById('pastie-chat-window');

        // Unconditionally evaluate initial state to configure launcher visibility and tidio status
        handleInitialState();

        // Bind events
        if (launcher) launcher.addEventListener('click', toggleChatWindow);
        document.getElementById('btn-submit-init').addEventListener('click', sendOTP);
        document.getElementById('btn-submit-otp').addEventListener('click', verifyOTP);
        document.getElementById('btn-resend-otp').addEventListener('click', sendOTP);

        if (togglePill) {
            togglePill.addEventListener('click', () => activateAIChat('Khách hàng click nút chuyển hướng chủ động'));
        }
        const openTidioBtn = document.getElementById('btn-open-tidio');
        if (openTidioBtn) {
            openTidioBtn.addEventListener('click', activateTidioChat);
        }

        // Start message polling if session is already active on load
        if (state.sessionId) {
            state.mode = 'human';
            switchView('chat');
        } else {
            state.mode = 'tidio';
            switchView('chat');
            injectTidioScript(false);
        }

        // Setup Tidio hash listener
        window.addEventListener('hashchange', checkHashForAIChat);
        checkHashForAIChat(); // Check immediately on load

        // Intercept language changes on landing page
        if (typeof window.switchLang === 'function') {
            const originalSwitchLang = window.switchLang;
            window.switchLang = function(lang) {
                originalSwitchLang(lang);
                changeWidgetLanguage(lang);
            };
        }
        applyTranslations(); // apply default lang on load

        
        document.getElementById('pastie-chat-form').addEventListener('submit', (e) => {

            e.preventDefault();
            sendMessage();
        });

        // Trigger input form enter bindings
        document.getElementById('input-name').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendOTP(); });
        document.getElementById('input-email').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendOTP(); });
        document.getElementById('input-otp').addEventListener('keypress', (e) => { if (e.key === 'Enter') verifyOTP(); });
    }

    // Execute widget loading when page DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
