/*
 * Pastie Chat embed loader.
 * Add this one file to a host website; it then loads the self-contained widget.
 */
(function (window, document) {
    'use strict';

    const loader = document.currentScript;
    if (!loader || document.getElementById('pastie-chat-widget-root')) return;

    const configuredBackend = (loader.dataset.backend || '').replace(/\/$/, '');
    let backend = configuredBackend;
    if (!backend) {
        try { backend = new URL(loader.src).origin; } catch (error) { return; }
    }

    const widget = document.createElement('script');
    widget.src = `${backend}/chat-widget.js`;
    widget.async = true;
    widget.dataset.project = loader.dataset.project || 'pastie-landingpage';
    widget.dataset.backend = backend;
    widget.dataset.embedVersion = '1';
    widget.onerror = function () {
        console.error('[Pastie Chat] Không thể tải chat widget từ', widget.src);
    };
    document.head.appendChild(widget);
})(window, document);
