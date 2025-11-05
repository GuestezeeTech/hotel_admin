import { PushService } from './../../services/push.service';
import { TaskManagementService } from './../../task-management/task-management.service';
import { NotificationService } from './../../notification/notification.service';
import { TechnicalInfoService } from './../../hotel-enrollment-tabview/technical-info/technical-info.service';
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
import { Modal } from 'bootstrap';
import { onMessage } from 'firebase/messaging';
import { HotelListService } from '../../hotel-list/hotel-list.service';
import { StaffListingService } from '../../user-access/staff-listing/staff-listing.service';
import { StaffService } from '../../user-access/staff/staff.service';
import { firstValueFrom } from 'rxjs';
declare var bootstrap: any;
import { ElementRef, ViewChild } from '@angular/core';

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
  //  Newly added & commented for Payment modal 
  @ViewChild('paymentModal') paymentModal!: ElementRef;
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
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService
  ) {
    this.currentRoute$ = new BehaviorSubject<string>(this.router.url);
  }

  async ngOnInit(): Promise<void> {
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
    // For tracking pay now button state & values
    const savedState = this.localService.get('payNowButtonState');
    console.log('Saved state:', savedState);
    if (savedState != null || savedState != undefined) {
      const state = JSON.parse(savedState);
      this.paymentEventService.updatePayNowButton(state.show, state.enabled, state.installmentText);
    }
    else {
      // fallback: call API to rebuild state
      console.log('Fallback');
      await this.updateHeaderPayNowButton();
    }
    this.paymentEventService.payNowButton$.subscribe(state => {
      this.payNowButtonState = state;
    });
    console.log('this.payNowButtonState', this.payNowButtonState);
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
      console.log('[App] Attempting to unlock audio...');
      if (!this.audioUnlocked) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
          this.audioUnlocked = true;
          console.log('[App] Audio unlocked for notifications');
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
    console.log('Flat list of notifications:', flatList);
    // Optional: format time if needed
    return flatList
    // .map(n => ({
    //   ...n,
    //   timeFormatted: new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    // }));
  }


  get activeMenu(): string {
    const currentRoute = this.currentRoute$.value;
    console.log("Report", currentRoute.includes('report'));
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

  async logout() {
    try {
      const userId = Number(this.localService.get('UserId'));
      const customerType = this.localService.get('CustomerType');
      console.log('Logging out userId:', userId, 'customerType:', customerType);
      if (!userId) return;
      const currentToken = await this.pushService.getCurrentToken();
      console.log('Current FCM token to remove:', currentToken);
      // Prepare Customer fetch body dynamically based on user type
      const customerFindKey = customerType === 'Staff' ? 'staff_id' : 'id';
      const customerFetchBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { [customerFindKey]: userId } }
      };
      // Remove FCM token from Customer table
      const customerResp: any = await this.hotellistService.getSignupAllCustomers(customerFetchBody).toPromise();
      if (customerResp.success === 1 && customerResp.result.data.length > 0) {
        const customer = customerResp.result.data[0];
        console.log('Fetched customer for FCM removal:', customer);
        if (Array.isArray(customer.fcm_token)) {
          customer.fcm_token = customer.fcm_token.filter((t: string) => t !== currentToken);
          const updateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { customer_update: { fcm_token: customer.fcm_token } },
            extras: { find: { [customerFindKey]: userId } }
          };
          await this.hotelenrollmenttabviewService.updateCustomerFcm(updateBody).toPromise();
          console.log('FCM token removed for customer:', currentToken);
        }
      }
      // Remove FCM token from Staff table only if user is Staff
      if (customerType === 'Staff') {
        const staffFetchBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: { find: { id: userId } }
        };
        const staffResp: any = await this.taskManagementService.getAllStaves(staffFetchBody).toPromise();
        if (staffResp.success === 1 && staffResp.result.data.length > 0) {
          const staff = staffResp.result.data[0];
          console.log('Fetched staff for FCM removal:', staff);
          if (Array.isArray(staff.fcm_token)) {
            staff.fcm_token = staff.fcm_token.filter((t: string) => t !== currentToken);
            const updateBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: { staff_updation: { fcm_token: staff.fcm_token } },
              extras: { find: { id: userId } }
            };
            await this.staffService.updateStaff(updateBody).toPromise();
            console.log('FCM token removed for staff:', currentToken);
          }
        }
      }
      // await this.pushService.deleteCurrentToken();
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
  async onPayNowClick() {
    // Notify PaymentComponent to execute payNow
    // this.paymentEventService.triggerPayNow();
    await this.getLastestOrderOfCustomer();
    const allCycles = this.orderdata?.payment_split || [];
    const hasUnpaid = allCycles.some((cycle: any) =>
      cycle.installments.some((inst: any) => inst.status === "Not Paid")
    );
    if (hasUnpaid) {
      // Continue normal installment payment flow
      console.log("Proceeding with existing installment payment...");
      this.paymentEventService.triggerPayNow(null);
    } else {
      // All paid → open Payment Type modal
      console.log("All installments paid → opening modal for new payment type");
      // this.paymentEventService.openModal();
      this.openPaymentModal();
    }
  }

  selectOnlyOne(index: number) {
    this.selectedIndex = index;
  }

  executePayment() {
    console.log('Executing payment with index:', this.selectedIndex);
    this.paymentEventService.triggerPayNow(this.selectedIndex);
    this.paymentTypeModal?.hide();
  }

  getLastestOrderOfCustomer(): Promise<any> {
    console.log('Fetching last order of customer...');
    return new Promise((resolve, reject) => {
      const req = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { customer_id: this.hotelId }
        }
      };
      console.log(req);
      this.hotelenrollmentservice.orderDetailsGetById(req).subscribe({
        next: (res: any) => {
          // this.orderdata = res?.result?.data?.[0] || null;
          // console.log('Latest order data of customer:', this.orderdata);
          // resolve(this.orderdata);
          const orders = res?.result?.data || [];
          console.log('All customer orders:', orders);
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
          console.log('Latest confirmed order of customer:', this.orderdata);
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
    if (!this.orderdata || !this.orderdata.payment_split) {
      this.paymentEventService.updatePayNowButton(false, false);
      return;
    }
    const allCycles: any[] = this.orderdata.payment_split;
    // Find first unpaid cycle
    let nextUnpaidCycleIndex = allCycles.findIndex(cycle =>
      cycle.installments.some((inst: any) => inst.status === "Not Paid")
    );
    console.log('Next Unpaid Cycle Index', nextUnpaidCycleIndex);
    let lastRelevantInstallment: any;
    if (nextUnpaidCycleIndex === -1) {
      console.log('All Installments Paid');
      // CASE: All installments paid
      // Pick the last paid installment
      const lastCycle = allCycles[allCycles.length - 1];
      lastRelevantInstallment = lastCycle.installments[lastCycle.installments.length - 1];
    } else {
      console.log('Some Installments Unpaid');
      // CASE: Some unpaid installments
      const nextCycle = allCycles[nextUnpaidCycleIndex];
      const nextUnpaidIndex = nextCycle.installments.findIndex((inst: any) => inst.status === "Not Paid");
      lastRelevantInstallment = nextUnpaidIndex > 0
        ? nextCycle.installments[nextUnpaidIndex - 1]
        : null;
    }
    if (!lastRelevantInstallment) {
      this.paymentEventService.updatePayNowButton(false, false);
      return;
    }
    console.log('lastRelevantInstallment', lastRelevantInstallment);
    // Enable button 7 days before subscription_end_date of lastRelevantInstallment
    const [day, month, year] = lastRelevantInstallment.subscription_end_date.split('-').map(Number);
    console.log('day, month, year', day, month, year);
    const subEndDate = new Date(year, month - 1, day);
    console.log('Sub end Date', subEndDate);
    const enableDate = new Date(subEndDate);
    console.log('enableDate before format', enableDate);
    enableDate.setDate(enableDate.getDate() - 7);
    const today = new Date();
    console.log('enableDate due date', enableDate);
    const enabled = today >= enableDate;
    console.log('Enable date', enabled);
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
    console.log('Pay Now Button:', { showButton, enabled, installmentText });
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
    console.log('Flat list of notifications:', flatList);
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
    console.log('Opening payment type modal...');
    this.modalInstance.show();
  }

  closeModal() {
    console.log('Close button clicked');  // Will now work
    this.modalInstance.hide();
  }

}


