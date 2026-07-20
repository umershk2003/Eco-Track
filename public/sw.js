// EcoTrack Service Worker for Waste Pickup Notifications
self.addEventListener('install', (event) => {
  console.log('[EcoTrack SW] Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[EcoTrack SW] Service Worker activated.');
  event.waitUntil(self.clients.claim());
});

// Handle incoming messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, body, url } = event.data;
    console.log('[EcoTrack SW] Received trigger request:', title, body);

    const options = {
      body: body || 'Your waste collection schedule is coming up!',
      icon: '/assets/icon.png',
      badge: '/assets/icon.png',
      vibrate: [200, 100, 200],
      data: url || '/',
      tag: 'pickup-alert',
      renotify: true,
      actions: [
        { action: 'view', title: 'Open EcoTrack' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Handle notification interaction clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[EcoTrack SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data || '/');
      }
    })
  );
});
