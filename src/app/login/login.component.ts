import { RoleListingService } from './../user-access/role-listing/role-listing.service';
import { NotificationService } from './../notification/notification.service';
import { TaskManagementService } from './../task-management/task-management.service';
import { TaskManagementComponent } from './../task-management/task-management.component';
import { USER_ID, DOMAIN_NAME } from './../app.config';
import { ChangeDetectorRef, Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, UntypedFormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AlertsService } from '../shared/alerts/alerts.service';
import { PlatformLocation } from '@angular/common';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { LoaderService } from '../shared/loader/loader.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ENDPOINTS } from '../app.config';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { SharedDataService } from '../shared/shared-data.service';
import { UserAccessService } from '../user-access/user-access.service';
import { ProfileService } from '../profile/profile.service';
// Newly added 
import { CustomValidators } from '../hotel-enrollment-tabview/validators'; //Signup phone number validation logic
import { HotelListService } from '../hotel-list/hotel-list.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { LoginService } from './login.service';
import { ServiceDetailService } from '../hotel-enrollment-tabview/service-details/service-details.service';
import { HierarchyDetailService } from '../hotel-enrollment-tabview/hierarchy-details/hierarchy-details.service';
import { TechnicalInfoService } from '../hotel-enrollment-tabview/technical-info/technical-info.service';
import { PushService } from '../services/push.service';
import { StaffService } from '../user-access/staff/staff.service';
import { Observable } from 'rxjs';
import { RoleService } from '../user-access/role/role.service';
import { PaymentHelperService } from '../services/payment-helper.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent]  // Add CommonModule here
})

export class LoginComponent implements OnInit {
  showalertmsg: boolean = false;
  validateForm: Boolean = false;
  dbSchema: any;
  passwordVisible: boolean = false;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  // Newly added 
  // Login & Signup initial state
  login: Boolean = true;
  loginForm: FormGroup = new FormGroup({});
  signup: Boolean = false;
  signupForm: FormGroup = new FormGroup({});
  otpArray = Array.from({ length: 5 }, (_, i) => i);
  otp: Boolean = false;
  otpForm: FormGroup = new FormGroup({});
  password: Boolean = false;
  passwordForm !: FormGroup;
  showNewPswd: Boolean = false;
  showconfirmPswd: Boolean = false;
  validatePasswordForm: Boolean = false;
  customerList: any[] = []; // Initialize customerList as an empty array
  email: any;
  phoneNumber: any;
  passwordData: any;
  customerdata: any;
  forgotPassword: boolean = false;
  isLoggingIn: boolean = false;
  forgot_phone_number: any;
  mail: any;
  reference_id: any;
  hotelId: any;
  orderdata: any;
  loginData: any;
  servicedata: any = {};
  servicedatalength: any = {};
  checkExistingServiceChoosen!: Number;
  isHierarchyExist: any;
  technicalInfodata: any;
  technicalInfodatalength: any;
  checkExistingTechnicalInfoChoosen!: Number;
  token !: any;
  // isStaffLogin: Boolean = false;
  navigatingValue: any = '';
  hasEmailAndPhone: boolean = false;
  loginErrorMessage: any;
  showDeactivatedModal: boolean = false;
  isHotelOwnerLogin: boolean = false;
  isHotelOwner: boolean = false;
  showPaymentOptions: boolean = false;
  paymentOptions = ['Quarterly Payment', 'Half-Yearly Payment', 'Full Payment'];
  selectedIndex = 2;
  deactivatedUserData: any = null;
  // Newly added for is_active check purpose
  showInactiveUserModal: boolean = false;
  inactiveUserModalMessage: string = '';
  // End of newly added for is_active check purpose

  constructor(private fb: FormBuilder, private alertService: AlertsService,
    private appService: LoginService,
    private authService: AuthTokenService,
    public localService: LocalStorageService,
    private loaderService: LoaderService,
    private router: Router,
    private userAccessService: UserAccessService,
    private profileService: ProfileService,
    // Newly added 
    private authTokenService: AuthTokenService,
    private hotellistService: HotelListService,
    private loginService: LoginService,
    private localStorageService: LocalStorageService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private serviceDetails: ServiceDetailService,
    private hierarchyService: HierarchyDetailService,
    private technicalInfoService: TechnicalInfoService,
    private pushService: PushService,
    private taskManagementService: TaskManagementService,
    private staffService: StaffService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private roleListingService: RoleListingService,
    private roleService: RoleService,
    private paymentHelperService: PaymentHelperService
  ) { }

  @HostListener('window:popstate', ['$event'])
  onBrowserBack(event: any) {
    if (this.otp || this.signup || this.password) {
      this.otp = false;
      this.login = true;
      this.forgotPassword = false;
      this.signup = false;
      this.password = false;
    }

    if (this.localStorageService.get('loggedOut') === 'true') {
      // Re-push the current URL to history to keep the user trapped on the login page
      window.history.pushState(null, '', window.location.href);
    }
  }

  ngOnInit(): void {

    //    if (this.authService.isLoggedIn()) {
    //   this.router.navigate(['/dashboard']);
    // }
    // this.getAllCustomers();
    // Initialize the login form with validation rules
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // Email field with validation
      password: ['', [Validators.required, Validators.minLength(6)]] // Password field with validation
    });
    // Newly added 
    // Initialize the signup form with validation rules 
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // Email field with validation
      phone_number: ['', [Validators.required, CustomValidators.phoneValidator]], // Phone number field with validation
    });
    // Define controls using FormBuilder.group()
    const group: { [key: string]: any } = {};
    for (let i = 0; i < 5; i++) {
      // group['otp' + i] = [''];
      group['otp' + i] = ['', Validators.required];
    }
    // Assign the group to the form
    this.otpForm = this.fb.group(group);
    this.passwordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
      confirm_password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]]
    });
    this.checkIfHierarchyExists();
    // Newly added for email/employee id
    this.loginForm.get('email')?.valueChanges.subscribe(() => {
      const emailControl = this.loginForm.get('email');
      // if (emailControl?.errors) {
      //   emailControl.setErrors(null); // Clear errors while typing
      // }
      if (emailControl?.hasError('email') && emailControl.value) {
        // Clear only the 'email' format error while typing
        emailControl.setErrors(null);
      }
    });
    // Newly added for removing multiple error messages
    this.loginForm.valueChanges.subscribe(() => {
      if (this.loginErrorMessage) {
        this.loginErrorMessage = '';
      }
    });
    // Newly added for browser back button
    if (this.localStorageService.get('loggedOut') === 'true') {
      window.history.pushState(null, '', window.location.href);
    }

  }

  get f() { return this.loginForm.controls; }

  // Newly added 
  get s() { return this.signupForm.controls; }

  get p() { return this.passwordForm.controls; }

  onSubmit(): void {
    // if (this.loginForm.valid) {
    //  const formData = this.loginForm.value;
    // console.log('Form Data:', formData);
    // this.loginForm.markAllAsTouched();
    //  this.signIn();
    // } else {
    //   console.log('Form is invalid');
    //   this.loginForm.markAllAsTouched();  // Mark all controls as touched to trigger validation
    // }
    // Newly added for email/employee id
    const formData = this.loginForm.value;
    // console.log('Form Data:', formData);
    this.signIn();
  }


  // signIn() {
  //   this.alertService.clear();
  //   this.showalertmsg = true;
  //   if (this.loginForm.valid) {
  //     this.loaderService.emitLoading();
  //     this.validateForm = false;
  //     this.loginData = {
  //       domain_name: DOMAIN_NAME,
  //       // username: this.loginForm.value.email,
  //      username: this.loginForm.value.email + '-' + DOMAIN_NAME,
  //      password: this.loginForm.value.password
  //     }


  //     // MAKE A SERVICE CALL HERE...
  //     this.appService.login(this.loginData).subscribe(
  //       (resp: any) => {
  //         if (resp) {
  //           if (resp.success === 1 && resp.status_code === 200) {
  //             this.authService.setExpiryTime(new Date().getTime() + (resp.access_token_expires_in * 1000))
  //             // this.authService.setExpiryTime(new Date().getTime() + (60*1000))
  //             this.authService.setRTokenExpireTime(new Date().getTime() + (resp.refresh_token_expires_in * 1000))
  //             this.authService.setAccessToken(resp.access_token);
  //             this.authService.setRefreshToken(resp.refresh_token);
  //             // this.localService.set('UserName', resp.user.name);
  //             this.localService.set('UserEmail', resp.user.email);
  //             this.localService.set('UserId', resp.user.id);
  //             this.localService.set('db_schema', resp.user.db_schema);

  //             this.dbSchema = resp.user.db_schema;
  //             // this.localService.set('db_schema', "Tams1");
  //             this.localService.set('domainName', resp.user.domain_name);
  //             this.router.navigate([`/add-new-hotel`], { skipLocationChange: false });


  //             this.appService.dbSchema = resp.user.db_schema;
  //           }
  //           else if (resp.success === 0) {
  //             this.loaderService.emitComplete();
  //             if (resp.message) {
  //               this.alertService.error(resp.message, this.options);
  //             }
  //           }
  //           else if (resp.message && resp.status_code !== 200) {
  //             this.loaderService.emitComplete();
  //             this.alertService.error(resp.message, this.options);
  //           }
  //           else {
  //             this.loaderService.emitComplete();
  //             this.alertService.error('Something bad happened. Please try again!', this.options);
  //           }
  //         }
  //       },
  //       (err: any) => {
  //         this.loaderService.emitComplete();
  //         if (err.error.statusCode === 500) {
  //           this.alertService.error('Please enter a valid UserName/Password', this.options);
  //         }
  //         else if (err.error.statusCode === 401) {
  //           this.alertService.error('Please enter a valid UserName/Password', this.options);
  //         }
  //         else {
  //           this.alertService.error('Something bad happened. Please try again!', this.options);
  //         }
  //       }
  //     )
  //   }
  //   else {
  //     this.validateForm = true;
  //   }
  // }  


  // signIn() {
  //   //console.log('signIn');
  //   this.alertService.clear();
  //   this.showalertmsg = true;
  //   if (this.loginForm.valid) {
  //     this.loaderService.emitLoading();
  //     this.validateForm = false;
  //     this.loginData = {
  //       // domain_name: DOMAIN_NAME,
  //       username: this.loginForm.value.email + '-' + DOMAIN_NAME,
  //       password: this.loginForm.value.password
  //     };

  //     let requestBody = {
  //       domain_name: DOMAIN_NAME,
  //       user_id: USER_ID, // Default user id
  //       extras: {
  //         find: {
  //           email: this.loginForm.value.email
  //         }
  //       }
  //     };

  //     // First: Checks in getSignupAllCustomers
  //     this.hotellistService.getSignupAllCustomers(requestBody).subscribe(
  //       (resp: any) => {
  //         //console.log('Function');
  //         if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
  //           const userData = resp.result.data[0];
  //           //console.log('User Data:', userData);
  //           if (resp.result.data.length > 0) {
  //             // procesed to login
  //             //console.log('procesed to login');
  //             this.appService.login(this.loginData).subscribe(
  //               (resp: any) => {
  //                 //console.log('Respond:', resp);
  //                 if (resp) {
  //                   if (resp.success === 1 && resp.status_code === 200) {
  //                     this.authService.setExpiryTime(new Date().getTime() + (resp.access_token_expires_in * 1000));
  //                     this.authService.setRTokenExpireTime(new Date().getTime() + (resp.refresh_token_expires_in * 1000));
  //                     this.authService.setAccessToken(resp.access_token);
  //                     this.authService.setRefreshToken(resp.refresh_token);
  //                     this.localService.set('UserEmail', userData.email);
  //                     this.localService.set('UserId', userData.id);
  //                     //console.log('User id:', this.localService.get('UserId'))
  //                     this.localService.set('db_schema', userData.db_schema);
  //                     this.localService.set('Password', String(this.loginForm.value.password));
  //                     //console.log('Password:', this.localService.get('Password'));
  //                     this.dbSchema = userData.db_schema;
  //                     this.localService.set('domainName', DOMAIN_NAME);
  //                     //console.log('Usersss:', userData.hierarchy_details)
  //                     //  For tab tracking
  //                     this.getOrderById();
  //                     const validTemplates = ['Gold', 'Silver', 'Platinum', 'Bronze'];
  //                     let maxTabReached;
  //                     if (userData.registered_address !== undefined) maxTabReached = 0;
  //                     if (userData.property_details !== undefined) maxTabReached = 1;
  //                     if (userData.service_details !== undefined) maxTabReached = 2;
  //                     if (userData.hierarchy_details !== undefined) maxTabReached = 3;
  //                     //console.log('Status',this.orderdata?.status)
  //                     if (this.orderdata?.status == 'Confirmed') {
  //                       maxTabReached = 4;
  //                       // this.router.navigateByUrl('/login');
  //                     };

  //                     //console.log('Max:', maxTabReached)


  //                     // Store tab progress in local storage
  //                     this.localService.set('maxTabReached', maxTabReached);
  //                     //console.log(this.localService.get('maxTabReached'))
  //                     this.localService.set('currentTab', maxTabReached);
  //                     this.router.navigate([`/edit-new-hotel/${userData.id}`], { skipLocationChange: false });
  //                     this.appService.dbSchema = userData.db_schema;
  //                   } else {
  //                     this.loaderService.emitComplete();
  //                     if (resp.message) {
  //                       this.alertService.error(resp.message, this.options);
  //                     } else {
  //                       this.alertService.error('Something bad happened. Please try again!', this.options);
  //                     }
  //                   }
  //                 }
  //               },
  //               (err: any) => {
  //                 this.loaderService.emitComplete();
  //                 if (err.error.statusCode === 500 || err.error.statusCode === 401) {
  //                   this.alertService.error('Please enter a valid UserName/Password', this.options);
  //                 }
  //                 else {
  //                   this.alertService.error('Something bad happened. Please try again!', this.options);
  //                 }
  //               }
  //             );
  //           } else {
  //             this.loaderService.emitComplete();
  //             this.alertService.error('Email not found. Please signup first!', this.options);
  //           }

  //         } else {
  //           this.loaderService.emitComplete();
  //           this.alertService.error('Email not found. Please signup first!', this.options);
  //         }
  //       },
  //       (err: any) => {
  //         this.loaderService.emitComplete();
  //         this.alertService.error('Something went wrong while verifying user.', this.options);
  //       }
  //     );

  //   } else {
  //     this.validateForm = true;
  //   }
  // }

  // getOrderById(){  
  //   let formatJson = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: {
  //         customer_id: Number(this.localService.get('UserId'))
  //         // id: Number(this.parameters['id'])
  //       }
  //     },
  //     "pagination": false,
  //     "paginationDetails": {
  //       "limit": 0,
  //       "pageSize": 10
  //     },
  //     "sorting": true,
  //     "sortingDetails": {
  //       "sortfield": "",
  //       "sortorder": -1
  //     }
  //   }

  //   this.hotelenrollmenttabviewService.orderDetailsGetById(formatJson).subscribe(
  //     resp => {
  //       this.loaderService.emitComplete();
  //       if (resp) {
  //        this.orderdata = resp.result.data[0];
  //       //  const memberId = this.orderdata.customer.member_id;
  //       //  this.localService.set('MemberId', memberId);
  //       //  //console.log(memberId, "MEMBERID");
  //        //console.log(this.orderdata, "RESPDATA");
  //       }
  //     },
  //     err => {
  //       this.loaderService.emitComplete();
  //       if (err.error.statusCode === 403) {
  //         // this.alertsService.error('Session Time Out! Please login Again', this.options);
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       } else if (err.error.message) {
  //         // this.alertsService.error(err.error.message, this.options);
  //       } else {
  //         // this.alertsService.error('Something bad happened. Please try again!', this.options);
  //       }
  //         // Reject promise if there is an error
  //     }
  //   ); 
  // }

  signIn() {
    // Newly added for email/staff employee number
    // 1.Checking whether user is customer or staff
    // this.loginData = {
    //   domain_name: DOMAIN_NAME,
    //   username: this.loginForm.value.email + '-' + DOMAIN_NAME,
    //   password: this.loginForm.value.password
    // };
    this.loginForm.markAllAsTouched();
    this.validateForm = true;
    this.loginErrorMessage = '';
    const enteredValue = this.loginForm.value.email?.trim();
    const password = this.loginForm.value.password?.trim();
    const emailControl = this.loginForm.controls['email'];
    // console.log('Entered Value:', enteredValue);
    // console.log('Password:', password);
    // console.log('Email / Employee ID Control:', emailControl);
    // Clear any old errors before new validation
    emailControl.setErrors(null);
    // 2.Required check
    if (!enteredValue) {
      // console.log('Email / Employee ID is required');
      emailControl.setErrors({ required: true });
      this.cdr.detectChanges();
      return;
    }
    // 3.Email or Employee ID validation
    const isEmailLogin = enteredValue.includes('@');
    if (isEmailLogin) {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(enteredValue)) {
        // console.log('Invalid email format');
        emailControl.setErrors({ invalid: true });
        this.cdr.detectChanges();
        return;
      }
    } else {
      const empPattern = /^[a-zA-Z]{2}[a-zA-Z0-9]*\d{8}$/;
      if (!empPattern.test(enteredValue)) {
        // console.log('Invalid Employee ID format');
        emailControl.setErrors({ invalid: true });
        this.cdr.detectChanges();
        return;
      }
    }
    // 4.If the form is invalid, stop here
    if (this.loginForm.invalid) return;
    // 5. All validations passed
    emailControl.setErrors(null);
    this.validateForm = false;
    this.alertService.clear();
    this.showalertmsg = true;
    if (this.loginForm.valid) {
      //console.log('signIn');
      this.loaderService.emitLoading();
      this.validateForm = false;
      // 5.Sending key based on user type(customer/staff) to get customer/staff data's
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          // find: {
          //   email: this.loginForm.value.email
          // }
          find:
            isEmailLogin ? { email: enteredValue } : { staff_employee_number: enteredValue }
        }
      }
      // console.log('signIn', requestBody);
      this.hotellistService.getSignupAllCustomers(requestBody).subscribe(
        (resp: any) => {
          if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
            const userData = resp.result.data[0];
            // console.log('User Data:', userData);
            // 5. Based on user type(customer/staff) login(2 different login)
            let loginPayload: any;
            let loginObservable: Observable<any>;
            if (isEmailLogin) {
              // Customer Login
              loginPayload = {
                domain_name: DOMAIN_NAME,
                username: `${enteredValue}-${DOMAIN_NAME}`,
                password: password
              };
              loginObservable = this.appService.login(loginPayload);
            } else {
              // Staff Login
              loginPayload = {
                domain_name: DOMAIN_NAME,
                username: `${enteredValue}-${DOMAIN_NAME}`,
                password: password
              };
              loginObservable = this.appService.staffLogin(loginPayload);
            }
            // this.appService.login(this.loginData).subscribe(
            loginObservable.subscribe(
              async (resp: any) => {
                if (resp && resp.success === 1 && resp.status_code === 200) {
                  const isStaff = userData.staff_employee_number != undefined;
                  const isHotelDisabled = userData.hotel_enabled === false || userData.hotel_enabled === 'false';
                  const isStatusApproved = (userData.status || '').toLowerCase() === 'approved';

                  if (isHotelDisabled && (isStaff || isStatusApproved)) {
                    this.loaderService.emitComplete();

                    // Store tokens and basic user info to allow checkout
                    this.authService.setExpiryTime(new Date().getTime() + (resp.access_token_expires_in * 1000));
                    this.authService.setRTokenExpireTime(new Date().getTime() + (resp.refresh_token_expires_in * 1000));
                    this.authService.setAccessToken(resp.access_token);
                    this.authService.setRefreshToken(resp.refresh_token);

                    this.localService.set('CustomerType', userData.staff_employee_number != undefined ? 'Staff' : 'Customer');
                    this.localService.set('UserId', Number(userData.id));

                    const memberId = userData.customer_member_id && userData.customer_member_id.trim() !== ''
                      ? userData.customer_member_id.trim()
                      : (userData.member_id ? userData.member_id.trim() : null);
                    if (memberId) {
                      this.localService.set('MemberId', memberId);
                    }
                    this.localService.set('UserEmail', userData.email);
                    this.localService.set('db_schema', userData.db_schema);
                    this.localService.set('Password', String(this.loginForm.value.password));
                    this.localService.set('Name', userData.first_name);
                    this.localService.set('Status', userData.status);
                    this.dbSchema = userData.db_schema;
                    this.localService.set('domainName', DOMAIN_NAME);

                    this.isHotelOwner = !!userData.customer_member_id && userData.staff_employee_number == undefined;
                    this.isHotelOwnerLogin = this.isHotelOwner && userData.inactive_type === 'Subscription Expiry';
                    this.deactivatedUserData = userData;
                    this.localStorageService.remove('loggedOut');
                    this.showDeactivatedModal = true;
                    return;
                  }
                  // Newly added for is_active check purpose
                  // Check if the specific user/staff/hotel is active
                  const isInactive = isStaff
                    ? (userData.is_staff_active === false || userData.is_staff_active === 'false')
                    : (userData.is_active === false || userData.is_active === 'false');

                  if (isInactive) {
                    this.loaderService.emitComplete();
                    let accountType = 'user account';
                    if (isStaff) {
                      accountType = 'staff profile';
                    } else if (userData.customer_member_id) {
                      accountType = 'hotel account';
                    }
                    this.inactiveUserModalMessage = `Your ${accountType} is currently inactive. Please contact the administrator for assistance.`;
                    this.showInactiveUserModal = true;
                    return;
                  }
                  // End of newly added for is_active check purpose
                  // Newly added for browser back button
                  this.localStorageService.remove('loggedOut');
                  // Staff type
                  if (userData.staff_employee_number != undefined) {
                    this.notificationService.clearAll();
                    this.localService.set('CustomerType', 'Staff');
                    this.localService.set('StaffData', JSON.stringify(userData));
                    this.localService.set('hierarchy', JSON.stringify(userData.hierarchy));
                    this.localService.set('UserId', Number(userData.staff_id));
                    this.localService.set('CustomerId', Number(userData.id));
                    // console.log('Staff ID:', this.localService.get('UserId'));
                    //  this.localService.set('MemberId', userData.member_id);
                    //Newly added
                    const staffMemberId = userData.customer_member_id && userData.customer_member_id.trim() !== ''
                      ? userData.customer_member_id.trim()
                      : (userData.member_id ? userData.member_id.trim() : null);

                    if (!staffMemberId || staffMemberId === 'undefined' || staffMemberId === 'null') {
                      this.loaderService.emitComplete();
                      this.alertService.error('Member ID is required', this.options);
                      this.alertClear();
                      return;
                    }
                    this.localService.set('MemberId', staffMemberId);
                    // console.log('Front office:', userData.front_office_desk);
                    //  Newly commented because no need of fo desk 
                    // this.localService.set('frontOfficeDeskStaff', userData.front_office_desk);
                    // End of newly commented code
                    // Newly added for processing / delivered
                    const member = userData.member_id;
                    // const department = userData.hierarchy.department;
                    const department = userData?.hierarchy?.map((item: any) => item.department);
                    // console.log('Login - department:', department)
                    this.getAllStaffIds(userData.staff_id, department, member)
                    this.loaderService.emitComplete();
                    this.router.navigate(['/task-management']);
                    // handles FCM token for Staff
                    try {
                      const userId: any = this.localService.get('UserId');
                      const token = await this.pushService.requestPermissionAndGetToken(userId);
                      const isFcmUnavailable = !token || token.trim() === '';
                      this.localService.set('isFcmUnavailable', isFcmUnavailable ? 'true' : 'false');
                      // console.log('Staff FCM Token:', token);
                      // Step 1: Fetch staff by staff_id
                      const fetchBody = {
                        domain_name: DOMAIN_NAME,
                        user_id: USER_ID,
                        extras: {
                          find: {
                            id: userData.staff_id
                          }
                        }
                      };
                      this.taskManagementService.getAllStaves(fetchBody).subscribe(
                        (resp: any) => {
                          if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
                            const staff = resp.result.data[0];
                            // Step 2: Ensure fcm_token array exists
                            if (!Array.isArray(staff.fcm_token)) {
                              staff.fcm_token = [];
                            }
                            if (token !== null && token !== undefined && token.trim() !== '') {
                              if (!staff.fcm_token.includes(token)) {
                                staff.fcm_token.push(token);
                              }
                              sessionStorage.setItem('CurrentTabFcmToken', token);
                            }
                            localStorage.setItem('UserFcmTokens', JSON.stringify(staff.fcm_token));
                            // Step 3: Update staff FCM token and is_available
                            const staffUpdationPayload: any = {
                              fcm_token: staff.fcm_token
                            };
                            if (!isFcmUnavailable) {
                              staffUpdationPayload.is_available = true;
                            }
                            const updateBody = {
                              domain_name: DOMAIN_NAME,
                              user_id: USER_ID,
                              payload: {
                                staff_updation: staffUpdationPayload
                              },
                              extras: {
                                find: {
                                  id: userData.staff_id
                                }
                              }
                            };
                            this.staffService.updateStaff(updateBody).subscribe(
                              (updateResp: any) => {
                                if (updateResp.success === 1 && updateResp.status_code === 200) {
                                  // console.log('Staff FCM token and is_available updated successfully');
                                } else {
                                  console.error('Failed to update staff FCM token and is_available:', updateResp?.message);
                                }
                              },
                              (err: any) => {
                                console.error('Error updating staff FCM token and is_available:', err);
                              }
                            );

                            // Update customer document for this staff member
                            const customerFetchBody = {
                              domain_name: DOMAIN_NAME,
                              user_id: USER_ID,
                              extras: {
                                find: {
                                  id: userData.id
                                }
                              }
                            };
                            this.hotelenrollmenttabviewService.getLoginCustomerById(customerFetchBody).subscribe(
                              (custResp: any) => {
                                if (custResp.success === 1 && custResp.status_code === 200 && custResp.result.data.length > 0) {
                                  const customer = custResp.result.data[0];
                                  if (!Array.isArray(customer.fcm_token)) {
                                    customer.fcm_token = [];
                                  }
                                  if (token !== null && token !== undefined && token.trim() !== '') {
                                    if (!customer.fcm_token.includes(token)) {
                                      customer.fcm_token.push(token);
                                    }
                                  }
                                  const customerUpdatePayload: any = {
                                    fcm_token: customer.fcm_token
                                  };
                                  if (!isFcmUnavailable) {
                                    customerUpdatePayload.is_available = true;
                                  }
                                  const customerUpdateBody = {
                                    domain_name: DOMAIN_NAME,
                                    user_id: USER_ID,
                                    payload: {
                                      customer_update: customerUpdatePayload
                                    },
                                    extras: {
                                      find: {
                                        id: userData.id
                                      }
                                    }
                                  };
                                  this.hotelenrollmenttabviewService.updateCustomerFcm(customerUpdateBody).subscribe(
                                    (custUpdateResp: any) => {
                                      // console.log('Customer FCM token and is_available updated successfully for staff login');
                                    },
                                    (err: any) => {
                                      console.error('Error updating customer FCM token for staff login:', err);
                                    }
                                  );
                                }
                              },
                              (err: any) => {
                                console.error('Error fetching customer document for staff login:', err);
                              }
                            );
                          }// End of newly added is_available to true on staff login
                          else {
                            console.error('Staff not found for ID:', userData.staff_id);
                          }
                        },
                        (err: any) => {
                          console.error('Error fetching staff:', err);
                        }
                      );
                    } catch (err) {
                      console.error('Failed to get FCM token for staff:', err);
                      this.localService.set('isFcmUnavailable', 'true');
                    }
                    // this.localService.set('higher_level_hierarchy', {
                    //   "id": Number(4),
                    //   "designation": "FOM",
                    //   "escalationTime": Number(30),
                    //   "department": "FO",
                    //   "isTopLevel": false,
                    //   "isTreeItem": false,
                    //   "parentId": Number(2)
                    // });
                    // this.localService.set('higher_level_officer', {
                    //   "id": Number(27),
                    //   "name": "Arul Prasanna",
                    //   "phone_number": "8072616729"
                    // })
                  }
                  // Customer type
                  else {
                    this.localService.set('CustomerType', 'Customer');
                    this.localService.set('UserId', Number(userData.id));
                    // Check if customer_member_id exists, otherwise use member_id
                    // const memberId = userData.customer_member_id ? userData.customer_member_id : userData.member_id;
                    const memberId = userData.customer_member_id && userData.customer_member_id.trim() !== ''
                      ? userData.customer_member_id.trim()
                      : (userData.member_id ? userData.member_id.trim() : null);

                    if (!memberId || memberId === 'undefined' || memberId === 'null') {
                      this.loaderService.emitComplete();
                      this.alertService.error('Member ID is required', this.options);
                      this.alertClear();
                      return;
                    }
                    this.localService.set('MemberId', memberId);
                    // console.log('Member ID:', this.localService.get('MemberId'));
                    // console.log('Customer member ID:', this.localService.get('MemberId'));
                    // Ended for getting member id for customer type
                    //   this.getServiceById((service_details: boolean) => {
                    //   //console.log('Service details:', service_details);
                    //   let maxTabReached;
                    //   this.localService.set('currentTab', 0);
                    //   if (userData.registered_address !== undefined) maxTabReached = 0;
                    //   if (userData.property_details !== undefined) maxTabReached = 1;
                    //   if (service_details == true) maxTabReached = 2;
                    //   if (this.isHierarchyExist == true) maxTabReached = 3;
                    //   this.localService.set('maxTabReached', maxTabReached);
                    //   //console.log('Max login:', maxTabReached);
                    //   this.getOrderById(userData);
                    // });
                  }
                  // console.log('Customer Type:',this.localService.get('CustomerType'));
                  // console.log('UserId:', this.localService.get('UserId'));
                  // Set tokens and basic user info
                  this.authService.setExpiryTime(new Date().getTime() + (resp.access_token_expires_in * 1000));
                  this.authService.setRTokenExpireTime(new Date().getTime() + (resp.refresh_token_expires_in * 1000));
                  this.authService.setAccessToken(resp.access_token);
                  this.authService.setRefreshToken(resp.refresh_token);
                  this.localService.set('UserEmail', userData.email);
                  this.localService.set('db_schema', userData.db_schema);
                  // console.log('DB schema:', this.localService.get('db_schema'));
                  this.localService.set('Password', String(this.loginForm.value.password));
                  this.localService.set('Name', userData.first_name);
                  this.localService.set('Status', userData.status);
                  this.dbSchema = userData.db_schema;
                  this.localService.set('domainName', DOMAIN_NAME);
                  // console.log('Domain name:', this.localService.get('domainName'));
                  // console.log('Login Member id:', this.localService.get('MemberId'));
                  // Newly added for role access
                  const role_id = userData.role_id;
                  this.localService.set('roleId', role_id);
                  // console.log('Role id:', this.localService.get('roleId'));
                  const role_name = userData.role_name;
                  this.localService.set('roleName', role_name);
                  // console.log('Role name:', this.localService.get('roleName'));
                  // Fetch role modules for permission handling (stored as roleModules)
                  if (role_id) {
                    await this.getRoleById(role_id);
                  }
                  // Ended
                  this.loaderService.emitComplete();
                  // Navigate based on customer_member_id availability ONLY after permissions are loaded!
                  if (userData.customer_member_id) { // Customer(but not hotel)
                    // Has customer_member_id → navigate to edit-new-hotel
                    this.router.navigate([`/edit-new-hotel/${userData.id}`]);
                  } else {
                    // No customer_member_id → navigate to profile page
                    // this.router.navigate([`/add-new-hotel`]);
                    this.router.navigate(['/profile']);
                  }
                  // Requesting FCM token right after login
                  try {
                    const userId: any = this.localService.get('UserId');
                    const token = await this.pushService.requestPermissionAndGetToken(userId);
                    const isFcmUnavailable = !token || token.trim() === '';
                    this.localService.set('isFcmUnavailable', isFcmUnavailable ? 'true' : 'false');
                    // this.token = await this.pushService.requestPermission();
                    // console.log('User FCM Token:', token);
                    // Step 1: Fetch customer by id
                    const fetchBody = {
                      domain_name: DOMAIN_NAME,
                      user_id: USER_ID,
                      extras: {
                        find: { id: userData.id }
                      }
                    };
                    this.hotelenrollmenttabviewService.getLoginCustomerById(fetchBody).subscribe(
                      (resp: any) => {
                        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
                          const customer = resp.result.data[0];
                          // Step 2: Ensure fcm_token array exists
                          if (!Array.isArray(customer.fcm_token)) {
                            customer.fcm_token = [];
                          }
                          if (token !== null && token !== undefined && token.trim() !== '') {
                            if (!customer.fcm_token.includes(token)) {
                              customer.fcm_token.push(token);
                            }
                            sessionStorage.setItem('CurrentTabFcmToken', token);
                          }
                          localStorage.setItem('UserFcmTokens', JSON.stringify(customer.fcm_token));
                          // Step 4: Update customer with the new array
                          const updateBody = {
                            domain_name: DOMAIN_NAME,
                            user_id: USER_ID,
                            payload: {
                              customer_update: {
                                fcm_token: customer.fcm_token
                              }
                            },
                            extras: {
                              find: { id: userData.id }
                            }
                          };
                          this.hotelenrollmenttabviewService.updateCustomerFcm(updateBody).subscribe(
                            (updateResp: any) => {
                              if (updateResp.success === 1 && updateResp.status_code === 200) {
                                // console.log('FCM token updated successfully:', token);
                              } else {
                                console.error('Failed to update FCM token:', updateResp?.message);
                              }
                            },
                            (err: any) => {
                              console.error('Error updating customer FCM token:', err);
                            }
                          );
                        } else {
                          console.error('Customer not found for email:', this.loginForm.value.email);
                        }
                      },
                      (err: any) => {
                        console.error('Error fetching customer:', err);
                      }
                    );
                  } catch (err) {
                    console.error('Failed to get FCM token:', err);
                    this.localService.set('isFcmUnavailable', 'true');
                  }
                  // // let service_details = await this.getServiceById();
                  // //console.log('Service details:', service_details);
                  // let maxTabReached;
                  // this.localService.set('currentTab', 0);
                  // if (userData.registered_address !== undefined) maxTabReached = 0;
                  // if (userData.property_details !== undefined) maxTabReached = 1;
                  // if (service_details == true) maxTabReached = 2;
                  // if (userData.hierarchy_details !== undefined) maxTabReached = 3;
                  // this.localService.set('maxTabReached', maxTabReached);
                  // //console.log('Max login:', maxTabReached);
                } else {
                  this.loaderService.emitComplete();
                  const message = resp?.message || 'Something bad happened. Please try again!';
                  this.alertService.error(message, this.options);
                  this.alertClear();
                }
              },
              (err: any) => {
                this.loaderService.emitComplete();
                if (err.error.statusCode === 500 || err.error.statusCode === 401) {
                  this.alertService.error('Please enter a valid UserName/Password', this.options);
                  this.loginErrorMessage = 'Please enter a valid UserName/Password';
                  this.alertClear();
                } else {
                  this.alertService.error('Something bad happened. Please try again!', this.options);
                  this.alertClear();
                }
              }
            );
          } else {
            this.loaderService.emitComplete();
            const errorMessage = isEmailLogin
              ? 'Email not found. Please signup first!'
              : 'Employee ID not found.';
            this.alertService.error(errorMessage, this.options);
            this.alertClear();
          }
        },
        (err: any) => {
          this.loaderService.emitComplete();
          this.alertService.error('Something went wrong while verifying user.', this.options);
          this.alertClear();
        }
      );
    } else {
      this.validateForm = true;
    }
  }

  closeDeactivatedModal(): void {
    this.showDeactivatedModal = false;
    this.showPaymentOptions = false;
    localStorage.clear();
    this.login1();
  }

  async initiatePaymentFlow(): Promise<void> {
    if (!this.deactivatedUserData) return;
    const memberId = this.localService.get('MemberId');
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
        await this.paymentHelperService.payNow(this.deactivatedUserData, orderdata, null);
      } else {
        // Show billing selection screen
        this.showPaymentOptions = true;
      }
    } catch (err) {
      console.error('Error in deactivated payment flow:', err);
    }
  }

  async executePaymentPlan(): Promise<void> {
    if (!this.deactivatedUserData) return;
    try {
      await this.paymentHelperService.payNow(this.deactivatedUserData, null, this.selectedIndex);
    } catch (err) {
      console.error('Error executing payment plan:', err);
    }
  }

  getServiceById(callback: (value: boolean) => void) {
    const checkExistingServiceAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // Newly added for getting member id for customer type
          // customer_id: Number(this.localService.get('UserId'))
          member_id: this.localService.get('MemberId')
        }
      }
    };
    this.serviceDetails.getAllServices(checkExistingServiceAvailbility).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          this.servicedata = resp.result.data[0];
          this.servicedatalength = resp.result.data.length;
          this.checkExistingServiceChoosen = this.customerdata;
          if (this.servicedatalength === 0) {
            callback(false); // Send false through callback
          } else {
            callback(true); // Send true through callback
          }
        } else {
          callback(false); // Fallback
        }
      },
      err => {
        this.loaderService.emitComplete();
        //console.error('getCustomerById error:', err);

        if (err.error?.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate(['/login'], { skipLocationChange: false });
        } else if (err.error?.message) {
          this.alertService.error(err.error.message, this.options);
        } else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
        callback(false); // In case of error
      }
    );
  }

  checkIfHierarchyExists(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            // customer_id: this.hotelId
            member_id: this.localService.get('MemberId')
          }
        }
      };

      this.hierarchyService.getAllHierarchy(requestBody).subscribe(
        (resp: any) => {
          if (resp && resp.result && resp.result.data) {
            const hierarchydatalength = resp.result.data.length;
            if (hierarchydatalength === 0) {
              this.isHierarchyExist = false;
              //console.log('Hierarchy Exist:', this.isHierarchyExist);
              resolve(false);
            } else {
              this.isHierarchyExist = true;
              //console.log('Hierarchy Exist:', this.isHierarchyExist)
            }
          } else {
            resolve(false);
          }
        },
        (err: any) => {
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate(['/login'], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);
        }
      );
    });
  }

  getTechnicalInfoById(callback: (value: boolean) => void) {
    const checkExistingTechnicalInfoAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // Newly added for getting member id for customer type
          // : Number(this.localService.get('UserId'))
          member_id: this.localService.get('MemberId')
        }
      }
    };
    this.technicalInfoService.getAllTechnicalInfo(checkExistingTechnicalInfoAvailbility).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp) {
          this.technicalInfodata = resp.result.data[0];
          this.technicalInfodatalength = resp.result.data.length;
          this.checkExistingTechnicalInfoChoosen = this.customerdata;
          if (this.technicalInfodatalength === 0) {
            callback(false); // Send false through callback
          } else {
            callback(true); // Send true through callback
          }
        } else {
          callback(false); // Fallback
        }
      },
      err => {
        this.loaderService.emitComplete();
        //console.error('getCustomerById error:', err);

        if (err.error?.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate(['/login'], { skipLocationChange: false });
        } else if (err.error?.message) {
          this.alertService.error(err.error.message, this.options);
        } else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
        callback(false); // In case of error
      }
    );
  }

  //to accept userData so we can access it here too
  getOrderById(userData: any) {
    const formatJson = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // Newly added for getting member id for customer type
          // customer_id: Number(this.localService.get('UserId'))
          customer_member_id: this.localService.get('MemberId')
        }
      },
      pagination: false,
      paginationDetails: {
        limit: 0,
        pageSize: 10
      },
      sorting: true,
      sortingDetails: {
        sortfield: "",
        sortorder: -1
      }
    };
    this.hotelenrollmenttabviewService.orderDetailsGetById(formatJson).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          this.orderdata = resp.result.data[0];
          //console.log(this.orderdata, "RESPDATA");
          //console.log('Status:', this.orderdata?.status);
          if (this.orderdata?.status === 'Order Confirmed' || this.orderdata?.status === 'Confirmed') {
            let maxTabReached = 4
            this.localService.set('maxTabReached', 4);
            // this.localService.set('currentTab', maxTabReached);
          }
          //console.log('Max:', this.localService.get('maxTabReached'));
          this.router.navigate([`/edit-new-hotel/${userData.id}`], { skipLocationChange: false });
          this.appService.dbSchema = userData.db_schema;
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error.statusCode === 403) {
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
      }
    );
  }

  getUserRolesAndAccess(userID: number) {
    return new Promise((resolve, reject) => {
      let jsonObj = {
        "domain_name": DOMAIN_NAME,
        "user_id": USER_ID,
        "extras": {
          "find": {
            "id": userID
          }
        }
      }
      this.appService.postApiCall(jsonObj, ENDPOINTS.GETBYID_ADMINUSERS).subscribe((resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          let respData = resp.result.data[0];
          let respNew = resp.result.data[0];
          let role_id = respData.role_id;
          this.localService.set('roleName', respData.role_name);
          this.localService.set('role_id', respData.role_id);
          const profile_image = respData.profile_image;
          const profile_name = respData.first_name + ' ' + respData.last_name;
          // Send data to BehaviorSubject for header
          this.profileService.updateProfileImage(profile_image || 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp');
          this.profileService.updateProfileName(profile_name);
          //  if(this.dbSchema==='Aiema'||this.dbSchema==='shubcards' ||this.dbSchema==='Deera' ||this.dbSchema==='BBold'||this.dbSchema==='BombayHardware'||this.dbSchema==='dosapark') {


          // if(this.dbSchema==='Aiema') {
          this.userAccessService.userAccessList.DASHBOARD = {
            has_add_permission: true,
            has_edit_permission: true,
            has_read_permission: true,
            has_delete_permission: true,
          }

          this.userAccessService.userAccessList.CUSTOMERS = {
            has_add_permission: true,
            has_edit_permission: true,
            has_read_permission: true,
            has_delete_permission: true,
          }


          this.userAccessService.userAccessList.PAYMENT = {
            has_add_permission: true,
            has_edit_permission: true,
            has_read_permission: true,
            has_delete_permission: true,
          }


          this.userAccessService.userAccessList.SYSTEMSETTINGS = {
            has_add_permission: true,
            has_edit_permission: true,
            has_read_permission: true,
            has_delete_permission: true,
          }


          this.userAccessService.userAccessList.MARKETING = {
            has_add_permission: true,
            has_edit_permission: true,
            has_read_permission: true,
            has_delete_permission: true,
          }


          this.userAccessService.userAccessList.USERACCESS = {
            has_add_permission: true,
            has_edit_permission: true,
            has_read_permission: true,
            has_delete_permission: true,
          }

          this.userAccessService.userAccessList.DUEPAYMENTS = {
            has_add_permission: false,
            has_edit_permission: false,
            has_read_permission: true,
            has_delete_permission: false,
          }


          // this.userAccessService.userAccessList.SYSTEMSETTINGS = {
          //   has_add_permission: true,
          //   has_edit_permission: true,
          //   has_read_permission: true,
          //   has_delete_permission: true,
          // }


          // this.userAccessService.userAccessList.AUTHORIZATION = {
          //   has_add_permission: true,
          //   has_edit_permission: true,
          //   has_read_permission: true,
          //   has_delete_permission: true,
          // }


          this.userAccessService.setUserAccess(this.userAccessService.userAccessList);
          if (this.userAccessService.getUserAccess() !== null) {
            resolve(true);
          }

          // resolve(true);
          {
            let roleObj = {
              "domain_name": DOMAIN_NAME,
              "user_id": USER_ID,
              "extras": {
                "find": {
                  "id": Number(role_id)
                }
              }
            }
            this.appService.postApiCall(roleObj, ENDPOINTS.GETBYID_ROLES).subscribe((resp: any) => {
              this.loaderService.emitComplete();
              if (resp.success === 1 && resp.status_code === 200) {
                let respData1 = resp.result.data[0];
                respData1.modules.forEach((element: { module_name: string, permission: any }) => {

                  if (element.module_name === "DASHBOARD") {
                    //console.log('11', element.permission);

                    this.userAccessService.userAccessList.DASHBOARD = element.permission;
                  }
                  else if (element.module_name === "CUSTOMERS") {
                    //console.log('12');
                    this.userAccessService.userAccessList.CUSTOMERS = element.permission;
                  }
                  else if (element.module_name === "PAYMENT") {
                    //console.log('13');
                    this.userAccessService.userAccessList.PAYMENT = element.permission;
                  }
                  else if (element.module_name === "MARKETING") {
                    //console.log('14');
                    this.userAccessService.userAccessList.MARKETING = element.permission;
                  }

                  else if (element.module_name === "SYSTEM SETTINGS") {
                    //console.log('15');
                    this.userAccessService.userAccessList.SYSTEMSETTINGS = element.permission;
                  }
                  else if (element.module_name === "USER ACCESS") {
                    //console.log('16');
                    this.userAccessService.userAccessList.USERACCESS = element.permission;
                  }
                  else if (element.module_name === "DUE PAYMENTS") {
                    this.userAccessService.userAccessList.DUEPAYMENTS = element.permission;
                  }

                });
                this.userAccessService.setUserAccess(this.userAccessService.userAccessList);
                if (this.userAccessService.getUserAccess() !== null) {
                  resolve(true);
                }

              }
            })
          }
        }
      })
    })
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  navigateToRegister() {
    this.router.navigate(['/bookings']);
  }

  // Newly added 
  getOtp() {
    if (this.signupForm.valid) {
      const signupFormData = this.signupForm.value;
      //console.log('Signup Form Data:', signupFormData);
      this.getAllCustomers(); // Call the method to get all customers
    } else {
      //console.log('Signup Form is invalid');
      this.signupForm.markAllAsTouched();  // Mark all controls as touched to trigger validation
    }
  }

  forgetPassword() {
    // if (this.loginForm.value.email == '') {
    //   this.alertService.error("Please enter email", this.options);
    // }
    // else {
    //   let requestBody = {
    //     domain_name: DOMAIN_NAME,
    //     user_id: USER_ID, //Default user id
    //     "extras": {
    //       "find": {
    //         email: this.loginForm.value.email
    //         // phone_number: phoneNumber
    //       }
    //     }
    //   }
    //   this.hotellistService.getSignupAllCustomers(requestBody).subscribe(
    //     (resp: any) => {
    //       this.loaderService.emitComplete();
    //       if (resp.success === 1 && resp.status_code === 200) {
    //         if (resp.result.data.length > 0) {
    //           this.customerList = resp.result.data[0];
    //           //console.log(this.customerList);
    //           this.forgot_phone_number = resp.result.data[0].phone_number;
    //           this.mail = resp.result.data[0].email;
    //           if (this.localService.get('CusromerType') === 'Staff') {
    //             this.hotelId = resp.result.data[0].staff_id;
    //           }
    //           else {
    //             this.hotelId = resp.result.data[0].id;
    //           }
    //           //console.log(this.hotelId);
    //           this.sendOTP(Number(this.forgot_phone_number));
    //           this.alertService.success("OTP has been sent to your mobile number.", this.options);
    //           this.forgotPassword = true
    //           this.login = false;
    //           this.otp = true;
    //         }
    //         else {
    //           this.alertService.error("Email not found. Please signup first!", this.options);
    //           this.otp = true;
    //           // this.router.navigate([`/login`], { skipLocationChange: false });
    //         }
    //       }
    //     },
    //     (err: any) => {
    //       if (err.error.statusCode === 403) {
    //         this.alertService.error('Session Time Out! Please login Again', this.options)
    //         this.router.navigate([`/login`], { skipLocationChange: false });
    //       }
    //       else if (err.error.message) {
    //         this.alertService.error(err.error.message, this.options)
    //       }
    //       else {
    //         this.alertService.error('Something bad happened. Please try again!', this.options);
    //       }
    //     }
    //   )
    // }
    // Newly added for email/staff employee number
    const enteredValue = this.loginForm.value.email?.trim();
    this.navigatingValue = enteredValue;
    if (!enteredValue) {
      this.alertService.error("Please enter Email / Employee ID", this.options);
      return;
    }
    let requestBody: any;
    // Patterns
    const empIdPattern = /^[a-zA-Z]{2}[a-zA-Z0-9]*\d{8}$/; // e.g. INTN00235123
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Detect type
    if (enteredValue.includes('@')) {
      // Treat as email (Customer)
      if (!emailPattern.test(enteredValue)) {
        this.alertService.error("Invalid Email format", this.options);
        return;
      }
      requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { email: enteredValue }
        }
      };
    } else if (empIdPattern.test(enteredValue)) {
      // Treat as staff employee ID
      requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { staff_employee_number: enteredValue }
        }
      };
    } else {
      // Neither valid email nor valid employee ID
      this.alertService.error("Invalid Email / Employee ID format", this.options);
      return;
    }
    this.hotellistService.getSignupAllCustomers(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp.success === 1 && resp.status_code === 200) {
          if (resp.result.data.length > 0) {
            const userData = resp.result.data[0];

            const isStaffUser = userData.staff_employee_number != undefined;
            const isHotelDisabled = userData.hotel_enabled === false || userData.hotel_enabled === 'false';
            const isStatusApproved = (userData.status || '').toLowerCase() === 'approved';

            if (isHotelDisabled && (isStaffUser || isStatusApproved)) {
              this.isHotelOwner = !!userData.customer_member_id && userData.staff_employee_number == undefined;
              this.isHotelOwnerLogin = this.isHotelOwner && userData.inactive_type === 'Subscription Expiry';
              this.deactivatedUserData = userData;
              this.showDeactivatedModal = true;
              return;
            }

            const isInactive = isStaffUser
              ? (userData.is_staff_active === false || userData.is_staff_active === 'false')
              : (userData.is_active === false || userData.is_active === 'false');

            if (isInactive) {
              let accountType = 'user account';
              if (userData.staff_employee_number) {
                accountType = 'staff profile';
              } else if (userData.customer_member_id) {
                accountType = 'hotel account';
              }
              this.inactiveUserModalMessage = `Your ${accountType} is currently inactive. Please contact the administrator for assistance.`;
              this.showInactiveUserModal = true;
              return;
            }

            this.customerList = userData;
            //console.log(this.customerList);
            this.forgot_phone_number = userData.phone_number;
            this.mail = resp.result.data[0].email;
            if (this.localService.get('CusromerType') === 'Staff') {
              this.hotelId = resp.result.data[0].staff_id;
            }
            else {
              this.hotelId = resp.result.data[0].id;
            }
            //console.log(this.hotelId);
            this.hasEmailAndPhone = false;
            this.sendOTP(this.mail, Number(this.forgot_phone_number));
            // this.alertService.success("OTP has been sent to your mobile number.", this.options);
            this.forgotPassword = true
            this.login = false;
            this.otp = true;
            // Newly added for browser back button
            history.pushState(null, '', location.href); // Push state to handle back button
          }
          else {
            const errorMessage = enteredValue.includes('@')
              ? "Email not found. Please signup first!"
              : "Employee ID not found.";
            this.alertService.error(errorMessage, this.options);
            // this.otp = true;
            // this.router.navigate([`/login`], { skipLocationChange: false });
          }
        }
      },
      (err: any) => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertService.error(err.error.message, this.options)
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
      }
    )
  }

  // getAllCustomers() {
  //   const email = String(this.signupForm.value.email);
  //   const phoneNumber = this.signupForm.value.phone_number;
  //   //console.log('Hello3')
  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID, //Default user id
  //     "extras": {
  //       "find": {
  //         email: email
  //         // phone_number: phoneNumber
  //       }
  //     }
  //   }
  //   this.hotellistService.getSignupAllCustomers(requestBody).subscribe(
  //     (resp: any) => {
  //       //console.log('Hello1')
  //       this.loaderService.emitComplete();
  //       if (resp.success === 1 && resp.status_code === 200) {
  //         if (resp.result.data.length > 0) {
  //           this.customerList = resp.result.data;
  //           //console.log(this.customerList);
  //           this.alertService.error("User already exists.Please login with your credentials.");
  //           this.signup = false;
  //           this.login = true;
  //         }
  //         else {
  //           this.signup = false;
  //           this.sendOTP(Number(phoneNumber));
  //           this.localStorageService.set('UserEamil', this.signupForm.value.email);
  //           this.localStorageService.set('UserPhoneNumber', this.signupForm.value.phone_number);
  //           this.phoneNumber = this.localStorageService.get('UserPhoneNumber');
  //           this.email = this.localStorageService.get('UserEamil');
  //           //console.log("User Phone Number: ", this.localStorageService.get('UserPhoneNumber'));
  //           //console.log("User Email: ", this.localStorageService.get('UserEamil'));
  //           this.alertService.success("OTP has been sent to your registered mobile number.");
  //           this.otp = true;
  //           // this.router.navigate([`/login`], { skipLocationChange: false });
  //         }
  //       }
  //     },
  //     (err: any) => {
  //       //console.log('Hello2')
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.options)
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       }
  //       else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.options)
  //       }
  //       else {
  //         this.alertService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   )
  // }

  // getAllCustomers1() {
  //   const email = String(this.signupForm.value.email);
  //   const phoneNumber = this.signupForm.value.phone_number;

  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID, //Default user id
  //     "extras": {
  //       "find": {
  //         // email: email
  //         // phone_number: phoneNumber
  //       }
  //     }
  //   }
  //   this.hotellistservice.getSignupAllCustomers(requestBody).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp.success === 1 && resp.status_code === 200) {
  //         if (resp.result.data.length > 0) {
  //           this.customerList = resp.result.data;
  //           //console.log(this.customerList);
  //           this.alertService.error("User already exists with this email id. Please login with your credentials.", this.options);
  //           this.signup = false;
  //           this.login = true;
  //         }
  //         else {
  //           this.signup = true;
  //           this.login = true;
  //           this.sendOTP(Number(phoneNumber));
  //           this.localStorageService.set('UserEamil', this.signupForm.value.email);
  //           this.localStorageService.set('UserPhoneNumber', this.signupForm.value.phone_number);
  //           this.phoneNumber = this.localStorageService.get('UserPhoneNumber');
  //           this.email = this.localStorageService.get('UserEamil');
  //           //console.log("User Phone Number: ", this.localStorageService.get('UserPhoneNumber'));
  //           //console.log("User Email: ", this.localStorageService.get('UserEamil'));
  //           this.otp = true;
  //           // this.router.navigate([`/login`], { skipLocationChange: false });
  //         }
  //       }
  //     },
  //     (err: any) => {
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.options)
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       }
  //       else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.options)
  //       }
  //       else {
  //         this.alertService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   )
  // }

  handleSignupError(err: any) {
    this.loaderService.emitComplete();
    if (err.error.statusCode === 403) {
      this.alertService.error('Session Time Out! Please login Again', this.options);
      this.router.navigate(['/login'], { skipLocationChange: false });
    } else if (err.error.message) {
      this.alertService.error(err.error.message, this.options);
    } else {
      this.alertService.error('Something bad happened. Please try again!', this.options);
    }
  }


  sendOTP(email: string, mobileNo: number) {
    return new Promise((resolve, reject) => {
      let requestData = {
        "domain_name": DOMAIN_NAME,
        "user_id": 1,
        "recipient_email": email,
        "recipient_mobile": Number(mobileNo),
        "event": "OTP"
      }
      this.loginService.checkoutAPICall(ENDPOINTS.GENERATE_OTP, requestData).then(
        respData => {
          let res: any = respData;
          if (res.success === 1) {
            this.reference_id = res.reference_id;
            this.alertService.success('OTP sent successfully to your email and mobile number.', this.options);
            resolve(true);
          }
          else {
            this.alertService.error('Failed to send OTP. Please try again!', this.options);
            resolve(false);
          }
        }
      )
    })
  }

  resendOtp() {
    // this.alertService.success("OTP sent successfully to your mobile number.", this.options);
    let targetedPhoneNumber = this.hasEmailAndPhone ? this.phoneNumber : this.forgot_phone_number;
    let targetedEmail = this.hasEmailAndPhone ? this.email : this.mail;
    this.alertClear();
    Object.keys(this.otpForm.controls).forEach(key => {
      this.otpForm.controls[key].setValue('');
    });
    this.sendOTP(targetedEmail, targetedPhoneNumber);
  }

  onOtpKeyUp(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (event.key === 'Backspace') {
      if (!value && index > 0) {
        const prevInput = document.querySelectorAll('input')[index - 1] as HTMLInputElement;
        prevInput.focus();
      }
    } else if (value && index < this.otpArray.length - 1) {
      const nextInput = document.querySelectorAll('input')[index + 1] as HTMLInputElement;
      nextInput.focus();
    }
  }

  //For OTP empty space validation
  preventSpace(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: any) {
    const input = event.target;
    input.value = input.value.replace(/[^0-9]/g, '');
  }

  onPhoneInput(event: any) {
    let input = event.target;
    let value = input.value.toString();
    // Remove any non-numeric characters
    value = value.replace(/[^0-9]/g, '');
    // Prevent typing '0' as the very first character
    if (value === '0') {
      value = '';
    }
    input.value = value;
    if (this.signupForm && this.signupForm.controls['phone_number']) {
      this.signupForm.controls['phone_number'].setValue(value);
    }
  }

  verifyOTP(phoneNumber: number) {
    const otp = this.otpArray.map(i => this.otpForm.get('otp' + i)?.value).join('');
    //console.log('OTP Entered:', otp);
    return new Promise((resolve, reject) => {
      let requestData = {
        "domain_name": DOMAIN_NAME,
        "user_id": 1,
        "reference_id": this.reference_id,
        "otp_code": otp
      }
      this.loginService.checkoutAPICall(ENDPOINTS.VERIFY_GENERATED_OTP, requestData).then(
        respdata => {
          let res: any = respdata;
          if (res.success === 1) {
            resolve({ status: true, msg: res.message });
            this.alertService.success('OTP verified successfully!', this.options);
            this.alertClear();
            this.otp = false;
            this.password = true;
            // Newly added for browser back button
            history.pushState(null, '', location.href);
          }
          else {
            resolve({ status: false, msg: res.message });
            this.alertService.error('OTP verification failed!', this.options);
            this.alertClear();
          }
        })
    })
  }

  forgotpasswordOtp() {
    const otp = this.otpArray.map(i => this.otpForm.get('otp' + i)?.value).join('');
    //console.log('OTP Entered:', otp);
    return new Promise((resolve, reject) => {
      let requestData = {
        "domain_name": DOMAIN_NAME,
        "user_id": 1,
        "reference_id": this.reference_id,
        "otp_code": otp
      }
      this.loginService.checkoutAPICall(ENDPOINTS.VERIFY_GENERATED_OTP, requestData).then(
        respdata => {
          let res: any = respdata;
          if (res.success === 1) {
            resolve({ status: true, msg: res.message });
            this.alertService.success('OTP verified successfully!', this.options);
            this.alertClear();
            this.otp = false;
            this.password = true;
            // Newly added for browser back button
            history.pushState(null, '', location.href);
          }
          else {
            resolve({ status: false, msg: res.message });
            this.alertService.error(res.message || 'OTP verification failed!', this.options);
          }
        })
    })
  }

  showPassword(pass: string) {
    if (pass == "login") {
      this.passwordVisible = !this.passwordVisible;
    }
    else if (pass == "new") {
      this.showNewPswd = !this.showNewPswd;
    }
    else if (pass == "confirm") {
      this.showconfirmPswd = !this.showconfirmPswd;
    }
  }

  setPassword() {
    if (this.passwordForm.valid) {
      const passwordFormData = this.passwordForm.value;
      //console.log("Password Form Data:", passwordFormData);
      const { new_password, confirm_password } = passwordFormData;
      if (new_password !== confirm_password) {
        this.alertService.error("Confirm password does not match", this.options);
        this.alertClear();
        return;
      }
      // If valid and passwords match, navigate
      this.passwordData = this.passwordForm.value.new_password;
      // console.log("Password Data :", this.passwordData);
      this.customerCreate();
    } else {
      //console.log('Password Form is invalid',this.options);
      this.passwordForm.markAllAsTouched(); // Trigger validation messages
    }
  }

  setNewPassword() {
    if (this.passwordForm.valid) {
      const passwordFormData = this.passwordForm.value;
      //console.log("Password Form Data:", passwordFormData);
      const { new_password, confirm_password } = passwordFormData;
      if (new_password !== confirm_password) {
        this.alertService.error("Confirm password does not match", this.options);
        this.alertClear();
        return;
      }
      // If valid and passwords match, navigate
      this.passwordData = this.passwordForm.value.new_password;
      // //console.log("Password Data :", this.passwordData);
      this.resetNewPassword();
    } else {
      //console.log('Password Form is invalid',this.options);
      this.passwordForm.markAllAsTouched(); // Trigger validation messages
    }
  }

  async customerCreate(): Promise<void> {
    this.isLoggingIn = true;
    return new Promise((resolve, reject) => {
      let customerObject = {
        phone_number: this.phoneNumber,
        email: String(this.email),
        password: String(this.passwordData),
        password_to_customer: String(this.passwordData),
        status: 'pending',
        send_email: true,
        send_welcome_email: false,
        send_welcome_sms: false,
        property_details: {
          property_address: {
            property_address: "",
            property_city: "Chennai",
            property_country: "India",
            property_doorno: "",
            property_gst: "",
            property_location: "",
            property_pan: "",
            property_size: "01-50 Rooms",
            property_state: "Tamil Nadu",
          }
        }
      }
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          customer_creation: customerObject
        }
      }
      // console.log('Request Body:', requestBody);
      this.hotelenrollmenttabviewService.addCustomerSignup(requestBody).subscribe(
        async (resp: any) => {
          this.loaderService.emitComplete();
          // console.log('Create Customer Response:', resp);
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              // this.sendEmail();
              // console.log('Resp:', resp);
              this.customerdata = resp.result.data[0];
              // console.log('Customer Data:', this.customerdata);
              // this.sendEmail(this.customerdata);
              this.authService.setExpiryTime(new Date().getTime() + (resp.access_token_expires_in * 1000));
              this.authService.setRTokenExpireTime(new Date().getTime() + (resp.refresh_token_expires_in * 1000));
              this.authService.setAccessToken(resp.access_token);
              this.authService.setRefreshToken(resp.refresh_token);
              this.localService.set('UserEmail', this.customerdata.email);
              this.localService.set('UserId', this.customerdata.id);
              this.localService.set('Password', this.passwordForm.value.new_password);
              this.localService.set('CustomerType', 'Customer');
              this.localService.set('domainName', DOMAIN_NAME);
              //newly added to Clear loggedOut so global guard won't immediately redirect to /login
              try {
                this.localStorageService.remove('loggedOut');
              } catch (e) {
                try { this.localService.remove('loggedOut'); } catch (err) { /* ignore */ }
              }

              // console.log('Domain name:', DOMAIN_NAME);
              // ---  FCM token logic: push token, then wait for getCustomerById before proceeding ---
              try {
                const userId: any = this.localService.get('UserId');
                const token = await this.pushService.requestPermissionAndGetToken(userId);
                // Ensure fcm_token array exists
                if (!Array.isArray(this.customerdata.fcm_token)) {
                  this.customerdata.fcm_token = [];
                }
                if (token !== null && token !== undefined && token.trim() !== '') {
                  this.customerdata.fcm_token.push(token);
                }
                // Update customer with FCM token and identifiers
                const updateBody = {
                  domain_name: DOMAIN_NAME,
                  user_id: USER_ID,
                  payload: {
                    customer_update: {
                      fcm_token: this.customerdata.fcm_token,
                      property_details: {
                        property_address: {
                          property_address: "",
                          property_city: "Chennai",
                          property_country: "India",
                          property_doorno: "",
                          property_gst: "",
                          property_location: "",
                          property_pan: "",
                          property_size: "01-50 Rooms",
                          property_state: "Tamil Nadu",
                        }
                      },
                      organization_id: this.customerdata.organization_id,
                      store_id: this.customerdata.store_id,
                      id: this.customerdata.id
                    }
                  },
                  extras: {
                    find: { id: this.customerdata.id }
                  }
                };
                const fcmUpdated = await new Promise<boolean>((resolve) => {
                  this.hotelenrollmenttabviewService.updateCustomercFcmToken(updateBody).subscribe(
                    (updateResp: any) => {
                      if (updateResp.success === 1 && updateResp.status_code === 200) {
                        resolve(true);
                      } else {
                        console.error('Failed to save FCM token:', updateResp?.message);
                        resolve(false);
                      }
                    },
                    (err: any) => {
                      console.error('Error updating customer FCM token:', err);
                      resolve(false);
                    }
                  );
                });
                if (fcmUpdated) {
                  // 1. Get latest customer details
                  await this.getCustomerById(this.customerdata.id);
                  // Newly added: Restrict if no member ID
                  const memberId = this.customerdata.customer_member_id && this.customerdata.customer_member_id.trim() !== ''
                    ? this.customerdata.customer_member_id.trim()
                    : (this.customerdata.member_id ? this.customerdata.member_id.trim() : null);

                  if (!memberId || memberId === 'undefined' || memberId === 'null') {
                    this.isLoggingIn = false;
                    this.loaderService.emitComplete();
                    this.alertService.error('Member ID is required', this.options);
                    this.alertClear();
                    return;
                  }
                  // 2. Create Admin role for that customer
                  const createdRole = await this.createAdminRole(this.customerdata);
                  // console.log('Created Role:', createdRole);
                  // After fetching customer details, load role info similar to sign-in
                  const role_id = createdRole.id;
                  const role_name = createdRole.name;
                  // 3. Update customer with role_id & role_name
                  await this.updateCustomerRole(this.customerdata.id, role_id, role_name);
                  const customerRoleId = role_id;
                  this.localService.set('roleId', customerRoleId);
                  this.localService.set('roleName', role_name);
                  if (customerRoleId !== null && customerRoleId !== undefined && customerRoleId !== '' && customerRoleId !== 'undefined' && customerRoleId !== 'null') {
                    await this.getRoleById(role_id);
                  }
                  this.sendEmail(this.customerdata);
                  this.sendMessage(this.customerdata);
                }
              } catch (err) {
                console.error('FCM token request failed:', err);
              }
              // --- Old code (commented): FCM push without waiting for getCustomerById ---
              // try {
              //   const userId: any = this.localService.get('UserId');
              //   const token = await this.pushService.requestPermissionAndGetToken(userId);
              //   if (!Array.isArray(this.customerdata.fcm_token)) {
              //     this.customerdata.fcm_token = [];
              //   }
              //   this.customerdata.fcm_token.push(token);
              //   const updateBody = {
              //     domain_name: DOMAIN_NAME,
              //     user_id: USER_ID,
              //     payload: { customer_update: { fcm_token: this.customerdata.fcm_token } },
              //     extras: { find: { id: this.customerdata.id } }
              //   };
              //   this.hotelenrollmenttabviewService.updateCustomercFcmToken(updateBody).subscribe(
              //     (updateResp: any) => {
              //       if (updateResp.success === 1 && updateResp.status_code === 200) {
              //         this.getCustomerById(this.customerdata.id);
              //       } else {
              //         console.error('Failed to save FCM token:', updateResp?.message);
              //       }
              //     },
              //     (err: any) => {
              //       console.error('Error updating customer FCM token:', err);
              //     }
              //   );
              // } catch (err) {
              //   console.error('FCM token request failed:', err);
              // }
              this.hotelenrollmenttabviewService.clearAdminFormEvent();
              this.alertService.success(resp.message, this.options);
              this.alertClear();
              //console.log(this.customerdata, "cst");
              //console.log('Password:', this.localService.get('Password'))
              //console.log('User id:', this.localService.get('UserId'))
              // this.localService.set('currentTab', 0);
              // this.localService.set('maxTabReached', 'undefined');
              // this.localService.set('db_schema', this.customerdata.db_schema);
              // this.dbSchema =this.customerdata.db_schema;
              // this.appService.dbSchema = resp.userData.db_schema;
              this.isLoggingIn = false;
              this.router.navigate([`/edit-new-hotel/${this.customerdata.id}`]);
              // this.router.navigate(["/add-new-hotel"]);
            }
            else if (resp.success === 0) {
              this.isLoggingIn = false;
              if (resp.message) {
                // console.log('Error:', resp.message);
                this.alertService.error(resp.message, this.options);
                this.alertClear();
              }
            }
            else if (resp.message && resp.status_code !== 200) {
              this.isLoggingIn = false;
              // console.log('Error:', resp.message);
              this.alertService.error(resp.message, this.options);
              this.alertClear();
            }
            else {
              this.isLoggingIn = false;
              // console.log('Something bad happened. Please try again!');
              this.alertService.error('Something bad happened. Please try again!', this.options);
              this.alertClear();
            }
          }
        },
        (err: any) => {
          this.isLoggingIn = false;
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.alertClear();
            this.router.navigate([`/login`], { skipLocationChange: false });
          }
          else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
            this.alertClear();
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
            this.alertClear();
          }
        }
      )
    })
  }

  alertClear() {
    setTimeout(() => {
      this.alertService.clear();
    }, 6000);
  }

  // Newly added for processing / delivered
  getAllStaffIds(staffId: number, department: any, memberId: string) {
    // OLD IMPLEMENTATION (kept for reference):
    // const requestBody = {
    //   domain_name: DOMAIN_NAME,
    //   user_id: USER_ID,
    //   "extras": {
    //     "find": {
    //       "member_id": memberId,
    //       "hierarchy.department": department
    //     }
    //   }
    // };
    // NEW IMPLEMENTATION - Only add "hierarchy.department" when department is not "Default"
    const find: any = (Array.isArray(department) ? !department.includes('Default') : department !== 'Default' && !!department)
      ? { member_id: memberId, 'hierarchy.department': department }
      : { member_id: memberId };
    // Ended

    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": find
      }
    };
    this.taskManagementService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          const allStaff = resp.result.data;
          // console.log("All staff in logged in staff department:", allStaff);
          const collectedIds: number[] = [];   // existing behavior (leaf with at_desk=false)
          const allLowerIds: number[] = [];    // new array (all lower ids irrespective of at_desk)
          // Newly added for storing front office staff id's
          // Newly commented because no need of fo desk
          // const frontOfficeStaffIds: number[] = [];
          // End of newly commented code
          // const isFoStaffString = this.localService.get('frontOfficeDeskStaff'); // likely "true" or "false"
          // console.log('Is front office staff string:', isFoStaffString);
          // const isFoStaff = (isFoStaffString === 'true');
          // console.log('Is front office staff:', isFoStaff);
          // if (isFoStaff) {
          // front office desk = true
          // collect all staff having front_office_desk = true
          // Newly commented because no need of fo desk
          /*  allStaff.forEach((s: any) => {
             if (s.front_office_desk === true && !frontOfficeStaffIds.includes(s.id)) {
               frontOfficeStaffIds.push(s.id);
             }
           }); */
          // End of newly commented code
          // }
          // recursive helper
          const traverse = (currentId: number) => {
            // Newly added & commented for combine - started
            // find all direct children of currentId
            // const children = allStaff.filter(
            //   (s: any) => s.higher_level_officer?.id === currentId
            // );
            const children = allStaff.filter((s: any) =>
              Array.isArray(s.higher_level_officer) &&
              s.higher_level_officer.some((officer: any) => officer?.id === currentId)
            );
            // console.log('Logged in children staff:', children)
            // Ended
            if (children.length === 0) {
              // leaf → check at_desk
              const currentStaff = allStaff.find((s: any) => s.id === currentId);
              if (currentStaff && currentStaff.at_desk === false && !collectedIds.includes(currentStaff.id)) {
                collectedIds.push(currentStaff.id);
              }
              return;
            }
            // if children exist → traverse each child
            children.forEach((child: any) => {
              if (!allLowerIds.includes(child.id)) {
                allLowerIds.push(child.id);  // collect all lower ids
              }
              traverse(child.id);
            });
          };
          // start from logged-in staffId
          traverse(staffId);
          // console.log("Collected Staff Ids(at_desk: false):", collectedIds);
          // console.log("All Lower Staff Ids (irrespective of at_desk):", allLowerIds);
          // console.log("Front Office Staff Ids (front_office_desk = true):", frontOfficeStaffIds);
          this.localService.set('baseStaffIds', JSON.stringify(collectedIds));
          this.localService.set('allLowerStaffIds', JSON.stringify(allLowerIds));
          // Newly commented because no need of fo desk
          // this.localService.set('frontOfficeStaffIds', JSON.stringify(frontOfficeStaffIds));
          // End of newly commented code
        } else {
          const message = resp?.message || 'Something bad happened. Please try again!';
          this.alertService.error(message, this.options);
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertService.error(errorMsg, this.options);
        if (err?.error?.statusCode === 403) {
          this.router.navigate(['/login'], { skipLocationChange: false });
        }
      }
    );
  }

  /* sendEmail(customerData: any) {
    const payload = {
      username: customerData.first_name,
      email: customerData.email,
      name: customerData.first_name,
      domain_name: 'https://www.guestezee.com'
    };
    this.loginService.sendWelcomeEmail(payload).subscribe({
      next: (res) => {
        console.log('Email API response:', res);
        // Newly added for email updation 
        if (res && (res.success === 1)) {
          const updateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
              find: {
                id: customerData.id
              }
            },
            payload: {
              customer_update: {
                send_welcome_email: true
              }
            }
          };
          this.hotelenrollmenttabviewService.updateCustomercFcmToken(updateBody).subscribe({
            next: (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                console.log('Successfully updated send_welcome_email to true');
              } else {
                console.error('Failed to update send_welcome_email:', updateResp?.message);
              }
            },
            error: (err: any) => {
              console.error('Error updating send_welcome_email:', err);
            }
          });
        }
        else {
          console.error('Failed to send email:', res?.message);
        }
        // End of newly added code for email updation 
      },
      error: (err) => {
        console.error('Email API error:', err);
      }
    });
  } */
  sendEmail(customerData: any) {
    const payload = {
      "domain_name": 'https://www.guestezee.com',
      "user_id": USER_ID,
      "payload": {
        // "to": customerData.email,
        "customer_member_id": customerData.customer_member_id,
        "template_code": "admin_welcome_email"
      }
    };
    this.loginService.sendWelcomeEmail(payload).subscribe({
      next: (res) => {
        console.log('Email API response:', res);
        // Newly added for email updation 
        if (res && (res.success === 1)) {
          const updateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
              find: {
                id: customerData.id
              }
            },
            payload: {
              customer_update: {
                send_welcome_email: true
              }
            }
          };
          this.hotelenrollmenttabviewService.updateCustomercFcmToken(updateBody).subscribe({
            next: (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                console.log('Successfully updated send_welcome_email to true');
              } else {
                console.error('Failed to update send_welcome_email:', updateResp?.message);
              }
            },
            error: (err: any) => {
              console.error('Error updating send_welcome_email:', err);
            }
          });
        }
        else {
          console.error('Failed to send email:', res?.message);
        }
        // End of newly added code for email updation 
      },
      error: (err) => {
        console.error('Email API error:', err);
      }
    });
  }

  sendMessage(customerData: any) {
    const payload = {
      // username: customerData.first_name,
      // email: customerData.email,
      // name: customerData.first_name,
      "domain_name": "https://www.guestezee.com",
      "customer_member_id": customerData.customer_member_id,
      "templateCode": "enrollment",
      "user_id": 1
    };
    this.loginService.sendWelcomeSMS(payload).subscribe({
      next: (res) => {
        console.log('SMS API response:', res);
        // Newly added for sms updation 
        if (res && (res.success === 1)) {
          const updateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
              find: {
                id: customerData.id
              }
            },
            payload: {
              customer_update: {
                send_welcome_sms: true
              }
            }
          };
          this.hotelenrollmenttabviewService.updateCustomercFcmToken(updateBody).subscribe({
            next: (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                console.log('Successfully updated send_welcome_sms to true');
              } else {
                console.error('Failed to update send_welcome_sms:', updateResp?.message);
              }
            },
            error: (err: any) => {
              console.error('Error updating send_welcome_sms:', err);
            }
          });
        }
        else {
          console.error('Failed to send sms:', res?.message);
        }
        // End of newly added code for sms updation 
      },
      error: (err) => {
        console.error('Email API error:', err);
      }
    });
  }

  // Newly added for role access
  getRoleById(id: any): Promise<void> {
    return new Promise((resolve) => {
      let requestBody = {
        "domain_name": DOMAIN_NAME,
        "user_id": USER_ID,
        "extras": {
          "find": {
            "member_id": this.localStorageService.get('MemberId'),
            "id": id
          }
        }
      }
      this.roleListingService.getAllRoles(requestBody).subscribe({
        next: (response) => {
          if (response?.success && response.success === 1 && response.result.data.length > 0) {
            const role = response.result.data[0];
            // console.log('Role based on id:', role);
            this.localStorageService.set('roleModules', JSON.stringify(role.modules));
            // console.log('Role Modules:', this.localStorageService.get('roleModules'));
          } else {
            console.error('No roles found:', response?.message);
          }
          resolve();
        },
        error: (err) => {
          //console.error('API Error:', err);
          resolve();
        }
      });
    });
  }

  getCustomerById(hotelId: any): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            id: hotelId
          }
        }
      };
      this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
            const memberId = this.customerdata.customer_member_id && this.customerdata.customer_member_id.trim() !== ''
              ? this.customerdata.customer_member_id.trim()
              : (this.customerdata.member_id ? this.customerdata.member_id.trim() : null);
            this.localService.set('MemberId', memberId);
            resolve();
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }

  async createAdminRole(customer: any): Promise<any> {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        role_creation: {
          name: 'Admin',
          is_standard: true,
          is_active: true,
          member_id: customer.customer_member_id,
          modules: this.getAllAccessModules()
        }
      }
    };

    // console.log('Request Body:', requestBody);
    return await new Promise((resolve, reject) => {
      this.roleService.postApiCall(requestBody, ENDPOINTS.CREATE_ROLES)
        .subscribe(
          (resp: any) => {
            this.loaderService.emitComplete();
            if (resp) {
              if (resp.success === 1 && resp.status_code === 200) {
                // console.log('Role created successfully for Admin:', resp);
                resolve(resp.result.data[0]);
              }
              else if (resp.success === 0) {
                if (resp.message) {
                  this.alertService.error(resp.message, this.options);
                }
                resolve(false);
              }
              else if (resp.message && resp.status_code !== 200) {
                this.alertService.error(resp.message, this.options);
                resolve(false);
              }
              else {
                this.alertService.error(
                  'Something bad happened. Please try again!',
                  this.options
                );
                resolve(false);
              }
            } else {
              this.alertService.error(
                'Something bad happened. Please try again!',
                this.options
              );
              resolve(false);
            }
          },
          (err: any) => {
            this.loaderService.emitComplete();
            if (err?.error?.statusCode === 403) {
              this.alertService.error(
                'Session Time Out! Please login Again',
                this.options
              );
            }
            else if (err?.error?.message) {
              this.alertService.error(err.error.message, this.options);
            }
            else {
              this.alertService.error(
                'Something bad happened. Please try again!',
                this.options
              );
            }
            resolve(false);
          }
        );
    });
  }

  getAllAccessModules() {
    const moduleNames = [
      'DASHBOARD',
      'PAYMENT',
      'SYSTEM SETTINGS',
      'USER ACCESS',
      'HOTELS',
      'TASK MANAGEMENT',
      'BOOKINGS',
      'OUTLETS',
      // 'RESTAURANTS',
      'FEATURES',
      'DUE PAYMENTS'
    ];
    return moduleNames.map(name => {
      const isDuePayments = name === 'DUE PAYMENTS';
      return {
        module_name: name,
        permission: {
          has_add_permission: isDuePayments ? false : true,
          has_edit_permission: isDuePayments ? false : true,
          has_read_permission: true,
          has_delete_permission: isDuePayments ? false : true
        }
      };
    });
  }

  async updateCustomerRole(customerId: any, roleId: number, roleName: string): Promise<boolean> {
    const updateBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: customerId
        }
      },
      payload: {
        customer_update: {
          role_id: roleId,
          role_name: roleName
        }
      }
    };
    return await new Promise<boolean>((resolve) => {
      this.hotelenrollmenttabviewService
        .updateCustomercFcmToken(updateBody) // use your existing update API
        .subscribe(
          (resp: any) => {
            if (resp.success === 1 && resp.status_code === 200) {
              resolve(true);
            } else {
              console.error('Failed to update customer role:', resp?.message);
              resolve(false);
            }
          },
          (err: any) => {
            console.error('Error updating customer role:', err);
            resolve(false);
          }
        );
    });
  }

  // Newly added & commented for updating fcm toke, few values in local, getting member id, get role acces after setting new password
  /*  resetNewPassword() {
     this.localService.set('UserId', this.hotelId);
     const resetRequest = {
       domain_name: DOMAIN_NAME,
       user_id: USER_ID,
       extras: {
         find: {
           username: String(this.forgot_phone_number)
         }
       },
       payload: {
         update: {
           password: this.passwordForm.value.new_password
         }
       }
     };
     this.loginService.checkoutAPICall(ENDPOINTS.RESET_PASSWORD, resetRequest).then(resetResp => {
       const resetRes: any = resetResp;
       if (resetRes.success === 1 && resetRes.status_code === 200) {
         this.alertService.success("Password reset successfully!", this.options);
         this.alertClear();
         this.localService.set('Password', this.passwordForm.value.new_password);
         // Newly added for email/staff employee number
         // this.router.navigate([`/edit-new-hotel/${this.hotelId}`], { skipLocationChange: false });
         // checking whether it's staff or customer
         const enteredValue = this.navigatingValue || '';
         const empIdPattern = /^[A-Z]{4}\d{8}$/; // Staff ID format (INTN00235123) 
         if (empIdPattern.test(enteredValue)) {
           // Staff → Go to task-management
           this.router.navigate([`/task-management`], { skipLocationChange: false });
         } else {
           // Customer → Go to edit-new-hotel
           this.router.navigate([`/edit-new-hotel/${this.hotelId}`], { skipLocationChange: false });
         }
       } else {
         this.alertService.error(resetRes.message || "Failed to reset password.");
         this.alertClear();
       }
     }).catch(err => {
       this.alertService.error("Something went wrong during password reset.", this.options);
       this.alertClear();
     });
   } */

  // async resetNewPassword(): Promise<void> {
  //   this.localService.set('UserId', this.hotelId);
  //   const resetRequest = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: {
  //         username: String(this.forgot_phone_number)
  //       }
  //     },
  //     payload: {
  //       update: {
  //         password: this.passwordForm.value.new_password,
  //         password_to_customer: this.passwordForm.value.new_password
  //       }
  //     }
  //   };
  //   this.loginService.checkoutAPICall(ENDPOINTS.RESET_PASSWORD, resetRequest).then(async resetResp => {
  //     const resetRes: any = resetResp;
  //     if (resetRes.success === 1 && resetRes.status_code === 200) {
  //       this.alertService.success("Password reset successfully!", this.options);
  //       this.alertClear();
  //       this.localService.set('Password', this.passwordForm.value.new_password);
  //       // Determine if staff or customer based on navigatingValue
  //       const enteredValue = this.navigatingValue || '';
  //       const isEmailLogin = enteredValue.includes('@');
  //       const empIdPattern = /^[A-Z]{4}\d{8}$/;
  //       const isStaff = empIdPattern.test(enteredValue);
  //       // Re-fetch user data to get fresh details (same as signIn does)
  //       const fetchBody = {
  //         domain_name: DOMAIN_NAME,
  //         user_id: USER_ID,
  //         extras: {
  //           find: isEmailLogin
  //             ? { email: enteredValue }
  //             : { staff_employee_number: enteredValue }
  //         }
  //       };
  //       this.hotellistService.getSignupAllCustomers(fetchBody).subscribe(
  //         async (resp: any) => {
  //           if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
  //             const userData = resp.result.data[0];
  //             if (isStaff) {
  //               // ── Staff post-reset logic ──
  //               this.notificationService.clearAll();
  //               this.localService.set('CustomerType', 'Staff');
  //               this.localService.set('StaffData', JSON.stringify(userData));
  //               this.localService.set('hierarchy', JSON.stringify(userData.hierarchy));
  //               this.localService.set('UserId', Number(userData.staff_id));
  //               this.localService.set('CustomerId', Number(userData.id));
  //               this.localService.set('MemberId', userData.member_id);
  //               // Newly commented because no need of fo desk 
  //               // this.localService.set('frontOfficeDeskStaff', userData.front_office_desk);
  //               // End of newly commented code
  //               this.localService.set('domainName', DOMAIN_NAME);
  //               this.localService.set('Name', userData.first_name);
  //               // Staff hierarchy-based IDs
  //               const member = userData.member_id;
  //               const department = userData?.hierarchy?.map((item: any) => item.department);
  //               this.getAllStaffIds(userData.staff_id, department, member);
  //               // Update FCM token for staff
  //               try {
  //                 const userId: any = this.localService.get('UserId');
  //                 const token = await this.pushService.requestPermissionAndGetToken(userId);
  //                 const staffFetchBody = {
  //                   domain_name: DOMAIN_NAME,
  //                   user_id: USER_ID,
  //                   extras: { find: { id: userData.staff_id } }
  //                 };
  //                 this.taskManagementService.getAllStaves(staffFetchBody).subscribe(
  //                   (staffResp: any) => {
  //                     if (staffResp.success === 1 && staffResp.status_code === 200 && staffResp.result.data.length > 0) {
  //                       const staff = staffResp.result.data[0];
  //                       if (!Array.isArray(staff.fcm_token)) { staff.fcm_token = []; }
  //                       staff.fcm_token.push(token);
  //                       const updateBody = {
  //                         domain_name: DOMAIN_NAME,
  //                         user_id: USER_ID,
  //                         payload: { staff_updation: { fcm_token: staff.fcm_token } },
  //                         extras: { find: { id: userData.staff_id } }
  //                       };
  //                       this.staffService.updateStaff(updateBody).subscribe(
  //                         (updateResp: any) => {
  //                           if (!(updateResp.success === 1 && updateResp.status_code === 200)) {
  //                             console.error('Failed to update staff FCM token:', updateResp?.message);
  //                           }
  //                         },
  //                         (err: any) => { console.error('Error updating staff FCM token:', err); }
  //                       );
  //                     }
  //                   },
  //                   (err: any) => { console.error('Error fetching staff for FCM update:', err); }
  //                 );
  //               } catch (err) {
  //                 console.error('Failed to get FCM token for staff:', err);
  //               }
  //               // Navigate staff to task-management
  //               this.router.navigate(['/task-management'], { skipLocationChange: false });
  //             }
  //             else {
  //               // ── Customer post-reset logic ──
  //               this.localService.set('CustomerType', 'Customer');
  //               this.localService.set('UserId', Number(userData.id));
  //               const memberId = userData.customer_member_id ? userData.customer_member_id : userData.member_id;
  //               this.localService.set('MemberId', memberId);
  //               this.localService.set('domainName', DOMAIN_NAME);
  //               this.localService.set('Name', userData.first_name);
  //               this.localService.set('UserEmail', userData.email);
  //               this.localService.set('db_schema', userData.db_schema);
  //               this.dbSchema = userData.db_schema;
  //               // Role details
  //               const role_id = userData.role_id;
  //               const role_name = userData.role_name;
  //               this.localService.set('roleId', role_id);
  //               this.localService.set('roleName', role_name);
  //               if (role_id) {
  //                 this.getRoleById(role_id);
  //               }
  //               // Update FCM token for customer
  //               try {
  //                 const userId: any = this.localService.get('UserId');
  //                 const token = await this.pushService.requestPermissionAndGetToken(userId);
  //                 const customerFetchBody = {
  //                   domain_name: DOMAIN_NAME,
  //                   user_id: USER_ID,
  //                   extras: {
  //                     find: isEmailLogin
  //                       ? { email: enteredValue }
  //                       : { staff_employee_number: enteredValue }
  //                   }
  //                 };
  //                 this.hotellistService.getSignupAllCustomers(customerFetchBody).subscribe(
  //                   (fcmResp: any) => {
  //                     if (fcmResp.success === 1 && fcmResp.status_code === 200 && fcmResp.result.data.length > 0) {
  //                       const customer = fcmResp.result.data[0];
  //                       if (!Array.isArray(customer.fcm_token)) { customer.fcm_token = []; }
  //                       customer.fcm_token.push(token);
  //                       const updateBody = {
  //                         domain_name: DOMAIN_NAME,
  //                         user_id: USER_ID,
  //                         payload: { customer_update: { fcm_token: customer.fcm_token } },
  //                         extras: {
  //                           find: isEmailLogin
  //                             ? { email: enteredValue }
  //                             : { staff_employee_number: enteredValue }
  //                         }
  //                       };
  //                       this.hotelenrollmenttabviewService.updateCustomerFcm(updateBody).subscribe(
  //                         (updateResp: any) => {
  //                           if (!(updateResp.success === 1 && updateResp.status_code === 200)) {
  //                             console.error('Failed to update FCM token:', updateResp?.message);
  //                           }
  //                         },
  //                         (err: any) => { console.error('Error updating customer FCM token:', err); }
  //                       );
  //                     }
  //                   },
  //                   (err: any) => { console.error('Error fetching customer for FCM update:', err); }
  //                 );
  //               } catch (err) {
  //                 console.error('Failed to get FCM token for customer:', err);
  //               }
  //               // Navigate customer based on customer_member_id
  //               if (userData.customer_member_id) {
  //                 this.router.navigate([`/edit-new-hotel/${userData.id}`], { skipLocationChange: false });
  //               } else {
  //                 this.router.navigate(['/profile'], { skipLocationChange: false });
  //               }
  //             }
  //           }
  //         },
  //         (err: any) => {
  //           console.error('Error re-fetching user after password reset:', err);
  //         }
  //       );
  //     } else {
  //       this.alertService.error(resetRes.message || "Failed to reset password.");
  //       this.alertClear();
  //     }
  //   }).catch(err => {
  //     this.alertService.error("Something went wrong during password reset.", this.options);
  //     this.alertClear();
  //   });
  // }

  // Newly commanding & updating for port change
  /*   getAllCustomers() {
      const email = String(this.signupForm.value.email);
      const phoneNumber = String(this.signupForm.value.phone_number);
      // First check for email
      const emailRequestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { email: email }
        }
      };
      this.hotellistService.getSignupAllCustomers(emailRequestBody).subscribe(
        (emailResp: any) => {
          const emailExists = emailResp.success === 1 && emailResp.status_code === 200 && emailResp.result.data.length > 0;
          // Now check for phone number
          const phoneRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
              find: { phone_number: phoneNumber }
            }
          }
          this.hotellistService.getSignupAllCustomers(phoneRequestBody).subscribe(
            (phoneResp: any) => {
              this.loaderService.emitComplete();
              const phoneExists = phoneResp.success === 1 && phoneResp.status_code === 200 && phoneResp.result.data.length > 0;
              if (emailExists || phoneExists) {
                this.alertService.error("User with this email or phone number already exists. Please login.", this.options);
                this.alertClear();
                this.signup = false;
                this.login = true;
              } else {
                this.signup = false;
                this.hasEmailAndPhone = true;
                this.sendOTP(Number(phoneNumber));
                this.localStorageService.set('UserEmail', email);
                this.localStorageService.set('UserPhoneNumber', phoneNumber);
                this.phoneNumber = phoneNumber;
                this.email = email;
                // this.alertService.success("OTP has been sent to your mobile number.", this.options);
                this.alertClear();
                this.otp = true;
                // Newly added for browser back button
                history.pushState(null, '', location.href);
              }
            },
            (err: any) => this.handleSignupError(err)
          );
        },
        (err: any) => this.handleSignupError(err)
      );
    } */

  getAllCustomers() {
    const email = String(this.signupForm.value.email);
    const phoneNumber = String(this.signupForm.value.phone_number);
    // First check for email
    const emailRequestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { email: email }
      }
    };
    this.hotellistService.getSignupAllCustomers(emailRequestBody).subscribe(
      (emailResp: any) => {
        const emailExists = emailResp.success === 1 && emailResp.status_code === 200 && emailResp.result.data.length > 0;
        if (emailExists) {
          this.alertService.error("User with this email already exists. Please login.", this.options);
          this.alertClear();
          this.signup = false;
          this.login = true;
          this.signupForm.reset();
          this.otpForm.reset();
        }
        else {
          this.signup = false;
          this.hasEmailAndPhone = true;
          this.sendOTP(email, Number(phoneNumber));
          this.localStorageService.set('UserEmail', email);
          this.localStorageService.set('UserPhoneNumber', phoneNumber);
          this.phoneNumber = phoneNumber;
          this.email = email;
          // this.alertService.success("OTP has been sent to your mobile number.", this.options);
          this.alertClear();
          this.otp = true;
          // Newly added for browser back button
          history.pushState(null, '', location.href);
        }
      },
      (err: any) => this.handleSignupError(err)
    );
  }

  /*   login1() {
    this.signup = false;
    this.login = true;
    this.otp = false;
  } */

  login1() {
    this.signup = false;
    this.login = true;
    this.otp = false;
    this.password = false;
    this.forgotPassword = false;
    this.signupForm.reset();
    this.otpForm.reset();
    if (this.passwordForm) {
      this.passwordForm.reset();
    }
    this.alertService.clear();
  }

  /*  signUp() {
     this.login = false;
     this.signup = true;
     this.otp = false;
     // Newly added for browser back button
     history.pushState(null, '', location.href);
   } */

  signUp() {
    this.login = false;
    this.signup = true;
    this.otp = false;
    this.loginForm.reset();
    this.loginErrorMessage = '';
    this.alertService.clear();
    // Newly added for browser back button
    history.pushState(null, '', location.href);
  }

  //newly added for automatic login after password reset and ensuring tokens are set before calling protected APIs
  // async resetNewPassword(): Promise<void> {
  //   this.localService.set('UserId', this.hotelId);
  //   const resetRequest = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: {
  //         username: String(this.forgot_phone_number)
  //       }
  //     },
  //     payload: {
  //       update: {
  //         password: this.passwordForm.value.new_password,
  //         password_to_customer: this.passwordForm.value.new_password
  //       }
  //     }
  //   };
  //   try {
  //     const resetResp: any = await this.loginService.checkoutAPICall(ENDPOINTS.RESET_PASSWORD, resetRequest);
  //     if (!(resetResp && resetResp.success === 1 && resetResp.status_code === 200)) {
  //       this.alertService.error(resetResp?.message || "Failed to reset password.", this.options);
  //       this.alertClear();
  //       return;
  //     }
  //     this.alertService.success("Password reset successfully!", this.options);
  //     this.alertClear();
  //     this.localService.set('Password', this.passwordForm.value.new_password);
  //     // Identify login type
  //     const enteredValue = this.navigatingValue || '';
  //     const isEmailLogin = enteredValue.includes('@');
  //     const empIdPattern = /^[a-zA-Z]{2}[a-zA-Z0-9]*\d{8}$/;
  //     const isStaff = empIdPattern.test(enteredValue);
  //     const password = this.passwordForm.value.new_password;
  //     // Build username according to login type (do not always append -DOMAIN_NAME for staff)
  //     const loginUsername = isEmailLogin ? `${enteredValue}-${DOMAIN_NAME}` : enteredValue;
  //     const loginPayload = {
  //       domain_name: DOMAIN_NAME,
  //       username: loginUsername,
  //       password: password
  //     };
  //     const loginObservable = isEmailLogin ? this.appService.login(loginPayload) : this.appService.staffLogin(loginPayload);
  //     // Attempt automatic login and require tokens before calling protected APIs
  //     loginObservable.subscribe(
  //       (loginResp: any) => {
  //         if (!(loginResp && loginResp.success === 1 && loginResp.access_token)) {
  //           // Inform user and stop — password changed but automatic login failed
  //           this.alertService.success("Password reset succeeded. Please sign in with your new password.", this.options);
  //           this.alertClear();
  //           return;
  //         }
  //         // Set tokens and expiry
  //         this.authService.setExpiryTime(new Date().getTime() + (loginResp.access_token_expires_in * 1000));
  //         this.authService.setRTokenExpireTime(new Date().getTime() + (loginResp.refresh_token_expires_in * 1000));
  //         this.authService.setAccessToken(loginResp.access_token);
  //         this.authService.setRefreshToken(loginResp.refresh_token);
  //         // Clear global loggedOut flag so app.component guard won't auto-redirect to /login
  //         try {
  //           this.localStorageService.remove('loggedOut');
  //         } catch (e) {
  //           // fallback if different service instance used
  //           try { this.localService.remove('loggedOut'); } catch (err) { /* ignore */ }
  //         }
  //         // Now re-fetch user data and continue with existing protected calls
  //         const fetchBody = {
  //           domain_name: DOMAIN_NAME,
  //           user_id: USER_ID,
  //           extras: {
  //             find: isEmailLogin ? { email: enteredValue } : { staff_employee_number: enteredValue }
  //           }
  //         };
  //         this.hotellistService.getSignupAllCustomers(fetchBody).subscribe(
  //           async (resp: any) => {
  //             if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
  //               const userData = resp.result.data[0];
  //               if (isStaff) {
  //                 // Staff post-reset logic (unchanged)
  //                 this.notificationService.clearAll();
  //                 this.localService.set('CustomerType', 'Staff');
  //                 this.localService.set('StaffData', JSON.stringify(userData));
  //                 this.localService.set('hierarchy', JSON.stringify(userData.hierarchy));
  //                 this.localService.set('UserId', Number(userData.staff_id));
  //                 this.localService.set('CustomerId', Number(userData.id));
  //                 this.localService.set('MemberId', userData.member_id);
  //                 this.localService.set('domainName', DOMAIN_NAME);
  //                 this.localService.set('Name', userData.first_name);
  //                 const member = userData.member_id;
  //                 const department = userData?.hierarchy?.map((item: any) => item.department);
  //                 this.getAllStaffIds(userData.staff_id, department, member);
  //                 // Update staff FCM token (existing)
  //                 try {
  //                   const userId: any = this.localService.get('UserId');
  //                   const token = await this.pushService.requestPermissionAndGetToken(userId);
  //                   const staffFetchBody = {
  //                     domain_name: DOMAIN_NAME,
  //                     user_id: USER_ID,
  //                     extras: { find: { id: userData.staff_id } }
  //                   };
  //                   this.taskManagementService.getAllStaves(staffFetchBody).subscribe(
  //                     (staffResp: any) => {
  //                       if (staffResp.success === 1 && staffResp.status_code === 200 && staffResp.result.data.length > 0) {
  //                         const staff = staffResp.result.data[0];
  //                         if (!Array.isArray(staff.fcm_token)) { staff.fcm_token = []; }
  //                         staff.fcm_token.push(token);
  //                         const updateBody = {
  //                           domain_name: DOMAIN_NAME,
  //                           user_id: USER_ID,
  //                           payload: { staff_updation: { fcm_token: staff.fcm_token } },
  //                           extras: { find: { id: userData.staff_id } }
  //                         };
  //                         this.staffService.updateStaff(updateBody).subscribe(() => { }, (err: any) => { console.error('Error updating staff FCM token:', err); });
  //                       }
  //                     },
  //                     (err: any) => { console.error('Error fetching staff for FCM update:', err); }
  //                   );
  //                 } catch (err) {
  //                   console.error('Failed to get FCM token for staff:', err);
  //                 }
  //                 this.router.navigate(['/task-management'], { skipLocationChange: false });
  //               } else {
  //                 // Customer post-reset logic (unchanged)
  //                 this.localService.set('CustomerType', 'Customer');
  //                 this.localService.set('UserId', Number(userData.id));
  //                 const memberId = userData.customer_member_id ? userData.customer_member_id : userData.member_id;
  //                 this.localService.set('MemberId', memberId);
  //                 this.localService.set('domainName', DOMAIN_NAME);
  //                 this.localService.set('Name', userData.first_name);
  //                 this.localService.set('UserEmail', userData.email);
  //                 this.localService.set('db_schema', userData.db_schema);
  //                 this.dbSchema = userData.db_schema;
  //                 const role_id = userData.role_id;
  //                 const role_name = userData.role_name;
  //                 this.localService.set('roleId', role_id);
  //                 this.localService.set('roleName', role_name);
  //                 if (role_id) { await this.getRoleById(role_id); }
  //                 // Update customer FCM (existing)
  //                 try {
  //                   const userId: any = this.localService.get('UserId');
  //                   const token = await this.pushService.requestPermissionAndGetToken(userId);
  //                   const customerFetchBody = {
  //                     domain_name: DOMAIN_NAME,
  //                     user_id: USER_ID,
  //                     extras: { find: isEmailLogin ? { email: enteredValue } : { staff_employee_number: enteredValue } }
  //                   };
  //                   this.hotellistService.getSignupAllCustomers(customerFetchBody).subscribe(
  //                     (fcmResp: any) => {
  //                       if (fcmResp.success === 1 && fcmResp.status_code === 200 && fcmResp.result.data.length > 0) {
  //                         const customer = fcmResp.result.data[0];
  //                         if (!Array.isArray(customer.fcm_token)) { customer.fcm_token = []; }
  //                         customer.fcm_token.push(token);
  //                         const updateBody = {
  //                           domain_name: DOMAIN_NAME,
  //                           user_id: USER_ID,
  //                           payload: { customer_update: { fcm_token: customer.fcm_token } },
  //                           extras: { find: isEmailLogin ? { email: enteredValue } : { staff_employee_number: enteredValue } }
  //                         };
  //                         this.hotelenrollmenttabviewService.updateCustomerFcm(updateBody).subscribe(() => { }, (err: any) => { console.error('Error updating customer FCM token:', err); });
  //                       }
  //                     },
  //                     (err: any) => { console.error('Error fetching customer for FCM update:', err); }
  //                   );
  //                 } catch (err) {
  //                   console.error('Failed to get FCM token for customer:', err);
  //                 }

  //                 // Navigate based on member id
  //                 if (userData.customer_member_id) {
  //                   this.router.navigate([`/edit-new-hotel/${userData.id}`], { skipLocationChange: false });
  //                 } else {
  //                   this.router.navigate(['/profile'], { skipLocationChange: false });
  //                 }
  //               }
  //             } else {
  //               console.error('User not found after reset when re-fetching:', resp);
  //             }
  //           },
  //           (err: any) => {
  //             console.error('Error re-fetching user after password reset:', err);
  //           }
  //         );
  //       },
  //       (err: any) => {
  //         this.alertService.error('Automatic login failed after password reset. Please login manually.', this.options);
  //         this.alertClear();
  //       }
  //     );
  //   } catch (err) {
  //     this.alertService.error("Something went wrong during password reset.", this.options);
  //     this.alertClear();
  //   }
  // }

  async resetNewPassword(): Promise<void> {
    const enteredValue = this.navigatingValue || '';
    const isEmailLogin = enteredValue.includes('@');
    const fetchBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: isEmailLogin ? { email: enteredValue } : { staff_employee_number: enteredValue }
      }
    };

    this.hotellistService.getSignupAllCustomers(fetchBody).subscribe(
      async (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const userData = resp.result.data[0];

          // 1. Check if hotel_enabled is false
          const isStaffUser = userData.staff_employee_number != undefined;
          const isHotelDisabled = userData.hotel_enabled === false || userData.hotel_enabled === 'false';
          const isStatusApproved = (userData.status || '').toLowerCase() === 'approved';

          if (isHotelDisabled && (isStaffUser || isStatusApproved)) {
            this.loaderService.emitComplete();
            this.isHotelOwner = !!userData.customer_member_id && userData.staff_employee_number == undefined;
            this.isHotelOwnerLogin = this.isHotelOwner && userData.inactive_type === 'Subscription Expiry';
            this.deactivatedUserData = userData;
            this.showDeactivatedModal = true;
            this.alertService.error("Cannot reset password: account is deactivated.", this.options);
            this.alertClear();
            return;
          }

          // 2. Check if user/staff is active
          const isInactive = isStaffUser
            ? (userData.is_staff_active === false || userData.is_staff_active === 'false')
            : (userData.is_active === false || userData.is_active === 'false');

          if (isInactive) {
            this.loaderService.emitComplete();
            let accountType = 'user account';
            if (userData.staff_employee_number) {
              accountType = 'staff profile';
            } else if (userData.customer_member_id) {
              accountType = 'hotel account';
            }
            this.inactiveUserModalMessage = `Your ${accountType} is currently inactive. Please contact the administrator for assistance.`;
            this.showInactiveUserModal = true;
            this.alertService.error("Cannot reset password: account is inactive.", this.options);
            this.alertClear();
            return;
          }

          // Proceed with password update
          this.localService.set('UserId', this.hotelId);
          const resetRequest = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
              find: {
                username: String(this.mail)
              }
            },
            payload: {
              update: {
                password: this.passwordForm.value.new_password,
                password_to_customer: this.passwordForm.value.new_password
              }
            }
          };
          try {
            const resetResp: any = await this.loginService.checkoutAPICall(ENDPOINTS.RESET_PASSWORD, resetRequest);
            if (!(resetResp && resetResp.success === 1 && resetResp.status_code === 200)) {
              this.alertService.error(resetResp?.message || "Failed to reset password.", this.options);
              this.alertClear();
              return;
            }
            this.alertService.success("Password reset successfully!", this.options);
            this.alertClear();
            this.localService.set('Password', this.passwordForm.value.new_password);

            // Identify login type
            const empIdPattern = /^[a-zA-Z]{2}[a-zA-Z0-9]*\d{8}$/;
            const isStaff = empIdPattern.test(enteredValue);
            const password = this.passwordForm.value.new_password;
            // Build username according to login type (do not always append -DOMAIN_NAME for staff)
            const loginUsername = isEmailLogin ? `${enteredValue}-${DOMAIN_NAME}` : enteredValue;
            const loginPayload = {
              domain_name: DOMAIN_NAME,
              username: loginUsername,
              password: password
            };
            const loginObservable = isEmailLogin ? this.appService.login(loginPayload) : this.appService.staffLogin(loginPayload);
            // Attempt automatic login and require tokens before calling protected APIs
            loginObservable.subscribe(
              async (loginResp: any) => {
                if (!(loginResp && loginResp.success === 1 && loginResp.access_token)) {
                  // Inform user and stop — password changed but automatic login failed
                  this.alertService.success("Password reset succeeded. Please sign in with your new password.", this.options);
                  this.alertClear();
                  return;
                }
                // Set tokens and expiry
                this.authService.setExpiryTime(new Date().getTime() + (loginResp.access_token_expires_in * 1000));
                this.authService.setRTokenExpireTime(new Date().getTime() + (loginResp.refresh_token_expires_in * 1000));
                this.authService.setAccessToken(loginResp.access_token);
                this.authService.setRefreshToken(loginResp.refresh_token);
                // Clear global loggedOut flag so app.component guard won't auto-redirect to /login
                try {
                  this.localStorageService.remove('loggedOut');
                } catch (e) {
                  // fallback if different service instance used
                  try { this.localService.remove('loggedOut'); } catch (err) { /* ignore */ }
                }

                if (isStaff) {
                  // Staff post-reset logic (unchanged)
                  this.notificationService.clearAll();
                  this.localService.set('CustomerType', 'Staff');
                  this.localService.set('StaffData', JSON.stringify(userData));
                  this.localService.set('hierarchy', JSON.stringify(userData.hierarchy));
                  this.localService.set('UserId', Number(userData.staff_id));
                  this.localService.set('CustomerId', Number(userData.id));
                  this.localService.set('MemberId', userData.member_id);
                  this.localService.set('domainName', DOMAIN_NAME);
                  this.localService.set('Name', userData.first_name);
                  const member = userData.member_id;
                  const department = userData?.hierarchy?.map((item: any) => item.department);
                  this.getAllStaffIds(userData.staff_id, department, member);
                  // Update staff FCM token (existing)
                  try {
                    const userId: any = this.localService.get('UserId');
                    const token = await this.pushService.requestPermissionAndGetToken(userId);
                    const staffFetchBody = {
                      domain_name: DOMAIN_NAME,
                      user_id: USER_ID,
                      extras: { find: { id: userData.staff_id } }
                    };
                    this.taskManagementService.getAllStaves(staffFetchBody).subscribe(
                      (staffResp: any) => {
                        if (staffResp.success === 1 && staffResp.status_code === 200 && staffResp.result.data.length > 0) {
                          const staff = staffResp.result.data[0];
                          if (!Array.isArray(staff.fcm_token)) { staff.fcm_token = []; }
                          staff.fcm_token.push(token);
                          const updateBody = {
                            domain_name: DOMAIN_NAME,
                            user_id: USER_ID,
                            payload: { staff_updation: { fcm_token: staff.fcm_token } },
                            extras: { find: { id: userData.staff_id } }
                          };
                          this.staffService.updateStaff(updateBody).subscribe(() => { }, (err: any) => { console.error('Error updating staff FCM token:', err); });
                        }
                      },
                      (err: any) => { console.error('Error fetching staff for FCM update:', err); }
                    );
                  } catch (err) {
                    console.error('Failed to get FCM token for staff:', err);
                  }
                  this.router.navigate(['/task-management'], { skipLocationChange: false });
                }
                else {
                  // Customer post-reset logic (unchanged)
                  this.localService.set('CustomerType', 'Customer');
                  this.localService.set('UserId', Number(userData.id));
                  const memberId = userData.customer_member_id ? userData.customer_member_id : userData.member_id;
                  this.localService.set('MemberId', memberId);
                  this.localService.set('domainName', DOMAIN_NAME);
                  this.localService.set('Name', userData.first_name);
                  this.localService.set('UserEmail', userData.email);
                  this.localService.set('db_schema', userData.db_schema);
                  this.dbSchema = userData.db_schema;
                  const role_id = userData.role_id;
                  const role_name = userData.role_name;
                  this.localService.set('roleId', role_id);
                  this.localService.set('roleName', role_name);
                  if (role_id) { await this.getRoleById(role_id); }
                  // Update customer FCM (existing)
                  try {
                    const userId: any = this.localService.get('UserId');
                    const token = await this.pushService.requestPermissionAndGetToken(userId);
                    const customerFetchBody = {
                      domain_name: DOMAIN_NAME,
                      user_id: USER_ID,
                      extras: { find: isEmailLogin ? { email: enteredValue } : { staff_employee_number: enteredValue } }
                    };
                    this.hotellistService.getSignupAllCustomers(customerFetchBody).subscribe(
                      (fcmResp: any) => {
                        if (fcmResp.success === 1 && fcmResp.status_code === 200 && fcmResp.result.data.length > 0) {
                          const customer = fcmResp.result.data[0];
                          if (!Array.isArray(customer.fcm_token)) { customer.fcm_token = []; }
                          customer.fcm_token.push(token);
                          const updateBody = {
                            domain_name: DOMAIN_NAME,
                            user_id: USER_ID,
                            payload: { customer_update: { fcm_token: customer.fcm_token } },
                            extras: { find: isEmailLogin ? { email: enteredValue } : { staff_employee_number: enteredValue } }
                          };
                          this.hotelenrollmenttabviewService.updateCustomerFcm(updateBody).subscribe(() => { }, (err: any) => { console.error('Error updating customer FCM token:', err); });
                        }
                      },
                      (err: any) => { console.error('Error fetching customer for FCM update:', err); }
                    );
                  } catch (err) {
                    console.error('Failed to get FCM token for customer:', err);
                  }

                  // Navigate based on member id
                  if (userData.customer_member_id) {
                    this.router.navigate([`/edit-new-hotel/${userData.id}`], { skipLocationChange: false });
                  } else {
                    this.router.navigate(['/profile'], { skipLocationChange: false });
                  }
                }
              },
              (err: any) => {
                this.alertService.error('Automatic login failed after password reset. Please login manually.', this.options);
                this.alertClear();
              }
            );
          } catch (err) {
            this.alertService.error("Something went wrong during password reset.", this.options);
            this.alertClear();
          }
        } else {
          this.alertService.error("User not found.", this.options);
          this.alertClear();
        }
      },
      (err: any) => {
        this.alertService.error("Failed to verify user status.", this.options);
        this.alertClear();
      }
    );
  }

  // Newly added for is_active check purpose
  closeInactiveUserModal(): void {
    this.showInactiveUserModal = false;
    this.inactiveUserModalMessage = '';
    localStorage.clear();
    this.login1();
  }
  // End of newly added for is_active check purpose

}
