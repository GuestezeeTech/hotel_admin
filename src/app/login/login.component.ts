import { TaskManagementComponent } from './../task-management/task-management.component';
import { USER_ID, DOMAIN_NAME } from './../app.config';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, UntypedFormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AlertsService } from '../shared/alerts/alerts.service';
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
  forgot_phone_number: any;
  mail: any;
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

  constructor(private fb: FormBuilder, private alertService: AlertsService,
    private appService: LoginService,
    private authService: AuthTokenService,
    private localService: LocalStorageService,
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
    private technicalInfoService: TechnicalInfoService
  ) { }

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
      group['otp' + i] = [''];
    }

    // Assign the group to the form
    this.otpForm = this.fb.group(group);
    this.passwordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
      confirm_password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]]
    });
    this.checkIfHierarchyExists();
  }

  get f() { return this.loginForm.controls; }

  // Newly added 
  get s() { return this.signupForm.controls; }

  get p() { return this.passwordForm.controls; }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const formData = this.loginForm.value;
      //console.log('Form Data:', formData);
      this.signIn();

    } else {
      //console.log('Form is invalid');
      this.loginForm.markAllAsTouched();  // Mark all controls as touched to trigger validation
    }
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
    //console.log('signIn');
    this.alertService.clear();
    this.showalertmsg = true;
    if (this.loginForm.valid) {
      //console.log('signIn');
      this.loaderService.emitLoading();
      this.validateForm = false;
      this.loginData = {
        username: this.loginForm.value.email + '-' + DOMAIN_NAME,
        password: this.loginForm.value.password
      };

      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            email: this.loginForm.value.email
          }
        }
      }
      //console.log('signIn',requestBody);
      this.hotellistService.getSignupAllCustomers(requestBody).subscribe(
        (resp: any) => {
          if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
            const userData = resp.result.data[0];
            //console.log('User Data:',userData);
            this.appService.login(this.loginData).subscribe(
              (resp: any) => {
                if (resp && resp.success === 1 && resp.status_code === 200) {
                  // Staff type
                  if (userData.staff_employee_number != undefined) {
                    this.localService.set('CustomerType', 'Staff');
                    this.localService.set('StaffData', JSON.stringify(userData));
                    this.localService.set('hierarchy', JSON.stringify(userData.hierarchy));
                    this.localService.set('UserId', Number(userData.staff_id));
                    //console.log('Hierarchy:',this.localService.get('hierarchy'));
                    this.router.navigate(['/task-management']);
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
                    if (userData.status == 'approved') {
                      this.router.navigate(['/dashboard']);
                    }
                    else {
                      this.router.navigate([`/edit-new-hotel/${userData.id}`]);
                    }
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
                  console.log('UserId:', this.localService.get('UserId'));
                  // Set tokens and basic user info
                  this.authService.setExpiryTime(new Date().getTime() + (resp.access_token_expires_in * 1000));
                  this.authService.setRTokenExpireTime(new Date().getTime() + (resp.refresh_token_expires_in * 1000));
                  this.authService.setAccessToken(resp.access_token);
                  this.authService.setRefreshToken(resp.refresh_token);
                  this.localService.set('UserEmail', userData.email);
                  this.localService.set('db_schema', userData.db_schema);
                  this.localService.set('Password', String(this.loginForm.value.password));
                  this.localService.set('Name', userData.first_name);
                  this.dbSchema = userData.db_schema;
                  this.localService.set('domainName', DOMAIN_NAME);
                  this.localService.set('MemberId', userData.customer_member_id);
                  // console.log('Login Member id:', this.localService.get('MemberId'));


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
                  this.alertClear();
                } else {
                  this.alertService.error('Something bad happened. Please try again!', this.options);
                  this.alertClear();
                }
              }
            );
          } else {
            this.loaderService.emitComplete();
            this.alertService.error('Email not found. Please signup first!', this.options);
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

  getServiceById(callback: (value: boolean) => void) {
    const checkExistingServiceAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_id: Number(this.localService.get('UserId'))
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
            customer_id: this.hotelId
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
          customer_id: Number(this.localService.get('UserId'))
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
          customer_id: Number(this.localService.get('UserId'))
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
          if (this.orderdata?.status === 'Order Confirmed') {
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
          this.profileService.updateProfileImage(profile_image || '../../assets/images/guestezee/profile.png');
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
              "domain_name": this.authService.getDomain(),
              "user_id": this.authService.getUserId(),
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
  login1() {
    this.signup = false;
    this.login = true;
  }

  signUp() {
    this.login = false;
    this.signup = true;
  }

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
    if (this.loginForm.value.email == '') {
      this.alertService.error("Please enter email", this.options);
    }
    else {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID, //Default user id
        "extras": {
          "find": {
            email: this.loginForm.value.email
            // phone_number: phoneNumber
          }
        }
      }
      this.hotellistService.getSignupAllCustomers(requestBody).subscribe(
        (resp: any) => {
          this.loaderService.emitComplete();
          if (resp.success === 1 && resp.status_code === 200) {
            if (resp.result.data.length > 0) {
              this.customerList = resp.result.data[0];
              //console.log(this.customerList);
              this.forgot_phone_number = resp.result.data[0].phone_number;
              this.mail = resp.result.data[0].email;
              if (this.localService.get('CusromerType') === 'Staff') {
                this.hotelId = resp.result.data[0].staff_id;
              }
              else {
                this.hotelId = resp.result.data[0].id;
              }
              //console.log(this.hotelId);
              this.sendOTP(Number(this.forgot_phone_number));
              this.alertService.success("OTP has been sent to your mobile number.", this.options);
              this.forgotPassword = true
              this.login = false;
              this.otp = true;
            }
            else {
              this.alertService.error("Email not found. Please signup first!", this.options);
              this.otp = true;
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
              this.sendOTP(Number(phoneNumber));
              this.localStorageService.set('UserEmail', email);
              this.localStorageService.set('UserPhoneNumber', phoneNumber);
              this.phoneNumber = phoneNumber;
              this.email = email;
              this.alertService.success("OTP has been sent to your mobile number.", this.options);
              this.alertClear();
              this.otp = true;
            }
          },
          (err: any) => this.handleSignupError(err)
        );
      },
      (err: any) => this.handleSignupError(err)
    );
  }

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


  sendOTP(mobileNo: number) {
    return new Promise((resolve, reject) => {
      let requestData = {
        "domain_name": DOMAIN_NAME,
        "data": {
          "otp": {
            "countrycode": "+91",
            "mobile": mobileNo,
            "otppurpose": "signup"
          }
        }
      }
      this.loginService.checkoutAPICall(ENDPOINTS.SEND_OTP, requestData).then(
        respData => {
          let res: any = respData;
          if (res.success === 1) {
            resolve(true);
          }
          else {
            resolve(false);
          }
        }
      )
    })
  }

  resendOtp() {
    alert("OTP sent successfully to your mobile number.");
    this.alertClear();
    Object.keys(this.otpForm.controls).forEach(key => {
      this.otpForm.controls[key].setValue('');
    });
    this.sendOTP(this.phoneNumber);
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

  verifyOTP(phoneNumber: number) {
    const otp = this.otpArray.map(i => this.otpForm.get('otp' + i)?.value).join('');
    //console.log('OTP Entered:', otp);
    return new Promise((resolve, reject) => {
      let requestData = {
        "domain_name": DOMAIN_NAME,
        "data": {
          "otp": {
            "userotp": otp,
            "mobile": phoneNumber
          }
        }
      }
      this.loginService.checkoutAPICall(ENDPOINTS.VERIFY_OTP, requestData).then(
        respdata => {
          let res: any = respdata;
          if (res.success === 1) {
            resolve({ status: true, msg: res.message });
            this.alertService.success('OTP verified successfully!', this.options);
            this.alertClear();
            this.otp = false;
            this.password = true;
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
        "data": {
          "otp": {
            "userotp": otp,
            "mobile": this.forgot_phone_number
          }
        }
      }
      this.loginService.checkoutAPICall(ENDPOINTS.VERIFY_OTP, requestData).then(
        respdata => {
          let res: any = respdata;
          if (res.success === 1) {
            resolve({ status: true, msg: res.message });
            this.alertService.success('OTP verified successfully!', this.options);
            this.alertClear();
            this.otp = false;
            this.password = true;
          }
          else {
            resolve({ status: false, msg: res.message });
            this.alertService.error('OTP verification failed!', this.options);
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
      // //console.log("Password Data :", this.passwordData);
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

  resetNewPassword() {
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
        this.router.navigate([`/edit-new-hotel/${this.hotelId}`], { skipLocationChange: false });
        // Navigate to login or other page here
      } else {
        this.alertService.error(resetRes.message || "Failed to reset password.");
        this.alertClear();
      }
    }).catch(err => {
      this.alertService.error("Something went wrong during password reset.", this.options);
      this.alertClear();
    });


  }

  async customerCreate(): Promise<void> {
    return new Promise((resolve, reject) => {
      let customerObject = {
        phone_number: this.phoneNumber,
        email: String(this.email),
        password: String(this.passwordData),
        password_to_customer: String(this.passwordData),
        status: 'pending',
        send_email: true
      }
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          customer_creation: customerObject
        }
      }
      this.hotelenrollmenttabviewService.addCustomerSignup(requestBody).subscribe(
        (resp: any) => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              // //console.log(resp);
              this.authService.setExpiryTime(new Date().getTime() + (resp.access_token_expires_in * 1000));
              this.authService.setRTokenExpireTime(new Date().getTime() + (resp.refresh_token_expires_in * 1000));
              this.authService.setAccessToken(resp.access_token);
              this.authService.setRefreshToken(resp.refresh_token);
              this.hotelenrollmenttabviewService.clearAdminFormEvent();
              this.alertService.success(resp.message, this.options);
              this.alertClear();
              this.customerdata = resp.result.data[0];
              //console.log(this.customerdata, "cst");
              this.localService.set('UserEmail', this.customerdata.email);
              this.localService.set('UserId', this.customerdata.id);
              this.localService.set('Password', this.passwordForm.value.new_password);
              this.localService.set('CustomerType', 'Customer');
              //console.log('Password:', this.localService.get('Password'))
              //console.log('User id:', this.localService.get('UserId'))
              // this.localService.set('currentTab', 0);
              // this.localService.set('maxTabReached', 'undefined');
              // this.localService.set('db_schema', this.customerdata.db_schema);
              // this.dbSchema =this.customerdata.db_schema;
              this.localService.set('domainName', this.customerdata.domain_name);
              // this.appService.dbSchema = resp.userData.db_schema;
              this.router.navigate([`/edit-new-hotel/${this.customerdata.id}`]);
              // this.router.navigate(["/add-new-hotel"]);
            }
            else if (resp.success === 0) {
              if (resp.message) {
                this.alertService.error(resp.message, this.options);
                this.alertClear();
              }
            }
            else if (resp.message && resp.status_code !== 200) {
              this.alertService.error(resp.message, this.options);
              this.alertClear();
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
              this.alertClear();
            }
          }
        },
        (err: any) => {
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
    }, 3000);
  }

}
