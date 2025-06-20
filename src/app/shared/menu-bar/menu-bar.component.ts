import { SharedDataService } from './../shared-data.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { EventEmitter, Output } from '@angular/core';
import { filter } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { UserAccessService } from '../../user-access/user-access.service';
import { CommonModule } from '@angular/common';
// Newly added
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { LoaderService } from '../loader/loader.service';
import { AlertsService } from '../alerts/alerts.service';
import { ServiceDetailService } from '../../hotel-enrollment-tabview/service-details/service-details.service';

@Component({
  selector: 'app-menu-bar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss'
})

export class MenuBarComponent implements OnInit {
  private currentRoute$ = new BehaviorSubject<string>('');
  @Output() menuSelected = new EventEmitter<string>();
  isSubmenuOpen: boolean = true; // Track submenu state
  currentRoute: string = '';
  showSidebar = false;
  isUserAccessOpen: boolean = false;
  isSettingsOpen: boolean = false;
  userAccess: any;
  // Newly added
  hotelId: Number | null = null;
  status !: string;
  customerdata: any
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  maxTabReached: any;
  customerType: any;
  @Output() continue = new EventEmitter<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userAccessService: UserAccessService,
    // newly added
    private localService: LocalStorageService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private sharedDataService: SharedDataService,
    private alerts: AlertsService) {
    this.currentRoute$ = new BehaviorSubject<string>(this.router.url);
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute$.next(event.urlAfterRedirects); // ✅ Update BehaviorSubject
        //console.log("Current Route Updated:", event.urlAfterRedirects);
      });
    this.userAccessService.userAccess$.subscribe((access) => {
      if (access) {
        this.userAccess = access;
        //console.log(this.userAccess, '🔁 Updated user access from service');
      }
    });
    // this.userAccess = this.userAccessService.userAccessList;
    this.userAccess = this.userAccessService.getUserAccess();
    //console.log(this.userAccess, "this.userAccess")
    // Newly added
    this.hotelId = Number(this.localService.get('UserId'));
    //console.log('Hotel ID:', this.hotelId);
    this.maxTabReached = this.localService.get('maxTabReached');
    //console.log('Tab:', this.maxTabReached);
    this.getCustomerById();
    // Customer Type
    this.customerType = this.localService.get('CustomerType');
    //console.log('Customer Type:', this.customerType);
  }

  sendValue(value: string) {
    this.menuSelected.emit(value); // Emit value to parent
    this.toggleSubmenu();
  }

  toggleSubmenu() {
    this.isSubmenuOpen = !this.isSubmenuOpen; // Toggle submenu open/close
    //console.log("123456")
  }

  isHotelActive(): boolean {
    const currentRoute = this.currentRoute$.value;
    //console.log("hotel", this.currentRoute.includes('hotel'));
    return currentRoute.includes('hotel');
  }

  isBookingsActive(): boolean {
    const currentRoute = this.currentRoute$.value;
    //console.log("hotel", this.currentRoute.includes('bookings'));
    return currentRoute.includes('bookings');
  }

  isPaymentActive(): boolean {
    const currentRoute = this.currentRoute$.value;
    //console.log("payment", this.currentRoute.includes('payment'));
    return currentRoute.includes('payment');
  }

  isDashboardActive(): boolean {
    const currentRoute = this.currentRoute$.value;
    //console.log("dashboard", this.currentRoute.includes('dashboard'));
    return currentRoute.includes('dashboard');
  }

  isTaskManagementActive(): boolean {
    const currentRoute = this.currentRoute$.value;
    //console.log("task-management", this.currentRoute.includes('task-management'));
    return currentRoute.includes('task-management');
  }

  isUserAccessActive(): boolean {
    const currentRoute = this.currentRoute$.value;
    //console.log("user", this.currentRoute.includes('user'));
    return (currentRoute.includes('user') || currentRoute.includes('role'));
  }

  isSystemSettingsActive(): boolean {
    const currentRoute = this.currentRoute$.value;
    return (currentRoute.includes('service') || currentRoute.includes('technical') || currentRoute.includes('hierarchy'));
  }

  toggleSubmenu1() {
    this.isUserAccessOpen = !this.isUserAccessOpen;
  }

  toggleSettingsMenu() {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  goToTab(tabName: string) {

    let nextTab = document.getElementById(tabName);
    if (nextTab) {
      (nextTab as HTMLAnchorElement).click();
    }
    // this.sharedDataService.setTab(tabIndex);
    // this.router.navigate([`/edit-new-hotel/${this.hotelId}`]); 
  }

  // Newly added
  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            id: this.hotelId
          }
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            this.status = this.customerdata.status;
            //console.log('Status:', this.status)
            //console.log(this.customerdata, "RESPDATA");
            //console.log(Array.isArray(this.customerdata));
            resolve();  // Resolve promise when data is set
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alerts.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alerts.error(err.error.message, this.options);
          } else {
            this.alerts.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }


}
