import { PushService } from './../../services/push.service';
import { TaskManagementService } from './../../task-management/task-management.service';
import { NotificationService } from './../../notification/notification.service';
import { TechnicalInfoService } from './../../hotel-enrollment-tabview/technical-info/technical-info.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { CheckoutApiService } from '../../hotel-enrollment-tabview/checkout.service';
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
import { Modal } from 'bootstrap';
import { onMessage } from 'firebase/messaging';
import { HotelListService } from '../../hotel-list/hotel-list.service';
import { StaffListingService } from '../../user-access/staff-listing/staff-listing.service';
import { StaffService } from '../../user-access/staff/staff.service';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '../../services/permission.service';
declare var bootstrap: any;
import { ElementRef, ViewChild, HostListener } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';

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
  orderdata: any;
  paymentoptions = ['Quarterly Payment', 'Half-Yearly Payment', 'Full Payment'];
  selectedIndex: number = 2;
  paymentTypeModal: any;
  activeSubscription: any;
  upsertData: any;
  //  Newly added & commented for Payment modal 
  @ViewChild('paymentModal') paymentModal!: ElementRef;
  @ViewChild('accountDropdown', { static: false }) accountDropdown!: ElementRef;
  @ViewChild('accountToggle', { static: false }) accountToggle!: ElementRef;
  modalInstance: any;
  private audioUnlocked = false;

  constructor(
    private localService: LocalStorageService,
    private route: ActivatedRoute, private router: Router,
    private profileService: ProfileService,
    private userAccessService: UserAccessService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alerts: AlertsService,
    // Newly added for payment
    private paymentEventService: TechnicalInfoService,
    private notificationService: NotificationService,
    private hotellistService: HotelListService,
    private taskManagementService: TaskManagementService,
    private pushService: PushService,
    private staffService: StaffService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private cd: ChangeDetectorRef,
    public permissionService: PermissionService,
    private checkoutApiService: CheckoutApiService
  ) {
    this.currentRoute$ = new BehaviorSubject<string>(this.router.url);
  }

  async ngOnInit(): Promise<void> {
    this.customerType = this.localService.get('CustomerType');
    // console.log('Customer Type:', this.customerType);
    this.hotelId = Number(this.localService.get('UserId'));
    // Only call getCustomerById if both values exist
    if (this.customerType && this.hotelId) {
      this.getCustomerById();
    }
    //newly added - Query param listener for payment cancellation/confirmation route refresh
    this.route.queryParams.subscribe(params => {
      const customerIdFromUrl = params['customer_id'];
      if (customerIdFromUrl) {
        this.hotelId = Number(customerIdFromUrl);
        if (this.router.url.includes('cancellation') || this.router.url.includes('confirmation')) {
          this.refreshComponentLogic();
        }
      }
    });
    this.profileService.getAdminProfileDetails(this.hotelId, this.customerType).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        const data = resp.result.data[0];
        // const profileImage = data?.profile_image?.trim() || '../../assets/images/guestezee/profile.png';
        const profileImage = data?.profile_image?.trim() || 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp';
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
      // this.profile_image = imageUrl || '../../assets/images/guestezee/profile.png';
      this.profile_image = imageUrl || 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp';
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
    this.currentRoute$.next(this.router.url);//newly added
    this.cd.detectChanges();// newly added
    // Newly added for payment
    // For tracking pay now button state & values
    const savedState = this.localService.get('payNowButtonState');
    // console.log('Saved state:', savedState);
    if (savedState != null || savedState != undefined) {
      const state = JSON.parse(savedState);
      this.paymentEventService.updatePayNowButton(state.show, state.enabled, state.installmentText);
    }
    else {
      // fallback: call API to rebuild state
      // console.log('Fallback');
      await this.updateHeaderPayNowButton();
    }
    this.paymentEventService.payNowButton$.subscribe(state => {
      this.payNowButtonState = state;
    });
    // console.log('this.payNowButtonState', this.payNowButtonState);
    // Newly added & commented for Payment modal
    // For storing order data(for payment)
    // const modalEl = document.getElementById('paymentType');
    // if (modalEl) {
    //   this.paymentTypeModal = new Modal(modalEl, { backdrop: 'static' });
    // }
    // else {
    //   console.error('Modal element not found in DOM!');
    // }
    // Subscribe to notifications
    // ended
    // Notifications
    this.notificationService.notifications$.subscribe(list => this.notifications = this.groupNotifications(list));
    this.notificationService.showPanel$.subscribe(show => this.showNotification = show);
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
  }

  private groupNotifications(flatList: any[]): any[] {
    // console.log('Flat list of notifications:', flatList);
    // Optional: format time if needed
    return flatList
    // .map(n => ({
    //   ...n,
    //   timeFormatted: new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    // }));
  }


  get activeMenu(): string {
    const currentRoute = this.currentRoute$.value;
    // console.log("Report", currentRoute.includes('report'));
    if (currentRoute.includes('report')) {
      return (this.selectedMenu = "report");
    }
    else if (currentRoute.includes('payment')) {
      return (this.selectedMenu = "Payment");
    }
    //  else if (currentRoute.includes('hotel')) {
    //   return (this.selectedMenu = "Hotel");
    else if (currentRoute.includes('hotel') || currentRoute.includes('cancellation') || currentRoute.includes('confirmation')) {
      return (this.selectedMenu = "Hotels");
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
    else if (currentRoute.includes('service')) {
      return (this.selectedMenu = "Service Settings");
    }
    else if (currentRoute.includes('form') || currentRoute.includes('view')) {
      return (this.selectedMenu = "Hierarchy");
    }
    else if (currentRoute.includes('technical')) {
      return (this.selectedMenu = "Technical Info");
    }
    else if (currentRoute.includes('profile')) {
      return (this.selectedMenu = "Profile");
    }
    else if (currentRoute.includes('restaurants-list')) {
      return (this.selectedMenu = "Features");
    }
    else if (currentRoute.includes('bookings')) {
      return (this.selectedMenu = "Bookings");
    }
    else if (currentRoute.includes('payment-details')) {
      return (this.selectedMenu = "Payment Details");
    }
    else if (currentRoute.includes('settings')) {
      return (this.selectedMenu = "Settings");
    }
    else if (currentRoute.includes('privacy-policy')) {
      return (this.selectedMenu = "Privacy Policy");
    }
    else if (currentRoute.includes('terms-conditions')) {
      return (this.selectedMenu = "Terms and Conditions");
    }
    else if (currentRoute.includes('department')) {
      return (this.selectedMenu = "Department");
    }
    /*  else if (currentRoute.includes('service-tab')) {
       return (this.selectedMenu = "Service Tab");
     }
     else if (currentRoute.includes('service-list') || currentRoute.includes('add-new-service') || currentRoute.includes('edit-service') || currentRoute.includes('view-service')) {
       return (this.selectedMenu = "Service List");
     }
     else if (currentRoute.includes('service')) {
       return (this.selectedMenu = "Service");
     } */
    else if (currentRoute.includes('hierarchy')) {
      return (this.selectedMenu = "Hierarchy");
    }
    else if (currentRoute.includes('features') || currentRoute.includes('feature')) {
      return (this.selectedMenu = "Features");
    }
    else if (currentRoute.includes('task-management')) {
      return (this.selectedMenu = "Task Management");
    }
    else if (currentRoute.includes('outlet')) {
      return (this.selectedMenu = "Outlets");
    }
    else {
      // return "set the name here";
      return this.selectedMenu;
    }
  }

  navigateToProfile() {
    this.showAccount = false;
    this.router.navigate(['/profile']);
  }

  async logout() {
    try {
      const userId = Number(this.localService.get('UserId'));
      const customerType = this.localService.get('CustomerType');
      if (userId) {
        // Run FCM removal with a strict timeout (e.g. 1000ms) so it never blocks the logout
        await Promise.race([
          (async () => {
            const currentToken = await this.pushService.getCurrentToken();
            const customerFindKey = customerType === 'Staff' ? 'staff_id' : 'id';
            const customerFetchBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              extras: { find: { [customerFindKey]: userId } }
            };
            const customerResp: any = await this.hotellistService.getSignupAllCustomers(customerFetchBody).toPromise();
            if (customerResp.success === 1 && customerResp.result.data.length > 0) {
              const customer = customerResp.result.data[0];
              let hasTokenChanged = false;
              let updatedTokens = customer.fcm_token || [];
              if (currentToken && Array.isArray(customer.fcm_token)) {
                const initialLength = customer.fcm_token.length;
                updatedTokens = customer.fcm_token.filter((t: string) => t !== currentToken);
                if (updatedTokens.length !== initialLength) {
                  hasTokenChanged = true;
                }
              }
              const remainingCount = updatedTokens.length;
              const isAvailableValue = remainingCount >= 1;
              const isFcmUnavailable = this.localService.get('isFcmUnavailable') === 'true';
              const customerUpdatePayload: any = {
                fcm_token: updatedTokens
              };
              if (customerType === 'Staff' && !isFcmUnavailable) {
                customerUpdatePayload.is_available = isAvailableValue;
              }

              if (hasTokenChanged) {
                const updateBody = {
                  domain_name: DOMAIN_NAME,
                  user_id: USER_ID,
                  payload: { customer_update: customerUpdatePayload },
                  extras: { find: { [customerFindKey]: userId } }
                };
                await this.hotelenrollmenttabviewService.updateCustomerFcm(updateBody).toPromise();
              } else if (customerType === 'Staff' && !isFcmUnavailable) {
                // Token list did not change, but still sync is_available in case it drifted
                const availBody = {
                  domain_name: DOMAIN_NAME,
                  user_id: USER_ID,
                  payload: { customer_update: { is_available: isAvailableValue } },
                  extras: { find: { [customerFindKey]: userId } }
                };
                await this.hotelenrollmenttabviewService.updateCustomerFcm(availBody).toPromise();
              }
            }
            if (customerType === 'Staff') {
              const staffFetchBody = {
                domain_name: DOMAIN_NAME,
                user_id: USER_ID,
                extras: { find: { id: userId } }
              };
              const staffResp: any = await this.taskManagementService.getAllStaves(staffFetchBody).toPromise();
              if (staffResp.success === 1 && staffResp.result.data.length > 0) {
                const staff = staffResp.result.data[0];
                let hasTokenChanged = false;
                let updatedTokens = staff.fcm_token || [];
                if (currentToken && Array.isArray(staff.fcm_token)) {
                  const initialLength = staff.fcm_token.length;
                  updatedTokens = staff.fcm_token.filter((t: string) => t !== currentToken);
                  if (updatedTokens.length !== initialLength) {
                    hasTokenChanged = true;
                  }
                }
                // Combine fcm_token removal and is_available into ONE call to avoid out-of-order writes
                const isFcmUnavailable = this.localService.get('isFcmUnavailable') === 'true';
                const remainingCount = updatedTokens.length;
                const isAvailableValue = remainingCount >= 1;
                const staffUpdationPayload: any = {
                  fcm_token: updatedTokens
                };
                if (!isFcmUnavailable) {
                  staffUpdationPayload.is_available = isAvailableValue;
                }
                if (hasTokenChanged) {
                  const updateBody = {
                    domain_name: DOMAIN_NAME,
                    user_id: USER_ID,
                    payload: {
                      staff_updation: staffUpdationPayload
                    },
                    extras: { find: { id: userId } }
                  };
                  await this.staffService.updateStaff(updateBody).toPromise();
                } else if (!isFcmUnavailable) {
                  // Token list did not change, but still sync is_available in case it drifted
                  const availableUpdateBody = {
                    domain_name: DOMAIN_NAME,
                    user_id: USER_ID,
                    payload: { staff_updation: { is_available: isAvailableValue } },
                    extras: { find: { id: userId } }
                  };
                  await this.staffService.updateStaff(availableUpdateBody).toPromise();
                }
              }
            }
          })(),
          new Promise<void>((resolve) => setTimeout(resolve, 1000))
        ]);
      }
    } catch (err) {
      console.error('Error removing FCM token on logout:', err);
    }
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
    this.localService.remove('payNowButtonState');
    this.localService.remove('isFirstStaff');
    this.localService.remove('defaultHierarchy');
    // Newly commented because no need of fo desk 
    // this.localService.remove('frontOfficeDeskStaff');
    // End of newly commented code
    // Newly added for role
    this.localService.remove('Role');
    this.localService.remove('roleId');
    this.localService.remove('roleName');
    this.localService.remove('roleModules');
    this.localService.remove('outlet_id');
    this.localService.remove('profile_name');
    this.localService.remove('profile_image');
    this.localService.remove('Name');
    this.localService.remove('paymentDone');
    this.localService.remove('lastValidUrl');
    this.localService.remove('UserFcmTokens');
    this.localService.remove('isFcmUnavailable');
    sessionStorage.removeItem('CurrentTabFcmToken');
    this.localService.set('loggedOut', 'true');
    this.router.navigate([''], { skipLocationChange: false, replaceUrl: true });
    this.userAccessService.removeUserAccess();
  }

  toggleLogout(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.showAccount = !this.showAccount;
  }

  // Close account dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showAccount) {
      const target = event.target as HTMLElement;
      const clickedInsideDropdown = this.accountDropdown?.nativeElement?.contains(target);
      const clickedOnToggle = this.accountToggle?.nativeElement?.contains(target);

      if (!clickedInsideDropdown && !clickedOnToggle) {
        this.showAccount = false;
      }
    }
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

  // newly added
  refreshComponentLogic() {
    this.customerType = this.localService.get('CustomerType');
    const hotelId = Number(this.localService.get('UserId'));
    this.hotelId = hotelId;
    if (hotelId) {
      this.getCustomerById().then(() => {
        if (this.customerdata) {
          this.customerType = this.customerdata.staff_employee_number == undefined ? 'Customer' : 'Staff';
          this.localService.set('CustomerType', this.customerType);
          this.profileService.getAdminProfileDetails(hotelId, this.customerType).subscribe(resp => {
            if (resp.success === 1 && resp.status_code === 200) {
              const data = resp.result.data[0];
              const profileImage = data?.profile_image?.trim() || 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp';
              let profileName: string;
              if (this.customerType === 'Staff') {
                profileName = data?.full_name ? data?.full_name.trim() : data?.phone_number;
              } else {
                profileName = (data?.first_name || data?.last_name)
                  ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
                  : data?.phone_number;
              }
              this.profileService.updateProfileImage(profileImage);
              this.profileService.updateProfileName(profileName);
            }
          });
        }
      }).catch(err => {
        console.error('Error refreshing HeaderComponent details:', err);
      });
    }
  }

  // Newly added for payment
  async onPayNowClick() {
    await this.getLastestOrderOfCustomer();
    const allCycles = this.orderdata?.payment_split || [];
    const hasUnpaid = allCycles.some((cycle: any) =>
      cycle.installments.some((inst: any) => inst.status === "Not Paid")
    );
    if (hasUnpaid) {
      // Continue normal installment payment flow
      await this.payNow(null);
    } else {
      // All paid → open Payment Type modal
      this.openPaymentModal();
    }
  }

  selectOnlyOne(index: number) {
    this.selectedIndex = index;
  }

  async executePayment() {
    await this.payNow(this.selectedIndex);
    this.closeModal();
  }

  async getActiveSubscription(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const propertySize = this.customerdata?.property_details?.property_address?.property_size;
        const customerSub = this.customerdata?.subscription_detail;
        if (customerSub) {
          this.activeSubscription = customerSub;
          return resolve();
        }
        const reqBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: {
            find: {},
            pagination: true,
            paginationDetails: { limit: 0, pageSize: 100 },
            sorting: true,
            sortingDetails: { name: 1 }
          }
        };
        const generalResp: any = await new Promise((res, rej) => {
          this.hotelenrollmentservice.getAllSubscriptionDetails(reqBody).subscribe(
            result => res(result),
            error => rej(error)
          );
        });
        if (generalResp?.result?.data?.length) {
          const allSubs = generalResp.result.data;
          let matched = allSubs.find((sub: any) => sub.name === propertySize);
          if (!matched) {
            console.warn(`No plan found matching "${propertySize}". Using first plan as default.`);
            matched = allSubs[0];
          }
          this.activeSubscription = matched;
          resolve();
        } else {
          reject('No general subscription plans found.');
        }
      } catch (err) {
        console.error('Error in getActiveSubscription:', err);
        reject(err);
      }
    });
  }

  async payNow(selectedIndex: number | null) {
    if (selectedIndex !== null && selectedIndex !== undefined) {
      this.selectedIndex = selectedIndex;
    }
    await this.getCustomerById();
    await this.getLastestOrderOfCustomer();
    const lastOrder = this.orderdata || null;
    let payment_split: any[] = [];
    let paymentType = "";
    if (!lastOrder) {
      payment_split = [];
    } else {
      payment_split = lastOrder.payment_split.map((cycle: any) => ({ ...cycle }));
    }
    const allPaid = payment_split.length === 0 || payment_split.every(cycle =>
      cycle.installments.every((inst: any) => inst.status === "Paid")
    );
    if (allPaid) {
      await this.getActiveSubscription();
      const perRoomCost = Number(this.activeSubscription?.perRoomCost || 0);
      const discountType = (this.activeSubscription?.discountType || "").toLowerCase();
      const discountValue = Number(this.activeSubscription?.discountValue || 0);
      const numberOfRooms = Number(this.customerdata?.property_details?.property_address?.number_of_rooms || 0);
      let discountedCost = perRoomCost;
      if (discountType === "percentage") {
        discountedCost = perRoomCost - (perRoomCost * discountValue / 100);
      } else if (discountType === "flat") {
        discountedCost = perRoomCost - discountValue;
      }
      discountedCost = Number(discountedCost.toFixed(2));
      const gstPerRoom = Number((discountedCost * 0.18).toFixed(2));
      const yearlyCost = Number((discountedCost * numberOfRooms * 12).toFixed(2));
      const yearlyGst = Number((gstPerRoom * numberOfRooms * 12).toFixed(2));
      const totalYearlyAmount = Number((yearlyCost + yearlyGst).toFixed(2));
      let installments = 1;
      if (this.selectedIndex === 0) { paymentType = "quarterly"; installments = 4; }
      if (this.selectedIndex === 1) { paymentType = "half-yearly"; installments = 2; }
      if (this.selectedIndex === 2) { paymentType = "full"; installments = 1; }
      const subTotalPerInstallment = Number((yearlyCost / installments).toFixed(2));
      const taxPerInstallment = Number((yearlyGst / installments).toFixed(2));
      const totalPerInstallment = Number((subTotalPerInstallment + taxPerInstallment).toFixed(2));
      let baseDate = new Date();
      const installmentArr = [];
      for (let i = 0; i < installments; i++) {
        let tempDate = new Date(baseDate);
        if (paymentType === "quarterly") tempDate.setMonth(tempDate.getMonth() + (3 * (i + 1)));
        if (paymentType === "half-yearly") tempDate.setMonth(tempDate.getMonth() + (6 * (i + 1)));
        if (paymentType === "full") tempDate.setFullYear(tempDate.getFullYear() + 1);
        const subscription_end_date = `${String(tempDate.getDate()).padStart(2, '0')}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${tempDate.getFullYear()}`;
        installmentArr.push({
          status: "Not Paid",
          sub_total: subTotalPerInstallment,
          tax: taxPerInstallment,
          order_total_amount: totalPerInstallment,
          subscription_end_date
        });
      }
      payment_split.push({
        name: paymentType,
        installments: installmentArr
      });
    } else {
      const nextUnpaidCycleIndex = payment_split.findIndex(cycle =>
        cycle.installments.some((inst: any) => inst.status === "Not Paid")
      );
      if (nextUnpaidCycleIndex === -1) {
        return;
      }
      paymentType = payment_split[nextUnpaidCycleIndex].name;
    }
    let nextUnpaid;
    for (let cycle of payment_split) {
      nextUnpaid = cycle.installments.find((inst: any) => inst.status === "Not Paid");
      if (nextUnpaid) break;
    }
    if (!nextUnpaid) {
      return;
    }
    const order_review = {
      order_summary: {
        sub_total: Number(nextUnpaid.sub_total.toFixed(2)),
        tax: Number(nextUnpaid.tax.toFixed(2)),
        order_total_amount: Number(nextUnpaid.order_total_amount.toFixed(2))
      }
    };
    const isIndia = this.customerdata?.property_details?.property_address?.property_country === 'India';
    const taxInfo = isIndia
      ? { gst_number: this.customerdata?.property_details?.property_address?.property_gst || "" }
      : { vat_number: this.customerdata?.property_details?.property_address?.property_vat || "" };

    const orderData = {
      customer_id: this.customerdata?.id,
      status: "Awaiting Payment",
      status_id: "1",
      system_label: "Pending",
      orderConfirmDate: new Date(),
      subscription_end_date: nextUnpaid.subscription_end_date,
      customer: {
        customer_id: this.customerdata?.id,
        customer_name: this.customerdata?.first_name,
        email: this.customerdata?.email,
        customer_type: "business customer",
        phone_number: this.customerdata?.phone_number,
        address: this.customerdata?.property_details?.property_address?.property_address,
        brand: this.customerdata?.property_details?.contact_details?.brand,
        hotel_name: this.customerdata?.property_details?.contact_details?.hotel_name,
        property_size: this.customerdata?.property_details?.property_address?.property_size,
        number_of_rooms: this.customerdata?.property_details?.property_address?.number_of_rooms,
        is_email_opt_in: false
      },
      "shipping": {
        "shipping_address_count": "",
        "fixed_shippping_price": false,
        "pay_to_logistics": "",
        "free_shipping": false,
        "shipped_date": "",
        "items_total": "",
        "items_shipped": "",
        "items_total_quantity": "",
        "shipping_addresses": [
          {
            "customer_id": this.customerdata?.id,
            "alias": "",
            "first_name": this.customerdata?.first_name,
            ...taxInfo,
            "last_name": "",
            "company_name": "",
            "entire_location": this.customerdata?.email,
            "address1": this.customerdata?.property_details?.property_address?.property_address,
            "landmark": "",
            "city": "",
            "state": "",
            "country": "",
            "country_code": "104",
            "zipcode": "",
            "email": "",
            "phone_number": "",
            "is_preferred_address": false,
            "address_type": "",
            "latitude": "",
            "longitude": ""
          }
        ],
        "delivery_instructions": "",
        "shipping_method": {
          "name": "",
          "delivery_charge": 0,
          "pay_to_logistics": 0,
          "total_shipping_price": 0
        },
        "shipping_carrier": {
          "shipping_carrier_id": "",
          "shipping_carrier_name": "",
          "api_integration_id": "",
          "api_integration_name": ""
        },
        "deliveries": [],
        "geo_info": {},
        "customer_comment": "",
        "notes": ""
      },
      "payment": {
        "status_flow": {
          "name": "Online Payment",
          "title": "Order - Online Payment",
          "statuses": [
            {
              "name": "",
              "title": "",
              "status_id": 1,
              "status_name": "Pending",
              "status_system_label": "Pending",
              "status_custom_label": "Order Placed",
              "process": "Checkout",
              "sequence": 1,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 2,
              "status_name": "Awaiting Payment",
              "status_system_label": "Awaiting Payment",
              "status_custom_label": "Awaiting Payment",
              "process": "Checkout",
              "sequence": 2,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 3,
              "status_name": "Confirmed",
              "status_system_label": "Confirmed",
              "status_custom_label": "Order Confirmed",
              "process": "Checkout",
              "sequence": 3,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": true
            },
            {
              "name": "",
              "title": "",
              "status_id": 4,
              "status_name": "Processing",
              "status_system_label": "Processing",
              "status_custom_label": "Being Prepared",
              "process": "Manual",
              "sequence": 4,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 5,
              "status_name": "Awaiting Shipment",
              "status_system_label": "Awaiting Shipment",
              "status_custom_label": "Ready for Delivery",
              "process": "Manual",
              "sequence": 5,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 6,
              "status_name": "Shipped",
              "status_system_label": "Shipped",
              "status_custom_label": "Out for Delivery",
              "process": "Manual/API",
              "sequence": 6,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 7,
              "status_name": "Delivered",
              "status_system_label": "Delivered",
              "status_custom_label": "Delivered",
              "process": "Manual/API",
              "sequence": 7,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 8,
              "status_name": "Cancelled",
              "status_system_label": "Cancelled",
              "status_custom_label": "Cancelled",
              "process": "Manual/API",
              "sequence": 8,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": false
            }
          ]
        },
        "payment_date": "",
        "payment_reference_no": "",
        "payment_status": ""
      },
      "delivery": {
        "outlet_id": "1",
        "outlet_name": "guest ezee",
        "email": this.customerdata?.property_details?.contact_details?.email,
        "phone_number": this.customerdata?.property_details?.contact_details?.primary_phone_number,
        "address": this.customerdata?.property_details?.property_address?.property_address,
        "is_email_opt_in": false
      },
      payment_type: paymentType,
      payment_split,
      order_review,
      customer_member_id: this.customerdata?.customer_member_id,
      organization_id: 46,
      store_id: 1,
      created_by: this.localService.get('UserId'),
      is_deleted: false,
      is_active: true,
      modified_by: 16,
      is_registration: true,
      send_sms: true
    };
    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { order_creation: orderData },
      extras: { find: { id: "" } }
    };
    this.hotelenrollmentservice.orderUpsert(requestData).subscribe(resp => {
      if (!resp.success) return console.error("Order creation failed");
      this.upsertData = resp.result.data;
      const hdfcData = {
        domain_name: DOMAIN_NAME,
        oid: this.upsertData[0].id,
        amount: nextUnpaid.order_total_amount
      };
      this.checkoutApiService.getHDFClink(hdfcData).then(responseData3 => {
        let respData3: any = responseData3;
        if (!respData3) return console.error("Payment link generation failed");
        const form = document.createElement("form");
        form.method = "POST";
        form.action = respData3.link;
        form.target = "_self";
        const input1 = document.createElement("input");
        input1.name = "encRequest";
        input1.value = respData3.encrequest;
        form.appendChild(input1);
        const input2 = document.createElement("input");
        input2.name = "access_code";
        input2.value = respData3.accesscode;
        form.appendChild(input2);
        document.body.appendChild(form);
        form.submit();
      });
    });
  }

  getLastestOrderOfCustomer(): Promise<any> {
    // console.log('Fetching last order of customer...');
    return new Promise((resolve, reject) => {
      const req = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            // customer_id: this.hotelId
            "customer_member_id": this.localService.get('MemberId')
          }
        }
      };
      // console.log(req);
      this.hotelenrollmentservice.orderDetailsGetById(req).subscribe({
        next: (res: any) => {
          // this.orderdata = res?.result?.data?.[0] || null;
          // console.log('Latest order data of customer:', this.orderdata);
          // resolve(this.orderdata);
          const orders = res?.result?.data || [];
          // console.log('All customer orders:', orders);
          // Filter only confirmed orders
          const confirmedOrders = orders.filter((order: any) => order.status === 'Order Confirmed');
          // Sort by creation date (descending) to get the most recent one
          const sortedConfirmed = confirmedOrders.sort((a: any, b: any) => {
            const dateA = new Date(a.created_on);
            const dateB = new Date(b.created_on);
            return dateB.getTime() - dateA.getTime(); // latest first
          });
          // Take the latest confirmed order (if any)
          this.orderdata = sortedConfirmed.length > 0 ? sortedConfirmed[0] : null;
          // console.log('Latest confirmed order of customer:', this.orderdata);
          resolve(this.orderdata);
        },
        error: (err: any) => {
          console.error('Error fetching last order:', err);
          reject(err);
        }
      });
    });
  }

  // async updateHeaderPayNowButton() {
  //   await this.getLastestOrderOfCustomer();
  //   if (!this.orderdata || !this.orderdata.payment_split) {
  //     this.paymentEventService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   const allCycles: any[] = this.orderdata.payment_split;
  //   // Find first cycle with unpaid installments
  //   const nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
  //     cycle.installments.some((inst: any) => inst.status === "Not Paid")
  //   );
  //   console.log('nextUnpaidCycleIndex', nextUnpaidCycleIndex);
  //   if (nextUnpaidCycleIndex === -1) {
  //     // All installments are paid
  //     this.paymentEventService.updatePayNowButton(false, false);
  //     this.localService.remove('payNowButtonState');
  //     return;
  //   }
  //   const nextCycle = allCycles[nextUnpaidCycleIndex];
  //   console.log('nextCycle', nextCycle);
  //   const nextUnpaidIndex = nextCycle.installments.findIndex(
  //     (inst: any) => inst.status === "Not Paid"
  //   );
  //   console.log('nextUnpaidIndex', nextUnpaidIndex);
  //   const totalInstallments = nextCycle.installments.length;
  //   console.log('totalInstallments', totalInstallments);
  //   if (nextUnpaidIndex <= 0) {
  //     // First installment not payable yet
  //     this.paymentEventService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   // Enable button only 1 week before prev installment expiry
  //   const prevInstallment = nextCycle.installments[nextUnpaidIndex - 1];
  //   const [day, month, year] = prevInstallment.subscription_end_date.split('-').map(Number);
  //   const subEndDate = new Date(year, month - 1, day);
  //   const today = new Date();
  //   // const enableDate = new Date(subEndDate);
  //   // enableDate.setDate(enableDate.getDate() - 7); // 7 days before due date
  //   const enableDate = new Date(2025, 9, 3);
  //   console.log('enableDate', enableDate);
  //   const showButton = true;
  //   const enabled = today >= enableDate;
  //   // Add cycle name for clarity
  //   const cycleName = nextCycle.name
  //     ? this.capitalizeFirstLetter(nextCycle.name)
  //     : 'Installment';
  //   const installmentText = `${cycleName} - Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
  //   console.log('installmentText', installmentText);
  //   // Save to localStorage (optional cache)
  //   const buttonState = { show: showButton, enabled, installmentText };
  //   this.localService.set('payNowButtonState', JSON.stringify(buttonState));
  //   console.log('payNowButtonState', buttonState);
  //   // update service (header binding)
  //   this.paymentEventService.updatePayNowButton(showButton, enabled, installmentText);
  // }

  // async updateHeaderPayNowButton() {
  //   await this.getLastestOrderOfCustomer();
  //   if (!this.orderdata || !this.orderdata.payment_split) {
  //     this.paymentEventService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   const allCycles: any[] = this.orderdata.payment_split;
  //   // Find first unpaid cycle
  //   let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
  //     cycle.installments.some((inst: any) => inst.status === "Not Paid")
  //   );
  //   console.log('nextUnpaidCycleIndex', nextUnpaidCycleIndex);
  //   // CASE 1: All installments paid — allow new payment cycle creation
  //   if (nextUnpaidCycleIndex === -1) {
  //     const showButton = true;
  //     const enabled = true;
  //     const installmentText = "Start New Payment Cycle";
  //     this.localService.set('payNowButtonState', JSON.stringify({ show: showButton, enabled, installmentText }));
  //     this.paymentEventService.updatePayNowButton(showButton, enabled, installmentText);
  //     console.log("All installments paid. Showing 'Start New Payment Cycle' button.");
  //     return;
  //   }
  //   // CASE 2: Some installments unpaid — continue normal flow
  //   const nextCycle = allCycles[nextUnpaidCycleIndex];
  //   console.log('nextCycle', nextCycle);
  //   const nextUnpaidIndex = nextCycle.installments.findIndex(
  //     (inst: any) => inst.status === "Not Paid"
  //   );
  //   console.log('nextUnpaidIndex', nextUnpaidIndex);
  //   const totalInstallments = nextCycle.installments.length;
  //   console.log('totalInstallments', totalInstallments);
  //   if (nextUnpaidIndex <= 0) {
  //     this.paymentEventService.updatePayNowButton(false, false);
  //     return;
  //   }
  //   // Enable button 1 week before previous installment end date
  //   const prevInstallment = nextCycle.installments[nextUnpaidIndex - 1];
  //   const [day, month, year] = prevInstallment.subscription_end_date.split('-').map(Number);
  //   const subEndDate = new Date(year, month - 1, day);
  //   const today = new Date();
  //   const enableDate = new Date(subEndDate);
  //   enableDate.setDate(enableDate.getDate() - 7); // 7 days before due date
  //   // const enableDate = new Date(2025, 9, 3);
  //   console.log('enableDate', enableDate);
  //   const showButton = true;
  //   const enabled = today >= enableDate;
  //   const cycleName = nextCycle.name
  //     ? this.capitalizeFirstLetter(nextCycle.name)
  //     : 'Installment';
  //   const installmentText = `${cycleName} - Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
  //   const buttonState = { show: showButton, enabled, installmentText };
  //   this.localService.set('payNowButtonState', JSON.stringify(buttonState));
  //   this.paymentEventService.updatePayNowButton(showButton, enabled, installmentText);
  //   console.log('Pay Now Button:', buttonState);
  // }

  async updateHeaderPayNowButton() {
    await this.getLastestOrderOfCustomer();
    // console.log('Updating Pay Now button with order data:', this.orderdata);
    if (!this.orderdata || !this.orderdata.payment_split) {
      this.paymentEventService.updatePayNowButton(false, false);
      return;
    }
    const allCycles: any[] = this.orderdata.payment_split;
    // console.log('All Cycles:', allCycles);
    // Find first unpaid cycle
    let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
      cycle.installments.some((inst: any) => inst.status === "Not Paid")
    );
    // console.log('Next Unpaid Cycle Index', nextUnpaidCycleIndex);
    let lastRelevantInstallment: any;
    if (nextUnpaidCycleIndex === -1) {
      // console.log('All Installments Paid');
      // CASE: All installments paid
      // Pick the last paid installment
      const lastCycle = allCycles[allCycles.length - 1];
      lastRelevantInstallment = lastCycle.installments[lastCycle.installments.length - 1];
    } else {
      // console.log('Some Installments Unpaid');
      // CASE: Some unpaid installments
      const nextCycle = allCycles[nextUnpaidCycleIndex];
      // console.log('Next Unpaid Cycle:', nextCycle);
      const nextUnpaidIndex = nextCycle.installments.findIndex((inst: any) => inst.status === "Not Paid");
      // console.log('Next Unpaid Index', nextUnpaidIndex);
      lastRelevantInstallment = nextUnpaidIndex > 0
        ? nextCycle.installments[nextUnpaidIndex - 1]
        : null;
      // console.log('Last Relevant Installment (for enable date)', lastRelevantInstallment);
    }
    if (!lastRelevantInstallment) {
      this.paymentEventService.updatePayNowButton(false, false);
      return;
    }
    // console.log('lastRelevantInstallment', lastRelevantInstallment);
    // Enable button 7 days before subscription_end_date of lastRelevantInstallment
    const [day, month, year] = lastRelevantInstallment.subscription_end_date.split('-').map(Number);
    // console.log('day, month, year', day, month, year);
    const subEndDate = new Date(year, month - 1, day);
    // console.log('Sub end Date', subEndDate);
    const enableDate = new Date(subEndDate);
    // console.log('enableDate before format', enableDate);
    enableDate.setDate(enableDate.getDate() - 7);
    const today = new Date();
    // console.log('enableDate due date', enableDate);
    const enabled = today >= enableDate;
    // console.log('Enable date', enabled);
    // Prepare button text
    let installmentText = 'Start New Payment Cycle';
    if (nextUnpaidCycleIndex !== -1) {
      const totalInstallments = allCycles[nextUnpaidCycleIndex].installments.length;
      const nextUnpaidIndex = allCycles[nextUnpaidCycleIndex].installments.findIndex((inst: any) => inst.status === "Not Paid");
      const cycleName = allCycles[nextUnpaidCycleIndex].name || 'Installment';
      installmentText = `${this.capitalizeFirstLetter(cycleName)} - Installment ${nextUnpaidIndex + 1} of ${totalInstallments}`;
    }
    const showButton = true;
    this.localService.set('payNowButtonState', JSON.stringify({ show: showButton, enabled, installmentText }));
    this.paymentEventService.updatePayNowButton(showButton, enabled, installmentText);
    // console.log('Pay Now Button:', { showButton, enabled, installmentText });
  }

  capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private groupNotificationsByDay(flatList: any[]): any[] {
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
    const todayGroup = { day: 'Today', list: [] as any[] };
    const yesterdayGroup = { day: 'Yesterday', list: [] as any[] };
    const olderGroup = { day: 'Earlier', list: [] as any[] };
    // console.log('Flat list of notifications:', flatList);
    flatList.forEach((n: any) => {
      const notifDate = new Date(n.time).toDateString();
      if (notifDate === todayStr) todayGroup.list.push(n);
      else if (notifDate === yesterdayStr) yesterdayGroup.list.push(n);
      else olderGroup.list.push(n);
    });

    const grouped: any[] = [];
    if (todayGroup.list.length) grouped.push(todayGroup);
    if (yesterdayGroup.list.length) grouped.push(yesterdayGroup);
    if (olderGroup.list.length) grouped.push(olderGroup);

    return grouped;
  }

  // Newly added & commented for Payment modal
  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.paymentModal.nativeElement);
  }

  // openPaymentModal() {
  //   console.log('Opening payment type modal...');
  //   this.paymentTypeModal?.show();
  // }

  openPaymentModal() {
    // console.log('Opening payment type modal...');
    this.modalInstance.show();
  }

  closeModal() {
    // console.log('Close button clicked');  // Will now work
    this.modalInstance.hide();
  }

}


