self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Pastie AI Console', {
    body: data.body || 'Có hội thoại cần được hỗ trợ.', icon: '/apple-touch-icon.png', badge: '/favicon.ico',
    tag: data.tag || 'pastie-notification', renotify: true, data: { sessionId: data.sessionId || null },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL('/admin', self.location.origin);
  if (event.notification.data?.sessionId) url.searchParams.set('session', event.notification.data.sessionId);
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(url.origin));
    return existing ? existing.focus() : clients.openWindow(url.toString());
  }));
});
