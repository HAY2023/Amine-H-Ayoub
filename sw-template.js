self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data && event.data.json ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'Learn Quran Kids';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icons/icon-192.png',
    data: data.url || '/'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(self.clients.openWindow(url));
});

// Workbox injection point
const precacheManifest = self.__WB_MANIFEST || [];
void precacheManifest;
