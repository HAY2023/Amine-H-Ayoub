self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    // ignore malformed push payloads
  }

  const title = data.title || 'Learn Quran Kids';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icons/icon-192.png',
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(self.clients.openWindow(String(url)));
});

// Workbox injection point
self.__WB_MANIFEST = self.__WB_MANIFEST || [];
