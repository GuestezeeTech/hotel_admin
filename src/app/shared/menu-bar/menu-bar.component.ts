import { RoleListingRoutingModule } from './../../user-access/role-listing/role-listing-routing.module';
import { Component, OnInit, EventEmitter, Output } from '@angular/core';
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
  customerType: any;
  hotelId: number | null = null;
  navigationHotelId: number | null = null; // ID to use for Hotels menu navigation
  // activeMenu stores the precise active key (e.g. 'role', 'user', 'staff', 'hotel-0', 'hotel', 'settings-page', 'dashboard', ...)
  activeMenu: string = '';
  // which parent submenus are open
  isHotelSubmenuOpen = false;
  isUserAccessSubmenuOpen = false;
  isSettingsSubmenuOpen = false;
  roleModules: any;

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
    private hotelListService: HotelListService
  ) { }

  ngOnInit(): void {
    // console.log('menu bar init');
    this.customerType = this.localService.get('CustomerType');
    this.hotelId = Number(this.localService.get('UserId'));
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
        // Newly added for refreshing after payment
        // End for refreshing after payment
      });
    // Newly added for role
    const roleId = this.localService.get('roleId');
    // console.log('Role Id:', roleId);
    // Check if roleId is valid (not null, undefined, empty string, or string "null"/"undefined")
    if (roleId !== null && roleId !== undefined && roleId !== '' && roleId !== 'null' && roleId !== 'undefined') {
      this.getRoleById(roleId);
    }
  }

  updateActiveMenu(url: string) {
    // Newly added for highlighting profile
    // Reset active menu to prevent stale highlights
    this.activeMenu = '';
    // End of newly added for highlighting profile
    // close all first (we'll open the relevant one)
    this.resetAllSubmenus();
    // console.log('Checking URL for highlight:', url);

    // Order matters: check the more-specific module names first (role/user/staff)
    if (url.includes('/role')) {
      // catches /role-list, /role-add, /role-edit, /role/..., etc.
      this.activeMenu = 'role';
      this.isUserAccessSubmenuOpen = true;

    } else if (url.includes('/user')) {
      // catches /user-list, /user-add, /user-edit, etc.
      this.activeMenu = 'user';
      this.isUserAccessSubmenuOpen = true;

    } else if (url.includes('/staff')) {
      this.activeMenu = 'staff';
      this.isUserAccessSubmenuOpen = true;

    } else if (url.includes('/edit-new-hotel') || url.includes('/hotel')) {
      // catches /edit-new-hotel/:id and generic hotel routes
      this.activeMenu = 'hotel';
      this.isHotelSubmenuOpen = true;

    } else if (url.includes('/settings') || url.includes('/privacy-policy') || url.includes('/terms-conditions')) {
      this.activeMenu = 'settings-page';
      this.isSettingsSubmenuOpen = true;

    } else if (url.includes('/bookings')) {
      this.activeMenu = 'bookings';

    } else if (url.includes('/payment-details')) {
      this.activeMenu = 'payment';

    } else if (url.includes('/dashboard')) {
      this.activeMenu = 'dashboard';

    } else if (url.includes('/task-management')) {
      this.activeMenu = 'task';

    } else if (url.includes('/outlet-list') || url.includes('/create-outlet')) {
      this.activeMenu = 'restaurant';

    }
    // Newly added for dynamic department, service and hierarchy
    else if (url.includes('/department')) {
      this.activeMenu = 'department';
      this.isSettingsSubmenuOpen = true;
    }
    else if (url.includes('/service-tab')) {
      this.activeMenu = 'service-tab';
      this.isSettingsSubmenuOpen = true;
    }
    else if (url.includes('/service') || url.includes('/add-new-service') || url.includes('/edit-service') || url.includes('/view-service')) {
      this.activeMenu = 'service';
      this.isSettingsSubmenuOpen = true;
    }
    else if (url.includes('/member-hierarchy') || url.includes('/create-new-hierarchy') || url.includes('/edit-hierarchy') || url.includes('/view-hierarchy')) {
      this.activeMenu = 'hierarchy';
      this.isSettingsSubmenuOpen = true;
    }
    else if (url.includes('/features') || url.includes('/restaurants-list')) {
      this.activeMenu = 'features';
    }
    // Newly added for highlighting profile
    else if (url.includes('/profile')) {
      this.activeMenu = '';
    }
    // End of newly added for highlighting profile

    //  else {
    //   // Default: no recognizable route — highlight Hotels by default (as requested)
    //   this.activeMenu = 'hotel';
    //   this.isHotelSubmenuOpen = true;
    // }
    // console.log('Active Menu set to:', this.activeMenu,
    //   'HotelOpen:', this.isHotelSubmenuOpen,
    //   'UserAccessOpen:', this.isUserAccessSubmenuOpen,
    //   'SettingsOpen:', this.isSettingsSubmenuOpen);
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

  // Find customer where customer_member_id matches the logged in person's member_id
  findCustomerByMemberId(): void {
    const memberId = this.localService.get('MemberId');
    if (!memberId) {
      // If no memberId, use current hotelId
      // this.navigationHotelId = this.hotelId;
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
        // Old code (commented out)
        // if (resp && resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
        if (resp && resp.success === 1 && resp.status_code === 200) {
          const foundCustomer = resp.result.data[0];
          // Use the found customer's id for navigation
          this.navigationHotelId = foundCustomer.id;
          // console.log('Found customer by customer_member_id:', foundCustomer.id);
        }
        // else {
        //   console.log('No customer found by customer_member_id:', memberId);
        //   // If no customer found, use current hotelId
        //   this.navigationHotelId = this.hotelId;
        // }
      },
      error: (err: any) => {
        console.error('Error finding customer by customer_member_id:', err);
        // Old code (commented out)
        // On error, use current hotelId
        // this.navigationHotelId = this.hotelId;
      }
    });
  }
  // Ended for getting customer id for customer type

  async getCustomerType(): Promise<void> {
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
          this.customerType = this.customerdata.staff_employee_number == undefined ? 'Customer' : 'Staff';
          this.localService.set('CustomerType', this.customerType);
        }
      },
      error: err => this.handleError(err)
    });
  }

  isPaymentRoute(): boolean {
    const url = this.router.url.toLowerCase();
    return url.includes('confirmation') || url.includes('cancellation');
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
    const id = this.navigationHotelId ?? this.hotelId;
    if (id == null) return;
    this.router.navigate(['/edit-new-hotel', id], { queryParams: { tab: tabIndex } });
  }

  setActiveMenu(menu: string) {
    this.activeMenu = menu;
    if (menu.startsWith('hotel')) {
      this.isHotelSubmenuOpen = true;
      this.isUserAccessSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
    } else if (['role', 'user', 'staff'].includes(menu)) {
      this.isUserAccessSubmenuOpen = true;
      this.isHotelSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
    } else if ((menu.startsWith('settings')) || (menu.startsWith('department')) || (menu.startsWith('service')) || (menu.startsWith('hierarchy')) || (menu.startsWith('service-tab'))) {
      this.isSettingsSubmenuOpen = true;
      this.isHotelSubmenuOpen = false;
      this.isUserAccessSubmenuOpen = false;
    } else {
      // clicking other main menus — close all submenus
      this.resetAllSubmenus();
    }
  }

  toggleSubmenu(menu: string) {
    if (menu === 'Hotels') {
      this.isHotelSubmenuOpen = !this.isHotelSubmenuOpen;
      this.isUserAccessSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
      // ensure highlight for Hotels (parent key)
      this.activeMenu = 'hotel';
    } else if (menu === 'User Access') {
      this.isUserAccessSubmenuOpen = !this.isUserAccessSubmenuOpen;
      this.isHotelSubmenuOpen = false;
      this.isSettingsSubmenuOpen = false;
      this.activeMenu = 'user-access';
    } else if (menu === 'Settings') {
      this.isSettingsSubmenuOpen = !this.isSettingsSubmenuOpen;
      this.isHotelSubmenuOpen = false;
      this.isUserAccessSubmenuOpen = false;
      this.activeMenu = 'settings-main';
    }
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

  // Newly added for role access
  getRoleById(id: any) {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          // "member_id": this.localService.get('MemberId'),
          "id": Number(id)
        }
      }
    }
    this.roleListingService.getAllRoles(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          const role = response.result.data[0];
          // console.log('Role based on id:', role);
          this.localService.set('roleModules', JSON.stringify(role.modules));
          // console.log('Role Modules:', this.localService.get('roleModules'));
          const stored = this.localService.get('roleModules');
          this.roleModules = stored ? JSON.parse(stored) : [];
          // console.log('Parsed Role Modules:', this.roleModules);
        } else {
          console.error('No roles found:', response?.message);
        }
      },
      error: (err) => {
        //console.error('API Error:', err);
      }
    });
  }

  hasReadPermission(moduleName: string): boolean {
    // If no roleId or no modules yet → do NOT check permission → returns false
    if (!this.roleModules || !Array.isArray(this.roleModules)) {
      return false;
    }
    // console.log('Role Modules Name(in hasReadPermission):', moduleName);
    // console.log('Role Modules(in hasReadPermission):', this.roleModules);
    const moduleObj = this.roleModules.find(
      (m: any) => m.module_name === moduleName
    );
    // console.log('Module Object(in hasReadPermission):', moduleObj);
    // console.log('Module Permission(in hasReadPermission):', moduleObj?.permission?.has_read_permission);
    return moduleObj?.permission?.has_read_permission === true;
  }

  hasAddPermission(moduleName: string): boolean {
    // If no roleId or no modules yet → do NOT check permission → returns false
    if (!this.roleModules || !Array.isArray(this.roleModules)) {
      return false;
    }
    // console.log('Role Modules Name(in hasReadPermission):', moduleName);
    // console.log('Role Modules(in hasReadPermission):', this.roleModules);
    const moduleObj = this.roleModules.find(
      (m: any) => m.module_name === moduleName
    );
    // console.log('Module Object(in hasReadPermission):', moduleObj);
    // console.log('Module Permission(in hasReadPermission):', moduleObj?.permission?.has_read_permission);
    return moduleObj?.permission?.has_add_permission === true;
  }

  hasEditPermission(moduleName: string): boolean {
    // If no roleId or no modules yet → do NOT check permission → returns false
    if (!this.roleModules || !Array.isArray(this.roleModules)) {
      return false;
    }
    // console.log('Role Modules Name(in hasReadPermission):', moduleName);
    // console.log('Role Modules(in hasReadPermission):', this.roleModules);
    const moduleObj = this.roleModules.find(
      (m: any) => m.module_name === moduleName
    );
    // console.log('Module Object(in hasReadPermission):', moduleObj);
    // console.log('Module Permission(in hasReadPermission):', moduleObj?.permission?.has_read_permission);
    return moduleObj?.permission?.has_edit_permission === true;
  }

  hasDeletePermission(moduleName: string): boolean {
    // If no roleId or no modules yet → do NOT check permission → returns false
    if (!this.roleModules || !Array.isArray(this.roleModules)) {
      return false;
    }
    // console.log('Role Modules Name(in hasReadPermission):', moduleName);
    // console.log('Role Modules(in hasReadPermission):', this.roleModules);
    const moduleObj = this.roleModules.find(
      (m: any) => m.module_name === moduleName
    );
    // console.log('Module Object(in hasReadPermission):', moduleObj);
    // console.log('Module Permission(in hasReadPermission):', moduleObj?.permission?.has_read_permission);
    return moduleObj?.permission?.has_delete_permission === true;
  }

  // Newly added for refreshing after payment
  refreshComponentLogic() {
    console.log('refreshComponentLogic called');
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
          // Newly added for reloading role
          if (this.customerdata?.role_id) {
            this.getRoleById(this.customerdata.role_id);
          }
        });
      }
    });
  }


}
