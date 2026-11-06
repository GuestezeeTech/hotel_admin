import { RoleListingRoutingModule } from './../../user-access/role-listing/role-listing-routing.module';
import { ChangeDetectorRef, Component, OnInit, EventEmitter, Output } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { SharedDataService } from './../shared-data.service';
import { UserAccessService } from '../../user-access/user-access.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { LoaderService } from '../loader/loader.service';
import { AlertsService } from '../alerts/alerts.service';
import { RoleListingService } from '../../user-access/role-listing/role-listing.service';
import { HotelListService } from '../../hotel-list/hotel-list.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-menu-bar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss']
})
export class MenuBarComponent implements OnInit {
  @Output() menuSelected = new EventEmitter<string>();
  @Output() continue = new EventEmitter<void>();

  customerdata: any;
  hotelLogoUrl: string | null = null;
  logoLoading = true;
  customerType: any;
  hotelId: number | null = null;
  navigationHotelId: number | null = null; // ID to use for Hotels menu navigation
  // activeMenu stores the precise active key (e.g. 'role', 'user', 'staff', 'hotel-0', 'hotel', 'settings-page', 'dashboard', ...)
  activeMenu: string = '';
  // which parent submenus are open
  isHotelSubmenuOpen = false;
  isUserAccessSubmenuOpen = false;
  isSettingsSubmenuOpen = false;
  /** Skip one route-driven submenu close after intentionally opening a parent flyout. */
  private keepSubmenuOpenOnNextNav = false;
  roleModules: any[] = [];
  // Newlya dded for submenu active
  currentHotelTab: number = 0;
  // End for submenu active

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private localService: LocalStorageService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alerts: AlertsService,
    private userAccessService: UserAccessService,
    private sharedDataService: SharedDataService,
    private roleListingService: RoleListingService,
    private hotelListService: HotelListService,
    private permissionService: PermissionService,
    private cdr: ChangeDetectorRef
  ) { }

  goToPropertyLogoUpload(): void {
    if (!this.isAdminRole()) {
      this.alerts.error('Only admin can change the hotel logo.', {
        autoClose: true,
        keepAfterRouteChange: false
      });
      return;
    }
    // Property Details tab (index 1) + focus company logo upload section
    const id = this.navigationHotelId || this.hotelId;
    if (!id) {
      this.alerts.error('Hotel details not available yet. Please try again.', {
        autoClose: true,
        keepAfterRouteChange: false
      });
      return;
    }
    this.setActiveMenu('hotel-1');
    this.router.navigate(['/edit-new-hotel', id], {
      queryParams: { tab: 1, focus: 'logo' }
    });
  }

  ngOnInit(): void {
    // console.log('menu bar init');
    this.customerType = this.localService.get('CustomerType');
    this.hotelId = Number(this.localService.get('UserId'));
    this.loadRoleModulesFromStorage();
    this.fetchHotelLogo();

    this.sharedDataService.hotelLogo$.subscribe((logoUrl) => {
      if (logoUrl !== undefined) {
        this.hotelLogoUrl = logoUrl;
      }
    });
    // Newlya dded for submenu active
    this.sharedDataService.tab$.subscribe((tabIndex) => {
      this.currentHotelTab = tabIndex;
      const currentUrl = this.router.url;
      if (currentUrl.includes('/edit-new-hotel') || currentUrl.includes('/hotel') || currentUrl.includes('cancellation') || currentUrl.includes('confirmation')) {
        if (this.isApproved()) {
          if (tabIndex === 0) {
            this.activeMenu = 'hotel-0';
          } else if (tabIndex === 1) {
            this.activeMenu = 'hotel-1';
          } else if (tabIndex === 2) {
            this.activeMenu = 'hotel-4';
          } else {
            this.activeMenu = 'hotel';
          }
        } else {
          this.activeMenu = 'hotel';
        }
      }
    });
    // End for submenu active
    // Initialize navigationHotelId with hotelId initially
    // this.navigationHotelId = this.hotelId;
    // Fetch any server data if required (keeps your original flow)
    this.getCustomerType().then(() => {
      // console.log('Customer Type:', this.customerType);
      // Newly added for getting customer id for customer type
      // Old code (commented out)
      // if (this.customerType && this.hotelId) this.getCustomerById();
      if (this.customerType && this.hotelId) {
        this.getCustomerById().then(() => {
          // After getting customer data, check if we need to find customer by customer_member_id
          if (this.customerType === 'Customer' && !this.customerdata?.customer_member_id) {
            this.findCustomerByMemberId();
          }
          else if (this.customerType === 'Customer' && this.customerdata?.customer_member_id) {
            this.navigationHotelId = this.hotelId;
          }
          // Staff UserId is staff_id — resolve real hotel customer id via member_id
          else if (this.customerType === 'Staff') {
            this.findCustomerByMemberId();
          }
          this.resolveAndLoadRoleModules();
          this.updateActiveMenu(this.router.url);
        });
      }
      // Ended for getting customer id for customer type
    });
    // Newly added for payment route id
    this.route.queryParams.subscribe(params => {
      const customerIdFromUrl = params['customer_id'];
      if (customerIdFromUrl) {
        this.hotelId = Number(customerIdFromUrl);
        // console.log('Hotel Id from URL:', this.hotelId);
        // Trigger refresh if on payment route now that we have the correct hotelId
        if (this.router.url.includes('cancellation') || this.router.url.includes('confirmation')) {
          this.refreshComponentLogic();
        }
      }
      this.updateActiveMenu(this.router.url); //newly added
    });

    // console.log('Hotel Id:', this.hotelId);
    // 1) Run initial highlight immediately (covers direct URL & refresh)
    //  Newly commented & added for refreshing after payment(after cancellation)
    // this.updateActiveMenu(this.router.url);
    const initialUrl = this.router.url;
    this.updateActiveMenu(initialUrl);
    // End for refreshing after payment
    // 2) Listen for later navigation events (covers router.navigate calls)
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // event.urlAfterRedirects is reliable
        this.updateActiveMenu(event.urlAfterRedirects);
        // Staff login may set roleModules after first paint — re-resolve on every nav
        this.customerType = this.localService.get('CustomerType') || this.customerType;
        this.resolveAndLoadRoleModules();
      });
    // Newly added for role — load from storage first, then refresh from roles/getall
    this.resolveAndLoadRoleModules();
  }

  private loadRoleModulesFromStorage(): void {
    try {
      const stored = this.localService.get('roleModules');
      if (!stored) {
        this.roleModules = [];
        return;
      }
      const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
      this.roleModules = Array.isArray(parsed) ? parsed : [];
      this.permissionService.refreshModules();
    } catch {
      this.roleModules = [];
    }
  }

  private getStoredRoleId(): any {
    const fromStorage = this.localService.get('roleId');
    if (fromStorage !== null && fromStorage !== undefined && fromStorage !== '' && fromStorage !== 'null' && fromStorage !== 'undefined') {
      return fromStorage;
    }
    return this.customerdata?.role_id || null;
  }

  private resolveAndLoadRoleModules(): void {
    const roleId = this.getStoredRoleId();
    if (roleId !== null && roleId !== undefined && roleId !== '' && roleId !== 'null' && roleId !== 'undefined') {
      this.localService.set('roleId', roleId);
      this.getRoleById(roleId);
    } else {
      this.loadRoleModulesFromStorage();
      this.cdr.detectChanges();
    }
  }

  updateActiveMenu(url: string) {
    // Highlight from route. Close flyouts on nav unless we just opened a parent menu.
    this.activeMenu = '';
    if (this.keepSubmenuOpenOnNextNav) {
      this.keepSubmenuOpenOnNextNav = false;
    } else {
      this.resetAllSubmenus();
    }

    const tabFromQuery = this.readHotelTabFromUrl(url);
    if (tabFromQuery != null) {
      this.currentHotelTab = tabFromQuery;
    }

    // Order matters: check the more-specific module names first (role/user/staff)
    if (url.includes('/role')) {
      this.activeMenu = 'role';
    } else if (url.includes('/user')) {
      this.activeMenu = 'user';
    } else if (url.includes('/staff')) {
      this.activeMenu = 'staff';
    } else if (
      url.includes('/edit-new-hotel') ||
      url.includes('/hotel') ||
      url.includes('cancellation') ||
      url.includes('confirmation')
    ) {
      if (this.isApproved()) {
        if (this.currentHotelTab === 0) {
          this.activeMenu = 'hotel-0';
        } else if (this.currentHotelTab === 1) {
          this.activeMenu = 'hotel-1';
        } else if (this.currentHotelTab === 2) {
          this.activeMenu = 'hotel-4';
        } else {
          this.activeMenu = 'hotel';
        }
      } else {
        this.activeMenu = 'hotel';
      }
    } else if (url.includes('/settings') || url.includes('/privacy-policy') || url.includes('/terms-conditions')) {
      this.activeMenu = 'settings-page';
    } else if (url.includes('/bookings')) {
      this.activeMenu = 'bookings';
    } else if (url.includes('/guests-list')) {
      this.activeMenu = 'guests';
    } else if (url.includes('/payment-details')) {
      this.activeMenu = 'payment';
    } else if (url.includes('/fb/dashboard')) {
      this.activeMenu = 'fb-dashboard';
    } else if (url.includes('/fo/dashboard')) {
      this.activeMenu = 'fo-dashboard';
    } else if (url.includes('/hk/dashboard')) {
      this.activeMenu = 'hk-dashboard';
    } else if (url.includes('/overview-dashboard') || url.includes('/kot-dashboard')) {
      this.activeMenu = 'overview-dashboard';
    } else if (url.includes('/dashboard') || url.includes('report') || url.includes('/guest-reviews')) {
      this.activeMenu = 'dashboard';
    } else if (url.includes('/task-management')) {
      this.activeMenu = 'task';
    } else if (
      url.includes('/outlet-list') ||
      url.includes('/outlet-creation') ||
      url.includes('/create-outlet') ||
      url.includes('/product') ||
      url.includes('/add-product')
    ) {
      this.activeMenu = 'outlet';
    } else if (url.includes('/department')) {
      this.activeMenu = 'department';
    } else if (url.includes('/service-tab')) {
      this.activeMenu = 'service-tab';
    } else if (
      url.includes('/service') ||
      url.includes('/add-new-service') ||
      url.includes('/edit-service') ||
      url.includes('/view-service')
    ) {
      this.activeMenu = 'service';
    } else if (
      url.includes('/member-hierarchy') ||
      url.includes('/create-new-hierarchy') ||
      url.includes('/edit-hierarchy') ||
      url.includes('/view-hierarchy')
    ) {
      this.activeMenu = 'hierarchy';
    } else if (
      url.includes('/features') ||
      url.includes('/restaurants-list') ||
      url.includes('/features-list') ||
      url.includes('/feature-creation')
    ) {
      this.activeMenu = 'features';
    } else if (url.includes('/profile')) {
      this.activeMenu = '';
    }
  }

  private readHotelTabFromUrl(url: string): number | null {
    const match = /[?&]tab=(\d+)/.exec(url);
    if (!match) {
      return null;
    }
    const tab = Number(match[1]);
    return Number.isFinite(tab) ? tab : null;
  }

  // Newly added for getting customer id for customer type
  // Old code (commented out)
  // async getCustomerById(): Promise<void> {
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: this.customerType === 'Staff'
  //         ? { staff_id: this.hotelId }
  //         : { id: this.hotelId }
  //     }
  //   };
  //   this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe({
  //     next: (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp) this.customerdata = resp.result.data[0];
  //     },
  //     error: err => this.handleError(err)
  //   });
  // }

  async getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      const isPayment = this.isPaymentRoute();
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: isPayment
            ? { id: this.hotelId }
            : (this.customerType === 'Staff'
              ? { staff_id: this.hotelId }
              : { id: this.hotelId })
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe({
        next: (resp: any) => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            this.localService.set('Status', this.customerdata?.status);
            resolve();
          } else {
            reject('No customer data found');
          }
        },
        error: err => {
          this.handleError(err);
          reject(err);
        }
      });
    });
  }

  // Find hotel customer where customer_member_id matches the logged-in member_id
  findCustomerByMemberId(onFound?: (id: number) => void): void {
    const memberId = this.localService.get('MemberId');
    if (!memberId) {
      return;
    }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: memberId
        }
      }
    };
    this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
      next: (resp: any) => {
        if (resp && resp.success === 1 && resp.status_code === 200 && resp.result?.data?.length > 0) {
          const foundCustomer = resp.result.data[0];
          this.navigationHotelId = foundCustomer.id;
          this.cdr.detectChanges();
          if (onFound && foundCustomer.id != null) {
            onFound(Number(foundCustomer.id));
          }
        }
      },
      error: (err: any) => {
        console.error('Error finding customer by customer_member_id:', err);
      }
    });
  }

  private resolveHotelAndNavigate(tabIndex?: number): void {
    this.findCustomerByMemberId((id) => {
      if (tabIndex != null) {
        this.router.navigate(['/edit-new-hotel', id], { queryParams: { tab: tabIndex } });
      } else {
        this.router.navigate(['/edit-new-hotel', id]);
      }
    });
  }

  /** Hotel customer id for Hotels menu — never use Staff UserId (staff_id). */
  private getHotelsNavigationId(): number | null {
    if (this.navigationHotelId != null && !isNaN(Number(this.navigationHotelId))) {
      return Number(this.navigationHotelId);
    }
    const type = this.customerType || this.localService.get('CustomerType');
    if (type === 'Staff') {
      // Do not fall back to UserId (staff_id) — that opens a blank enrollment page
      return null;
    }
    if (this.hotelId != null && !isNaN(Number(this.hotelId)) && Number(this.hotelId) !== 0) {
      return Number(this.hotelId);
    }
    return null;
  }
  // Ended for getting customer id for customer type

  async getCustomerType(): Promise<void> {
    return new Promise((resolve, reject) => { //newly added
      const isPayment = this.isPaymentRoute();
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: isPayment
            ? { id: this.hotelId }
            : (this.customerType === 'Staff'
              ? { staff_id: this.hotelId }
              : { id: this.hotelId })
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe({
        next: (resp: any) => {
          this.loaderService.emitComplete();
          // if (resp) {
          if (resp && resp.result && resp.result.data && resp.result.data.length > 0) { //newly added
            this.customerdata = resp.result.data[0];
            this.customerType = this.customerdata.staff_employee_number == undefined ? 'Customer' : 'Staff';
            this.localService.set('CustomerType', this.customerType);
            this.localService.set('Status', this.customerdata?.status);
            resolve(); //newly added
          } else {
            resolve();//newly added
          }
        },
        error: err => {
          this.handleError(err);
          reject(err);//newly added
        }
      });
    });
  }

  isPaymentRoute(): boolean {
    const url = this.router.url.toLowerCase();
    return url.includes('confirmation') || url.includes('cancellation');
  }

  isApproved(): boolean {
    const status = (this.customerdata?.status || this.localService.get('Status') || '').toString().toLowerCase();
    return status === 'approved';
  }

  /**
   * Show a sidebar item when the role has any permission for that module.
   * Staff: permission alone is enough.
   * Customer: must be approved (except HOTELS, which stays available during enrollment).
   * If customer type is not yet resolved, still show when permission exists.
   */
  canShowMenu(moduleName: string): boolean {
    // Always re-read from storage so late role loads (e.g. Staff login) are picked up
    if (!this.roleModules?.length) {
      this.loadRoleModulesFromStorage();
    }
    if (!this.hasAnyPermission(moduleName)) {
      return false;
    }
    const type = this.customerType || this.localService.get('CustomerType');
    if (type === 'Staff' || !type) {
      return true;
    }
    if (type === 'Customer') {
      if ((moduleName || '').toUpperCase() === 'HOTELS') {
        return true;
      }
      return this.isApproved();
    }
    return true;
  }

  handleError(err: any) {
    this.loaderService.emitComplete();
    if (err.error?.statusCode === 403) {
      this.alerts.error('Session Time Out! Please login Again');
      this.router.navigate(['/login']);
    } else if (err.error?.message) {
      this.alerts.error(err.error.message);
    } else {
      this.alerts.error('Something bad happened. Please try again!');
    }
  }

  sendValue(value: string) {
    this.menuSelected.emit(value);
  }

  /** Old approach: submenu used to call goToTab('Registered Office Details') etc. - only worked when already on hotel page. */
  goToTab(tabName: string) {
    const nextTab = document.getElementById(tabName);
    // console.log('Next Tab:', nextTab);
    if (nextTab) (nextTab as HTMLAnchorElement).click();
  }

  /**
   * Navigate to the Hotels (edit-new-hotel) page and open the given tab by index.
   * Uses route + query param so the correct tab opens even when coming from another page.
   */
  navigateToHotelTab(tabIndex: number) {
    const id = this.getHotelsNavigationId();
    if (id == null) {
      this.resolveHotelAndNavigate(tabIndex);
      return;
    }
    this.router.navigate(['/edit-new-hotel', id], { queryParams: { tab: tabIndex } });
  }

  /** Pick a Hotels leaf: navigate, keep selection highlight, hide the 3-item flyout. */
  selectHotelTab(menuKey: string, tabIndex: number, event?: Event): void {
    event?.stopPropagation();
    this.activeMenu = menuKey;
    this.currentHotelTab = tabIndex;
    this.isHotelSubmenuOpen = false;
    this.isUserAccessSubmenuOpen = false;
    this.isSettingsSubmenuOpen = false;
    this.navigateToHotelTab(tabIndex);
  }

  /** Pick User Access / Settings leaf: keep highlight, hide submenu. */
  selectLeafMenu(menuKey: string, label: string, event?: Event): void {
    event?.stopPropagation();
    this.activeMenu = menuKey;
    this.isHotelSubmenuOpen = false;
    this.isUserAccessSubmenuOpen = false;
    this.isSettingsSubmenuOpen = false;
    this.sendValue(label);
  }

  isHotelMenuActive(): boolean {
    return this.activeMenu === 'hotel' || this.activeMenu.startsWith('hotel-');
  }

  isUserAccessMenuActive(): boolean {
    return this.activeMenu === 'user-access' || ['role', 'user', 'staff'].includes(this.activeMenu);
  }

  isSettingsMenuActive(): boolean {
    return (
      this.activeMenu === 'settings-main' ||
      this.activeMenu.startsWith('settings') ||
      ['department', 'service', 'hierarchy', 'service-tab'].includes(this.activeMenu)
    );
  }

  setActiveMenu(menu: string) {
    this.activeMenu = menu;
    if (menu.startsWith('hotel-')) {
      // Leaf selected elsewhere — keep highlight, submenu stays closed
      this.isHotelSubmenuOpen = false;
      this.isUserAccessSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
    } else if (menu === 'hotel') {
      this.isUserAccessSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
    } else if (['role', 'user', 'staff'].includes(menu)) {
      this.isUserAccessSubmenuOpen = false;
      this.isHotelSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
    } else if (
      menu.startsWith('settings') ||
      menu.startsWith('department') ||
      menu.startsWith('service') ||
      menu.startsWith('hierarchy') ||
      menu.startsWith('service-tab')
    ) {
      this.isSettingsSubmenuOpen = false;
      this.isHotelSubmenuOpen = false;
      this.isUserAccessSubmenuOpen = false;
    } else {
      // clicking other main menus — close all submenus
      this.resetAllSubmenus();
    }
  }

  private setSubmenuFlyoutTop(event?: Event): void {
    const el = event?.currentTarget as HTMLElement | undefined;
    if (!el || typeof window === 'undefined' || window.innerWidth > 1280) {
      return;
    }
    const rectTop = Math.round(el.getBoundingClientRect().top);
    // Keep flyout on-screen (leave room for ~3–5 items)
    const maxTop = Math.max(8, window.innerHeight - 220);
    const top = Math.min(Math.max(8, rectTop), maxTop);
    document.documentElement.style.setProperty('--submenu-flyout-top', `${top}px`);
  }

  toggleSubmenu(menu: string, event?: Event) {
    this.setSubmenuFlyoutTop(event);
    if (menu === 'Hotels') {
      const opening = !this.isHotelSubmenuOpen;
      this.isHotelSubmenuOpen = opening;
      this.isUserAccessSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
      // Keep chosen hotel tab highlight when reopening the flyout
      if (!this.activeMenu.startsWith('hotel-')) {
        this.activeMenu = 'hotel';
      }
      if (opening) {
        this.armKeepSubmenuOpen();
        const id = this.getHotelsNavigationId();
        if (id != null) {
          const tab =
            this.activeMenu === 'hotel-0'
              ? 0
              : this.activeMenu === 'hotel-1'
                ? 1
                : this.activeMenu === 'hotel-4'
                  ? 2
                  : this.currentHotelTab;
          this.router.navigate(['/edit-new-hotel', id], {
            queryParams: tab != null ? { tab } : undefined
          });
        } else {
          this.resolveHotelAndNavigate(this.currentHotelTab);
        }
      }
    } else if (menu === 'User Access') {
      const opening = !this.isUserAccessSubmenuOpen;
      this.isUserAccessSubmenuOpen = opening;
      this.isHotelSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
      if (!['role', 'user', 'staff'].includes(this.activeMenu)) {
        this.activeMenu = 'user-access';
      }
      if (opening) {
        this.armKeepSubmenuOpen();
      }
    } else if (menu === 'Settings') {
      const opening = !this.isSettingsSubmenuOpen;
      this.isSettingsSubmenuOpen = opening;
      this.isHotelSubmenuOpen = false;
      this.isUserAccessSubmenuOpen = false;
      if (
        !this.activeMenu.startsWith('settings') &&
        !['department', 'service', 'hierarchy', 'service-tab'].includes(this.activeMenu)
      ) {
        this.activeMenu = 'settings-main';
      }
      if (opening) {
        this.armKeepSubmenuOpen();
      }
    }
  }

  private armKeepSubmenuOpen(): void {
    this.keepSubmenuOpenOnNextNav = true;
    // Same-URL taps may not emit NavigationEnd — clear the guard shortly
    setTimeout(() => {
      this.keepSubmenuOpenOnNextNav = false;
    }, 600);
  }

  resetAllSubmenus() {
    this.isHotelSubmenuOpen = false;
    this.isUserAccessSubmenuOpen = false;
    this.isSettingsSubmenuOpen = false;
  }

  isActive(menu: string): boolean {
    // simple equality check — menu keys must match what's set in activeMenu
    return this.activeMenu === menu;
  }

  isAdminRole(): boolean {
    const role = (this.localService.get('roleName') || '').trim().toLowerCase();
    return role === 'admin';
  }

  // Newly added for role access — uses www.guestezee.com:1306/roles/getall
  getRoleById(id: any) {
    const memberId = this.localService.get('MemberId') || this.customerdata?.customer_member_id || this.customerdata?.member_id;
    const findWithMember: any = { id: Number(id) };
    if (memberId && memberId !== 'null' && memberId !== 'undefined') {
      findWithMember.member_id = memberId;
    }
    const requestWithMember = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: findWithMember }
    };
    this.roleListingService.getAllRoles(requestWithMember).subscribe({
      next: (response) => {
        if (response?.success === 1 && response?.result?.data?.length > 0) {
          this.applyRoleModules(response.result.data[0]);
          return;
        }
        // Retry by role id only when member filter returns nothing
        if (findWithMember.member_id) {
          this.fetchRoleByIdOnly(id);
        } else {
          this.loadRoleModulesFromStorage();
          this.cdr.detectChanges();
        }
      },
      error: () => {
        if (findWithMember.member_id) {
          this.fetchRoleByIdOnly(id);
        } else {
          this.loadRoleModulesFromStorage();
          this.cdr.detectChanges();
        }
      }
    });
  }

  private fetchRoleByIdOnly(id: any): void {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: Number(id) } }
    };
    this.roleListingService.getAllRoles(requestBody).subscribe({
      next: (response) => {
        if (response?.success === 1 && response?.result?.data?.length > 0) {
          this.applyRoleModules(response.result.data[0]);
        } else {
          this.loadRoleModulesFromStorage();
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.loadRoleModulesFromStorage();
        this.cdr.detectChanges();
      }
    });
  }

  private applyRoleModules(role: any): void {
    const modules = Array.isArray(role?.modules) ? role.modules : [];
    this.localService.set('roleModules', JSON.stringify(modules));
    if (role?.id !== undefined && role?.id !== null) {
      this.localService.set('roleId', role.id);
    }
    if (role?.name) {
      this.localService.set('roleName', role.name);
    }
    this.roleModules = modules;
    this.permissionService.refreshModules();
    this.cdr.detectChanges();
  }

  private findRoleModule(moduleName: string): any {
    if (!this.roleModules || !Array.isArray(this.roleModules) || this.roleModules.length === 0) {
      this.loadRoleModulesFromStorage();
    }
    if (!this.roleModules || !Array.isArray(this.roleModules)) {
      return null;
    }
    return this.roleModules.find(
      (m: any) => (m.module_name || '').toUpperCase() === (moduleName || '').toUpperCase()
    );
  }

  hasReadPermission(moduleName: string): boolean {
    return this.findRoleModule(moduleName)?.permission?.has_read_permission === true;
  }

  hasAddPermission(moduleName: string): boolean {
    return this.findRoleModule(moduleName)?.permission?.has_add_permission === true;
  }

  hasEditPermission(moduleName: string): boolean {
    return this.findRoleModule(moduleName)?.permission?.has_edit_permission === true;
  }

  hasDeletePermission(moduleName: string): boolean {
    return this.findRoleModule(moduleName)?.permission?.has_delete_permission === true;
  }

  // Newly added for refreshing after payment
  refreshComponentLogic() {
    /* console.log('refreshComponentLogic called'); */
    this.fetchHotelLogo();
    // console.log('Refreshing component logic...');
    // console.log('Role id:', this.localService.get('roleId'));
    this.getCustomerType().then(() => {
      if (this.customerType && this.hotelId) {
        this.getCustomerById().then(() => {
          // ✅ Case 1: Customer type and member id missing
          if (this.customerType === 'Customer' && !this.customerdata?.customer_member_id) {
            this.findCustomerByMemberId();
          }
          // ✅ Case 2: Customer type and member id exists
          else if (this.customerType === 'Customer' && this.customerdata?.customer_member_id) {
            this.navigationHotelId = this.hotelId;  // if you have this method
          }
          // Newly added for reloading role from roles/getall
          this.resolveAndLoadRoleModules();
          this.updateActiveMenu(this.router.url);
        });
      }
    });
  }


  fetchHotelLogo() {
    const memberId = this.localService.get('MemberId');
    this.logoLoading = true;
    if (!memberId) {
      this.hotelLogoUrl = null;
      this.logoLoading = false;
      return;
    }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: memberId
        },
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe({
      next: (response: any) => {
        if (response?.success && response.result?.data?.length > 0) {
          const customerData = response.result.data[0];
          this.customerdata = this.customerdata || customerData;
          this.hotelLogoUrl = customerData.property_details?.hotel_logo || null;
        } else {
          this.hotelLogoUrl = null;
        }
        this.logoLoading = false;
      },
      error: (err) => {
        console.error('Error fetching customer logo in menu bar:', err);
        this.hotelLogoUrl = null;
        this.logoLoading = false;
      }
    });
  }

  // Newly added for checking any permission
  hasAnyPermission(moduleName: string): boolean {
    const moduleObj = this.findRoleModule(moduleName);
    if (!moduleObj?.permission) {
      return false;
    }
    const p = moduleObj.permission;
    return p.has_read_permission === true ||
      p.has_add_permission === true ||
      p.has_edit_permission === true ||
      p.has_delete_permission === true;
  }
  // Ended for checking any permission
}
