self.addEventListener('push', function (event) {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Уведомление', body: event.data.text() }; }

  const title = data.title || 'Система заявок';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: 'ticket-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const requestId = event.notification.data?.request_id;
  const url = requestId ? `/?tab=service_requests&request=${requestId}` : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', requestId });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
