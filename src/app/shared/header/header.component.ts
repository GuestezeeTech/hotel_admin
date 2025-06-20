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

  constructor(
    private localService: LocalStorageService,
    private route: ActivatedRoute, private router: Router,
    private profileService: ProfileService,
    private userAccessService: UserAccessService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alerts: AlertsService
  ) {
    this.currentRoute$ = new BehaviorSubject<string>(this.router.url); // ✅
  }

  ngOnInit(): void {
    this.hotelId = Number(this.localService.get('UserId'));
    this.profileService.getAdminProfileDetails(this.hotelId).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        const data = resp.result.data[0];
        const profileImage = data?.profile_image?.trim() || '../../assets/images/guestezee/profile.png';
        const profileName = data?.first_name || data?.last_name
          ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
          : data.phone_number;
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
    this.getCustomerById();
    this.customerType = this.localService.get('CustomerType');
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

