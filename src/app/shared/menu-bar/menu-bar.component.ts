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

  // activeMenu stores the precise active key (e.g. 'role', 'user', 'staff', 'hotel-0', 'hotel', 'settings-page', 'dashboard', ...)
  activeMenu: string = '';

  // which parent submenus are open
  isHotelSubmenuOpen = false;
  isUserAccessSubmenuOpen = false;
  isSettingsSubmenuOpen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private localService: LocalStorageService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alerts: AlertsService,
    private userAccessService: UserAccessService,
    private sharedDataService: SharedDataService
  ) { }

  ngOnInit(): void {
    console.log('menu bar init');
    this.customerType = this.localService.get('CustomerType');
    this.hotelId = Number(this.localService.get('UserId'));

    // Fetch any server data if required (keeps your original flow)
    this.getCustomerType().then(() => {
      console.log('Customer Type:', this.customerType);
      if (this.customerType && this.hotelId) this.getCustomerById();
    });
    console.log('Hotel Id:', this.hotelId);

    // 1) Run initial highlight immediately (covers direct URL & refresh)
    this.updateActiveMenu(this.router.url);

    // 2) Listen for later navigation events (covers router.navigate calls)
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // event.urlAfterRedirects is reliable
        this.updateActiveMenu(event.urlAfterRedirects);
      });
  }

  /**
   * Decide which menu/submenu should be active and which parent submenu should be open,
   * based on the current URL. This supports nested child routes like /role-add, /role-edit/:id etc.
   */
  updateActiveMenu(url: string) {
    // close all first (we'll open the relevant one)
    this.resetAllSubmenus();
    console.log('Checking URL for highlight:', url);

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

    } else if (url.includes('/settings') ||url.includes('/privacy-policy') || url.includes('/terms-conditions')) {
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
      this.activeMenu = 'outlet';

    }
    // Newly added for dynamic department and service
    else if (url.includes('/department')) {
      this.activeMenu = 'department';
      this.isSettingsSubmenuOpen = true;
    } 
    else if (url.includes('/service')) {
      this.activeMenu = 'service';
      this.isSettingsSubmenuOpen = true;
    } 
    //  else {
    //   // Default: no recognizable route — highlight Hotels by default (as requested)
    //   this.activeMenu = 'hotel';
    //   this.isHotelSubmenuOpen = true;
    // }

    console.log('Active Menu set to:', this.activeMenu,
      'HotelOpen:', this.isHotelSubmenuOpen,
      'UserAccessOpen:', this.isUserAccessSubmenuOpen,
      'SettingsOpen:', this.isSettingsSubmenuOpen);
  }

  // --- your existing server calls (unchanged)
  async getCustomerById(): Promise<void> {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: this.customerType === 'Staff'
          ? { staff_id: this.hotelId }
          : { id: this.hotelId }
      }
    };
    this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe({
      next: (resp: any) => {
        this.loaderService.emitComplete();
        if (resp) this.customerdata = resp.result.data[0];
      },
      error: err => this.handleError(err)
    });
  }

  async getCustomerType(): Promise<void> {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find:
          this.customerType === 'Staff'
            ? { staff_id: this.hotelId }
            : { id: this.hotelId }
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

  goToTab(tabName: string) {
    const nextTab = document.getElementById(tabName);
    if (nextTab) (nextTab as HTMLAnchorElement).click();
  }

  /**
   * Called when user clicks a menu item to set highlight immediately.
   * It also opens the relevant parent submenu when a submenu item is clicked.
   */
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
    } else if ((menu.startsWith('settings')) || (menu.startsWith('department')) || (menu.startsWith('service'))) {
      this.isSettingsSubmenuOpen = true;
      this.isHotelSubmenuOpen = false;
      this.isUserAccessSubmenuOpen = false;
    } else {
      // clicking other main menus — close all submenus
      this.resetAllSubmenus();
    }
  }

  /**
   * Toggle the parent submenu open/close when its header is clicked.
   * Re-clicking the same header toggles (closes) it.
   * Opening one parent closes others.
   */
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
}
