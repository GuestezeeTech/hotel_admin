import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouteConfigLoadStart, RouteConfigLoadEnd, RouterOutlet } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MenuBarComponent } from './shared/menu-bar/menu-bar.component';
import { HeaderComponent } from './shared/header/header.component';
import { LocalStorageService } from './auth-services/local-storage.service';
import { PushService } from './services/push.service';
import { NotificationService } from './notification/notification.service';
import { ProfileService } from './profile/profile.service';
import { LogoutService } from './services/logout.service';
import { PermissionService } from './services/permission.service';
import { LoaderComponent } from './shared/loader/loader.component';
import { TaskManagementService } from './task-management/task-management.service';
import { HotelEnrollmentTabviewService } from './hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { ENDPOINTS, DOMAIN_NAME, USER_ID } from './app.config';
import { PaymentHelperService } from './services/payment-helper.service';
import { StaffService } from './user-access/staff/staff.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuBarComponent, HeaderComponent, LoginComponent, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'GUESTEZEE_ADMIN';

  // Checks whether the given input element is an email/mail field
  private isEmailInputField(target: HTMLInputElement): boolean {
    const type = (target.getAttribute('type') || 'text').toLowerCase();
    const name = (target.getAttribute('name') || '').toLowerCase();
    const id = (target.id || '').toLowerCase();
    const fcn = (target.getAttribute('formcontrolname') || '').toLowerCase();
    const ph = (target.getAttribute('placeholder') || '').toLowerCase();
    return (
      type === 'email' ||
      name === 'email' || name === 'mail' || name.includes('email') ||
      (name.includes('mail') && !name.includes('address')) ||
      id === 'email' || id === 'mail' || id.includes('email') ||
      (id.includes('mail') && !id.includes('address')) ||
      fcn === 'email' || fcn === 'mail' || fcn.includes('email') ||
      (fcn.includes('mail') && !fcn.includes('address')) ||
      ph.includes('email') ||
      (ph.includes('mail') && !ph.includes('address'))
    );
  }

  // Flag to suppress handleGlobalInput for the synthetic event we dispatch ourselves
  private _suppressInput = false;

  // Keydown handler: intercepts uppercase characters BEFORE browser inserts them.
  // This avoids Angular's reactive form writeValue() resetting the cursor to end.
  handleGlobalKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLInputElement;
    if (!target) return;
    const tag = target.tagName;
    const type = (target.getAttribute('type') || 'text').toLowerCase();
    const isTextEntry = tag === 'TEXTAREA' || (tag === 'INPUT' && ['text', 'email', 'search', 'url', 'tel'].includes(type));
    if (!isTextEntry) return;
    if (!this.isEmailInputField(target)) return;

    // Check if the placeholder contains "Email" or "Employee ID"
    const ph = (target.getAttribute('placeholder') || '').toLowerCase();
    const hasEmailOrEmpId = ph.includes('email') || ph.includes('employee id') || ph.includes('employeeid');

    if (hasEmailOrEmpId) {
      // Wait until the user types '@'. If they haven't typed '@', leave whatever they typed
      const hasAt = target.value.includes('@') || event.key === '@';
      if (!hasAt) {
        return;
      }
    }

    // Only intercept single uppercase letters (A-Z), skip shortcuts like Ctrl+C
    if (
      event.key.length === 1 &&
      event.key >= 'A' && event.key <= 'Z' &&
      !event.ctrlKey && !event.metaKey && !event.altKey
    ) {
      event.preventDefault();
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const cursorAfter = start + 1; // where cursor should land after inserting 1 char

      // Manually insert the lowercase character at the current cursor position
      const lower = event.key.toLowerCase();
      target.value = target.value.slice(0, start) + lower + target.value.slice(end);

      // Notify Angular's reactive form / ngModel that the value changed.
      // Suppress our own handleGlobalInput from reacting to this synthetic event.
      // Angular's (input)="clearError('email')" may call markAsPristine() → CD → writeValue()
      // which resets cursor to end. So we restore AFTER via microtask.
      this._suppressInput = true;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      this._suppressInput = false;

      // Restore cursor AFTER Angular's synchronous markAsPristine/writeValue pipeline
      Promise.resolve().then(() => {
        try {
          target.setSelectionRange(cursorAfter, cursorAfter);
        } catch (e) { }
      });
    }
  };

  // Input handler: handles paste / autofill / IME — no cursor issue in those cases
  handleGlobalInput = (event: Event) => {
    if (this._suppressInput) return; // ignore our own synthetic event
    const target = event.target as HTMLInputElement;
    if (!target) return;
    const tag = target.tagName;
    const type = (target.getAttribute('type') || 'text').toLowerCase();
    const isTextEntry = tag === 'TEXTAREA' || (tag === 'INPUT' && ['text', 'email', 'search', 'url', 'tel'].includes(type));
    if (!isTextEntry) return;
    if (!this.isEmailInputField(target)) return;

    // Check if the placeholder contains "Email" or "Employee ID"
    const ph = (target.getAttribute('placeholder') || '').toLowerCase();
    const hasEmailOrEmpId = ph.includes('email') || ph.includes('employee id') || ph.includes('employeeid');

    if (hasEmailOrEmpId) {
      // Wait until the user types '@'. If they haven't typed '@', leave whatever they typed
      const hasAt = target.value && target.value.includes('@');
      if (!hasAt) {
        return;
      }
    }

    if (target.value && target.value !== target.value.toLowerCase()) {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      target.value = target.value.toLowerCase();

      // Notify Angular's reactive form so it syncs the lowercased value.
      // Without this, Angular's writeValue() can revert the DOM change on next CD cycle.
      this._suppressInput = true;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      this._suppressInput = false;

      // Restore cursor AFTER Angular's synchronous writeValue pipeline
      if (start !== null && end !== null) {
        Promise.resolve().then(() => {
          try {
            target.setSelectionRange(start, end);
          } catch (e) { }
        });
      }
    }
  };
  showSidebar = true;
  selectedMenuItem: string = '';
  showNotification = false;
  customerType: string | null = null;
  private audioUnlocked = false;
  isRouteAuthorized = true;
  isRouteLoading = false;
  isPendingApproval = false;
  // Newly addedfor inactive log out
  isUserInactive = false;
  isStatusChecking = false;
  // End of newly added for inactive log out
  inactiveCustomerData: any = null;
  showPaymentOptions = false;
  paymentOptions = ['Quarterly Payment', 'Half-Yearly Payment', 'Full Payment'];
  selectedIndex = 2;
  showInactiveUserModal = false;
  inactiveUserModalMessage = '';
  isSessionInitialized = false;
  showForceLogoutModal = false;
  forceLogoutModalTitle = 'Account Updated';
  forceLogoutModalMessage = 'Your account data has been updated. Please log in again to apply the changes.';
  private sessionInterval: any;

  private isInitialNavigation = true;
  private tokenSyncInterval: any;
  private hotelStatusInterval: any;
  private isFcmInitialized = false;
  // Tracks the in-flight FCM-token removal fired when the user blocks permission,
  // so the enable branch can await it and avoid the disable→enable race that
  // otherwise leaves DB stuck at fcm_token=[] / is_available=false.
  private removeFcmTokenInFlight: Promise<void> | null = null;
  // Timeout beyond which a sessionStorage 'pending' sentinel is treated as stale
  // (previous FCM registration attempt hung, tab reloaded mid-flight, etc.).
  // Without this, 'pending' persists forever and blocks all future registration
  // (both initFcmHandling IIFE and checkNotificationPermission enable branch
  // short-circuit on any truthy sessionStorage.CurrentTabFcmToken).
  private readonly PENDING_TOKEN_TIMEOUT_MS = 10000;
  // Last token that registerFcmTokenOnLoad successfully claimed for a write pass.
  // Any subsequent registerFcmTokenOnLoad(sameToken) call in this component
  // instance is skipped — defends against a duplicate write when the 'pending'
  // sentinel leaks and two paths both call in with the same token. Cleared
  // on cleanup so a re-enable after a block can re-register the same token.
  private lastRegisteredToken: string | null = null;
  // Timestamp until which registerFcmTokenOnLoad rate-limit-locks itself. Defends
  // against a DIFFERENT-token race: if the 'pending' sentinel leaks and two paths
  // both get through with different tokens (Firebase getToken can briefly return
  // different token strings right after a fresh SW subscription), the second call
  // within this window is skipped. The reconcile loop at 20s will heal any state
  // that legitimately needed the skipped call. 12s covers a slow DB round-trip
  // plus the 10s pending-stale window, so a re-claim triggered by pending-stale
  // detection can't race the previous call's still-in-flight write.
  private registrationLockUntil = 0;
  private readonly REGISTRATION_LOCK_MS = 12000;
  notifications: any[] = [];
  showNotificationBlockedAlert = false;
  notificationPermissionState: 'default' | 'denied' = 'default';

  private routesWithoutSidebar = ['/login', '/', '/view'];

  constructor(
    private router: Router,
    public localservice: LocalStorageService,
    private pushService: PushService,
    private notificationService: NotificationService,
    private logoutService: LogoutService,
    private permissionService: PermissionService,
    private taskManagementService: TaskManagementService,
    private hotelEnrollmentService: HotelEnrollmentTabviewService,
    private paymentHelperService: PaymentHelperService,
    private staffService: StaffService,
    private cdr: ChangeDetectorRef
  ) {
    this.isUserInactive = this.localservice.get('isUserInactive') === 'true';
    // --- Sidebar and menu tracking ---
    this.router.events.subscribe(event => {
      if (
        event instanceof NavigationStart ||
        event instanceof RouteConfigLoadStart
      ) {
        const targetUrl = ('url' in event ? (event as any).url : '').toLowerCase();
        const isBypassLoader = targetUrl.includes('/login') ||
          targetUrl.includes('/profile') ||
          targetUrl === '/' ||
          targetUrl.startsWith('/view') ||
          targetUrl.includes('/confirmation') ||
          targetUrl.includes('/cancellation') ||
          targetUrl.includes('/payment');

        if (!this.isInitialNavigation && !isBypassLoader) {
          this.isRouteLoading = true;
        }

        if (!isBypassLoader) {
          this.checkHotelStatus();
        }
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof RouteConfigLoadEnd
      ) {
        this.isRouteLoading = false;
        this.isInitialNavigation = false;
      }

      if (event instanceof NavigationEnd) {
        //newly added for logged out issue
        const url = event.urlAfterRedirects || event.url || '';
        // Allow enrollment routes even when loggedOut flag is set (payment callbacks, cancellations)
        const path = (this.router?.url || window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
        const isEnrollmentRoute = path.includes('confirmation') || path.includes('cancellation') || path.includes('payment') || path.includes('edit-new-hotel') || path.includes('add-new-hotel');
        // Global Guard: If not logged in, prevent access to any page except public/bypass and enrollment routes
        const userId = this.localservice.get('UserId');
        const isLoggedOut = this.localservice.get('loggedOut') === 'true';
        const isLoggedIn = !!userId && !isLoggedOut;
        const isBypassRoute =
          url === '/' ||
          url === '/login' ||
          url.startsWith('/login') ||
          url === '/hotel-registration/login' ||
          url.startsWith('/hotel-registration/login');

        if (!isLoggedIn && !isEnrollmentRoute && !isBypassRoute) {
          this.router.navigate(['/login'], { replaceUrl: true });
          return;
        }


        // Auto-logout: navigated to /login WITHOUT the manual loggedOut flag
        // → means it was triggered by a 403 / session expiry → clean up FCM token
        const isAutoLogout =
          (url === '/login' || url.startsWith('/login') || url === '/hotel-registration/login' || url.startsWith('/hotel-registration/login')) &&
          this.localservice.get('loggedOut') !== 'true' &&
          !!this.localservice.get('UserId'); // user was previously logged in
        // console.log('[App] NavigationEnd url:', url, '| loggedOut:', this.localservice.get('loggedOut'), '| UserId:', this.localservice.get('UserId'), '| isAutoLogout:', isAutoLogout);
        if (isAutoLogout) {
          // Capture UserId and CustomerType BEFORE clearing localStorage
          const userIdVal = Number(this.localservice.get('UserId'));
          const customerTypeVal = this.localservice.get('CustomerType');

          // ── Step 1: Clear localStorage immediately (synchronous) ──
          // Do NOT wait for the async FCM API call — localStorage must be wiped right away
          this.localservice.remove('accessToken');
          this.localservice.remove('refreshToken');
          this.localservice.remove('expireTime');
          this.localservice.remove('UserName');
          this.localservice.remove('UserEmail');
          this.localservice.remove('domainName');
          this.localservice.remove('rexpireTime');
          this.localservice.remove('MemberId');
          this.localservice.remove('CustomerType');
          this.localservice.remove('StaffData');
          this.localservice.remove('hierarchy');
          this.localservice.remove('roleName');
          this.localservice.remove('roleId');
          this.localservice.remove('roleModules');
          this.localservice.remove('Password');
          this.localservice.remove('db_schema');
          this.localservice.remove('profile_name');
          this.localservice.remove('profile_image');
          this.localservice.remove('Name');
          this.localservice.remove('paymentDone');
          this.localservice.remove('payNowButtonState');
          this.localservice.remove('lastValidUrl');
          this.localservice.remove('isUserInactive');
          this.localservice.set('loggedOut', 'true');
          // console.log('[App] Auto-logout: localStorage cleared immediately.');
          // ── Step 2: Remove FCM token from DB (async, fire-and-forget) ──
          this.logoutService.removeFcmToken(userIdVal, customerTypeVal).then(() => {
            console.log('[App] Auto-logout: FCM token removed from DB.');
          }).catch(err => {
            console.error('[App] Auto-logout FCM cleanup failed:', err);
          });
          // Remove UserId last
          this.localservice.remove('UserId');
        }

        this.showSidebar =
          this.routesWithoutSidebar.some(route => route === event.url) ||
          event.url.startsWith('/view-hierarchy') ||
          event.url.startsWith('/view-customer-hierarchy');
        // console.log('Current URL:', event.url);
        //newly commented for header issue
        // if (event.url == '/hotel-list' || event.url == '/add-new-hotel') this.selectedMenuItem = "Hotels";
        // // Newly added for terms and conditions & privacy policy
        // else if (event.url == '/privacy-policy') this.selectedMenuItem = "Privacy Policy";
        // else if (event.url == '/terms-conditions') this.selectedMenuItem = "Terms & Conditions";
        // // Newly added for dynamic department and service
        // else if (event.url == '/department-list') this.selectedMenuItem = "Department";
        // else if (event.url == '/service-list') this.selectedMenuItem = "Service";
        // else if (event.url == '/service-tab-list') this.selectedMenuItem = "Service Tab";
        // // Ended
        // else if (event.url == '/role-list' || event.url == '/role') this.selectedMenuItem = "Roles";
        // else if (event.url == '/user-list' || event.url == '/user') this.selectedMenuItem = "Users";
        // else if (event.url == '/staff-list' || event.url == '/staff') this.selectedMenuItem = "Staff";
        // else if (event.url == '/bookings') this.selectedMenuItem = "Bookings";
        // else if (event.url == '/bookings-management') this.selectedMenuItem = "Bookings & Guest Management";
        // else if (event.url == '/late-checkout') this.selectedMenuItem = "Late Checkout";
        // else if (event.url == '/settings') this.selectedMenuItem = "Settings";
        //newly added for header issue
        // const url = event.urlAfterRedirects || event.url;
        // newly commented and added
        //  if (url.includes('/hotel-list') || url.includes('/add-new-hotel') || url.includes('/edit-new-hotel') || url.includes('/hotel-registration')) {
        if (url.includes('/hotel-list') || url.includes('/add-new-hotel') || url.includes('/edit-new-hotel') || url.includes('/hotel-registration') || url.includes('/cancellation') || url.includes('/confirmation')) {
          this.selectedMenuItem = "Hotels";
        } else if (url.includes('/privacy-policy')) {
          this.selectedMenuItem = "Privacy Policy";
        } else if (url.includes('/terms-conditions')) {
          this.selectedMenuItem = "Terms & Conditions";
        } else if (url.includes('/department-list')) {
          this.selectedMenuItem = "Department";
        } else if (url.includes('/service-tab-list')) {
          this.selectedMenuItem = "Service Tab";
        } else if (url.includes('/service-list') || url.includes('/service') || url.includes('/add-new-service') || url.includes('/edit-service') || url.includes('/view-service')) {
          this.selectedMenuItem = "Service";
        } else if (url.includes('/role-list') || url.includes('/role')) {
          this.selectedMenuItem = "Roles";
        } else if (url.includes('/user-list') || url.includes('/user')) {
          this.selectedMenuItem = "Users";
        } else if (url.includes('/staff-list') || url.includes('/staff')) {
          this.selectedMenuItem = "Staff";
        } else if (url.includes('/bookings-management')) {
          this.selectedMenuItem = "Bookings & Guest Management";
        } else if (url.includes('/bookings')) {
          this.selectedMenuItem = "Bookings";
        } else if (url.includes('/late-checkout')) {
          this.selectedMenuItem = "Late Checkout";
        } else if (url.includes('/settings')) {
          this.selectedMenuItem = "Settings";
        } else if (url.includes('/member-hierarchy') || url.includes('/create-new-hierarchy') || url.includes('/edit-hierarchy') || url.includes('/view-hierarchy')) {
          this.selectedMenuItem = "Hierarchy";
        } else if (url.includes('/features') || url.includes('/restaurants-list') || url.includes('/features-list') || url.includes('/feature-creation')) {
          this.selectedMenuItem = "Features";
        } else if (url.includes('/payment-details') || url.includes('/payment-subscription')) {
          this.selectedMenuItem = "Payment";
        } else if (url.includes('/outlet-list') || url.includes('/outlet-creation') || url.includes('/create-outlet') || url.includes('/product') || url.includes('/add-product')) {
          this.selectedMenuItem = "Outlets";
        } else if (url.includes('/dashboard')) {
          this.selectedMenuItem = "Dashboard";
        } else if (url.includes('report')) {
          this.selectedMenuItem = "Report";
        } else if (url.includes('/profile')) {
          this.selectedMenuItem = "Profile";
        } else if (url.includes('/task-management') || url.includes('/create-task')) {
          this.selectedMenuItem = "Task Management";
        } else if (url.includes('/timeline')) {
          this.selectedMenuItem = "Timeline";
        }
        // Check if the current route is the wildcard/not-found route
        let activeRoute = this.router.routerState.root;
        while (activeRoute.firstChild) {
          activeRoute = activeRoute.firstChild;
        }
        const isWildcard = activeRoute.routeConfig?.path === '**';

        this.checkRouteAuthorization(url);

        if (!isWildcard && isLoggedIn && !isBypassRoute && this.isRouteAuthorized) {
          this.localservice.set('lastValidUrl', url);
        }
        this.initFcmHandling();
        this.checkNotificationPermission();
      }
    });
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this.handleGlobalKeydown, true);
    document.addEventListener('input', this.handleGlobalInput, true);

    // Drop a stale FCM 'pending' sentinel that survived a tab reload. The 'pending'
    // string is set while pushService.getCurrentToken() / requestPermissionAndGetToken()
    // is in flight; if that call hung or the tab reloaded before it resolved, the
    // string persists (sessionStorage survives reload) and permanently blocks every
    // future registration path. Age check protects an attempt that is legitimately
    // still in flight in this tab session.
    const stalePending = sessionStorage.getItem('CurrentTabFcmToken') === 'pending';
    const stamp = Number(sessionStorage.getItem('__CurrentTabFcmTokenPendingAt') || '0');
    if (stalePending && (stamp === 0 || Date.now() - stamp > this.PENDING_TOKEN_TIMEOUT_MS)) {
      sessionStorage.removeItem('CurrentTabFcmToken');
      sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
    }

    // --- Restore user info ---
    this.customerType = this.localservice.get('CustomerType');
    // console.log('[App] Customer Type:', this.customerType);
    const queryParams = new URLSearchParams(window.location.search);
    const customerIdFromUrl = queryParams.get('customer_id');
    if (customerIdFromUrl) {
      localStorage.setItem('customer_id', customerIdFromUrl);
      this.localservice.set('UserId', customerIdFromUrl);
      this.localservice.remove('loggedOut');
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
    this.initFcmHandling();
    this.checkNotificationPermission();
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
        permissionStatus.onchange = () => {
          this.checkNotificationPermission();
        };
      }).catch(e => console.warn('Permissions API query failed:', e));
    }

    // Periodic check to prevent check timing/routing race conditions when logging in
    setInterval(() => {
      this.checkNotificationPermission();
    }, 2000);
  }

  // Returns true when the current route is one of the app's unauthenticated
  // landing pages, where no FCM token or is_available write should ever run —
  // even if localStorage still carries a stale CustomerType/UserId from a
  // previous session (browser closed without logging out, multi-tab, etc.).
  // Covers exactly the URL families the app already treats as unauthenticated
  // elsewhere (see the NavigationEnd auto-logout bypass at line ~250 and
  // doesPathRequireApproval), plus the bare /hotel-registration entry point.
  // Deliberately does NOT catch authenticated /hotel-registration sub-paths
  // (add-new-hotel, edit-new-hotel, confirmation, cancellation) where a
  // Customer legitimately needs FCM sync during their enrollment flow.
  private isOnUnauthenticatedRoute(): boolean {
    const raw = (this.router?.url || window.location.pathname || '').toLowerCase();
    const path = (raw.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/');
    return (
      path === '/' ||
      path === '/login' ||
      path.startsWith('/login/') ||
      path === '/hotel-registration' ||
      path === '/hotel-registration/login' ||
      path.startsWith('/hotel-registration/login/')
    );
  }

  initFcmHandling(): void {
    // Skip on unauthenticated routes so a stale CustomerType/UserId in localStorage
    // can't cause FCM registration on /login, /, /hotel-registration, or the
    // registration flow's login page.
    // Newly added for session id updation(log out)
    // if (this.isOnUnauthenticatedRoute()) return;
    if (this.isOnUnauthenticatedRoute()) {
      this.isFcmInitialized = false;
      this.isSessionInitialized = false;
      if (this.sessionInterval) {
        clearInterval(this.sessionInterval);
        this.sessionInterval = null;
      }
      return;
    }
    // End of newly added for session id updation(log out)
    const currentCustomerType = this.localservice.get('CustomerType');
    if (!currentCustomerType) {
      if (this.isFcmInitialized) {
        this.isFcmInitialized = false;
        window.removeEventListener('focus', this.handleWindowFocus);
        if (this.tokenSyncInterval) {
          clearInterval(this.tokenSyncInterval);
          this.tokenSyncInterval = null;
        }
        if (this.hotelStatusInterval) {
          clearInterval(this.hotelStatusInterval);
          this.hotelStatusInterval = null;
        }
      }
      this.isSessionInitialized = false;
      if (this.sessionInterval) {
        clearInterval(this.sessionInterval);
        this.sessionInterval = null;
      }
      return;
    }

    if (this.isFcmInitialized) return;

    this.customerType = currentCustomerType;
    if (this.customerType === 'Staff' || this.customerType === 'Customer') {
      this.isFcmInitialized = true;

      if (this.customerType === 'Staff') {
        this.notificationService.showPanel$.subscribe(show => this.showNotification = show);
        // Newly added for session id updation(log out)
        this.initStaffSessionHandling();
        // End of newly added for session id updation(log out)
      }

      // --- Sync & Polling for FCM tokens ---
      // Always remove before re-adding to prevent duplicate listeners across fast login/logout cycles
      window.removeEventListener('focus', this.handleWindowFocus);
      window.addEventListener('focus', this.handleWindowFocus);
      // Clear any leftover interval before starting a fresh one
      if (this.tokenSyncInterval) {
        clearInterval(this.tokenSyncInterval);
        this.tokenSyncInterval = null;
      }
      this.tokenSyncInterval = setInterval(() => {
        this.syncFcmTokensFromDb();
      }, 20000);

      if (this.hotelStatusInterval) {
        clearInterval(this.hotelStatusInterval);
        this.hotelStatusInterval = null;
      }
      this.hotelStatusInterval = setInterval(() => {
        this.checkHotelStatus();
      }, 60000);

      this.checkHotelStatus();

      (async () => {
        try {
          const activeToken = sessionStorage.getItem('CurrentTabFcmToken');
          // Treat 'pending' as stale when its stamp is missing (never set) or older
          // than the timeout — covers the reload-mid-flight case and any hung call.
          const pendingStamp = Number(sessionStorage.getItem('__CurrentTabFcmTokenPendingAt') || '0');
          const isStalePending = activeToken === 'pending' &&
            (pendingStamp === 0 || Date.now() - pendingStamp > this.PENDING_TOKEN_TIMEOUT_MS);
          if (!activeToken || isStalePending) {
            sessionStorage.setItem('CurrentTabFcmToken', 'pending');
            sessionStorage.setItem('__CurrentTabFcmTokenPendingAt', String(Date.now()));
            const currentToken = await this.pushService.getCurrentToken();
            if (currentToken) {
              sessionStorage.setItem('CurrentTabFcmToken', currentToken);
              sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
              // Newly added for after login notification enable & block
              this.localservice.set('isFcmUnavailable', 'false');
              // End of newly added for after login notification enable & block
              this.registerFcmTokenOnLoad(currentToken);
            } else {
              sessionStorage.removeItem('CurrentTabFcmToken');
              sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
              // Newly added for after login notification enable & block
              this.localservice.set('isFcmUnavailable', 'true');
              // End of newly added for after login notification enable & block
            }
          } else if (activeToken !== 'pending') {
            this.localservice.set('isFcmUnavailable', 'false');
            this.registerFcmTokenOnLoad(activeToken);
          }
          this.syncFcmTokensFromDb();
        } catch (err) {
          console.error('[App] Failed to hydrate FCM tokens:', err);
          sessionStorage.removeItem('CurrentTabFcmToken');
          sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
          // Newly added for after login notification enable & block
          this.localservice.set('isFcmUnavailable', 'true');
        }
      })();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleGlobalKeydown, true);
    document.removeEventListener('input', this.handleGlobalInput, true);
    window.removeEventListener('focus', this.handleWindowFocus);
    if (this.tokenSyncInterval) {
      clearInterval(this.tokenSyncInterval);
    }
    if (this.hotelStatusInterval) {
      clearInterval(this.hotelStatusInterval);
    }
  }

  private handleWindowFocus = () => {
    // syncFcmTokensFromDb has its own unauthenticated-route guard, but call it
    // here too so we don't even schedule the fetch when focus lands on /login etc.
    if (!this.isOnUnauthenticatedRoute()) {
      this.syncFcmTokensFromDb();
    }
    this.checkHotelStatus();
  };

  syncFcmTokensFromDb(): void {
    // Skip on unauthenticated routes even if the 20s tokenSyncInterval keeps
    // firing after the tab landed on /login with a stale localStorage session.
    if (this.isOnUnauthenticatedRoute()) return;

    const customerType = this.localservice.get('CustomerType');
    const userId = this.localservice.get('UserId');
    // Skip polling if the user is in the process of logging out or already logged out
    const isLoggedOut = this.localservice.get('loggedOut') === 'true';
    if (!userId || isLoggedOut || (customerType !== 'Staff' && customerType !== 'Customer')) return;
    const fetchBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: Number(userId) } }
    };

    if (customerType === 'Staff') {
      this.taskManagementService.getAllStaves(fetchBody).subscribe((resp: any) => {
        if (resp?.success === 1 && resp.result?.data?.length > 0) {
          const staff = resp.result.data[0];
          if (Array.isArray(staff.fcm_token)) {
            localStorage.setItem('UserFcmTokens', JSON.stringify(staff.fcm_token));
          }
          this.reconcileFcmWithDb(Array.isArray(staff.fcm_token) ? staff.fcm_token : [], staff.is_available);
        }
      });

      // ALSO fetch the linked Customer document for a Staff user so localStorage
      // .CustomerFcmTokens stays fresh. beforeUnloadHandler reads this cache on
      // tab close to send the Customer-document mirror update — if the cache is
      // null (never populated) or stale (out of sync with DB after block/unblock
      // cycles), that update silently skips or sends the wrong array. Populated
      // here on every 20s tick + window focus so it's never more than 20s stale.
      const customerId = this.localservice.get('CustomerId');
      const customerFetchBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: customerId ? { id: Number(customerId) } : { staff_id: Number(userId) }
        }
      };
      this.hotelEnrollmentService.getLoginCustomerById(customerFetchBody).subscribe((custResp: any) => {
        if (custResp?.success === 1 && custResp.result?.data?.length > 0) {
          const customer = custResp.result.data[0];
          // Back-fill CustomerId if it wasn't cached (some login paths don't set it).
          if (!customerId && customer.id) {
            this.localservice.set('CustomerId', String(customer.id));
          }
          if (Array.isArray(customer.fcm_token)) {
            localStorage.setItem('CustomerFcmTokens', JSON.stringify(customer.fcm_token));
          }
        }
      });
    } else if (customerType === 'Customer') {
      this.hotelEnrollmentService.getLoginCustomerById(fetchBody).subscribe((resp: any) => {
        if (resp?.success === 1 && resp.result?.data?.length > 0) {
          const customer = resp.result.data[0];
          if (Array.isArray(customer.fcm_token)) {
            localStorage.setItem('UserFcmTokens', JSON.stringify(customer.fcm_token));
          }
          this.reconcileFcmWithDb(Array.isArray(customer.fcm_token) ? customer.fcm_token : []);
        }
      });
    }
  }

  // Self-heal: if permission is granted but the DB is missing this tab's token
  // (or Staff.is_available drifted to false), fire registerFcmTokenOnLoad so the
  // DB catches up. If permission is blocked but the DB still contains this tab's
  // token, fire the cleanup. Runs every 20s via syncFcmTokensFromDb's interval
  // and on window focus. Idempotent — registerFcmTokenOnLoad and removeFcmToken
  // both no-op when the DB is already in the right state.
  private reconcileFcmWithDb(dbTokens: string[], staffIsAvailable?: any): void {
    if (!('Notification' in window)) return;
    // Defense-in-depth: even though syncFcmTokensFromDb already guards, block any
    // DB write (registerFcmTokenOnLoad or removeFcmToken) if we ended up here on
    // an unauthenticated route through any other code path.
    if (this.isOnUnauthenticatedRoute()) return;
    const cachedToken = sessionStorage.getItem('CurrentTabFcmToken');
    // Skip while a registration is in progress; nothing to reconcile against yet.
    if (!cachedToken || cachedToken === 'pending') return;
    const isStaff = this.customerType === 'Staff';
    const userId = this.localservice.get('UserId');
    if (!userId) return;

    if (Notification.permission === 'granted') {
      const tokenMissing = !dbTokens.includes(cachedToken);
      const availabilityDrifted = isStaff && staffIsAvailable !== true;
      if (tokenMissing || availabilityDrifted) {
        // Drift detected — reset the dedupe marker and rate-limit lock so
        // registerFcmTokenOnLoad actually re-runs. Without this, the dedupe
        // (same-token check) or the rate-limit lock would block reconcile's
        // healing call and drift would persist indefinitely.
        this.lastRegisteredToken = null;
        this.registrationLockUntil = 0;
        this.registerFcmTokenOnLoad(cachedToken);
      }
    } else {
      // Permission is blocked but a token is still cached for this tab — cleanup
      // was probably lost or never fired. Remove it and forget.
      if (dbTokens.includes(cachedToken)) {
        const customerType = this.localservice.get('CustomerType');
        sessionStorage.removeItem('CurrentTabFcmToken');
        sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
        // Clear the dedupe marker AND the rate-limit lock so a re-enable of the
        // same token can register again immediately after this cleanup.
        this.lastRegisteredToken = null;
        this.registrationLockUntil = 0;
        // Track on removeFcmTokenInFlight too, so a quick re-enable right after this
        // reconcile-triggered cleanup awaits it instead of racing it (same protection
        // the checkNotificationPermission disable branch gets).
        const cleanup = this.logoutService.removeFcmToken(Number(userId), customerType, cachedToken).catch(err => {
          console.error('[App] Reconcile cleanup failed:', err);
        }).then(() => {
          if (this.removeFcmTokenInFlight === cleanup) {
            this.removeFcmTokenInFlight = null;
          }
        });
        this.removeFcmTokenInFlight = cleanup;
      } else {
        // Token isn't in DB but is cached — drop the local sentinel.
        sessionStorage.removeItem('CurrentTabFcmToken');
        sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
      }
    }
  }

  registerFcmTokenOnLoad(token: string): void {
    // Defense-in-depth: block DB writes on unauthenticated routes regardless of
    // caller (initFcmHandling, checkNotificationPermission, reconcileFcmWithDb,
    // handleInstructionsOk all lead here). All those callers guard too, but
    // this final gate makes it impossible to write fcm_token / is_available
    // from any URL the app treats as unauthenticated.
    if (this.isOnUnauthenticatedRoute()) return;

    const userId = this.localservice.get('UserId');
    if (!userId) return;

    // Dedupe: skip if this exact token already got a write pass from this
    // component instance. Defends against SAME-token concurrent calls.
    if (token && token === this.lastRegisteredToken) {
      return;
    }
    // Rate-limit lock: skip if any registerFcmTokenOnLoad ran in the last 3s.
    // Defends against DIFFERENT-token races that the dedupe above misses (Firebase
    // getToken briefly returning different token strings on quick successive calls
    // right after a fresh SW subscription). Reconcile fires at 20s and will heal
    // any state that legitimately needed the dropped call. Cleared in cleanup paths
    // (permission-block, reconcile-cleanup) so re-enable registers immediately.
    const now = Date.now();
    if (now < this.registrationLockUntil) {
      return;
    }
    this.registrationLockUntil = now + this.REGISTRATION_LOCK_MS;
    if (token) {
      this.lastRegisteredToken = token;
    }

    if (this.customerType === 'Staff') {
      const staffFetchBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { id: Number(userId) } }
      };
      this.taskManagementService.getAllStaves(staffFetchBody).subscribe(
        (staffResp: any) => {
          if (staffResp?.success === 1 && staffResp.result?.data?.length > 0) {
            const staff = staffResp.result.data[0];
            let tokens: string[] = staff.fcm_token || [];
            if (!Array.isArray(tokens)) {
              tokens = [];
            }
            const hasToken = tokens.includes(token);
            if (!hasToken || staff.is_available !== true) {
              if (!hasToken) {
                tokens.push(token);
              }
              const updateBody = {
                domain_name: DOMAIN_NAME,
                user_id: USER_ID,
                payload: {
                  staff_updation: {
                    fcm_token: tokens,
                    is_available: true
                  }
                },
                extras: { find: { id: Number(userId) } }
              };
              this.staffService.updateStaff(updateBody).subscribe(
                (updateResp: any) => {
                  if (updateResp?.success === 1) {
                    localStorage.setItem('UserFcmTokens', JSON.stringify(tokens));
                  }
                },
                (err: any) => {
                  console.error('[App] Failed to update staff FCM token on load:', err);
                }
              );
            }

            // ALWAYS fetch the Customer document for a Staff user (moved outside
            // the Staff-update guard). Two reasons:
            //   1. Populate localStorage.CustomerFcmTokens on every registration
            //      pass — beforeUnloadHandler needs it to correctly filter this
            //      tab's token out on tab/window close. Previously nested inside
            //      the Staff guard, so it never ran when login already wrote the
            //      correct state to the Staff document (the normal login case).
            //   2. Reconcile the Customer document's own fcm_token / is_available
            //      independently of the Staff document — they can drift separately.
            const customerId = this.localservice.get('CustomerId');
            const customerFetchBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              extras: {
                find: customerId ? { id: Number(customerId) } : { staff_id: Number(userId) }
              }
            };
            this.hotelEnrollmentService.getLoginCustomerById(customerFetchBody).subscribe(
              (customerResp: any) => {
                if (customerResp?.success === 1 && customerResp.result?.data?.length > 0) {
                  const customer = customerResp.result.data[0];
                  if (!customerId && customer.id) {
                    this.localservice.set('CustomerId', String(customer.id));
                  }
                  const resolvedCustomerId = customerId ? Number(customerId) : Number(customer.id);
                  let customerTokens: string[] = customer.fcm_token || [];
                  if (!Array.isArray(customerTokens)) {
                    customerTokens = [];
                  }
                  const hasCustToken = customerTokens.includes(token);
                  // Cache the current customer-document tokens unconditionally.
                  localStorage.setItem('CustomerFcmTokens', JSON.stringify(
                    hasCustToken ? customerTokens : [...customerTokens, token]
                  ));
                  if (!hasCustToken || customer.is_available !== true) {
                    if (!hasCustToken) {
                      customerTokens.push(token);
                    }
                    const customerUpdateBody = {
                      domain_name: DOMAIN_NAME,
                      user_id: USER_ID,
                      payload: {
                        customer_update: {
                          fcm_token: customerTokens,
                          is_available: true
                        }
                      },
                      extras: { find: { id: resolvedCustomerId } }
                    };
                    this.hotelEnrollmentService.updateCustomerFcm(customerUpdateBody).subscribe(
                      () => { /* customer mirror updated for staff */ },
                      err => console.error('[App] Failed to mirror FCM token to customer for staff:', err)
                    );
                  }
                }
              },
              err => console.error('[App] Failed to fetch customer record for staff FCM mirror:', err)
            );
          }
        },
        (err: any) => {
          console.error('[App] Failed to fetch staff for FCM token registration on load:', err);
        }
      );
    } else if (this.customerType === 'Customer') {
      const customerFetchBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { id: Number(userId) } }
      };
      this.hotelEnrollmentService.getLoginCustomerById(customerFetchBody).subscribe(
        (customerResp: any) => {
          if (customerResp?.success === 1 && customerResp.result?.data?.length > 0) {
            const customer = customerResp.result.data[0];
            let tokens: string[] = customer.fcm_token || [];
            if (!Array.isArray(tokens)) {
              tokens = [];
            }
            if (!tokens.includes(token)) {
              tokens.push(token);
              const updateBody = {
                domain_name: DOMAIN_NAME,
                user_id: USER_ID,
                payload: {
                  customer_update: {
                    fcm_token: tokens
                  }
                },
                extras: { find: { id: Number(userId) } }
              };
              this.hotelEnrollmentService.updateCustomerFcm(updateBody).subscribe(
                (updateResp: any) => {
                  if (updateResp?.success === 1) {
                    localStorage.setItem('UserFcmTokens', JSON.stringify(tokens));
                  }
                },
                (err: any) => {
                  console.error('[App] Failed to update customer FCM token on load:', err);
                }
              );
            }
          }
        },
        (err: any) => {
          console.error('[App] Failed to fetch customer for FCM token registration on load:', err);
        }
      );
    }
  }

  checkNotificationPermission() {
    if (!('Notification' in window)) {
      return;
    }
    // Never show the modal or run FCM sync on unauthenticated routes, even if
    // localStorage still holds a previous session's values. Uses the shared
    // helper so /hotel-registration and /hotel-registration/login are covered
    // too (the older inline check only caught / and /login).
    if (this.isOnUnauthenticatedRoute()) {
      this.showNotificationBlockedAlert = false;
      this.cdr.detectChanges();
      return;
    }
    const customerType = this.localservice.get('CustomerType');
    const userId = this.localservice.get('UserId');
    const isLoggedOut = this.localservice.get('loggedOut') === 'true';

    // Not logged in / unknown role → nothing to sync.
    if (!userId || isLoggedOut || (customerType !== 'Staff' && customerType !== 'Customer')) {
      this.showNotificationBlockedAlert = false;
      this.cdr.detectChanges();
      return;
    }

    // Blocked-notification modal is Staff-only, but DB sync (fcm_token cleanup /
    // re-registration) must run for BOTH Staff and Customer — Customer was
    // previously bypassed here, which meant permission toggles never updated
    // the Customer's fcm_token array.
    const showModalAlert = (customerType === 'Staff');

    if (Notification.permission !== 'granted') {
      if (showModalAlert) {
        const isDismissed = sessionStorage.getItem('dismissedNotificationAlert') === 'true';
        this.showNotificationBlockedAlert = !isDismissed;
        this.notificationPermissionState = Notification.permission as 'default' | 'denied';
      } else {
        this.showNotificationBlockedAlert = false;
      }
      this.localservice.set('isFcmUnavailable', 'true');

      // Clean up token from service when user blocks permission.
      // Clear sessionStorage BEFORE the async network call so the 2s setInterval
      // tick that lands mid-flight doesn't fire a duplicate removeFcmToken (the
      // logout service's _isCleaningUp mutex would silently drop the duplicate).
      const cachedToken = sessionStorage.getItem('CurrentTabFcmToken');
      if (cachedToken && cachedToken !== 'pending') {
        console.log('[App] Notifications blocked by user. Cleaning up token:', cachedToken);
        sessionStorage.removeItem('CurrentTabFcmToken');
        sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
        // Clear the dedupe marker AND the rate-limit lock so a re-enable of the
        // same token can register again immediately after this cleanup.
        this.lastRegisteredToken = null;
        this.registrationLockUntil = 0;
        // Track the promise so the enable branch (quick block→allow) can await
        // it before reading DB — otherwise registerFcmTokenOnLoad sees the
        // pre-cleanup state, skips the write, and DB stays stuck stale.
        const cleanup = this.logoutService.removeFcmToken(Number(userId), customerType, cachedToken).then(() => {
          console.log('[App] Successfully removed FCM token from DB after user blocked permission.');
        }).catch(err => {
          console.error('[App] Failed to remove FCM token after user blocked permission:', err);
        }).then(() => {
          if (this.removeFcmTokenInFlight === cleanup) {
            this.removeFcmTokenInFlight = null;
          }
        });
        this.removeFcmTokenInFlight = cleanup;
      }
    } else {
      this.showNotificationBlockedAlert = false;
      this.localservice.set('isFcmUnavailable', 'false');
      // If permission is back to granted, reset block alert dismissal state so it can raise warning again if blocked later
      sessionStorage.removeItem('dismissedNotificationAlert');

      // Auto-register FCM token since permission is enabled.
      // Also treat 'pending' as stale when its stamp is missing or older than the
      // timeout — the 'pending' sentinel is set while requestPermissionAndGetToken
      // is in flight and can otherwise persist across a tab reload or a hung call,
      // permanently blocking re-registration.
      const activeToken = sessionStorage.getItem('CurrentTabFcmToken');
      const pendingStamp = Number(sessionStorage.getItem('__CurrentTabFcmTokenPendingAt') || '0');
      const isStalePending = activeToken === 'pending' &&
        (pendingStamp === 0 || Date.now() - pendingStamp > this.PENDING_TOKEN_TIMEOUT_MS);
      if (!activeToken || isStalePending) {
        sessionStorage.setItem('CurrentTabFcmToken', 'pending');
        sessionStorage.setItem('__CurrentTabFcmTokenPendingAt', String(Date.now()));
        // Await any in-flight disable-cleanup so registerFcmTokenOnLoad reads the
        // post-cleanup DB state, not the pre-cleanup one.
        const inFlightCleanup = this.removeFcmTokenInFlight;
        (async () => {
          if (inFlightCleanup) {
            try { await inFlightCleanup; } catch { /* already logged */ }
          }
          // Permission may have flipped back to blocked while we waited — abort if so.
          if (!('Notification' in window) || Notification.permission !== 'granted') {
            sessionStorage.removeItem('CurrentTabFcmToken');
            sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
            return;
          }
          try {
            const token = await this.pushService.requestPermissionAndGetToken(userId.toString());
            if (!('Notification' in window) || Notification.permission !== 'granted') {
              sessionStorage.removeItem('CurrentTabFcmToken');
              sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
              return;
            }
            if (token) {
              sessionStorage.setItem('CurrentTabFcmToken', token);
              sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
              this.registerFcmTokenOnLoad(token);
            } else {
              sessionStorage.removeItem('CurrentTabFcmToken');
              sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
            }
          } catch (err) {
            console.error('Failed auto-registering FCM token:', err);
            sessionStorage.removeItem('CurrentTabFcmToken');
            sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
          }
        })();
      }
    }
    this.cdr.detectChanges();
  }

  handleInstructionsOk() {
    console.log('[App Notifications] handleInstructionsOk clicked. Current permission:', Notification.permission);
    // Defensive: modal shouldn't render on unauthenticated routes (its show flag
    // is only set by checkNotificationPermission, which itself is guarded), but
    // don't fire any FCM work from a stray click on those routes either.
    if (this.isOnUnauthenticatedRoute()) {
      this.dismissNotificationAlert();
      return;
    }
    const userId = this.localservice.get('UserId');
    if ('Notification' in window && userId) {
      console.log('[App Notifications] Invoking requestPermission directly on click...');
      // Invoke Notification.requestPermission synchronously inside the click handler to guarantee active user gesture
      Notification.requestPermission().then(status => {
        console.log('[App Notifications] Native permission resolved to:', status);
        if (status === 'granted') {
          this.localservice.set('isFcmUnavailable', 'false');
          // Claim the same 'pending' sentinel checkNotificationPermission uses before
          // doing any token work. Granting permission here also flips the underlying
          // PermissionStatus, which independently fires the permissions.onchange
          // listener (and the next 2s setInterval tick) — both call
          // checkNotificationPermission(), which does its own token fetch + DB write.
          // Without this claim, both this handler and that one can race, each getting
          // a token from Firebase (which can briefly return two different token
          // strings right after a fresh SW subscription) and each pushing its own
          // value into the DB's fcm_token array — producing 2 entries for one tab.
          // The check-then-claim below is synchronous (no await in between), so
          // whichever of the two callbacks runs first wins the claim and the other
          // sees 'pending' and backs off — checkNotificationPermission mirrors this
          // same synchronous pattern on its side.
          const activeToken = sessionStorage.getItem('CurrentTabFcmToken');
          const pendingStamp = Number(sessionStorage.getItem('__CurrentTabFcmTokenPendingAt') || '0');
          const isStalePending = activeToken === 'pending' &&
            (pendingStamp === 0 || Date.now() - pendingStamp > this.PENDING_TOKEN_TIMEOUT_MS);
          if (!activeToken || isStalePending) {
            sessionStorage.setItem('CurrentTabFcmToken', 'pending');
            sessionStorage.setItem('__CurrentTabFcmTokenPendingAt', String(Date.now()));
            this.pushService.getCurrentToken().then(token => {
              if (token) {
                sessionStorage.setItem('CurrentTabFcmToken', token);
                sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
                this.registerFcmTokenOnLoad(token);
              } else {
                this.pushService.requestPermissionAndGetToken(userId.toString()).then(t => {
                  if (t) {
                    sessionStorage.setItem('CurrentTabFcmToken', t);
                    sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
                    this.registerFcmTokenOnLoad(t);
                  } else {
                    sessionStorage.removeItem('CurrentTabFcmToken');
                    sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
                  }
                });
              }
            }).catch(err => {
              console.error('[App Notifications] Error getting current FCM token:', err);
              sessionStorage.removeItem('CurrentTabFcmToken');
              sessionStorage.removeItem('__CurrentTabFcmTokenPendingAt');
            });
          }
          // else: a registration is already in flight or already complete for this
          // tab (claimed by checkNotificationPermission's onchange/interval-triggered
          // run) — nothing to do here, that other path already handles it.
        } else {
          this.localservice.set('isFcmUnavailable', 'true');
        }
      }).catch(err => {
        console.error('[App Notifications] Error requesting permission:', err);
        this.localservice.set('isFcmUnavailable', 'true');
      });
    } else {
      this.localservice.set('isFcmUnavailable', 'true');
    }

    // Delay dismissal slightly to keep the clicked DOM element alive
    // so the browser does not invalidate the user gesture context.
    setTimeout(() => {
      this.dismissNotificationAlert();
    }, 250);
  }

  dismissNotificationAlert() {
    this.showNotificationBlockedAlert = false;
    sessionStorage.setItem('dismissedNotificationAlert', 'true');
    this.cdr.detectChanges();
  }

  // Newly added for inactive log out
  checkHotelStatus(): void {
    if (window.location.href.includes('confirmation')) {
      this.isUserInactive = false;
      this.localservice.remove('isUserInactive');
      this.isStatusChecking = false;
      return;
    }
    const customerType = this.localservice.get('CustomerType');
    const targetCustomerId = customerType === 'Staff'
      ? this.localservice.get('CustomerId')
      : this.localservice.get('UserId');

    const isLoggedOut = this.localservice.get('loggedOut') === 'true';
    if (isLoggedOut || !targetCustomerId) {
      this.isUserInactive = false;
      this.localservice.remove('isUserInactive');
      this.isStatusChecking = false;
      return;
    }

    const currentUrl = (this.router?.url || window.location.pathname || '').toLowerCase();
    const isBypass = currentUrl.includes('/login') || currentUrl === '/' || currentUrl.includes('/confirmation') || currentUrl.includes('/cancellation');
    if (!isBypass) {
      if (this.isStatusChecking) {
        return;
      }
      this.isStatusChecking = true;
    }

    const fetchBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: Number(targetCustomerId) } }
    };
    this.hotelEnrollmentService.getLoginCustomerById(fetchBody).subscribe({
      next: (resp: any) => {
        this.isStatusChecking = false;
        // Double check login status before modifying state (handles in-flight request race conditions)
        const currentUserId = this.localservice.get('UserId');
        const currentLoggedOut = this.localservice.get('loggedOut') === 'true';
        if (!currentUserId || currentLoggedOut) {
          this.isUserInactive = false;
          this.localservice.remove('isUserInactive');
          return;
        }

        if (resp?.success === 1 && resp.result?.data?.length > 0) {
          const customer = resp.result.data[0];
          this.inactiveCustomerData = customer;
          const isStaff = customer.staff_employee_number != undefined;
          const isHotelDisabled = customer.hotel_enabled === false || customer.hotel_enabled === 'false';
          const isStatusApproved = (customer.status || '').toLowerCase() === 'approved';

          if (isHotelDisabled && (isStaff || isStatusApproved)) {
            this.isUserInactive = true;
            this.localservice.set('isUserInactive', 'true');
            this.showInactiveUserModal = false;
            // Restore MemberId if it was missing
            const memberId = this.localservice.get('MemberId');
            if (!memberId) {
              const restoredMemberId = customer.customer_member_id || customer.member_id;
              if (restoredMemberId) {
                this.localservice.set('MemberId', restoredMemberId);
              }
            }
          } else {
            // Check if individual user / staff profile is inactive
            const isInactive = isStaff
              ? (customer.is_staff_active === false || customer.is_staff_active === 'false')
              : (customer.is_active === false || customer.is_active === 'false');

            if (isInactive) {
              const accountType = isStaff ? 'staff profile' : 'user account';
              this.inactiveUserModalMessage = `Your ${accountType} is currently inactive. Please contact the administrator for assistance.`;
              this.showInactiveUserModal = true;
              this.isUserInactive = false;
              this.localservice.remove('isUserInactive');
            } else {
              this.showInactiveUserModal = false;
              this.isUserInactive = false;
              this.localservice.remove('isUserInactive');
            }
          }
        }
      },
      error: (err: any) => {
        this.isStatusChecking = false;
        console.error('Error checking hotel/user status:', err);
      }
    });
  }

  initStaffSessionHandling(): void {
    if (this.isOnUnauthenticatedRoute()) return;
    const currentCustomerType = this.localservice.get('CustomerType');
    const userId = this.localservice.get('UserId');
    if (!currentCustomerType || !userId || currentCustomerType !== 'Staff') {
      if (this.sessionInterval) {
        clearInterval(this.sessionInterval);
        this.sessionInterval = null;
      }
      return;
    }
    if (this.isSessionInitialized) return;
    this.isSessionInitialized = true;
    this.executeStaffSessionHandling(userId);
  }

  executeStaffSessionHandling(userId: string): void {
    // Retrieve or generate CurrentSessionId
    let currentSessionId = sessionStorage.getItem('CurrentSessionId');
    if (!currentSessionId) {
      currentSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('CurrentSessionId', currentSessionId);
    }

    const createBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        staff_id: Number(userId),
        session_id: currentSessionId,
        is_logged_out: false
      }
    };

    this.staffService.createStaffSession(createBody).subscribe({
      next: (resp: any) => {
        // console.log('[App] Session created in staffchecker:', resp);
      },
      error: (err: any) => {
        console.error('[App] Failed to create session in staffchecker:', err);
      }
    });

    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
    }
    this.sessionInterval = setInterval(() => {
      this.checkStaffSession();
    }, 15000);
  }

  checkStaffSession(): void {
    const currentCustomerType = this.localservice.get('CustomerType');
    const userId = this.localservice.get('UserId');
    const isLoggedOut = this.localservice.get('loggedOut') === 'true';
    if (!currentCustomerType || !userId || currentCustomerType !== 'Staff' || isLoggedOut) {
      if (this.sessionInterval) {
        clearInterval(this.sessionInterval);
        this.sessionInterval = null;
      }
      return;
    }
    const currentSessionId = sessionStorage.getItem('CurrentSessionId');
    if (!currentSessionId) return;
    const checkBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          staff_id: Number(userId),
          session_id: currentSessionId
        }
      }
    };
    this.staffService.checkStaffSession(checkBody).subscribe({
      next: (resp: any) => {
        if (resp?.success === 1) {
          const forceLogoutFromBoolean = resp.result?.force_logout === true;
          const forceLogoutFromData = resp.result?.data?.length > 0 &&
            (resp.result.data[0].is_logged_out === true || resp.result.data[0].logout === true);

          if (forceLogoutFromBoolean || forceLogoutFromData) {
            this.showForceLogout();
          } else {
            console.log('No force logout', resp);
          }
        }
        else {
          console.log('No force logout / no session found', resp);
        }
      },
      error: (err: any) => {
        console.error('[App] Error during periodic session check:', err);
      }
    });
  }

  showForceLogout(): void {
    this.showForceLogoutModal = true;
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
      this.sessionInterval = null;
    }
  }

  async handleForceLogoutOk(): Promise<void> {
    this.showForceLogoutModal = false;
    this.isUserInactive = false;

    // Clear intervals
    if (this.tokenSyncInterval) {
      clearInterval(this.tokenSyncInterval);
      this.tokenSyncInterval = null;
    }
    if (this.hotelStatusInterval) {
      clearInterval(this.hotelStatusInterval);
      this.hotelStatusInterval = null;
    }
    this.isFcmInitialized = false;
    window.removeEventListener('focus', this.handleWindowFocus);

    // Perform logout cleanups
    const userId = Number(this.localservice.get('UserId'));
    const customerType = this.localservice.get('CustomerType');
    if (userId) {
      try {
        await this.logoutService.removeFcmToken(userId, customerType);
      } catch (err) {
        console.error('[App] Force logout FCM cleanup failed:', err);
      }
    }

    // Clear local storage and sessionStorage items
    this.localservice.remove('accessToken');
    this.localservice.remove('refreshToken');
    this.localservice.remove('expireTime');
    this.localservice.remove('UserName');
    this.localservice.remove('UserEmail');
    this.localservice.remove('UserId');
    this.localservice.remove('domainName');
    this.localservice.remove('rexpireTime');
    this.localservice.remove('MemberId');
    this.localservice.remove('CustomerType');
    this.localservice.remove('guestData');
    this.localservice.remove('maxTabReached');
    this.localservice.remove('currentTab');
    this.localservice.remove('StaffData');
    this.localservice.remove('hierarchy');
    this.localservice.remove('roleName');
    this.localservice.remove('role_id');
    this.localservice.remove('Password');
    this.localservice.remove('db_schema');
    this.localservice.remove('selectedSlots');
    this.localservice.remove('baseStaffIds');
    this.localservice.remove('allLowerStaffIds');
    this.localservice.remove('roomRange');
    this.localservice.remove('USERACCESS');
    this.localservice.remove('payNowButtonState');
    this.localservice.remove('isFirstStaff');
    this.localservice.remove('defaultHierarchy');
    this.localservice.remove('Role');
    this.localservice.remove('roleId');
    this.localservice.remove('roleModules');
    this.localservice.remove('outlet_id');
    this.localservice.remove('profile_name');
    this.localservice.remove('profile_image');
    this.localservice.remove('Name');
    this.localservice.remove('paymentDone');
    this.localservice.remove('lastValidUrl');
    this.localservice.remove('UserFcmTokens');
    this.localservice.remove('isFcmUnavailable');
    this.localservice.remove('isUserInactive');
    sessionStorage.removeItem('CurrentTabFcmToken');
    sessionStorage.removeItem('dismissedNotificationAlert');
    sessionStorage.removeItem('CurrentSessionId');
    this.localservice.set('loggedOut', 'true');
    this.isSessionInitialized = false;

    // Navigate to login
    this.router.navigate([''], { skipLocationChange: false, replaceUrl: true });
  }

  async initiatePaymentFlow(): Promise<void> {
    if (!this.inactiveCustomerData) return;
    let memberId = this.localservice.get('MemberId');
    if (!memberId && this.inactiveCustomerData) {
      memberId = this.inactiveCustomerData.customer_member_id || this.inactiveCustomerData.member_id;
      if (memberId) {
        this.localservice.set('MemberId', memberId);
      }
    }
    if (!memberId) return;

    try {
      const orderdata = await this.paymentHelperService.getLastestOrderOfCustomer(memberId);
      let payment_split: any[] = [];
      if (orderdata && orderdata.payment_split) {
        payment_split = orderdata.payment_split;
      }

      const hasUnpaid = payment_split.some((cycle: any) =>
        cycle.installments.some((inst: any) => inst.status === "Not Paid")
      );

      if (hasUnpaid) {
        // Direct checkout for existing unpaid installment
        await this.paymentHelperService.payNow(this.inactiveCustomerData, orderdata, null);
      } else {
        // Show billing selection screen
        this.showPaymentOptions = true;
      }
    } catch (err) {
      console.error('Error in deactivated payment flow:', err);
    }
  }

  async executePaymentPlan(): Promise<void> {
    if (!this.inactiveCustomerData) return;
    try {
      await this.paymentHelperService.payNow(this.inactiveCustomerData, null, this.selectedIndex);
    } catch (err) {
      console.error('Error executing payment plan:', err);
    }
  }

  async handleInactiveLogout(): Promise<void> {
    this.isUserInactive = false;
    // Clear interval and event listeners immediately to stop further requests
    if (this.tokenSyncInterval) {
      clearInterval(this.tokenSyncInterval);
      this.tokenSyncInterval = null;
    }
    if (this.hotelStatusInterval) {
      clearInterval(this.hotelStatusInterval);
      this.hotelStatusInterval = null;
    }
    this.isFcmInitialized = false;
    window.removeEventListener('focus', this.handleWindowFocus);

    // ── Step 1: FCM token cleanup (same as manual logout — async fire-and-forget) ──
    const userId = Number(this.localservice.get('UserId'));
    const customerType = this.localservice.get('CustomerType');
    if (userId) {
      this.logoutService.removeFcmToken(userId, customerType).catch(err => {
        console.error('[App] Inactive logout FCM cleanup failed:', err);
      });
    }
    // ── Step 2: Clear all localStorage keys (mirrors header.component.ts logout) ──
    this.localservice.remove('accessToken');
    this.localservice.remove('refreshToken');
    this.localservice.remove('expireTime');
    this.localservice.remove('UserName');
    this.localservice.remove('UserEmail');
    this.localservice.remove('UserId');
    this.localservice.remove('domainName');
    this.localservice.remove('rexpireTime');
    this.localservice.remove('MemberId');
    this.localservice.remove('CustomerType');
    this.localservice.remove('guestData');
    this.localservice.remove('maxTabReached');
    this.localservice.remove('currentTab');
    this.localservice.remove('StaffData');
    this.localservice.remove('hierarchy');
    this.localservice.remove('roleName');
    this.localservice.remove('role_id');
    this.localservice.remove('Password');
    this.localservice.remove('db_schema');
    this.localservice.remove('selectedSlots');
    this.localservice.remove('baseStaffIds');
    this.localservice.remove('allLowerStaffIds');
    this.localservice.remove('roomRange');
    this.localservice.remove('USERACCESS');
    this.localservice.remove('payNowButtonState');
    this.localservice.remove('isFirstStaff');
    this.localservice.remove('defaultHierarchy');
    this.localservice.remove('Role');
    this.localservice.remove('roleId');
    this.localservice.remove('roleModules');
    this.localservice.remove('outlet_id');
    this.localservice.remove('profile_name');
    this.localservice.remove('profile_image');
    this.localservice.remove('Name');
    this.localservice.remove('paymentDone');
    this.localservice.remove('lastValidUrl');
    this.localservice.remove('UserFcmTokens');
    this.localservice.remove('isFcmUnavailable');
    this.localservice.remove('isUserInactive');
    sessionStorage.removeItem('CurrentTabFcmToken');
    sessionStorage.removeItem('dismissedNotificationAlert');
    this.localservice.set('loggedOut', 'true');
    // ── Step 3: Navigate to login ──
    this.router.navigate([''], { skipLocationChange: false, replaceUrl: true });
  }
  // End of newly added for inactive log out

  closeInactiveUserModal(): void {
    this.showInactiveUserModal = false;
    this.handleInactiveLogout();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any): void {
    const customerType = this.localservice.get('CustomerType');

    if (customerType === 'Staff' || customerType === 'Customer') {
      const userId = this.localservice.get('UserId');
      // Newly added for session id updation(log out)
      if (!userId) return;
      const currentSessionId = sessionStorage.getItem('CurrentSessionId');
      // End of newly added for session id updation(log out)
      const currentToken = sessionStorage.getItem('CurrentTabFcmToken');
      const rawTokens = localStorage.getItem('UserFcmTokens');

      try {
        const tokenHeaders = new Headers({
          'Content-Type': 'application/json',
          'authorization': 'Bearer ' + this.localservice.get('accessToken')
        });

        let didExecuteFetch = false;

        if (customerType === 'Staff') {
          // --- FCM tokens ---
          let filteredTokens: string[] = [];
          if (currentToken && rawTokens) {
            try {
              const tokens: string[] = JSON.parse(rawTokens);
              filteredTokens = tokens.filter(t => t !== currentToken);
              localStorage.setItem('UserFcmTokens', JSON.stringify(filteredTokens));
            } catch (e) { }
          }
          const remainingCount = filteredTokens.length;
          const isAvailableValue = remainingCount >= 1;

          // Build staff update payload
          const staffUpdatePayload: any = {
            is_available: isAvailableValue
          };
          if (rawTokens && currentToken) {
            staffUpdatePayload.fcm_token = filteredTokens;
          }

          const memberId = this.localservice.get('MemberId');
          const staffUpdateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              staff_updation: staffUpdatePayload
            },
            extras: {
              find: {
                id: Number(userId),
                ...(memberId ? { member_id: memberId } : {})
              }
            }
          };

          fetch(ENDPOINTS.UPDATE_STAFF, {
            method: 'POST',
            headers: tokenHeaders,
            body: JSON.stringify(staffUpdateBody),
            keepalive: true
          });
          didExecuteFetch = true;

          // --- Staff Session update ---
          if (currentSessionId) {
            const checkUpdateBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: {
                staff_session_update: {
                  is_logged_out: true
                }
              },
              extras: {
                find: {
                  staff_id: Number(userId),
                  session_id: currentSessionId
                }
              }
            };
            fetch(ENDPOINTS.UPDATE_STAFF_SESSION, {
              method: 'POST',
              headers: tokenHeaders,
              body: JSON.stringify(checkUpdateBody),
              keepalive: true
            });
            didExecuteFetch = true;
          }
        } else {
          // Non-Staff Customer
          const customerUpdatePayload: any = {};
          if (rawTokens && currentToken) {
            try {
              const tokens: string[] = JSON.parse(rawTokens);
              const filteredTokens = tokens.filter(t => t !== currentToken);
              customerUpdatePayload.fcm_token = filteredTokens;
              localStorage.setItem('UserFcmTokens', JSON.stringify(filteredTokens));
            } catch (e) { }
          }

          if (Object.keys(customerUpdatePayload).length > 0) {
            const customerUpdateBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: {
                customer_update: customerUpdatePayload
              },
              extras: { find: { id: Number(userId) } }
            };

            fetch(ENDPOINTS.UPDATE_LOGIN_CUSTOMER_FCM, {
              method: 'POST',
              headers: tokenHeaders,
              body: JSON.stringify(customerUpdateBody),
              keepalive: true
            });
            didExecuteFetch = true;
          }
        }

        if (didExecuteFetch) {
          // Busy-wait for 150ms to allow the browser's network thread to dispatch the request/preflight
          const start = Date.now();
          while (Date.now() - start < 150) {
            // block execution briefly
          }
        }
      } catch (e) {
        console.error('[App] Error in beforeunload handler:', e);
      }
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
    /*  const structured = {
       title: payload?.notification?.title || 'No Title',
       body: payload?.notification?.body || '',
       task_id: parsedMessage?.task_id || null,
       redirection_tab: parsedMessage?.redirection_tab || null,
     }; */
    /*   const structured = {
        // id and time are required by the notification panel, which only shows
        // entries that have an id and displays the time; id is also used to
        // de-duplicate notifications in the notification service.
        id: payload?.messageId || null,
        title: payload?.notification?.title || 'No Title',
        body: payload?.notification?.body || '',
        time: new Date().toLocaleTimeString(),
        task_id: parsedMessage?.task_id || null,
        redirection_tab: parsedMessage?.redirection_tab || null,
      }; */
    const structured = {

      // id and time are required by the notification panel, which only shows
      // entries that have an id and displays the time; id is also used to
      // de-duplicate notifications in the notification service.
      id: payload?.messageId || null,
      // Fall back to payload.data for data-only messages (same as the service
      // worker and the previous push service); without this, data-only messages
      // produce an empty body and get dropped by addNotification's guard.
      title: payload?.notification?.title || payload?.data?.['title'] || 'No Title',
      body: payload?.notification?.body || payload?.data?.['body'] || '',
      time: new Date().toLocaleTimeString(),
      task_id: parsedMessage?.task_id || null,
      redirection_tab: parsedMessage?.redirection_tab || null,
    };
    // console.log('[App] Extracted Notification Data:', structured);
    return structured;
  }

  private checkRouteAuthorization(url: string): void {
    this.isPendingApproval = false;
    // If the matched route is the wildcard (Page Not Found), bypass authorization
    let activeRoute = this.router.routerState.root;
    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }
    if (activeRoute.routeConfig?.path === '**') {
      this.isRouteAuthorized = true;
      return;
    }

    const userId = this.localservice.get('UserId');
    if (!userId) {
      this.isRouteAuthorized = true;
      return;
    }

    const customerType = this.localservice.get('CustomerType');
    const cleanUrl = url.split('?')[0].toLowerCase().replace(/\/+$/, '');

    // Common/public bypass routes
    const bypassRoutes = ['/login', '/', ''];
    if (bypassRoutes.some(r => cleanUrl === r || (r !== '' && cleanUrl.startsWith(r + '/')))) {
      this.isRouteAuthorized = true;
      // console.log('[AuthCheck] Bypassed route:', cleanUrl);
      return;
    }

    if (customerType === 'Staff') {
      const isTaskManagement = cleanUrl.includes('task-management') ||
        cleanUrl.includes('create-task') ||
        cleanUrl.includes('timeline');
      const isSettings = cleanUrl.includes('settings') ||
        cleanUrl.includes('privacy-policy') ||
        cleanUrl.includes('terms-conditions') ||
        cleanUrl.includes('department') ||
        cleanUrl.includes('service') ||
        cleanUrl.includes('service-tab') ||
        cleanUrl.includes('member-hierarchy') ||
        cleanUrl.includes('create-new-hierarchy') ||
        cleanUrl.includes('edit-hierarchy') ||
        cleanUrl.includes('view-hierarchy');
      const isProfile = cleanUrl.includes('profile');

      this.isRouteAuthorized = isTaskManagement || isSettings || isProfile;
      // console.log('[AuthCheck] Staff path:', cleanUrl, 'isRouteAuthorized:', this.isRouteAuthorized);
      return;
    }

    if (customerType === 'Customer') {
      if (this.doesPathRequireApproval(cleanUrl)) {
        const status = (this.localservice.get('Status') || '').toLowerCase();
        if (status !== 'approved') {
          this.isRouteAuthorized = false;
          this.isPendingApproval = true;
          // console.log('[AuthCheck] Customer is not approved. Denied access to:', cleanUrl);
          return;
        }
      } else {
        this.isRouteAuthorized = true;
        console.log('[AuthCheck] Customer path does not require approval, bypassing permissions:', cleanUrl);
        return;
      }

      const moduleName = this.getModuleForPath(cleanUrl);
      if (!moduleName) {
        this.isRouteAuthorized = true;
        // console.log('[AuthCheck] Customer path (no module matched):', cleanUrl);
        return;
      }

      const permission = this.permissionService.getModulePermission(moduleName);
      // console.log('[AuthCheck] Customer path:', cleanUrl, 'moduleName:', moduleName, 'permission:', permission);
      if (!permission) {
        this.isRouteAuthorized = false;
        // console.log('[AuthCheck] No permission found for module:', moduleName);
        return;
      }

      const hasAnyPermission = permission.has_read_permission ||
        permission.has_add_permission ||
        permission.has_edit_permission ||
        permission.has_delete_permission;

      this.isRouteAuthorized = hasAnyPermission;
      // console.log('[AuthCheck] hasAnyPermission:', hasAnyPermission, 'isRouteAuthorized:', this.isRouteAuthorized);
      return;
    }

    this.isRouteAuthorized = true;
  }

  private doesPathRequireApproval(path: string): boolean {
    const cleanPath = path.toLowerCase();

    // Public/common bypasses do not require approval
    if (cleanPath === '/login' ||
      cleanPath === '/' ||
      cleanPath === '') {
      return false;
    }

    // Enrollment-related paths do not require approval (allows setup phase)
    if (cleanPath.includes('/edit-new-hotel') ||
      cleanPath.includes('/hotel-registration') ||
      cleanPath.includes('/cancellation') ||
      cleanPath.includes('/confirmation')) {
      return false;
    }

    // General settings do not require approval
    if (cleanPath.includes('/settings') ||
      cleanPath.includes('/privacy-policy') ||
      cleanPath.includes('/terms-conditions')) {
      return false;
    }

    // Profile page does not require approval to allow users to view/edit profile details
    if (cleanPath.includes('/profile')) {
      return false;
    }

    // All other internal screens require status to be 'approved'
    return true;
  }

  private getModuleForPath(path: string): string | null {
    if (path.includes('/dashboard') || path.includes('report')) return 'DASHBOARD';

    if (path.includes('/task-management') ||
      path.includes('/create-task') ||
      path.includes('/timeline')) return 'TASK MANAGEMENT';

    if (path.includes('/hotel-list') ||
      path.includes('/add-new-hotel') ||
      path.includes('/edit-new-hotel') ||
      path.includes('/hotel-registration') ||
      path.includes('/cancellation') ||
      path.includes('/confirmation')) return 'HOTELS';

    if (path.includes('/bookings') ||
      path.includes('/bookings-management') ||
      path.includes('/late-checkout')) return 'BOOKINGS';

    if (path.includes('/guests') ||
      path.includes('/guests-management')) return 'GUESTS';

    if (path.includes('/role') ||
      path.includes('/user-list') ||
      path.includes('/user') ||
      path.includes('/staff')) return 'USER ACCESS';

    if (path.includes('/settings') ||
      path.includes('/privacy-policy') ||
      path.includes('/terms-conditions') ||
      path.includes('/department') ||
      path.includes('/service') ||
      path.includes('/service-tab') ||
      path.includes('/member-hierarchy') ||
      path.includes('/create-new-hierarchy') ||
      path.includes('/edit-hierarchy') ||
      path.includes('/view-hierarchy')) return 'SYSTEM SETTINGS';

    if (path.includes('/features') ||
      path.includes('/features-list') ||
      path.includes('/feature-creation')) return 'FEATURES';

    if (path.includes('/payment-details') ||
      path.includes('/payment-subscription')) return 'PAYMENT';

    if (path.includes('/outlet-list') ||
      path.includes('/outlet-creation') ||
      path.includes('/create-outlet') ||
      path.includes('/product') ||
      path.includes('/add-product')) return 'OUTLETS';

    return null;
  }

  goBack(): void {
    const lastValidUrl = localStorage.getItem('lastValidUrl');
    if (lastValidUrl) {
      this.router.navigateByUrl(lastValidUrl);
    } else {
      const customerType = localStorage.getItem('CustomerType');
      if (customerType === 'Staff') {
        this.router.navigate(['/task-management']);
      } else if (customerType === 'Customer') {
        const status = (localStorage.getItem('Status') || '').toLowerCase();
        if (status === 'approved') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/profile']);
        }
      } else {
        this.router.navigate(['/login']);
      }
    }
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
