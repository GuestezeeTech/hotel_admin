importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCMX3gUG0fIUFlNRCXpKXM_hyK9eC72jlI",
  authDomain: "labes-common-app-a2fa5.firebaseapp.com",
  projectId: "labes-common-app-a2fa5",
  messagingSenderId: "563382026704",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// Handle background messages
// Receives messages while the app is in the background.
messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const notificationTitle = payload.notification?.title || 'Background Message';
  const notificationOptions = {
    body: payload.notification?.body,
    data: payload.data
  };
  // Shows system notification even when the user is not on the page.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = '/notifications'; // URL of notification page
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

