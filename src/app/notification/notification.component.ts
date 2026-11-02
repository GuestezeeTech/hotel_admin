// import { TaskManagementService } from './../task-management/task-management.service';
// import { Component, Output, EventEmitter } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { AlertsService } from '../shared/alerts/alerts.service';
// import { AlertsComponent } from '../shared/alerts/alerts.component';
// import { Input } from '@angular/core';
// import { NotificationService } from './notification.service';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-notification',
//   standalone: true,
//   imports: [AlertsComponent, CommonModule],
//   templateUrl: './notification.component.html',
//   styleUrl: './notification.component.scss'
// })

// export class NotificationComponent {
//   // Emits an event when the user closes the notification panel.
//   @Output() close = new EventEmitter<void>();
//   notifications: any[] = [];

//   constructor(
//     private alertService: AlertsService,
//     private notificationService: NotificationService,
//     private router: Router,
//     private taskManagementService: TaskManagementService
//   ) {
//     // Subscribe to live notifications from the service
//     this.notificationService.notifications$.subscribe(list => {
//       // this.notifications = this.groupNotifications(list);
//       this.notifications = list;
//       console.log('Notifications in component:', this.notifications);
//     });
//     console.log(this.notifications, "notifications in notification component")
//   }

//   private groupNotifications(flatList: any[]): any[] {
//     console.log('Flat list of notifications:', flatList);
//     return flatList
//     // .map(n => ({
//     //   ...n,
//     //   timeFormatted: new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
//     // }));
//   }

//   // navigateNotification(notify: any) {
//   //   console.log('Navigating based on notification:', notify);
//   //   this.close.emit(); // Close the notification panel
//   //   // Choose the tab dynamically
//   //   let targetTab = 'ASAP'; // default
//   //   if ((notify.redirection_tab === 'ASAP') || (!notify.redirection_tab && notify.title === 'Task Created' && notify.body === 'Please assign the staff')) {
//   //     targetTab = 'ASAP';
//   //   }
//   //   else if (notify.redirection_tab === 'Priority' || (!notify.redirection_tab && notify.title === 'Escalated' && notify.body === 'Immediate attention needed')) {
//   //     targetTab = 'Priority';
//   //   }
//   //   else if (notify.redirection_tab === 'My Escalation' || (!notify.redirection_tab && notify.title === 'Escalated' && notify.body === 'Your task is escalated')) {
//   //     targetTab = 'My Escalation';
//   //   }
//   //   // Set the selected tab silently
//   //   this.taskManagementService.setSelectedTab(targetTab);
//   //   this.router.navigate(['/task-management']); // Navigate to the page
//   //   this.notificationService.removeNotification(notify);
//   // }

//   // newly added for panel tab navigation
//   navigateNotification(notify: any) {
//     console.log('Navigating based on notification:', notify);
//     this.close.emit(); // Close the notification panel
//     let targetTab;
//     if (notify.redirection_tab) {
//       // If redirection_tab exists, use it
//       targetTab = notify.redirection_tab;
//     } else if (notify.title === 'Task Created' && notify.body === 'Please assign the staff') {
//       targetTab = 'ASAP';
//     } else if (notify.title === 'Escalated' && notify.body === 'Immediate attention needed') {
//       targetTab = 'Priority';
//     } else if (notify.title === 'Escalated' && notify.body === 'Your task is escalated') {
//       targetTab = 'My Escalation';
//     }
//     // Set the selected tab 
//     this.taskManagementService.setSelectedTab(targetTab);
//     this.router.navigate(['/task-management']);
//     // Remove notification from the list
//     this.notificationService.removeNotification(notify);
//   }


//   clearAll() {
//     this.notificationService.clearAll();
//     // Reset local copy to instantly reflect the cleared state
//     this.notifications = [];

//   }
// }

import { TaskManagementService } from './../task-management/task-management.service';
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertsService } from '../shared/alerts/alerts.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { NotificationService } from './notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [AlertsComponent, CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent {
  @Output() close = new EventEmitter<void>();
  notifications: any[] = [];

  constructor(
    private alertService: AlertsService,
    private notificationService: NotificationService,
    private router: Router,
    private taskManagementService: TaskManagementService,
    private ngZone: NgZone,
    private route: ActivatedRoute
  ) {
    this.notificationService.notifications$.subscribe(list => {
      // Filter only valid notifications
      // this.notifications = (list || []).filter(n => n && n.title && n.body);
      this.notifications = (list || []).filter(n => n && n.id);
      // console.log('Notifications in component:', this.notifications);
    });
  }

  // ngOnInit() {
  //   if (navigator.serviceWorker) {
  //     navigator.serviceWorker.addEventListener('message', (event) => {
  //       const data = event.data;
  //       console.log('[TaskManagement] Message from SW:', data);
  //       if (data?.action === 'highlightTaskTab') {
  //         const { title, body } = data;
  //         let targetTab = 'ASAP'; // Default tab
  //         if (title === 'Task Created' && body === 'Please assign the staff') {
  //           targetTab = 'ASAP';
  //         } else if (title === 'Escalated' && body === 'Immediate attention needed') {
  //           targetTab = 'Priority';
  //         } else if (title === 'Escalated' && body === 'Your task is escalated') {
  //           targetTab = 'My Escalation';
  //         }
  //         console.log('[TaskManagement] Highlighting tab:', targetTab);
  //         this.taskManagementService.setSelectedTab(targetTab);
  //       }
  //     });
  //   }
  // }

  ngOnInit() {
    this.route.queryParams.subscribe((params: any) => {
      const title = params['title'];
      const body = params['body'];
      if (title && body) {
        // console.log('Loaded from URL:', title, body);
        this.playNotificationSound(),
          this.highlightTabBasedOnNotification(title, body);
      }
    });

    // Also handle live messages when app is already open
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        const data = event.data;
        if (data?.action === 'highlightTab') {
          this.playNotificationSound(),
            this.highlightTabBasedOnNotification(data.title, data.body);
        }
      });
    }
  }


  playNotificationSound() {
    try {
      const audio = new Audio('assets/images/guestezee/alarm.mp3');
      audio.volume = 1.0;
      audio.play().then(() => {
        // console.log('Notification sound played.');
      }).catch(err => {
        console.warn('Could not play sound:', err);
      });
    } catch (e) {
      console.error('Audio play failed:', e);
    }
  }

  highlightTabBasedOnNotification(title: string, body: string) {
    // console.log('Highlighting tab based on notification:', title, body);
    let targetTab = 'Priority'; // default fallback
    if (title === 'Task Created' && body === 'Please assign the staff') {
      targetTab = 'ASAP';
    }
    else if (title === 'Escalated' && body === 'Immediate attention needed') {
      targetTab = 'Priority';
    }
    else if (title === 'Escalated' && body === 'Desk staff is currently offline') {
      targetTab = 'Priority';
    }
    else if (title === 'Escalated' && body === 'Your task is escalated') {
      targetTab = 'My Escalation';
    }
    else if (title === 'Completed') {
      targetTab = 'Staff Delivered';
    }
    // Newly added for cancel tab navigation
    else if (title === 'Cancelled') {
      targetTab = 'Cancelled';
    }
    else if (title === 'Assigned' && body === 'Please accept the task') {
      targetTab = 'ASAP';
    }
    else if (title === 'Assigned' && body === 'Task assigned to staff') {
      targetTab = 'ASAP';
    }
    // Newly added for task allocation purpose
    else if (title === 'Processing') {
      targetTab = 'Processing';
    }
    // Added for delivered status
    else if (title === 'Delivered') {
      targetTab = 'Delivered';
    }
    // console.log('Highlighting tab:', targetTab);
    this.taskManagementService.setSelectedTab(targetTab);
    this.router.navigate(['/task-management']);
  }

  navigateNotification(notify: any) {
    // console.log('Navigating based on notification:', notify);
    this.close.emit();
    let targetTab = 'Priority'; // default fallback
    if (notify.redirection_tab) {
      targetTab = notify.redirection_tab;
    }
    else if ((notify.title === 'Task Created' && notify.body === 'Please assign the staff') || (notify.title === 'ASAP' && notify.body === 'Please assign the staff')) {
      targetTab = 'ASAP';
    }
    else if (notify.title === 'Escalated' && notify.body === 'Immediate attention needed') {
      targetTab = 'Priority';
    }
    else if (notify.title === 'Escalated' && notify.body === 'Desk staff is currently offline') {
      targetTab = 'Priority';
    }
    else if (notify.title === 'Escalated' && notify.body === 'Your task is escalated') {
      targetTab = 'My Escalation';
    }
    else if (notify.title === 'Completed') {
      targetTab = 'Staff Delivered';
    }
    // Newly added for cancel tab navigation
    else if (notify.title === 'Cancelled') {
      targetTab = 'Cancelled';
    }
    else if (notify.title === 'Assigned' && notify.body === 'Please accept the task') {
      targetTab = 'ASAP';
    }
    else if (notify.title === 'Assigned' && notify.body === 'Task assigned to staff') {
      targetTab = 'ASAP';
    }
    // Newly added for task allocation purpose
    else if (notify.title === 'Processing') {
      targetTab = 'Processing';
    }
    // Newly added for delivered
    else if (notify.title === 'Delivered') {
      targetTab = 'Delivered';
    }
    this.taskManagementService.setSelectedTab(targetTab);
    this.router.navigate(['/task-management']);
    this.notificationService.removeNotification(notify);
  }

  clearAll() {
    this.notificationService.clearAll();
    this.notifications = []; // instantly reflect in UI
  }
}
