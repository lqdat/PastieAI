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
        detectedLang: 'en', // default language detected
        tidioHistory: JSON.parse(sessionStorage.getItem('pastie_tidio_history') || '[]'),
        isTyping: false,
        typingTimeout: null
    };

    // DOM Elements
    let togglePill = null;
    let launcher = null;
    let chatWindow = null;
    let hasBoundDocumentTidioEvents = false;

    // Auto detect browser language
    try {
        state.detectedLang = navigator.language.split('-')[0] || 'en';
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
        
        root.innerHTML = `
            <!-- Chat Window -->
            <div class="pastie-chat-window" id="pastie-chat-window">
                <!-- Header -->
                <div class="pastie-chat-header">
                    <div class="pastie-chat-avatar"><i class="ri-customer-service-2-fill"></i></div>
                    <div class="pastie-chat-header-info">
                        <h4>Hỗ Trợ Trực Tuyến</h4>
                        <p><span class="pastie-chat-status-dot"></span> Đang hoạt động • AI song ngữ</p>
                    </div>
                </div>
                
                <!-- Body (Dynamic Views) -->
                <div class="pastie-chat-body" id="pastie-chat-body">
                    
                    <!-- Screen 1: Contact Form -->
                    <div class="pastie-chat-view" id="view-init">
                        <h3>Trò chuyện trực tiếp</h3>
                        <p id="view-init-desc">Vui lòng điền thông tin để kết nối trực tiếp với nhân viên hỗ trợ của chúng tôi.</p>
                        <div class="pastie-chat-error" id="init-error"></div>
                        <div class="pastie-chat-form-group">
                            <label>Họ tên của bạn</label>
                            <input type="text" id="input-name" placeholder="Nguyễn Văn A..." required>
                        </div>
                        <div class="pastie-chat-form-group">
                            <label>Địa chỉ Email</label>
                            <input type="email" id="input-email" placeholder="email@cua-ban.com..." required>
                        </div>
                        <button class="pastie-chat-btn" id="btn-submit-init">
                            Tiếp tục <i class="ri-arrow-right-line"></i>
                        </button>
                        <button class="pastie-chat-btn-link" id="btn-open-tidio" style="margin-top: 12px; margin-bottom: 0;">
                            <i class="ri-robot-2-line"></i> Quay lại AI Chatbot
                        </button>
                    </div>


                    <!-- Screen 2: OTP Verification -->
                    <div class="pastie-chat-view pastie-chat-hide" id="view-otp">
                        <h3>Xác thực Email</h3>
                        <p>Chúng tôi vừa gửi mã OTP 6 số vào email của bạn. Vui lòng nhập mã vào ô dưới đây để xác thực.</p>
                        <div class="pastie-chat-error" id="otp-error"></div>
                        <div class="pastie-chat-form-group">
                            <label>Mã xác thực OTP</label>
                            <input type="text" id="input-otp" placeholder="------" maxlength="6" style="text-align: center; letter-spacing: 4px; font-weight: bold; font-size: 18px;" required>
                        </div>
                        <button class="pastie-chat-btn" id="btn-submit-otp">
                            Xác nhận kết nối <i class="ri-checkbox-circle-line"></i>
                        </button>
                        <button class="pastie-chat-btn-link" id="btn-resend-otp">Gửi lại mã OTP</button>
                    </div>

                    <!-- Screen 3: Active Conversation Thread -->
                    <div class="pastie-chat-view pastie-chat-hide" id="view-chat" style="padding: 0;">
                        <div class="pastie-chat-thread" id="pastie-chat-thread"></div>
                        
                        <!-- Input Footer -->
                        <div class="pastie-chat-footer">
                            <form id="pastie-chat-form" onsubmit="event.preventDefault();">
                                <div class="pastie-chat-input-row">
                                    <input type="text" id="pastie-chat-input" placeholder="Type a message..." autocomplete="off">
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
            <button class="pastie-chat-launcher pastie-chat-hide" id="pastie-chat-launcher">
                <i class="ri-chat-3-line" id="launcher-icon"></i>
                <div class="pastie-chat-badge" id="pastie-chat-badge"></div>
            </button>

            <!-- Toggle Pill to switch to AI Chat -->
            <button class="pastie-ai-toggle-pill pastie-chat-hide" id="pastie-ai-toggle-pill">
                <i class="ri-robot-2-line"></i> Dịch thuật AI (🤖)
            </button>
        `;

        document.body.appendChild(root);
    }


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
        state.otpCooldown = 60;
        resendBtn.disabled = true;
        
        if (state.otpCooldownTimer) clearInterval(state.otpCooldownTimer);
        
        state.otpCooldownTimer = setInterval(() => {
            state.otpCooldown--;
            if (state.otpCooldown <= 0) {
                clearInterval(state.otpCooldownTimer);
                resendBtn.textContent = 'Gửi lại mã OTP';
                resendBtn.disabled = false;
            } else {
                resendBtn.textContent = `Gửi lại mã (${state.otpCooldown}s)`;
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

        if (!name || !email || !email.includes('@')) {
            errorEl.textContent = 'Vui lòng điền đúng Họ tên và Email.';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang xử lý...';

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
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
                errorEl.textContent = data.error || 'Có lỗi xảy ra.';
                errorEl.style.display = 'block';
            }
        } catch (e) {
            errorEl.textContent = 'Không thể kết nối đến máy chủ.';
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Tiếp tục <i class="ri-arrow-right-line"></i>';
        }
    }

    // 2. Verify OTP
    async function verifyOTP() {
        const code = document.getElementById('input-otp').value.trim();
        const errorEl = document.getElementById('otp-error');
        const submitBtn = document.getElementById('btn-submit-otp');

        if (code.length < 6) {
            errorEl.textContent = 'Vui lòng nhập đủ mã OTP 6 số.';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Xác thực...';

        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: state.visitorEmail,
                    code,
                    name: state.visitorName,
                    projectId: CONFIG.PROJECT_ID
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
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
                errorEl.textContent = data.error || 'Mã xác thực không hợp lệ.';
                errorEl.style.display = 'block';
            }
        } catch (e) {
            errorEl.textContent = 'Lỗi kết nối máy chủ.';
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Xác nhận kết nối <i class="ri-checkbox-circle-line"></i>';
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
                    targetLang: state.detectedLang || 'en'
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

        // 2. Remove old Tidio iframe to reset the widget UI
        const iframe = document.getElementById('tidio-chat-iframe');
        if (iframe) {
            try {
                iframe.remove();
            } catch(e) {}
        }

        // 3. Delete the tidioChatApi global object so the fresh script can recreate it
        delete window.tidioChatApi;

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
                threadContainer.innerHTML = '<div class="pastie-msg system"><div class="pastie-msg-bubble">Chào mừng! Vui lòng gửi câu hỏi của bạn. Hệ thống AI dịch thuật tự động đã sẵn sàng.</div></div>';
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
            // If translated_text exists, show it as primary bubble text, and original Vietnamese below
            const primaryText = msg.translated_text || msg.original_text;
            const hasTranslation = msg.translated_text && msg.translated_text !== msg.original_text;

            displayHtml = `
                <div class="pastie-msg-bubble">
                    <div>${escapeHtml(primaryText)}</div>
                    ${hasTranslation ? `<div class="pastie-msg-translation">${escapeHtml(msg.original_text)}</div>` : ''}
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
