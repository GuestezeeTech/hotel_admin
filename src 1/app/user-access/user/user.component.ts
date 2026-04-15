import { HotelListService } from './../../hotel-list/hotel-list.service';
import { USER_ID } from './../../app.config';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from './user.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { DOMAIN_NAME } from '../../app.config';
import { ENDPOINTS } from '../../app.config';
import { HotelEnrollmentTabviewComponent } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.component';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})

export class UserComponent implements OnInit {
  users = [];
  showAddUserForm = false;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  editScreen: boolean = false;
  inventoryId: any;
  editorConfig: any;
  roleList = [] as any[];
  usersForm !: FormGroup;
  validateForm: boolean = false;
  intialValue: boolean = false;
  showalertmsg: boolean = true;
  enableEdit = false;
  isExitModalOpen: boolean = false;
  roleId: any;
  // Newly added
  memberId: any;
  // View-only mode (when opened from eye icon)
  isViewMode: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private router: ActivatedRoute,
    private routeUrl: Router,
    private authTokenService: AuthTokenService,
    private localService: LocalStorageService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private hotelListService: HotelListService
  ) { }

  ngOnInit(): void {
    let req_body = { "domain_name": "https://www.guestezee.com", "user_id": 1, "extras": { "find": {} } }
    this.userService.clearEvent();
    // Detect if opened in view-only mode
    const navState = window.history.state as any;
    this.isViewMode = navState?.mode === 'view';
    this.showalertmsg = true;
    //console.log('User name:', this.localService.get('UserName'), 'User id:', this.localService.get('UserId'), 'Db schema:', this.localService.get('db_schema'))
    // For getting id from router
    if (this.router.snapshot.params['id'] !== undefined) {
      this.inventoryId = this.router.snapshot.params['id'];
      this.enableEdit = true;
      this.setInitialValues(this.inventoryId);
    } else {
      this.editScreen = false;
    }
    this.editScreen = this.enableEdit;
    this.usersForm = new FormGroup({
      // email: this.formBuilder.control('', [Validators.required, Validators.email]),
      email: this.formBuilder.control('', [Validators.required, Validators.pattern(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/)]),
      role_name: this.formBuilder.control('', [Validators.required]),
      phone_number: this.formBuilder.control('', [Validators.required, Validators.required, Validators.maxLength(10), Validators.pattern(/^[1-9][0-9]{9}$/)]),
      created_by_name: this.formBuilder.control(this.localService.get('Name')),
      role_id: this.formBuilder.control(''),
      is_locked: this.formBuilder.control(false),
      is_active: this.formBuilder.control(false),
      // Newly added & commented
      first_name: this.formBuilder.control('', [Validators.required, Validators.pattern(/^[a-zA-Z]+[ a-zA-Z]+$/)]),
      last_name: this.formBuilder.control('', [Validators.required, Validators.pattern(/^[a-zA-Z]+[ a-zA-Z]+$/)]),
      // name: this.formBuilder.control('', [Validators.maxLength(80)])
      // Ended
    })
    // Add password control ALWAYS
    this.usersForm.addControl(
      'password',
      this.formBuilder.control('')
    );
    // console.log('Enable edit(User):', this.enableEdit);
    // Add password field only if enableEdit is false
    if (!this.enableEdit) {
      this.usersForm.addControl('db_schema', this.formBuilder.control(this.localService.get('db_schema')));
      this.usersForm.addControl('last_login', this.formBuilder.control(''));
      this.usersForm.addControl('is_password_reset_next_login', this.formBuilder.control(false));
      // this.usersForm.addControl('password', this.formBuilder.control('', [Validators.required, Validators.minLength(6)]));
      this.usersForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.usersForm.get('password')?.updateValueAndValidity();
    this.usersForm.get('role_name')?.valueChanges.subscribe(roleName => {
      const role = this.roleList.find(r => r.name === roleName);
      this.usersForm.patchValue({ role_id: role?.id || null });
    });
    // Newly added
    // this.getRoles();
    this.memberId = this.localService.get('MemberId');
    // console.log('Member id:', this.memberId);
    if (this.memberId) {
      this.getRoles();
    }
    else {
      console.warn("Member ID not found — not fetching roles");
    }

    // If in view mode, disable the entire form so nothing can be edited
    if (this.isViewMode) {
      this.usersForm.disable({ emitEvent: false });
    }
  }

  getRoles() {
    // get roles list
    this.userService.getAllRoles(this.memberId).subscribe(
      resp => {
        this.roleList = resp.result.data;
        // console.log('Role list:', this.roleList);
      },
      err => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.routeUrl.navigate([`/login`], { skipLocationChange: false });
        }
        if (err.error.message) {
          this.alertService.error(err.error.message, this.options)
        }
        else {
          this.alertService.error('Something bad happened while loading roles. Please try again!', this.options);
        }
      }
    )
  }

  get f() { return this.usersForm.controls; }

  /* sendData() {
    //this.alertService.clear();
    this.editScreen = this.enableEdit;
    //console.log('Edit screen:', this.editScreen, this.roleList)
    this.showalertmsg = true;
    //console.log(this.usersForm, "this.usersForm.valid")
    //console.log(this.usersForm.valid, "this.usersForm.valid", this.usersForm.errors);
    Object.keys(this.usersForm.controls).forEach(field => {
      const control = this.usersForm.get(field);
      // console.log(`Field: ${field}, Valid: ${control?.valid}, Errors:`, control?.errors);
    });
    this.validateForm = true;
    this.usersForm.markAllAsTouched();
    if (this.usersForm.invalid) {
      this.alertService.error("Please fill all mandatory fields correctly", this.options);
      return;
    }
    if (this.usersForm.valid) {
      this.loaderService.emitLoading();
      this.validateForm = false;
      var form_value = {} as Record<string, any>;
      form_value["phone_number"] = this.usersForm.value.phone_number
      form_value["created_by_name"] = this.localService.get('Name')
      form_value["role_id"] = this.usersForm.value.role_id;
      form_value["email"] = this.usersForm.value.email
      form_value["role_name"] = this.usersForm.value.role_name
      form_value["is_locked"] = this.usersForm.value.is_locked
      form_value["is_active"] = this.usersForm.value.is_active
      // Newly added & commented
      form_value["username"] = this.usersForm.value.email
      form_value["name"] = this.usersForm.value.name
      form_value["member_id"] = this.memberId
      // form_value["name"] = this.usersForm.value.first_name + " " + this.usersForm.value.last_name;
      // form_value["first_name"] = this.usersForm.value.first_name
      // form_value["last_name"] = this.usersForm.value.last_name
      // if (!this.enableEdit) {
      // form_value["password"] = this.usersForm.value.password;
      // Send password only if user typed something in edit mode
      if (this.editScreen) {
        form_value["password"] = this.usersForm.value.password ? this.usersForm.value.password : "";
      }
      else {
        // In add mode always send password
        form_value["password"] = this.usersForm.value.password;
      }
      form_value["created_by_id"] = this.localService.get('UserId');
      form_value["db_schema"] = 'GuestEzee';
      form_value["last_login"] = '';
      form_value["is_password_reset_next_login"] = false
      // }
      // Ended
      // console.log('Form value of user:', form_value);
      //UPDATE CALL
      if (this.editScreen) {
        //console.log('Edit1:', this.editScreen)
        let formatJson = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          payload: { users: form_value },
          extras: {
            find: {
              id: Number(this.inventoryId)
            }
          }
        }
        this.userService.updateUser(formatJson).subscribe(resp => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.alertService.success(resp.message, this.options);
              setTimeout(() => this.routeUrl.navigate(['/user-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
            }
            else if (resp.success === 0) {
              if (resp.message) {
                this.alertService.error(resp.message, this.options);
              }
            }
            else if (resp.message && resp.status_code !== 200) {
              this.alertService.error(resp.message, this.options);
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
        },
          err => {
            this.loaderService.emitComplete();
            if (err.error.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.options)
              this.routeUrl.navigate([`/login`], { skipLocationChange: false });
            }
            else if (err.error.message) {

              this.alertService.error(err.error.message, this.options)
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          })
      }
      else {
        //console.log()
        let formatJson = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          payload: {
            user_creation: form_value
          }
        }
        //console.log(formatJson)
        this.userService.addUser(formatJson).subscribe(resp => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.alertService.success(resp.message, this.options);
              setTimeout(() => this.routeUrl.navigate(['/user-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
            }
            else if (resp.success === 0) {
              if (resp.message) {
                this.alertService.error(resp.message, this.options);
              }
            }
            else if (resp.message && resp.status_code !== 200) {
              this.alertService.error(resp.message, this.options);
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
        },
          err => {
            this.loaderService.emitComplete();
            if (err.error.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.options)
              this.routeUrl.navigate([`/login`], { skipLocationChange: false });
            }

            else if (err.error.message) {

              this.alertService.error(err.error.message, this.options)
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          })
      }
    }
    else {
      this.validateForm = true;
    }
  } */

  /*   sendData() {
      //this.alertService.clear();
      this.editScreen = this.enableEdit;
      //console.log('Edit screen:', this.editScreen, this.roleList)
      this.showalertmsg = true;
      //console.log(this.usersForm, "this.usersForm.valid")
      //console.log(this.usersForm.valid, "this.usersForm.valid", this.usersForm.errors);
      Object.keys(this.usersForm.controls).forEach(field => {
        const control = this.usersForm.get(field);
        // console.log(`Field: ${field}, Valid: ${control?.valid}, Errors:`, control?.errors);
      });
      this.validateForm = true;
      this.usersForm.markAllAsTouched();
      if (this.usersForm.invalid) {
        this.alertService.error("Please fill all mandatory fields correctly", this.options);
        return;
      }
      if (this.usersForm.valid) {
        this.loaderService.emitLoading();
        this.validateForm = false;
        var form_value = {} as Record<string, any>;
        form_value["phone_number"] = this.usersForm.value.phone_number
        form_value["created_by_name"] = this.localService.get('Name')
        form_value["role_id"] = this.usersForm.value.role_id;
        form_value["email"] = this.usersForm.value.email
        form_value["role_name"] = this.usersForm.value.role_name
        form_value["is_locked"] = this.usersForm.value.is_locked
        form_value["is_active"] = this.usersForm.value.is_active
        // Newly added & commented
        // form_value["username"] = this.usersForm.value.email
        // form_value["name"] = this.usersForm.value.name
        form_value["member_id"] = this.memberId
        // form_value["name"] = this.usersForm.value.first_name + " " + this.usersForm.value.last_name;
        form_value["first_name"] = this.usersForm.value.first_name
        form_value["last_name"] = this.usersForm.value.last_name
        // if (!this.enableEdit) {
        // form_value["password"] = this.usersForm.value.password;
        // Send password only if user typed something in edit mode
        if (this.editScreen) {
          form_value["password"] = this.usersForm.value.password ? this.usersForm.value.password : "";
        }
        else {
          // In add mode always send password
          form_value["password"] = this.usersForm.value.password;
        }
        form_value["created_by_id"] = this.localService.get('UserId');
        form_value["db_schema"] = 'GuestEzee';
        form_value["last_login"] = '';
        form_value["is_password_reset_next_login"] = false
        // }
        // Ended
        // console.log('Form value of user:', form_value);
        //UPDATE CALL
        if (this.editScreen) {
          //console.log('Edit1:', this.editScreen)
          let formatJson = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { users: form_value },
            extras: {
              find: {
                id: Number(this.inventoryId)
              }
            }
          }
          this.hotelenrollmenttabviewService.updateCustomerFcm(formatJson).subscribe(resp => {
            this.loaderService.emitComplete();
            if (resp) {
              if (resp.success === 1 && resp.status_code === 200) {
                this.alertService.success(resp.message, this.options);
                setTimeout(() => this.routeUrl.navigate(['/user-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
              }
              else if (resp.success === 0) {
                if (resp.message) {
                  this.alertService.error(resp.message, this.options);
                }
              }
              else if (resp.message && resp.status_code !== 200) {
                this.alertService.error(resp.message, this.options);
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.options);
              }
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          },
            err => {
              this.loaderService.emitComplete();
              if (err.error.statusCode === 403) {
                this.alertService.error('Session Time Out! Please login Again', this.options)
                this.routeUrl.navigate([`/login`], { skipLocationChange: false });
              }
              else if (err.error.message) {
  
                this.alertService.error(err.error.message, this.options)
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.options);
              }
            })
        }
        else {
          //console.log()
          let formatJson = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              user_creation: form_value
            }
          }
          //console.log(formatJson)
          this.hotelenrollmenttabviewService.addCustomerSignup(formatJson).subscribe((resp: any) => {
            this.loaderService.emitComplete();
            if (resp) {
              if (resp.success === 1 && resp.status_code === 200) {
                this.alertService.success(resp.message, this.options);
                setTimeout(() => this.routeUrl.navigate(['/user-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
              }
              else if (resp.success === 0) {
                if (resp.message) {
                  this.alertService.error(resp.message, this.options);
                }
              }
              else if (resp.message && resp.status_code !== 200) {
                this.alertService.error(resp.message, this.options);
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.options);
              }
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          },
            err => {
              this.loaderService.emitComplete();
              if (err.error.statusCode === 403) {
                this.alertService.error('Session Time Out! Please login Again', this.options)
                this.routeUrl.navigate([`/login`], { skipLocationChange: false });
              }
              else if (err.error.message) {
                this.alertService.error(err.error.message, this.options)
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.options);
              }
            })
        }
      }
      else {
        this.validateForm = true;
      }
    } */

  sendData() {
    this.showalertmsg = true;
    this.validateForm = true;
    this.usersForm.markAllAsTouched();
    if (this.usersForm.invalid) {
      this.alertService.error("Please fill all mandatory fields correctly", this.options);
      return;
    }
    const inputMemberId = this.localService.get('MemberId');
    // console.log('Input member id:', inputMemberId);
    this.loaderService.emitLoading();
    // Step 1: Fetch customers by member_id
    const formatJsonMemberId = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { member_id: inputMemberId } }
    };
    // console.log('Format json(1):', formatJsonMemberId);
    this.hotelListService.getSignupAllCustomers(formatJsonMemberId).subscribe(resp1 => {
      const list1 = resp1?.result?.data || [];
      console.log('List(1):', list1);
      // Step 2: Fetch customers by customer_member_id
      const formatJsonCustomerMemberId = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { customer_member_id: inputMemberId } }
      };
      // console.log('Format json(2):', formatJsonCustomerMemberId);
      this.hotelListService.getSignupAllCustomers(formatJsonCustomerMemberId).subscribe(resp2 => {
        const list2 = resp2?.result?.data || [];
        // console.log('List(2):', list2);
        const customersList = [...list1, ...list2];
        // console.log('Customers List:', customersList);
        // Determine which user to update (existing duplicate or explicit edit)
        let existingCustomer = null;
        if (this.editScreen) {
          // Edit mode → always update current inventoryId
          existingCustomer = { id: Number(this.inventoryId) };
        } else {
          // Add mode → check duplicates by email or phone
          existingCustomer = customersList.find(cust =>
            cust.email === this.usersForm.value.email || cust.phone_number === this.usersForm.value.phone_number
          );
        }
        //  if(existingCustomer){
        //   console.log('Existing customer id:', existingCustomer.id);
        //  }
        // Check if existing customer has staff_employee_number or customer_member_id
        let hasStaffOrCustomerId = false;
        if (existingCustomer && existingCustomer.id) {
          const existingCustomerData = customersList.find(cust => cust.id === existingCustomer.id);
          if (existingCustomerData) {
            hasStaffOrCustomerId = !!(existingCustomerData.staff_employee_number || existingCustomerData.customer_member_id);
          }
        }
        // console.log('Has staff or customer id:', hasStaffOrCustomerId);
        // Build form value
        const form_value: Record<string, any> = {
          phone_number: this.usersForm.value.phone_number,
          created_by_name: this.localService.get('Name'),
          role_id: this.usersForm.value.role_id,
          email: this.usersForm.value.email,
          role_name: this.usersForm.value.role_name,
          is_locked: this.usersForm.value.is_locked,
          is_active: this.usersForm.value.is_active,
          first_name: this.usersForm.value.first_name,
          last_name: this.usersForm.value.last_name,
          password: this.editScreen
            ? this.usersForm.value.password ? this.usersForm.value.password : ""
            : this.usersForm.value.password,
          password_to_customer: this.editScreen
            ? this.usersForm.value.password ? this.usersForm.value.password : ""
            : this.usersForm.value.password,
          created_by_id: this.localService.get('UserId'),
          db_schema: 'GuestEzee',
          last_login: '',
          is_password_reset_next_login: false,
          member_id: inputMemberId
        };
        // Add status: "approved" only for customers (not for staff or hotel customers)
        // Customers are identified by NOT having staff_employee_number or customer_member_id keys
        if (!hasStaffOrCustomerId) {
          form_value['status'] = 'approved';
        }
        if (existingCustomer) {
          // UPDATE EXISTING CUSTOMER
          const formatJson = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { users: form_value },
            extras: { find: { id: existingCustomer.id } }
          };
          this.hotelenrollmenttabviewService.updateUserCustomer(formatJson).subscribe(
            resp => {
              this.loaderService.emitComplete();
              if (resp && resp.success === 1 && resp.status_code === 200) {
                this.alertService.success('User updated successfully', this.options);
                setTimeout(() =>
                  this.routeUrl.navigate(['/user-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000
                );
              } else {
                this.alertService.error(resp.message || 'Something bad happened. Please try again!', this.options);
              }
            },
            err => {
              this.loaderService.emitComplete();
              if (err.error?.statusCode === 403) {
                this.alertService.error('Session Time Out! Please login Again', this.options);
                this.routeUrl.navigate(['/login'], { skipLocationChange: false });
              } else {
                this.alertService.error(err.error?.message || 'Something bad happened. Please try again!', this.options);
              }
            }
          );
        }
        else {
          // ADD NEW CUSTOMER
          const formatJson = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { user_creation: form_value }
          };
          this.hotelenrollmenttabviewService.addUserCustomer(formatJson).subscribe(
            (resp: any) => {
              this.loaderService.emitComplete();
              if (resp && resp.success === 1 && resp.status_code === 200) {
                this.alertService.success('User created successfully', this.options);
                setTimeout(() =>
                  this.routeUrl.navigate(['/user-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000
                );
              } else {
                this.alertService.error(resp.message || 'Something bad happened. Please try again!', this.options);
              }
            },
            err => {
              this.loaderService.emitComplete();
              if (err.error?.statusCode === 403) {
                this.alertService.error('Session Time Out! Please login Again', this.options);
                this.routeUrl.navigate(['/login'], { skipLocationChange: false });
              } else {
                this.alertService.error(err.error?.message || 'Something bad happened. Please try again!', this.options);
              }
            }
          );
        }
      }, err2 => {
        this.loaderService.emitComplete();
        this.alertService.error('Failed to fetch customers by customer_member_id.', this.options);
      });

    }, err1 => {
      this.loaderService.emitComplete();
      this.alertService.error('Failed to fetch customers by member_id.', this.options);
    });
  }

  /* setInitialValues(inventory_id: any) {
    this.editScreen = true
    let jsonObj = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "id": parseInt(inventory_id)
        }
      }
    }
    this.userService.getUserById(jsonObj).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        let respData = resp.result.data[0];
        //console.log('Active:', respData.is_active);
        //console.log('Locked:', respData.is_locked);
        //console.log(respData)
        this.usersForm.patchValue({
          name: respData.name,
          phone_number: respData.phone_number,
          email: respData.email,
          role_name: respData.role_name,
          created_by_name: respData.created_by_name,
          is_locked: respData.is_locked,
          is_active: respData.is_active,
          role_id: respData.role_id,
          // is_password_reset_next_login: respData.is_password_reset_next_login,
          password: '',
          // first_name: respData.first_name,        
          // last_name: respData.last_name,
        })
      }
      else {
        this.alertService.error('Something bad happened. Please try again!', this.options);
      }
    },
      err => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.routeUrl.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertService.error(err.error.message, this.options)
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
      })

  } */

  setInitialValues(inventory_id: any) {
    this.editScreen = true
    let jsonObj = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "id": parseInt(inventory_id)
        }
      }
    }
    this.hotelenrollmenttabviewService.getLoginCustomerById(jsonObj).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        let respData = resp.result.data[0];
        //console.log('Active:', respData.is_active);
        //console.log('Locked:', respData.is_locked);
        //console.log(respData)
        this.usersForm.patchValue({
          // name: respData.name,
          phone_number: respData.phone_number,
          email: respData.email,
          role_name: respData.role_name,
          created_by_name: respData.created_by_name,
          is_locked: respData.is_locked,
          is_active: respData.is_active,
          role_id: respData.role_id,
          // is_password_reset_next_login: respData.is_password_reset_next_login,
          password: '',
          first_name: respData.first_name,
          last_name: respData.last_name,
        })
      }
      else {
        this.alertService.error('Something bad happened. Please try again!', this.options);
      }
    },
      err => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.routeUrl.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertService.error(err.error.message, this.options)
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
      })
  }

  // cancelData(){
  //   this.routeUrl.navigate(['/user'], { skipLocationChange: false })
  //   // if(!confirm("Do you want to cancel the changes?"))
  //   // {
  //   //   return
  //   // }
  //   if(!this.editScreen){,
  //   this.usersForm.reset(
  //     {
  //     username: '',
  //     password: '',
  //     first_name:'',
  //     last_name:'',
  //     email:'',
  //     role_name: '',
  //     role_id:'',
  //     is_password_reset_next_login:false,
  //     is_locked:false,
  //     is_active:false,
  //     }
  //   );
  //   }
  //   else{
  //     this.setInitialValues(this.inventoryId);
  //   }
  //   this.getRoles();
  //   this.validateForm = false;
  // }

  // resetData(){
  //   // if(!confirm("Do you want to reset the changes?"))
  //   // {
  //   //   return
  //   // }
  //   this.usersForm.reset(
  //     {
  //     username: '',
  //     password: '',
  //     first_name:'',
  //     last_name:'',
  //     email:'',
  //     role_name: '',
  //     role_id:'',
  //     is_password_reset_next_login:false,
  //     is_locked:false,
  //     is_active:false,
  //     }
  //   )
  // }

  handleRoles(evt: any) {
    if (evt.target.value === "") {
      this.usersForm.controls['role_name'].setValue("")
      this.usersForm.controls['role_id'].setValue("")
    }
    else {
      let target_value = evt.target.value.split(",")
      this.usersForm.controls['role_name'].setValue(target_value[0])
      this.usersForm.controls['role_id'].setValue(target_value[1])
    }
  }

  toggleAddUser() {
    this.showAddUserForm = true;
  }

  togglCloseAddUser() {
    this.routeUrl.navigate(['/user-list'])
  }

  openExitModal() {
    // In view mode just go back without confirmation
    if (this.isViewMode) {
      this.routeUrl.navigate(['/user-list']);
      return;
    }
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }

  validatePhoneNumber(event: any) {
    let value = event.target.value;
    // Block alphabets & special characters — allow only digits
    value = value.replace(/[^0-9]/g, '');
    // not start with 0
    if (value.startsWith('0')) {
      value = value.substring(1);
    }
    // not exceed 10 digits
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    // Update back to input
    event.target.value = value;
    // Also update form control
    this.usersForm.get('phone_number')?.setValue(value);
  }


}