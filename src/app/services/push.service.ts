import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PushService {
  private app = initializeApp(environment.firebaseConfig);
  private messaging = getMessaging(this.app);

  constructor(private http: HttpClient) { }
  // Request permission and get token
  // Asks user for permission and generates FCM token to receive notifications.
  async requestPermissionAndGetToken(userId: string): Promise<string | null> {
    try {
      console.log('Requesting notification permission...');
      const status = await Notification.requestPermission();
      console.log('Permission status:', status);
      if (status !== 'granted') throw new Error('Notification permission not granted');
      const token = await getToken(this.messaging, {
        vapidKey: environment.fcmVapidKey
      });
      if (!token) throw new Error('No registration token available.');
      console.log('FCM token:', token);
      return token;
    } catch (err) {
      console.error('FCM token error:', err);
      return null;
    }
  }

  // Listen for messages when app in foreground
  // Listens for foreground messages (when the user is actively using the app) and triggers a callback.
  onMessageListener(cb: (payload: MessagePayload) => void) {
    console.log('Listening for foreground messages...');
    onMessage(this.messaging, (payload) => {
      console.log(' Foreground message received:', payload);
      cb(payload);
    });
  }
}
