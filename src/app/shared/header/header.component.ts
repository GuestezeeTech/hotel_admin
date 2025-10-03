import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { LoaderService } from './../loader/loader.service';
import { Component, Input, OnInit } from '@angular/core';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { EventEmitter, Output } from '@angular/core';
import { filter } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { ProfileService } from '../../profile/profile.service';
import { CommonModule } from '@angular/common';
import { UserAccessService } from '../../user-access/user-access.service';
import { NotificationComponent } from '../../notification/notification.component';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { Alert } from 'bootstrap';
import { AlertsService } from '../alerts/alerts.service';
import { TechnicalInfoService } from '../../hotel-enrollment-tabview/technical-info/technical-info.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NotificationComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})

export class HeaderComponent implements OnInit {
  private currentRoute$ = new BehaviorSubject<string>('');
  @Input() selectedMenu: string = '';
  profile_image: string | null = null;
  profile_name: string | null = '';
  showAccount = false;
  showNotification = false;
  hotelId: number | null = null;
  customerType: any;
  customerdata: any;
  status !: string;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  // userName:string='';
  // Receives the list of notifications from AppComponent.
  @Input() notifications: any[] = [];
  @Output() close = new EventEmitter<void>();
  // Newly added for payment
  payNowButtonState = { show: false, enabled: false, installmentText: '' };


  constructor(
    private localService: LocalStorageService,
    private route: ActivatedRoute, private router: Router,
    private profileService: ProfileService,
    private userAccessService: UserAccessService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alerts: AlertsService,
    // Newly added for payment
    private paymentEventService: TechnicalInfoService
  ) {
    this.currentRoute$ = new BehaviorSubject<string>(this.router.url);
  }

  ngOnInit(): void {
    this.customerType = this.localService.get('CustomerType');
    console.log('Customer Type:', this.customerType);
    this.hotelId = Number(this.localService.get('UserId'));
    // Only call getCustomerById if both values exist
    if (this.customerType && this.hotelId) {
      this.getCustomerById();
    }
    this.profileService.getAdminProfileDetails(this.hotelId, this.customerType).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        const data = resp.result.data[0];
        const profileImage = data?.profile_image?.trim() || '../../assets/images/guestezee/profile.png';
        let profileName: string;
        if (this.customerType === 'Staff') {
          profileName = data?.full_name ? data?.full_name.trim() : data?.phone_number;
        } else {
          profileName = (data?.first_name || data?.last_name)
            ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
            : data?.phone_number;
        }
        // const profileName = data?.first_name || data?.last_name
        //   ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
        //   : data.phone_number;
        this.profileService.updateProfileImage(profileImage);
        this.profileService.updateProfileName(profileName);
      }
    });
    this.profileService.profileImage$.subscribe(imageUrl => {
      this.profile_image = imageUrl || '../../assets/images/guestezee/profile.png';
    });
    this.profileService.profileName$.subscribe(name => {
      this.profile_name = name;
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute$.next(event.urlAfterRedirects);
        //console.log("Current Route Updated:", event.urlAfterRedirects);
      });
    this.activeMenu;
    // Newly added for payment
    // Load persisted Pay Now button state
    const savedState = this.localService.get('payNowButtonState');
    if (savedState) {
      const state = JSON.parse(savedState);
      this.paymentEventService.updatePayNowButton(state.show, state.enabled, state.installmentText);
    }
    this.paymentEventService.payNowButton$.subscribe(state => {
      this.payNowButtonState = state;
    });
   console.log('this.payNowButtonState', this.payNowButtonState);
  }

  get activeMenu(): string {
    const currentRoute = this.currentRoute$.value;
    //console.log("payment", currentRoute.includes('payment'));
    if (currentRoute.includes('payment')) {
      return (this.selectedMenu = "Payment");
    }
    else if (currentRoute.includes('hotel')) {
      return (this.selectedMenu = "Hotel");
    }
    else if (currentRoute.includes('role')) {
      return (this.selectedMenu = "Roles");
    }
    else if (currentRoute.includes('user')) {
      return (this.selectedMenu = "Users");
    }
    else if (currentRoute.includes('dashboard')) {
      return (this.selectedMenu = "Dashboard");
    }
    else if (currentRoute.includes('report')) {
      return (this.selectedMenu = "Report");
    }
    else if (currentRoute.includes('task-management')) {
      return (this.selectedMenu = "Task Management");
    }
    else if (currentRoute.includes('form') || currentRoute.includes('view')) {
      return (this.selectedMenu = "Hierarchy");
    }
    else if (currentRoute.includes('service')) {
      return (this.selectedMenu = "Service Settings");
    }
    else if (currentRoute.includes('service')) {
      return (this.selectedMenu = "Service Settings");
    }
    else if (currentRoute.includes('technical')) {
      return (this.selectedMenu = "Technical Info");
    }
    else if (currentRoute.includes('profile')) {
      return (this.selectedMenu = "Profile");
    }
    else {
      return "set the name here";
    }
  }

  navigateToProfile() {
    this.showAccount = false;
    this.router.navigate(['/profile']);
  }

  logout() {
    this.localService.remove('accessToken');
    this.localService.remove('refreshToken');
    this.localService.remove('expireTime');
    this.localService.remove('UserName');
    this.localService.remove('UserEmail');
    this.localService.remove('UserId');
    this.localService.remove('domainName');
    this.localService.remove('rexpireTime');
    this.localService.remove('MemberId');
    this.localService.remove('CustomerType');
    this.localService.remove('guestData');
    this.localService.remove('maxTabReached');
    this.localService.remove('currentTab');
    this.localService.remove('StaffData');
    this.localService.remove('hierarchy');
    this.localService.remove('roleName');
    this.localService.remove('role_id');
    this.localService.remove('Password');
    this.localService.remove('db_schema');
    this.localService.remove('selectedSlots');
    this.localService.remove('baseStaffIds');
    this.localService.remove('allLowerStaffIds');
    this.localService.remove('roomRange');
    this.localService.remove('USERACCESS');
    this.router.navigate([''], { skipLocationChange: false });
    this.userAccessService.removeUserAccess();
  }

  toggleLogout() {
    this.showAccount = !this.showAccount;
  }

  toggleNotification() {
    this.showNotification = !this.showNotification;
  }

  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: this.customerType == 'Staff'
            ? { staff_id: this.hotelId }
            : { id: this.hotelId }
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

  // Newly added for payment
  onPayNowClick() {
    // Notify PaymentComponent to execute payNow
    this.paymentEventService.triggerPayNow();
  }
}

