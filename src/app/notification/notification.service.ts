// notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // Stores the current list of notifications.
  private notificationsSubject = new BehaviorSubject<any[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
  // Stores the visibility state of the notification panel.
  private showPanelSubject = new BehaviorSubject<boolean>(false);
  showPanel$ = this.showPanelSubject.asObservable();

  // Adds a new notification to the list and optionally opens the panel automatically.
  addNotification(notification: any) {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...current]);
    this.showPanelSubject.next(true); // auto-open panel
  }

  // Closes the notification panel by updating the showPanelSubject.
  closePanel() {
    this.showPanelSubject.next(false);
  }
}
