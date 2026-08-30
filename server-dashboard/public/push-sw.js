const BADGE_STORE = 'pastie-push-badge';
const BADGE_KEY = 'unread-count';

function openBadgeStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BADGE_STORE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setUnreadBadge(increment = true) {
  if (!('setAppBadge' in self.navigator)) return;
  try {
    const db = await openBadgeStore();
    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite');
      const store = tx.objectStore('state');
      const get = store.get(BADGE_KEY);
      get.onsuccess = () => store.put(increment ? Number(get.result || 0) + 1 : 0, BADGE_KEY);
      tx.oncomplete = () => resolve(increment ? Number(get.result || 0) + 1 : 0);
      tx.onerror = () => reject(tx.error);
    });
    await self.navigator.setAppBadge(count);
    db.close();
  } catch (_) {}
}

async function clearUnreadBadge() {
  if (!('clearAppBadge' in self.navigator)) return;
  try {
    const db = await openBadgeStore();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite');
      tx.objectStore('state').put(0, BADGE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await self.navigator.clearAppBadge();
    db.close();
  } catch (_) {}
}

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
