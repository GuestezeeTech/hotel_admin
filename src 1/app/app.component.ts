import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MenuBarComponent } from './shared/menu-bar/menu-bar.component';
import { HeaderComponent } from './shared/header/header.component';
import { LocalStorageService } from './auth-services/local-storage.service';
import { PushService } from './services/push.service';
import { NotificationService } from './notification/notification.service';
import { ProfileService } from './profile/profile.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuBarComponent, HeaderComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'GUESTEZEE_ADMIN';
  showSidebar = true;
  selectedMenuItem: string = '';
  showNotification = false;
  customerType: string | null = null;
  private audioUnlocked = false;
  notifications: any[] = [];

  private routesWithoutSidebar = ['/login', '/', '/view'];

  constructor(
    private router: Router,
    private localservice: LocalStorageService,
    private pushService: PushService,
    private notificationService: NotificationService
  ) {
    // --- Sidebar and menu tracking ---
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showSidebar = this.routesWithoutSidebar.some(route => route === event.url);
        // console.log('Current URL:', event.url);
        if (event.url == '/hotel-list' || event.url == '/add-new-hotel') this.selectedMenuItem = "Hotels";
        // Newly added for terms and conditions & privacy policy
        else if (event.url == '/privacy-policy') this.selectedMenuItem = "Privacy Policy";
        else if (event.url == '/terms-conditions') this.selectedMenuItem = "Terms & Conditions";
        // Newly added for dynamic department and service
        else if (event.url == '/department-list') this.selectedMenuItem = "Department";
        else if (event.url == '/service-list') this.selectedMenuItem = "Service";
        else if (event.url == '/service-tab-list') this.selectedMenuItem = "Service Tab";
        // Ended
        else if (event.url == '/role-list' || event.url == '/role') this.selectedMenuItem = "Roles";
        else if (event.url == '/user-list' || event.url == '/user') this.selectedMenuItem = "Users";
        else if (event.url == '/staff-list' || event.url == '/staff') this.selectedMenuItem = "Staff";
        else if (event.url == '/bookings') this.selectedMenuItem = "Bookings";
        else if (event.url == '/bookings-management') this.selectedMenuItem = "Bookings & Guest Management";
        else if (event.url == '/late-checkout') this.selectedMenuItem = "Late Checkout";
        else if (event.url == '/settings') this.selectedMenuItem = "Settings";
        if (event.url.startsWith('/view-hierarchy') || event.url.startsWith('/view-customer-hierarchy')) {
          this.showSidebar = true;
        }
      }
      // console.log('Selected menu item:', this.selectedMenuItem);
    });
  }

  ngOnInit(): void {
    // --- Restore user info ---
    this.customerType = this.localservice.get('CustomerType');
    // console.log('[App] Customer Type:', this.customerType);
    const queryParams = new URLSearchParams(window.location.search);
    const customerIdFromUrl = queryParams.get('customer_id');
    if (customerIdFromUrl) {
      localStorage.setItem('customer_id', customerIdFromUrl);
      this.localservice.set('UserId', customerIdFromUrl);
      // console.log('[App] Restored customer_id:', customerIdFromUrl);
    }

    // --- Unlock audio context ---
    const unlockAudio = () => {
      // console.log('[App] Attempting to unlock audio...');
      if (!this.audioUnlocked) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
          this.audioUnlocked = true;
          // console.log('[App] Audio unlocked for notifications');
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
          window.removeEventListener('mousemove', unlockAudio);
        } catch (err) {
          console.warn('[App] Failed to unlock audio:', err);
        }
      }
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('mousemove', unlockAudio);
    unlockAudio(); // attempt immediate unlock
    // --- Foreground Notifications ---
    this.pushService.onMessageListener().subscribe((payload: any) => {
      // console.log('[App] Foreground message received:', payload);

      if (this.audioUnlocked) {
        const audio = new Audio('assets/images/guestezee/alarm.mp3');
        audio.play().then(() => {
          // console.log('[App] Foreground sound played');
        }).catch(err => {
          console.warn('[App] Foreground sound blocked:', err);
        });
      }

      const structuredData = this.extractNotificationData(payload);
      this.notificationService.addNotification(structuredData);
    });


    // --- Background Notifications from SW ---
    navigator.serviceWorker.addEventListener('message', (event: any) => {
      if (event.data?.action === 'playSound') {
        // console.log('[App] Received playSound from SW');
        if (this.audioUnlocked) {
          const audio = new Audio('assets/images/guestezee/alarm.mp3');
          audio.play().then(() => {
            // console.log('[App] Background sound played');
          }).catch(err => {
            console.warn('[App] Background sound blocked:', err);
          });
        }
      }
      // if (event.data?.action === 'openTaskManagement') {
      //   window.location.href = '/task-management';
      // }
    });
    // --- Staff-specific panel handling ---
    if (this.customerType === 'Staff') {
      this.notificationService.showPanel$.subscribe(show => this.showNotification = show);
    }
  }

  updateMenu(value: string) {
    this.selectedMenuItem = value;
  }

  toggleNotification() {
    this.showNotification = !this.showNotification;
    if (!this.showNotification) this.notificationService.closePanel();
  }

  // --- Extract Notification Data (Structured) ---
  private extractNotificationData(payload: any) {
    let parsedMessage: any = {};
    try {
      if (payload?.data?.message) {
        let rawMessage = payload.data.message;
        try {
          parsedMessage = JSON.parse(rawMessage);
          if (typeof parsedMessage === 'string') parsedMessage = JSON.parse(parsedMessage);
        } catch {
          console.warn('[App] Failed nested JSON parse:', rawMessage);
        }
      }
    } catch (err) {
      console.warn('[App] Failed to parse payload.data.message:', err);
    }
    const structured = {
      title: payload?.notification?.title || 'No Title',
      body: payload?.notification?.body || '',
      task_id: parsedMessage?.task_id || null,
      redirection_tab: parsedMessage?.redirection_tab || null,
    };
    // console.log('[App] Extracted Notification Data:', structured);
    return structured;
  }
}

//                     +---------------------------+
//                     |       User Interaction    |
//                     |  (Clicked / Touched App) |
//                     +------------+--------------+
//                                  |
//                 +----------------+----------------+
//                 |                                 |
//           +-----v-----+                     +-----v-----+
//           |  Foreground|                     | Background|
//           |  Tab Active|                     |   Tab    |
//           +-----+-----+                     +-----+-----+
//                 |                                 |
//       +---------+---------+               +-------+-------+
//       | Sound Plays        |               | Audio unlocked?|
//       | Immediately        |               +-------+-------+
//       +-------------------+                       |
//                                                 +--+--+
//                                                 |     |
//                                            +----v---+ +---v----+
//                                            | Yes    | |  No    |
//                                            | Sound  | | Blocked|
//                                            | Plays  | | Sound  |
//                                            +--------+ +--------+
// No tab open / user not logged in → Sound cannot play, only system notification appears.
// “Silent” AudioContext
// A silent AudioContext is an AudioContext that plays a tiny, empty buffer with no sound.
// Purpose: browsers now consider the user “interacted” with audio, so future audio can be played without being blocked, even in background tabs.
