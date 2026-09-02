/*
 * Pastie Chat embed loader.
 * Add this one file to a host website; it then loads the self-contained widget.
 */
(function (window, document) {
    'use strict';

    const loader = document.currentScript;
    if (!loader || document.getElementById('pastie-chat-widget-root')) return;

    // Đặt lúc build bởi scripts/build.js. Rỗng = suy ra từ origin của chính
    // script, đúng như trước. Cần nó khi widget được host riêng: lúc ấy origin
    // của script là máy chủ tĩnh, không phải backend.
    // Thứ tự ưu tiên: data-backend trên thẻ nhúng > giá trị build > origin script.
    const BUILD_BACKEND = '';
    const configuredBackend = (loader.dataset.backend || BUILD_BACKEND || '').replace(/\/$/, '');
    let backend = configuredBackend;
    if (!backend) {
        try { backend = new URL(loader.src).origin; } catch (error) { return; }
    }

    const widget = document.createElement('script');
    widget.src = `${backend}/chat-widget.js`;
    widget.async = true;
    widget.dataset.project = loader.dataset.project || 'pastie-landingpage';
    widget.dataset.backend = backend;
    if (loader.dataset.qrCode) widget.dataset.qrCode = loader.dataset.qrCode;
    widget.dataset.embedVersion = '1';
    widget.onerror = function () {
        console.error('[Pastie Chat] Không thể tải chat widget từ', widget.src);
    };
    document.head.appendChild(widget);
})(window, document);
