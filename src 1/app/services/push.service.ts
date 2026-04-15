import { NotificationService } from './../notification/notification.service';
import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { deleteToken } from 'firebase/messaging';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })

export class PushService {
  private app = initializeApp(environment.firebaseConfig);
  private messaging = getMessaging(this.app);
  public notifications$ = new BehaviorSubject<any>(null);
  private lastHandledId: string | null = null;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService) { }

  // Request permission and get token
  // Asks user for permission and generates FCM token to receive notifications.
  async requestPermissionAndGetToken(userId: string): Promise<string | null> {
    try {
      // console.log('Requesting notification permission...');
      const status = await Notification.requestPermission();
      // console.log('Permission status:', status);
      if (status !== 'granted') throw new Error('Notification permission not granted');
      const token = await getToken(this.messaging, {
        vapidKey: environment.fcmVapidKey
      });
      if (!token) throw new Error('No registration token available.');
      // console.log('FCM token:', token);
      return token;
    } catch (err) {
      console.error('FCM token error:', err);
      return null;
    }
  }

  // Listen for messages when app in foreground
  // Listens for foreground messages (when the user is actively using the app) and triggers a callback.
  // onMessageListener(cb: (payload: MessagePayload) => void) {
  //   console.log('Listening for foreground messages...');
  //   onMessage(this.messaging, (payload) => {
  //     console.log('Foreground message:', payload);
  //     // If payload already has notification, no need for SW
  //     if (payload.notification) {
  //       this.notificationService.addNotification({
  //         id: payload.messageId,
  //         title: payload.notification.title,
  //         body: payload.notification.body,
  //         time: new Date().toLocaleTimeString()
  //       });
  //       this.playNotificationSound();
  //     }
  //     if (cb) cb(payload);
  //   });
  // }

onMessageListener(): Observable<MessagePayload> {
    return new Observable((observer) => {
      onMessage(this.messaging, (payload: MessagePayload) => {
        // console.log('[PushService] Foreground message received:', payload);
        const messageId = payload?.messageId;
        if (!messageId) return;
        // Prevent duplicates
        if (this.lastHandledId === messageId) {
          // console.log('[PushService] Duplicate notification skipped:', messageId);
          return;
        }
        this.lastHandledId = messageId;
        // Build structured notification
        const structuredData = {
          id: messageId,
          title: payload.notification?.title || payload.data?.['title'],
          body: payload.notification?.body || payload.data?.['body'],
          time: new Date().toLocaleTimeString(),
        };
        // Add notification to UI
        this.notificationService.addNotification(structuredData);
        // Play sound
        const audio = new Audio('assets/images/guestezee/alarm.mp3');
        audio.play().catch((err) => console.warn('[PushService] Sound blocked:', err));
        // Emit payload to subscribers
        observer.next(payload);
      });
    });
  }

  // New method to delete current FCM token
  async deleteCurrentToken(): Promise<boolean> {
    try {
      const currentToken = await getToken(this.messaging, { vapidKey: environment.fcmVapidKey });
      if (!currentToken) return false;
      await deleteToken(this.messaging);
      // console.log('FCM token deleted:', currentToken);
      return true;
    } catch (err) {
      console.error('Error deleting FCM token:', err);
      return false;
    }
  }

  // Optional helper to just get the current token without requesting permission
  async getCurrentToken(): Promise<string | null> {
    try {
      const token = await getToken(this.messaging, { vapidKey: environment.fcmVapidKey });
      // console.log('Current FCM token:', token);
      return token || null;
    } catch (err) {
      console.error('Error getting current FCM token:', err);
      return null;
    }
  }

  private playNotificationSound() {
    try {
      const audio = new Audio('/assets/images/guestezee/alarm.mp3');
      audio.volume = 1.0;
      audio.play().catch(err => console.warn('Audio play failed:', err));
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

}
