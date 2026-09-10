// // Force activation immediately
// self.addEventListener('install', event => {
//   self.skipWaiting();
// });

// self.addEventListener('activate', event => {
//   event.waitUntil(self.clients.claim());
// });

// importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

// firebase.initializeApp({
//   apiKey: "AIzaSyCMX3gUG0fIUFlNRCXpKXM_hyK9eC72jlI",
//   authDomain: "labes-common-app-a2fa5.firebaseapp.com",
//   projectId: "labes-common-app-a2fa5",
//   messagingSenderId: "563382026704",
//   appId: "1:563382026704:web:3b1e2a5f3f3e8e4c9f4e2d",
// });

// const messaging = firebase.messaging();

// // Handle background messages
// messaging.onBackgroundMessage(function (payload) {
//   console.log('[firebase-messaging-sw.js] Background message received:', payload);
//   const notificationTitle = payload.notification?.title || 'Background Message';
//   const notificationOptions = {
//     body: payload.notification?.body,
//     data: payload.data,
//     // Add sound metadata (will trigger audio in app via message)
//     sound: 'alarm',
//   };
//   self.registration.showNotification(notificationTitle, notificationOptions);
//   // Show browser notification
//   const showPromise = self.registration.showNotification(notificationTitle, notificationOptions);
//   // Send message to active client to play sound
//   const notifyClients = self.clients.matchAll({ includeUncontrolled: true }).then((allClients) => {
//     for (const client of allClients) {
//       client.postMessage({ action: 'playSound', payload });
//     }
//   });
//   // Wait for both notification and message send to complete
//   return Promise.all([showPromise, notifyClients]);
// });

// // Notification click handler
// // self.addEventListener('notificationclick', function (event) {
// //   event.notification.close();
// //   const hostname = self.location.hostname;
// //   const baseUrl = (hostname === 'localhost')
// //     ? 'http://localhost:4200'
// //     : 'https://guestezee.com/hotel-registration';
// //   const path = '/task-management';
// //   const targetUrl = baseUrl + path;
// //   console.log('[SW] Notification clicked');
// //   console.log('[SW] Hostname:', hostname);
// //   console.log('[SW] Base URL:', baseUrl);
// //   console.log('[SW] Target URL:', targetUrl);
// //   event.waitUntil(
// //     clients.matchAll({ type: 'window', includeUncontrolled: false }).then(windowClients => {
// //       console.log('[SW] Controlled clients found:', windowClients.length);
// //       let focused = false;
// //       for (const client of windowClients) {
// //         const clientUrl = new URL(client.url);
// //         console.log('[SW] Checking client:', client.url);
// //         if (clientUrl.origin === new URL(baseUrl).origin) {
// //           if ('focus' in client) {
// //             client.focus();
// //             console.log('[SW] Focused controlled client:', client.url);
// //             focused = true;
// //           }
// //           break; // won't navigate
// //         }
// //       }
// //       if (!focused && clients.openWindow) {
// //         console.log('[SW] No controlled client found, opening new window');
// //         return clients.openWindow(targetUrl).then(win => {
// //           console.log('[SW] New window opened:', win?.url);
// //         }).catch(err => {
// //           console.error('[SW] Failed to open window:', err);
// //         });
// //       }
// //     }).catch(err => {
// //       console.error('[SW] Error matching clients:', err);
// //     })
// //   );
// // });

// self.addEventListener('notificationclick', function (event) {
//   event.notification.close();
//   const hostname = self.location.hostname;
//   const baseUrl =
//     hostname === 'localhost'
//       ? 'http://localhost:4200'
//       : 'https://guestezee.com/hotel-registration';
//   const taskUrl = baseUrl + '/task-management';
//   console.log('[SW] Notification clicked');
//   console.log('[SW] Hostname:', hostname);
//   console.log('[SW] Base URL:', baseUrl);
//   console.log('[SW] Task URL:', taskUrl);
//   event.waitUntil(
//     clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windowClients => {
//       console.log('[SW] Found clients:', windowClients.length);
//       if (windowClients.length > 0) {
//         console.log('[SW] User active → navigating to /task-management');
//         for (const client of windowClients) {
//           const clientUrl = new URL(client.url);
//           if (clientUrl.origin === new URL(baseUrl).origin) {
//             try {
//               await client.navigate(taskUrl);
//               await client.focus();
//               return;
//             } catch (err) {
//               console.warn('[SW] Not active SW, fallback to openWindow:', err);
//               return clients.openWindow(taskUrl);
//             }
//           }
//         }
//       }
//       console.log('[SW] No active tab → opening base URL');
//       return clients.openWindow(baseUrl);
//     })
//   );
// });

// Force activation immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

// firebase.initializeApp({
//   apiKey: "AIzaSyCMX3gUG0fIUFlNRCXpKXM_hyK9eC72jlI",
//   authDomain: "labes-common-app-a2fa5.firebaseapp.com",
//   projectId: "labes-common-app-a2fa5",
//   messagingSenderId: "563382026704",
//   appId: "1:563382026704:web:3b1e2a5f3f3e8e4c9f4e2d",
// });

firebase.initializeApp({
  apiKey: "AIzaSyC7Kc8dcd-Q9hrS18bViBreDGzbtlRCTQ0",
  authDomain: "hospitalitynewsapp-f7968.firebaseapp.com",
  projectId: "hospitalitynewsapp-f7968",
  messagingSenderId: "945771911357",
  appId: "1:945771911357:web:ce9a1527c47aed31773fd4",
});

const messaging = firebase.messaging();

// // Background message handler
// messaging.onBackgroundMessage(function (payload) {
//   console.log('[SW] Background message received:', payload);
//   // Add this guard
//   if (payload.notification) {
//     console.log('Skipping duplicate notification (already shown by FCM)');
//     return;
//   }
//   else {
//     const notificationTitle = payload.notification?.title || 'Background Message';
//     const notificationOptions = {
//       body: payload.notification?.body,
//       data: payload.data,
//       sound: 'alarm'
//     };
//     self.registration.showNotification(notificationTitle, notificationOptions);
//   }
//   const notificationTitle = payload.notification?.title || 'Background Message';
//   const notificationOptions = {
//     body: payload.notification?.body,
//     data: payload.data,
//     sound: 'alarm'
//   };
//   // Show browser notification
//   const showPromise = self.registration.showNotification(notificationTitle, notificationOptions);
//   // Notify all active clients to play sound
//   const notifyClients = self.clients.matchAll({ includeUncontrolled: true }).then(allClients => {
//     allClients.forEach(client => {
//       client.postMessage({ action: 'playSound', payload });
//     });
//   });
//   return Promise.all([showPromise, notifyClients]);
// });
// messaging.onBackgroundMessage(function (payload) {
//   console.log('[SW] Background message received:',JSON.stringify(payload, null, 2));
//   // Skip duplicate auto-shown notifications
//   if (payload.notification) {
//     console.log('[SW] Skipping manual showNotification() — already handled by FCM');
//   } else {
//     const notificationTitle = payload.data?.title || 'Background Message';
//     const notificationOptions = {
//       body: payload.data?.body,
//       data: payload.data,
//       sound: 'alarm'
//     };
//     self.registration.showNotification(notificationTitle, notificationOptions);
//   }
//   //Always notify active clients to play sound
//   self.clients.matchAll({ includeUncontrolled: true }).then(allClients => {
//     allClients.forEach(client => {
//       client.postMessage({ action: 'playSound', payload });
//     });
//   });
// });


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