import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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
  // End of newly added for inactive log out
  inactiveCustomerData: any = null;
  showPaymentOptions = false;
  paymentOptions = ['Quarterly Payment', 'Half-Yearly Payment', 'Full Payment'];
  selectedIndex = 2;

  private isInitialNavigation = true;
  private tokenSyncInterval: any;
  private hotelStatusInterval: any;
  private isFcmInitialized = false;
  notifications: any[] = [];

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
    private staffService: StaffService
  ) {
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
      }
    });
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this.handleGlobalKeydown, true);
    document.addEventListener('input', this.handleGlobalInput, true);

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
  }

  initFcmHandling(): void {
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
      return;
    }

    if (this.isFcmInitialized) return;

    this.customerType = currentCustomerType;
    if (this.customerType === 'Staff' || this.customerType === 'Customer') {
      this.isFcmInitialized = true;

      if (this.customerType === 'Staff') {
        this.notificationService.showPanel$.subscribe(show => this.showNotification = show);
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

      (async () => {
        try {
          const currentToken = await this.pushService.getCurrentToken();
          if (currentToken) {
            sessionStorage.setItem('CurrentTabFcmToken', currentToken);
            this.registerFcmTokenOnLoad(currentToken);
          }
          this.syncFcmTokensFromDb();
          this.checkHotelStatus();
        } catch (err) {
          console.error('[App] Failed to hydrate FCM tokens:', err);
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
    this.syncFcmTokensFromDb();
    this.checkHotelStatus();
  };

  syncFcmTokensFromDb(): void {
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
        }
      });
    } else if (customerType === 'Customer') {
      this.hotelEnrollmentService.getLoginCustomerById(fetchBody).subscribe((resp: any) => {
        if (resp?.success === 1 && resp.result?.data?.length > 0) {
          const customer = resp.result.data[0];
          if (Array.isArray(customer.fcm_token)) {
            localStorage.setItem('UserFcmTokens', JSON.stringify(customer.fcm_token));
          }
        }
      });
    }
  }

  registerFcmTokenOnLoad(token: string): void {
    const userId = this.localservice.get('UserId');
    if (!userId) return;

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

  // Newly added for inactive log out
  checkHotelStatus(): void {
    if (window.location.href.includes('confirmation')) {
      this.isUserInactive = false;
      return;
    }
    const memberId = this.localservice.get('MemberId');
    const isLoggedOut = this.localservice.get('loggedOut') === 'true';
    const userId = this.localservice.get('UserId');
    if (isLoggedOut || !userId) {
      this.isUserInactive = false;
      return;
    }
    const findQuery = memberId ? { customer_member_id: memberId } : { id: Number(userId) };
    const fetchBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: findQuery }
    };
    this.hotelEnrollmentService.getLoginCustomerById(fetchBody).subscribe({
      next: (resp: any) => {
        // Double check login status before modifying state (handles in-flight request race conditions)
        const currentUserId = this.localservice.get('UserId');
        const currentLoggedOut = this.localservice.get('loggedOut') === 'true';
        if (!currentUserId || currentLoggedOut) {
          this.isUserInactive = false;
          return;
        }

        if (resp?.success === 1 && resp.result?.data?.length > 0) {
          const customer = resp.result.data[0];
          this.inactiveCustomerData = customer;
          const isStaff = customer.staff_employee_number != undefined;
          const isHotelDisabled = customer.hotel_enabled === false;
          const isStatusApproved = (customer.status || '').toLowerCase() === 'approved';

          if (isHotelDisabled && (isStaff || isStatusApproved)) {
            this.isUserInactive = true;
            // Restore MemberId if it was missing
            if (!memberId) {
              const restoredMemberId = customer.customer_member_id || customer.member_id;
              if (restoredMemberId) {
                this.localservice.set('MemberId', restoredMemberId);
              }
            }
          } else {
            this.isUserInactive = false;
          }
        }
      },
      error: (err: any) => {
        console.error('Error checking hotel status:', err);
      }
    });
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
    sessionStorage.removeItem('CurrentTabFcmToken');
    this.localservice.set('loggedOut', 'true');
    // ── Step 3: Navigate to login ──
    this.router.navigate([''], { skipLocationChange: false, replaceUrl: true });
  }
  // End of newly added for inactive log out

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any): void {
    const customerType = this.localservice.get('CustomerType');
    const isFcmUnavailable = this.localservice.get('isFcmUnavailable') === 'true';

    if ((customerType === 'Staff' || customerType === 'Customer') && !isFcmUnavailable) {
      const userId = this.localservice.get('UserId');
      const currentToken = sessionStorage.getItem('CurrentTabFcmToken');
      const rawTokens = localStorage.getItem('UserFcmTokens');

      if (userId && currentToken && rawTokens) {
        try {
          const tokens: string[] = JSON.parse(rawTokens);
          const filteredTokens = tokens.filter(t => t !== currentToken);

          let updateBody: any;
          let endpointUrl: string;

          if (customerType === 'Staff') {
            const remainingCount = filteredTokens.length;
            const isAvailableValue = remainingCount >= 1;
            updateBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: {
                staff_updation: {
                  fcm_token: filteredTokens,
                  is_available: isAvailableValue
                }
              },
              extras: { find: { id: Number(userId) } }
            };
            endpointUrl = ENDPOINTS.UPDATE_STAFF;
          } else {
            updateBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: {
                customer_update: {
                  fcm_token: filteredTokens
                }
              },
              extras: { find: { id: Number(userId) } }
            };
            endpointUrl = ENDPOINTS.UPDATE_LOGIN_CUSTOMER_FCM;
          }

          const tokenHeaders = new Headers({
            'Content-Type': 'application/json',
            'authorization': 'Bearer ' + this.localservice.get('accessToken')
          });

          fetch(endpointUrl, {
            method: 'POST',
            headers: tokenHeaders,
            body: JSON.stringify(updateBody),
            keepalive: true
          });

          // Busy-wait for 150ms to allow the browser's network thread to dispatch the request/preflight
          const start = Date.now();
          while (Date.now() - start < 150) {
            // block execution briefly
          }

          // Sync local storage for other tabs
          localStorage.setItem('UserFcmTokens', JSON.stringify(filteredTokens));
        } catch (e) {
          console.error('[App] Error in beforeunload handler:', e);
        }
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
