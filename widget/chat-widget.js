(function() {
    // --- Widget Configuration ---
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
            return 'http://localhost:3000';
        })(),
        PROJECT_ID: 'pastie-landingpage',
        POLL_INTERVAL: 4000
    };

    // --- State Management ---
    let state = {
        isOpen: false,
        step: 'chat',
        // 'init' = OTP form | 'otp' = OTP code | 'ai' = verified AI chat | 'human' = human agent
        mode: (function() {
            const sid = sessionStorage.getItem('pastie_chat_session_id');
            if (!sid) return 'init';
            return sessionStorage.getItem('pastie_chat_mode') || 'ai';
        })(),
        sessionId: sessionStorage.getItem('pastie_chat_session_id') || null,
        visitorName: sessionStorage.getItem('pastie_chat_visitor_name') || '',
        visitorEmail: sessionStorage.getItem('pastie_chat_visitor_email') || '',
        lastMessageCount: 0,
        pollInterval: null,
        otpCooldown: 0,
        otpCooldownTimer: null,
        detectedLang: (function() {
            try { return localStorage.getItem('pastie-lang') || 'vi'; } catch(e) { return 'vi'; }
        })(),
        isTyping: false,
        typingTimeout: null,
        messages: [],
        offset: 0,
        limit: 15,
        hasMore: true,
        isLoadingMore: false,
        requestingAgent: false // flag: OTP form opened for GẶP CSKH (not fresh session)
    };

    const TRANSLATIONS = {
        vi: {
            headerTitle: 'Hỗ Trợ Trực Tuyến',
            headerStatus: 'Đang hoạt động • AI song ngữ',
            initTitle: 'Bắt đầu trò chuyện',
            initDesc: 'Vui lòng điền tên và email của bạn để bắt đầu chat với AI hỗ trợ của chúng tôi.',
            initNameLabel: 'Họ tên của bạn',
            initNamePlaceholder: 'Nguyễn Văn A...',
            initEmailLabel: 'Địa chỉ Email',
            initEmailPlaceholder: 'email@cua-ban.com...',
            initBtnSubmit: 'Tiếp tục',
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
            chatThinking: 'AI đang suy nghĩ...',
            loadingSend: 'Đang xử lý...',
            loadingVerify: 'Xác thực...',
            defaultError: 'Có lỗi xảy ra.',
            typingText: 'Nhân viên đang nhập...',
            chatStartWelcome: 'Chào mừng! Vui lòng gửi câu hỏi của bạn. Hệ thống AI dịch thuật tự động đã sẵn sàng.',
            loadOlder: 'Xem tin nhắn cũ hơn',
            loadingMore: 'Đang tải...',
            miniSenderAgent: 'Hỗ trợ',
            miniSenderVisitor: 'Bạn',
            miniSenderSystem: 'Hệ thống',
            miniSenderAI: 'AI Trợ lý',
            btnMeetCSKH: 'Gặp CSKH',
            btnCloseCSKH: 'Kết thúc',
            confirmEndChat: 'Bạn có chắc chắn muốn kết thúc cuộc trò chuyện?',
            backToAI: 'Quay lại AI'
        },
        en: {
            headerTitle: 'Live Support',
            headerStatus: 'Online • Bilingual AI',
            initTitle: 'Start a Conversation',
            initDesc: 'Please enter your name and email to start chatting with our AI assistant.',
            initNameLabel: 'Your Name',
            initNamePlaceholder: 'John Doe...',
            initEmailLabel: 'Email Address',
            initEmailPlaceholder: 'your@email.com...',
            initBtnSubmit: 'Continue',
            initErrorFields: 'Please enter a valid Name and Email.',
            initErrorConn: 'Unable to connect to server.',
            otpTitle: 'Email Verification',
            otpDesc: 'We just sent a 6-digit OTP code to your email. Please enter it below.',
            otpLabel: 'OTP Verification Code',
            otpPlaceholder: '------',
            otpBtnSubmit: 'Confirm Connection',
            otpBtnResend: 'Resend OTP',
            otpBtnResendCooldown: 'Resend code',
            otpErrorEmpty: 'Please enter the full 6-digit OTP.',
            otpErrorInvalid: 'Invalid or expired OTP.',
            otpErrorConn: 'Server connection error.',
            chatInputPlaceholder: 'Type a message...',
            chatThinking: 'AI is thinking...',
            loadingSend: 'Processing...',
            loadingVerify: 'Verifying...',
            defaultError: 'An error occurred.',
            typingText: 'Agent is typing...',
            chatStartWelcome: 'Welcome! Send your question and our bilingual AI will respond.',
            loadOlder: 'Load older messages',
            loadingMore: 'Loading...',
            miniSenderAgent: 'Support',
            miniSenderVisitor: 'You',
            miniSenderSystem: 'System',
            miniSenderAI: 'AI Assistant',
            btnMeetCSKH: 'Meet Agent',
            btnCloseCSKH: 'End Chat',
            confirmEndChat: 'Are you sure you want to end this conversation?',
            backToAI: 'Back to AI'
        },
        ru: {
            headerTitle: 'Живая Поддержка',
            headerStatus: 'Онлайн • Двуязычный ИИ',
            initTitle: 'Начать разговор',
            initDesc: 'Пожалуйста, введите ваше имя и email, чтобы начать чат с нашим ИИ-ассистентом.',
            initNameLabel: 'Ваше имя',
            initNamePlaceholder: 'Иван Иванов...',
            initEmailLabel: 'Электронная почта',
            initEmailPlaceholder: 'ваш@email.com...',
            initBtnSubmit: 'Продолжить',
            initErrorFields: 'Пожалуйста, введите корректное Имя и Email.',
            initErrorConn: 'Невозможно подключиться к серверу.',
            otpTitle: 'Подтверждение Email',
            otpDesc: 'Мы отправили 6-значный код на ваш email. Введите его ниже.',
            otpLabel: 'Код подтверждения OTP',
            otpPlaceholder: '------',
            otpBtnSubmit: 'Подтвердить',
            otpBtnResend: 'Отправить код повторно',
            otpBtnResendCooldown: 'Повторная отправка',
            otpErrorEmpty: 'Пожалуйста, введите 6-значный OTP.',
            otpErrorInvalid: 'Неверный или просроченный OTP.',
            otpErrorConn: 'Ошибка подключения к серверу.',
            chatInputPlaceholder: 'Введите сообщение...',
            chatThinking: 'ИИ думает...',
            loadingSend: 'Обработка...',
            loadingVerify: 'Проверка...',
            defaultError: 'Произошла ошибка.',
            typingText: 'Оператор печатает...',
            chatStartWelcome: 'Добро пожаловать! Задайте вопрос, и наш ИИ ответит вам.',
            loadOlder: 'Загрузить старые сообщения',
            loadingMore: 'Загрузка...',
            miniSenderAgent: 'Поддержка',
            miniSenderVisitor: 'Вы',
            miniSenderSystem: 'Система',
            miniSenderAI: 'ИИ Ассистент',
            btnMeetCSKH: 'Оператор',
            btnCloseCSKH: 'Завершить',
            confirmEndChat: 'Вы уверены, что хотите завершить разговор?',
            backToAI: 'Назад к ИИ'
        },
        zh: {
            headerTitle: '在线支持',
            headerStatus: '在线 • 双语 AI',
            initTitle: '开始对话',
            initDesc: '请输入您的姓名和邮箱，开始与我们的AI助手对话。',
            initNameLabel: '您的姓名',
            initNamePlaceholder: '张三...',
            initEmailLabel: '电子邮件',
            initEmailPlaceholder: 'your@email.com...',
            initBtnSubmit: '继续',
            initErrorFields: '请输入正确的姓名和邮箱。',
            initErrorConn: '无法连接到服务器。',
            otpTitle: '邮箱验证',
            otpDesc: '我们已向您的邮箱发送了6位验证码，请在下方输入。',
            otpLabel: 'OTP 验证码',
            otpPlaceholder: '------',
            otpBtnSubmit: '确认连接',
            otpBtnResend: '重新发送OTP',
            otpBtnResendCooldown: '重新发送',
            otpErrorEmpty: '请输入完整的6位OTP。',
            otpErrorInvalid: 'OTP无效或已过期。',
            otpErrorConn: '服务器连接错误。',
            chatInputPlaceholder: '输入消息...',
            chatThinking: 'AI正在思考...',
            loadingSend: '处理中...',
            loadingVerify: '验证中...',
            defaultError: '发生错误。',
            typingText: '客服正在输入...',
            chatStartWelcome: '欢迎！请发送您的问题，我们的双语AI将为您解答。',
            loadOlder: '加载更多旧消息',
            loadingMore: '加载中...',
            miniSenderAgent: '客服',
            miniSenderVisitor: '您',
            miniSenderSystem: '系统',
            miniSenderAI: 'AI助手',
            btnMeetCSKH: '联系客服',
            btnCloseCSKH: '结束',
            confirmEndChat: '您确定要结束对话吗？',
            backToAI: '返回AI'
        }
    };

    // DOM Elements
    let launcher = null;
    let chatWindow = null;
    let headerActionBtn = null;

    // Auto detect language
    try {
        state.detectedLang = localStorage.getItem('pastie-lang') || navigator.language.split('-')[0] || 'vi';
        if (!TRANSLATIONS[state.detectedLang]) state.detectedLang = 'vi';
    } catch(e) {}

    // --- UI Dynamic Injection ---
    function injectAssets() {
        if (!document.querySelector('link[href*="Be+Vietnam+Pro"]')) {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap';
            document.head.appendChild(fontLink);
        }
        if (!document.querySelector('link[href*="remixicon"]')) {
            const iconLink = document.createElement('link');
            iconLink.rel = 'stylesheet';
            iconLink.href = 'https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css';
            document.head.appendChild(iconLink);
        }
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = `${CONFIG.BACKEND_URL}/chat-widget.css`;
        document.head.appendChild(styleLink);
    }

    function createWidgetDOM() {
        const root = document.createElement('div');
        root.id = 'pastie-chat-widget-root';
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];

        root.innerHTML = `
            <div class="pastie-chat-window" id="pastie-chat-window">
                <div class="pastie-chat-header">
                    <div class="pastie-chat-avatar"><i class="ri-customer-service-2-fill"></i></div>
                    <div class="pastie-chat-header-info">
                        <h4 id="pastie-chat-header-title">${t.headerTitle}</h4>
                        <p id="pastie-chat-header-status"><span class="pastie-chat-status-dot"></span> ${t.headerStatus}</p>
                    </div>
                    <button class="pastie-chat-header-action-btn" id="pastie-chat-header-action-btn"></button>
                </div>
                <div class="pastie-chat-body" id="pastie-chat-body">
                    <!-- Screen 1: Contact Form (for GẶP CSKH) -->
                    <div class="pastie-chat-view pastie-chat-hide" id="view-init">
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
                        <button class="pastie-chat-btn-link" id="btn-back-to-ai" style="margin-top: 12px; margin-bottom: 0;">
                            <i class="ri-robot-2-line"></i> <span id="txt-btn-back-to-ai">${t.backToAI}</span>
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
                    <div class="pastie-chat-view" id="view-chat" style="padding: 0;">
                        <div class="pastie-chat-thread" id="pastie-chat-thread"></div>
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
            <!-- Mini Bubble Popup -->
            <div class="pastie-chat-mini-bubble" id="pastie-chat-mini-bubble">
                <div class="pastie-chat-mini-body" id="pastie-chat-mini-body">
                    <div class="pastie-chat-mini-avatar"><i class="ri-customer-service-2-fill"></i></div>
                    <div class="pastie-chat-mini-text-container">
                        <div class="pastie-chat-mini-sender" id="pastie-chat-mini-sender">Support Team</div>
                        <div class="pastie-chat-mini-text" id="pastie-chat-mini-text">...</div>
                    </div>
                </div>
                <button class="pastie-chat-mini-close" id="pastie-chat-mini-close" aria-label="Close message preview">
                    <i class="ri-close-line"></i>
                </button>
            </div>
        `;
        document.body.appendChild(root);
    }

    function applyTranslations() {
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
        const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
        const safeSetPlaceholder = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };

        safeSetText('pastie-chat-header-title', t.headerTitle);
        const statusEl = document.getElementById('pastie-chat-header-status');
        if (statusEl) statusEl.innerHTML = `<span class="pastie-chat-status-dot"></span> ${t.headerStatus}`;

        safeSetText('view-init-title', t.initTitle);
        safeSetText('view-init-desc', t.initDesc);
        safeSetText('lbl-input-name', t.initNameLabel);
        safeSetPlaceholder('input-name', t.initNamePlaceholder);
        safeSetText('lbl-input-email', t.initEmailLabel);
        safeSetPlaceholder('input-email', t.initEmailPlaceholder);
        safeSetText('txt-btn-submit-init', t.initBtnSubmit);
        safeSetText('txt-btn-back-to-ai', t.backToAI);

        safeSetText('view-otp-title', t.otpTitle);
        safeSetText('view-otp-desc', t.otpDesc);
        safeSetText('lbl-input-otp', t.otpLabel);
        safeSetPlaceholder('input-otp', t.otpPlaceholder);
        safeSetText('txt-btn-submit-otp', t.otpBtnSubmit);

        const resendBtn = document.getElementById('btn-resend-otp');
        if (resendBtn) {
            resendBtn.textContent = state.otpCooldown > 0 ? `${t.otpBtnResendCooldown} (${state.otpCooldown}s)` : t.otpBtnResend;
        }
        safeSetPlaceholder('pastie-chat-input', t.chatInputPlaceholder);

        const threadContainer = document.getElementById('pastie-chat-thread');
        if (threadContainer && threadContainer.children.length === 1 && threadContainer.children[0].classList.contains('system')) {
            threadContainer.children[0].innerHTML = `<div class="pastie-msg-bubble">${t.chatStartWelcome}</div>`;
        }
    }

    async function changeWidgetLanguage(lang) {
        if (!TRANSLATIONS[lang]) return;
        state.detectedLang = lang;
        applyTranslations();
        if (state.isOpen) toggleChatWindow();
        else {
            const miniEl = document.getElementById('pastie-chat-mini-bubble');
            if (miniEl && miniEl.classList.contains('show')) showMiniBubble();
        }
        if (state.sessionId) {
            try {
                await fetch(`${CONFIG.BACKEND_URL}/api/chats/session/language`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: state.sessionId, language: lang })
                });
                state.messages = [];
                state.offset = 0;
                state.hasMore = true;
                await loadMessageHistory(false);
            } catch(e) {}
        }
    }
    window.changeWidgetLanguage = changeWidgetLanguage;

    function minimizePastieChat() {
        if (state.isOpen) toggleChatWindow();
    }
    window.minimizePastieChat = minimizePastieChat;

    function openPastieChat() {
        if (!state.isOpen) toggleChatWindow();
    }
    window.openPastieChat = openPastieChat;

    function updateHeaderActionButton() {
        const btn = document.getElementById('pastie-chat-header-action-btn');
        if (!btn) return;
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];

        if (state.mode === 'ai' && state.sessionId) {
            btn.className = 'pastie-chat-header-action-btn meet-cskh';
            btn.textContent = t.btnMeetCSKH || 'Gặp CSKH';
            btn.style.display = 'block';
            btn.onclick = () => requestAgentDirect();
        } else if (state.mode === 'human' && state.sessionId) {
            btn.className = 'pastie-chat-header-action-btn close-cskh';
            btn.textContent = t.btnCloseCSKH || 'Kết thúc';
            btn.style.display = 'block';
            btn.onclick = () => handleEndChatSession();
        } else {
            btn.style.display = 'none';
        }
    }

    // Email/name were already verified when the chat started — go straight to agent, no OTP needed.
    async function requestAgentDirect() {
        if (!state.sessionId) return;
        const btn = document.getElementById('pastie-chat-header-action-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i>`; }
        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/chats/session/request-agent-direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.sessionId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                state.mode = 'human';
                sessionStorage.setItem('pastie_chat_mode', 'human');
                switchView('chat');
                loadMessageHistory();
            }
        } catch(e) {}
        if (btn) btn.disabled = false;
        updateHeaderActionButton();
    }

    async function handleEndChatSession() {
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
        if (!confirm(t.confirmEndChat)) return;

        const btn = document.getElementById('pastie-chat-header-action-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i>`; }

        try {
            await fetch(`${CONFIG.BACKEND_URL}/api/chats/session/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.sessionId })
            });
        } catch(e) {}

        // Clear session, go back to init form
        state.sessionId = null;
        state.mode = 'init';
        state.messages = [];
        state.lastMessageCount = 0;
        state.offset = 0;
        state.hasMore = true;
        state.requestingAgent = false;
        state.visitorName = '';
        state.visitorEmail = '';
        sessionStorage.removeItem('pastie_chat_session_id');
        sessionStorage.removeItem('pastie_chat_mode');
        sessionStorage.removeItem('pastie_chat_visitor_name');
        sessionStorage.removeItem('pastie_chat_visitor_email');
        stopPolling();

        if (btn) btn.disabled = false;
        switchView('init');
        updateHeaderActionButton();
    }

    // --- DOM Actions & Navigation ---
    function switchView(step) {
        state.step = step;
        const views = {
            'init': document.getElementById('view-init'),
            'otp': document.getElementById('view-otp'),
            'chat': document.getElementById('view-chat')
        };
        Object.values(views).forEach(v => { if (v) v.classList.add('pastie-chat-hide'); });
        if (views[step]) views[step].classList.remove('pastie-chat-hide');

        // Show "Back to AI" only when escalating from existing session
        const backBtn = document.getElementById('btn-back-to-ai');
        if (backBtn) backBtn.style.display = (state.requestingAgent && state.sessionId) ? 'block' : 'none';

        if (step === 'chat') {
            if (state.sessionId) {
                startPolling();
                loadMessageHistory();
            } else {
                stopPolling();
                // Show welcome message for fresh AI session
                const threadContainer = document.getElementById('pastie-chat-thread');
                if (threadContainer && state.messages.length === 0) {
                    const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
                    threadContainer.innerHTML = `<div class="pastie-msg system"><div class="pastie-msg-bubble">${t.chatStartWelcome}</div></div>`;
                }
            }
        }
        updateHeaderActionButton();
    }

    function toggleChatWindow() {
        const windowEl = document.getElementById('pastie-chat-window');
        const iconEl = document.getElementById('launcher-icon');
        const badgeEl = document.getElementById('pastie-chat-badge');

        state.isOpen = !state.isOpen;

        if (state.isOpen) {
            windowEl.classList.add('open');
            iconEl.className = 'ri-close-line active';
            if (badgeEl) badgeEl.style.display = 'none';

            // Hide mini bubble
            const miniEl = document.getElementById('pastie-chat-mini-bubble');
            if (miniEl) miniEl.classList.remove('show');

            // Decide which view to show
            if (state.sessionId && (state.mode === 'ai' || state.mode === 'human')) {
                switchView('chat');
            } else if (state.mode === 'otp') {
                switchView('otp');
            } else {
                switchView('init');
            }
            updateHeaderActionButton();
        } else {
            windowEl.classList.remove('open');
            iconEl.className = 'ri-chat-3-line';
            stopPolling();

            if (state.messages && state.messages.length > 0 && state.sessionId) {
                showMiniBubble();
            }
        }
    }

    function showMiniBubble() {
        const miniEl = document.getElementById('pastie-chat-mini-bubble');
        const textEl = document.getElementById('pastie-chat-mini-text');
        const senderEl = document.getElementById('pastie-chat-mini-sender');
        if (!miniEl || !textEl || !senderEl) return;
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];

        if (state.sessionId && state.messages && state.messages.length > 0) {
            const lastMsg = state.messages[state.messages.length - 1];
            if (!lastMsg) return;
            if (lastMsg.sender === 'agent') {
                senderEl.textContent = t.miniSenderAgent;
                textEl.textContent = lastMsg.translated_text || lastMsg.original_text;
            } else if (lastMsg.sender === 'ai') {
                senderEl.textContent = t.miniSenderAI;
                textEl.textContent = lastMsg.translated_text || lastMsg.original_text;
            } else if (lastMsg.sender === 'visitor') {
                senderEl.textContent = t.miniSenderVisitor;
                textEl.textContent = lastMsg.original_text;
            } else {
                senderEl.textContent = t.miniSenderSystem;
                textEl.textContent = lastMsg.original_text;
            }
            miniEl.classList.add('show');
        }
    }

    // --- OTP Countdown Timer ---
    function startOtpCooldown() {
        const resendBtn = document.getElementById('btn-resend-otp');
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
        state.otpCooldown = 60;
        if (resendBtn) resendBtn.disabled = true;
        if (state.otpCooldownTimer) clearInterval(state.otpCooldownTimer);
        state.otpCooldownTimer = setInterval(() => {
            state.otpCooldown--;
            if (state.otpCooldown <= 0) {
                clearInterval(state.otpCooldownTimer);
                if (resendBtn) { resendBtn.textContent = t.otpBtnResend; resendBtn.disabled = false; }
            } else {
                if (resendBtn) resendBtn.textContent = `${t.otpBtnResendCooldown} (${state.otpCooldown}s)`;
            }
        }, 1000);
    }

    // --- API Network Calls ---

    // Send OTP for GẶP CSKH flow
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
        } catch(e) {
            errorEl.textContent = t.initErrorConn;
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${t.initBtnSubmit} <i class="ri-arrow-right-line"></i>`;
        }
    }

    // Verify OTP — two flows:
    // 1. If existing AI session (state.requestingAgent=true) → update session + set requested_agent
    // 2. No session → create new human session
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
            if (state.requestingAgent && state.sessionId) {
                // Update existing AI session → request human agent
                const res = await fetch(`${CONFIG.BACKEND_URL}/api/chats/session/request-agent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: state.sessionId,
                        email: state.visitorEmail,
                        name: state.visitorName,
                        code
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    state.mode = 'human';
                    state.requestingAgent = false;
                    sessionStorage.setItem('pastie_chat_mode', 'human');
                    switchView('chat');
                    loadMessageHistory();
                } else {
                    errorEl.textContent = data.error || t.otpErrorInvalid;
                    errorEl.style.display = 'block';
                }
            } else {
                // Create new session
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
                    state.mode = 'ai';
                    state.sessionId = data.sessionId;
                    state.requestingAgent = false;
                    sessionStorage.setItem('pastie_chat_session_id', data.sessionId);
                    sessionStorage.setItem('pastie_chat_mode', 'ai');
                    switchView('chat');
                } else {
                    errorEl.textContent = data.error || t.otpErrorInvalid;
                    errorEl.style.display = 'block';
                }
            }
        } catch(e) {
            errorEl.textContent = t.otpErrorConn;
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${t.otpBtnSubmit} <i class="ri-checkbox-circle-line"></i>`;
        }
    }

    async function sendSystemNotification(text) {
        if (!state.sessionId) return;
        try {
            await fetch(`${CONFIG.BACKEND_URL}/api/chats/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.sessionId, sender: 'system', text, targetLang: state.detectedLang || 'vi' })
            });
        } catch(e) {}
    }

    // Send Message (AI or Human mode)
    async function sendMessage() {
        const inputEl = document.getElementById('pastie-chat-input');
        const text = inputEl.value.trim();
        if (!text) return;
        inputEl.value = '';

        // Must have a session (created via OTP) before sending
        if (!state.sessionId) return;

        if ((state.mode === 'ai' || state.mode === 'human') && state.sessionId) {
            // Add temp message to show immediately
            const newMsgObj = {
                id: 'temp_' + Date.now(),
                sender: 'visitor',
                original_text: text,
                created_at: new Date()
            };
            state.messages.push(newMsgObj);
            renderMessageThread(false);

            try {
                const res = await fetch(`${CONFIG.BACKEND_URL}/api/chats/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: state.sessionId,
                        sender: 'visitor',
                        text,
                        visitorLang: state.detectedLang || 'vi',
                        targetLang: 'vi'
                    })
                });

                if (res.status === 404 || res.status === 410) {
                    // Session expired — restart fresh AI session
                    state.sessionId = null;
                    state.mode = 'ai';
                    state.messages = [];
                    sessionStorage.removeItem('pastie_chat_session_id');
                    stopPolling();
                    switchView('chat');
                    return;
                }

                const data = await res.json();
                if (data.success) {
                    loadMessageHistory();
                }
            } catch(e) {
                console.error('Failed to send message:', e);
            }
        }
    }

    // --- Polling & Message History ---
    async function loadMessageHistory(isLoadMore = false) {
        if (!state.sessionId) return;

        let fetchLimit = state.limit;
        let fetchOffset = state.offset;

        if (!isLoadMore) {
            fetchLimit = Math.max(state.messages.length, state.limit);
            fetchOffset = 0;
        }

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/chats/${state.sessionId}/messages?visitorLang=${state.detectedLang}&limit=${fetchLimit}&offset=${fetchOffset}&_=${Date.now()}`);
            if (res.status === 404 || res.status === 410) {
                state.sessionId = null;
                state.mode = 'ai';
                state.messages = [];
                sessionStorage.removeItem('pastie_chat_session_id');
                stopPolling();
                switchView('chat');
                return;
            }
            const fetchedMessages = await res.json();
            if (!Array.isArray(fetchedMessages)) return;

            if (isLoadMore) {
                if (fetchedMessages.length < state.limit) state.hasMore = false;
                state.messages = [...fetchedMessages, ...state.messages];
                state.offset += fetchedMessages.length;
            } else {
                const currentMsgs = state.messages.filter(m => m.id && !m.id.toString().startsWith('temp_'));
                if (currentMsgs.length === 0) {
                    state.messages = fetchedMessages;
                    if (fetchedMessages.length < state.limit) state.hasMore = false;
                    state.lastMessageCount = fetchedMessages.length;
                    if (!state.isOpen && state.messages.length > 0) showMiniBubble();
                } else {
                    const merged = [...currentMsgs];
                    fetchedMessages.forEach(newMsg => {
                        const idx = merged.findIndex(m => m.id === newMsg.id);
                        if (idx !== -1) merged[idx] = newMsg;
                        else merged.push(newMsg);
                    });
                    merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    if (merged.length > state.lastMessageCount) {
                        const latestMsg = merged[merged.length - 1];
                        if (latestMsg.sender === 'agent' && state.lastMessageCount > 0) playNotificationAlert();
                        state.lastMessageCount = merged.length;
                    }
                    state.messages = merged;
                }
            }
            renderMessageThread(isLoadMore);
        } catch(e) {
            console.error('Failed to load message history:', e);
        }
    }

    function renderMessageThread(isLoadMore = false) {
        const threadContainer = document.getElementById('pastie-chat-thread');
        if (!threadContainer) return;

        const previousScrollHeight = threadContainer.scrollHeight;
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];

        threadContainer.innerHTML = '';

        if (state.hasMore) {
            const loadMoreDiv = document.createElement('div');
            loadMoreDiv.className = 'pastie-chat-loadmore-btn-container';
            loadMoreDiv.style.textAlign = 'center';
            loadMoreDiv.style.padding = '12px 8px';
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'pastie-chat-loadmore-btn';
            loadMoreBtn.id = 'btn-load-older';
            loadMoreBtn.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:var(--widget-text);font-family:"Be Vietnam Pro",sans-serif;font-size:11px;font-weight:600;border-radius:20px;padding:6px 16px;cursor:pointer;transition:all 0.2s';
            loadMoreBtn.textContent = state.isLoadingMore ? t.loadingMore : t.loadOlder;
            loadMoreBtn.onmouseover = () => { loadMoreBtn.style.background = 'rgba(255,255,255,0.15)'; };
            loadMoreBtn.onmouseout = () => { loadMoreBtn.style.background = 'rgba(255,255,255,0.08)'; };
            loadMoreBtn.onclick = async () => {
                if (state.isLoadingMore) return;
                state.isLoadingMore = true;
                loadMoreBtn.textContent = t.loadingMore;
                await loadMessageHistory(true);
                state.isLoadingMore = false;
            };
            loadMoreDiv.appendChild(loadMoreBtn);
            threadContainer.appendChild(loadMoreDiv);
        }

        if (state.messages.length === 0) {
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'pastie-msg system';
            welcomeDiv.innerHTML = `<div class="pastie-msg-bubble">${t.chatStartWelcome}</div>`;
            threadContainer.appendChild(welcomeDiv);
            return;
        }

        state.messages.forEach(msg => {
            const bubbleWrap = document.createElement('div');
            bubbleWrap.className = `pastie-msg ${msg.sender}`;
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let displayHtml = '';
            if (msg.sender === 'visitor') {
                const primaryText = msg.translated_text || msg.original_text;
                displayHtml = `<div class="pastie-msg-bubble"><div>${escapeHtml(primaryText)}</div></div><div class="pastie-msg-time">${timeStr}</div>`;
            } else if (msg.sender === 'agent' || msg.sender === 'ai') {
                const primaryText = msg.translated_text || msg.original_text;
                displayHtml = `<div class="pastie-msg-bubble"><div>${escapeHtml(primaryText)}</div></div><div class="pastie-msg-time">${timeStr}</div>`;
            } else {
                const primaryText = msg.translated_text || msg.original_text;
                displayHtml = `<div class="pastie-msg-bubble"><div>${escapeHtml(primaryText)}</div></div>`;
            }
            bubbleWrap.innerHTML = displayHtml;
            threadContainer.appendChild(bubbleWrap);
        });

        // Show typing indicator if last message is from visitor (AI/agent thinking)
        const lastMsg = state.messages[state.messages.length - 1];
        if (lastMsg && lastMsg.sender === 'visitor') {
            state.isTyping = true;
            appendTypingBubble();
        } else {
            state.isTyping = false;
        }

        if (isLoadMore) {
            threadContainer.scrollTop = threadContainer.scrollHeight - previousScrollHeight;
        } else {
            threadContainer.scrollTop = threadContainer.scrollHeight;
        }
    }

    function appendTypingBubble() {
        const threadContainer = document.getElementById('pastie-chat-thread');
        if (!threadContainer) return;
        const existing = threadContainer.querySelector('.pastie-typing-indicator-bubble');
        if (existing) return;
        const t = TRANSLATIONS[state.detectedLang] || TRANSLATIONS['vi'];
        const typingBubble = document.createElement('div');
        typingBubble.className = 'pastie-msg agent';
        typingBubble.innerHTML = `
            <div class="pastie-msg-bubble pastie-typing-indicator-bubble">
                <div class="pastie-typing-indicator">
                    <span class="pastie-typing-dot"></span>
                    <span class="pastie-typing-dot"></span>
                    <span class="pastie-typing-dot"></span>
                    <span class="pastie-typing-text" style="font-size:11.5px;margin-left:6px;color:var(--widget-text-sec);font-weight:500;">${t.chatThinking}</span>
                </div>
            </div>
        `;
        threadContainer.appendChild(typingBubble);
        threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    // --- Helpers ---
    function playNotificationAlert() {
        if (!state.isOpen) {
            const badge = document.getElementById('pastie-chat-badge');
            if (badge) badge.style.display = 'block';
            if (state.messages && state.messages.length > 0 && state.sessionId) showMiniBubble();
        }
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.setValueAtTime(587.33, context.currentTime);
            osc.frequency.setValueAtTime(880.00, context.currentTime + 0.15);
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
        if (state.pollInterval) { clearInterval(state.pollInterval); state.pollInterval = null; }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }

    // Handle URL hash to trigger human chat (#chat-with-human)
    function checkHashForHumanChat() {
        if (window.location.hash === '#chat-with-human') {
            if (!state.isOpen) toggleChatWindow();
            if (state.sessionId && state.mode === 'ai') {
                requestAgentDirect();
            } else {
                state.requestingAgent = true;
                switchView('init');
            }
            try { history.pushState('', document.title, window.location.pathname + window.location.search); } catch(e) {}
        }
    }

    // --- App Setup & Event Listeners ---
    function init() {
        injectAssets();
        createWidgetDOM();

        launcher = document.getElementById('pastie-chat-launcher');
        chatWindow = document.getElementById('pastie-chat-window');
        headerActionBtn = document.getElementById('pastie-chat-header-action-btn');

        // Bind launcher
        if (launcher) launcher.addEventListener('click', toggleChatWindow);

        // Mini bubble
        const miniBubble = document.getElementById('pastie-chat-mini-bubble');
        const miniClose = document.getElementById('pastie-chat-mini-close');
        if (miniBubble) {
            miniBubble.addEventListener('click', (e) => {
                if (e.target.closest('#pastie-chat-mini-close')) return;
                if (!state.isOpen) toggleChatWindow();
                miniBubble.classList.remove('show');
            });
        }
        if (miniClose) {
            miniClose.addEventListener('click', (e) => {
                e.stopPropagation();
                miniBubble.classList.remove('show');
            });
        }

        // Form buttons
        const submitInitBtn = document.getElementById('btn-submit-init');
        const submitOtpBtn = document.getElementById('btn-submit-otp');
        const resendOtpBtn = document.getElementById('btn-resend-otp');
        const backToAiBtn = document.getElementById('btn-back-to-ai');

        if (submitInitBtn) submitInitBtn.addEventListener('click', sendOTP);
        if (submitOtpBtn) submitOtpBtn.addEventListener('click', verifyOTP);
        if (resendOtpBtn) resendOtpBtn.addEventListener('click', sendOTP);
        if (backToAiBtn) {
            backToAiBtn.addEventListener('click', () => {
                state.requestingAgent = false;
                switchView('chat');
            });
        }

        // Chat form
        const chatForm = document.getElementById('pastie-chat-form');
        if (chatForm) chatForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });

        // Enter key bindings
        const nameInput = document.getElementById('input-name');
        const emailInput = document.getElementById('input-email');
        const otpInput = document.getElementById('input-otp');
        if (nameInput) nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendOTP(); });
        if (emailInput) emailInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendOTP(); });
        if (otpInput) otpInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') verifyOTP(); });

        // Click-outside to close
        document.addEventListener('click', (e) => {
            if (state.isOpen && chatWindow) {
                const clickedInsideWindow = chatWindow.contains(e.target);
                const clickedInsideLauncher = launcher && launcher.contains(e.target);
                const miniBubbleEl = document.getElementById('pastie-chat-mini-bubble');
                const clickedInsideMiniBubble = miniBubbleEl && miniBubbleEl.contains(e.target);
                if (!clickedInsideWindow && !clickedInsideLauncher && !clickedInsideMiniBubble) {
                    toggleChatWindow();
                }
            }
        });

        // Initial state
        if (state.sessionId) {
            switchView('chat'); // existing session → chat
        } else {
            switchView('init'); // no session → show form first
        }
        updateHeaderActionButton();

        // Hash listener
        window.addEventListener('hashchange', checkHashForHumanChat);
        checkHashForHumanChat();

        // Language switcher intercept
        if (typeof window.switchLang === 'function') {
            const originalSwitchLang = window.switchLang;
            window.switchLang = function(lang) {
                originalSwitchLang(lang);
                changeWidgetLanguage(lang);
            };
        }
        applyTranslations();
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
