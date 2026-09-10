// Force activation immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC7Kc8dcd-Q9hrS18bViBreDGzbtlRCTQ0",
  authDomain: "hospitalitynewsapp-f7968.firebaseapp.com",
  projectId: "hospitalitynewsapp-f7968",
  messagingSenderId: "945771911357",
  appId: "1:945771911357:web:ce9a1527c47aed31773fd4",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  /* console.log('[SW] Background message received:', JSON.stringify(payload, null, 2)); */
  // Resolve title/body once at function scope so they are available below for
  // both the system notification and the messages posted to the Angular clients.
  const title = payload.notification?.title || payload.data?.title || 'Background Message';
  const body = payload.notification?.body || payload.data?.body || '';
  if (payload.notification) {
    // "notification" type messages are auto-displayed by FCM, so showing one
    // here would create a duplicate — skip the manual showNotification().
    /* console.log('[SW] Skipping manual showNotification() — already handled by FCM'); */
  } else {
    // Data-only messages are not auto-displayed, so show one manually.
    const options = {
      body,
      data: payload.data,
      sound: 'alarm'
    };
    self.registration.showNotification(title, options);
  }
  // Notify Angular clients
  self.clients.matchAll({ includeUncontrolled: true }).then(allClients => {
    allClients.forEach(client => {
      // Tell app to play sound
      client.postMessage({ action: 'playSound' });
      // Tell app which tab to highlight
      client.postMessage({
        action: 'highlightTab',
        title,
        body
      });
    });
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  /* console.log('[SW] Notification clicked:', event.notification); */
  const title = event.notification.title;
  const body = event.notification.body;
  const targetUrl = `/task-management?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(allClients => {
      /* console.log('[SW] Matched clients:', allClients.length); */
      if (allClients.length > 0) {
        allClients[0].postMessage({ action: 'highlightTab', title, body });
        return allClients[0].focus();
      } else {
        return clients.openWindow(targetUrl);
      }
    })
  );
});