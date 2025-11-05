// import { LocalStorageService } from './../auth-services/local-storage.service';
// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { Observable } from 'rxjs';

// @Injectable({ providedIn: 'root' })

// export class NotificationService {
//   // A key to use when storing/retrieving notifications from localStorage
//   private storageKey = 'appNotifications';
//   // Stores the current list of notifications -Initialized with the notifications loaded from localStorage,
//   private notificationsSubject: BehaviorSubject<any[]>;
//   // Exposes the notifications as an Observable so components can subscribe and reactively update whenever the list changes.
//   notifications$: Observable<any[]>; // will be initialized in constructor
//   // Stores the visibility state of the notification panel.
//   private showPanelSubject = new BehaviorSubject<boolean>(false);
//   //  Exposes the panel visibility as an Observable for components to reactively show/hide the panel.
//   showPanel$ = this.showPanelSubject.asObservable();

//   constructor(private localStorageService: LocalStorageService) {
//     // Initialize after the service is available
//     const storedNotifications = this.loadFromStorage();
//     this.notificationsSubject = new BehaviorSubject<any[]>(storedNotifications);
//     this.notifications$ = this.notificationsSubject.asObservable();
//   }

//   // Adds a new notification to the list and optionally opens the panel automatically.
//   // addNotification(notification: any) {
//   //   // Adds a new notification to the list
//   //   const current = this.notificationsSubject.value;
//   //   // Get the current list of notifications from the BehaviorSubject
//   //   const updated = [notification, ...current];
//   //   // Add the new notification to the start of the list (most recent first)
//   //   this.notificationsSubject.next(updated);
//   //   // Push the updated list to all subscribers (components)
//   //   this.saveToStorage(updated);
//   //   // Save the updated list to localStorage for persistence
//   //   this.showPanelSubject.next(true);
//   //   // Automatically open the notification panel when a new notification is added
//   // }

//   // removeNotification(notification: any) {
//   //   // Removes a single notification from the list
//   //   const current = this.notificationsSubject.value;
//   //   // Get the current list of notifications
//   //   const updated = current.filter(n => n !== notification);
//   //   // Filter out the notification that needs to be removed
//   //   this.notificationsSubject.next(updated);
//   //   // Update all subscribers with the new list
//   //   this.saveToStorage(updated);
//   //   // Save the new list to localStorage
//   // }

//   // clearAll() {
//   //   // Clears all notifications
//   //   this.notificationsSubject.next([]);
//   //   // Update subscribers with an empty array
//   //   this.saveToStorage([]);
//   //   // Remove all notifications from localStorage
//   //   console.log('All notifications cleared');
//   // }

//   addNotification(notification: any) {
//     const current = this.notificationsSubject.value || [];
//     const updated = [notification, ...current];
//     this.notificationsSubject.next([...updated]); // new reference
//     this.saveToStorage(updated);
//     this.showPanelSubject.next(true);
//   }

//   removeNotification(notification: any) {
//     const current = this.notificationsSubject.value || [];
//     const updated = current.filter(n => n !== notification);
//     this.notificationsSubject.next([...updated]); // new reference
//     this.saveToStorage(updated);
//   }

//   clearAll() {
//     this.notificationsSubject.next([]); // new empty array reference
//     this.saveToStorage([]);
//   }

//   closePanel() {
//     // Closes the notification panel
//     this.showPanelSubject.next(false);
//     // Updates subscribers to hide the panel
//   }

//   private saveToStorage(notifications: any[]) {
//     // Saves notifications to localStorage -  Converts the array to a JSON string
//     this.localStorageService.set(this.storageKey, JSON.stringify(notifications));
//     console.log('Saved notifications to storage:', notifications);
//   }

//   private loadFromStorage(): any[] {
//     // Loads notifications from localStorage -Retrieve the string
//     const data = this.localStorageService.get(this.storageKey);
//     return data ? JSON.parse(data) : []; // Parse JSON string back into an arra
//   }
// }


import { LocalStorageService } from './../auth-services/local-storage.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private storageKey = 'appNotifications';

  private notificationsSubject: BehaviorSubject<any[]>;
  notifications$: Observable<any[]>;

  private showPanelSubject = new BehaviorSubject<boolean>(false);
  showPanel$ = this.showPanelSubject.asObservable();

  constructor(private localStorageService: LocalStorageService) {
    const storedNotifications = this.loadFromStorage();
    this.notificationsSubject = new BehaviorSubject<any[]>(storedNotifications);
    this.notifications$ = this.notificationsSubject.asObservable();
  }

  // addNotification(notification: any) {
  //   if (!notification || !notification.title || !notification.body) {
  //     console.warn('⚠️ Ignored invalid notification:', notification);
  //     return;
  //   }
  //   const current = this.notificationsSubject.value || [];
  //   const updated = [notification, ...current.filter(n => n && n.title)];
  //   this.notificationsSubject.next(updated);
  //   this.saveToStorage(updated);
  //   this.showPanelSubject.next(true);
  // }

  addNotification(notification: any) {
    if (!notification || !notification.title || !notification.body) {
      console.warn('Ignored invalid notification:', notification);
      return;
    }
    const current = this.notificationsSubject.value || [];
    // Prevent duplicates
    const isDuplicate = current.some(n => n.id === notification.id);
    if (isDuplicate) {
      console.log(' Duplicate notification skipped (id:', notification.id, ')');
      return;
    }
    if (isDuplicate) {
      console.log('Duplicate notification skipped');
      return;
    }
    const updated = [notification, ...current];
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
    this.showPanelSubject.next(true);
  }

  removeNotification(notification: any) {
    const current = this.notificationsSubject.value || [];
    const updated = current.filter(n => n !== notification);
    this.notificationsSubject.next(updated);
    this.saveToStorage(updated);
  }

  clearAll() {
    this.notificationsSubject.next([]);
    this.saveToStorage([]);
    this.showPanelSubject.next(false);
  }

  closePanel() {
    this.showPanelSubject.next(false);
  }

  private saveToStorage(notifications: any[]) {
    this.localStorageService.set(this.storageKey, JSON.stringify(notifications));
    console.log('Saved notifications to storage:', notifications);
  }

  private loadFromStorage(): any[] {
    const data: any = this.localStorageService.get(this.storageKey);
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(n => n && n.title && n.body);
      }
    } catch (e) {
      console.warn('Invalid stored notification data, resetting storage');
      this.localStorageService.remove(this.storageKey);
    }
    return [];
  }
}
