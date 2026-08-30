let currentBadgeCount = 0;

async function setUnreadBadge(count) {
  const nav = self.navigator || navigator;
  if (nav && 'setAppBadge' in nav) {
    try {
      if (typeof count === 'number' && count > 0) {
        currentBadgeCount = count;
        await nav.setAppBadge(count);
      } else {
        currentBadgeCount++;
        await nav.setAppBadge(currentBadgeCount);
      }
    } catch (_) {}
  }
}

async function clearUnreadBadge() {
  currentBadgeCount = 0;
  const nav = self.navigator || navigator;
  if (nav && 'clearAppBadge' in nav) {
    try {
      await nav.clearAppBadge();
    } catch (_) {}
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      data = { body: event.data ? event.data.text() : '' };
    } catch (_) {}
  }
  const title = data.title || 'Pastie Chat';
  const options = {
    body: data.body || 'Có tin nhắn mới từ khách hàng.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || `pastie-notif-${Date.now()}`,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: { sessionId: data.sessionId || null, url: '/admin' },
  };
  event.waitUntil(
    Promise.all([
      setUnreadBadge().catch(() => {}),
      self.registration.showNotification(title, options)
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL('/admin', self.location.origin);
  if (event.notification.data?.sessionId) url.searchParams.set('session', event.notification.data.sessionId);
  event.waitUntil(Promise.all([
    clearUnreadBadge().catch(() => {}),
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(url.origin));
      if (existing) {
        if ('focus' in existing) existing.focus();
        if (event.notification.data?.sessionId) {
          existing.navigate(url.toString());
        }
        return existing;
      }
      return clients.openWindow(url.toString());
    })
  ]));
});
