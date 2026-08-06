self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event: PushEvent) => {
  let data = {} as Record<string, unknown>;
  try {
    data = event.data?.json() || {};
  } catch {
    // ignore malformed push payloads
  }

  const title = (data.title as string) || 'Learn Quran Kids';
  const options: NotificationOptions = {
    body: (data.body as string) || '',
    icon: (data.icon as string) || '/assets/icons/icon-192.png',
    data: (data.url as string) || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(self.clients.openWindow(String(url)));
});

// Workbox injection point
self["__WB_MANIFEST"] = self["__WB_MANIFEST"] || [];

