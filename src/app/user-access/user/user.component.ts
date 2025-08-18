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

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private router: ActivatedRoute,
    private routeUrl: Router,
    private authTokenService: AuthTokenService,
    private localService: LocalStorageService,
  ) { }

  ngOnInit(): void {
    let req_body = { "domain_name": "https://guestezee.ecbee.net", "user_id": 1, "extras": { "find": {} } }
    this.userService.clearEvent();
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
      name: this.formBuilder.control('', [Validators.maxLength(80)]),
      first_name: this.formBuilder.control('', [Validators.minLength(3), Validators.maxLength(40)]),
      last_name: this.formBuilder.control('', [Validators.minLength(3), Validators.maxLength(40)]),
      email: this.formBuilder.control('', [Validators.required, Validators.email]),
      role_name: this.formBuilder.control('', [Validators.required]),
      phone_number: this.formBuilder.control('', [Validators.required, Validators.maxLength(10), Validators.pattern("^[+]*[(]{0,1}[0-9]{10}[)]{0,1}[-\s\./0-9]*$")]),
      created_by_name: this.formBuilder.control(this.localService.get('UserName')),
      role_id: this.formBuilder.control(''),
      is_locked: this.formBuilder.control(false),
      is_active: this.formBuilder.control(false)
    })
    // Add password field only if enableEdit is false
    if (!this.enableEdit) {
      this.usersForm.addControl('db_schema', this.formBuilder.control(this.localService.get('db_schema')));
      this.usersForm.addControl('last_login', this.formBuilder.control(''));
      this.usersForm.addControl('is_password_reset_next_login', this.formBuilder.control(false));
      this.usersForm.addControl('password', this.formBuilder.control('', [Validators.required, Validators.minLength(6)]));
    }
    this.usersForm.get('role_name')?.valueChanges.subscribe(roleName => {
      const role = this.roleList.find(r => r.name === roleName);
      this.usersForm.patchValue({ role_id: role?.id || null });
    });

    this.getRoles();
  }

  getRoles() {
    // get roles list
    this.userService.getAllRoles().subscribe(
      resp => {
        this.roleList = resp.result.data;
        //console.log('Role list:', this.roleList);
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
  roleId: any;

  get f() { return this.usersForm.controls; }

  sendData() {
    //this.alertService.clear();
    this.editScreen = this.enableEdit;
    //console.log('Edit screen:', this.editScreen, this.roleList)
    this.showalertmsg = true;
    //console.log(this.usersForm, "this.usersForm.valid")
    //console.log(this.usersForm.valid, "this.usersForm.valid", this.usersForm.errors);
    Object.keys(this.usersForm.controls).forEach(field => {
      const control = this.usersForm.get(field);
      //console.log(`Field: ${field}, Valid: ${control?.valid}, Errors:`, control?.errors);
    });

    if (this.usersForm.valid) {
      this.loaderService.emitLoading();
      this.validateForm = false;
      var form_value = {} as Record<string, any>;
      form_value["name"] = this.usersForm.value.first_name + " " + this.usersForm.value.last_name;
      form_value["first_name"] = this.usersForm.value.first_name
      form_value["last_name"] = this.usersForm.value.last_name
      form_value["phone_number"] = this.usersForm.value.phone_number
      form_value["created_by_name"] = this.localService.get('UserName')
      form_value["role_id"] = this.usersForm.value.role_id;
      form_value["email"] = this.usersForm.value.email
      form_value["role_name"] = this.usersForm.value.role_name
      form_value["is_locked"] = this.usersForm.value.is_locked
      form_value["is_active"] = this.usersForm.value.is_active

      if (!this.enableEdit) {
        form_value["password"] = this.usersForm.value.password;
        form_value["created_by_id"] = this.localService.get('UserId');
        form_value["db_schema"] = this.localService.get('db_schema');
        form_value["last_login"] = '';
        form_value["is_password_reset_next_login"] = false
      }

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
          payload: { user_creation: form_value }
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
  }

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

    this.userService.getUserById(jsonObj).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        let respData = resp.result.data[0];
        //console.log('Active:', respData.is_active);
        //console.log('Locked:', respData.is_locked);
        //console.log(respData)
        this.usersForm.patchValue({
          name: respData.name,
          first_name: respData.first_name,
          last_name: respData.last_name,
          phone_number: respData.phone_number,
          email: respData.email,
          role_name: respData.role_name,
          created_by_name: respData.created_by_name,
          is_locked: respData.is_locked,
          is_active: respData.is_active,
          role_id: respData.role_id,
          // is_password_reset_next_login: respData.is_password_reset_next_login,
          // password: respData.password,    
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
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }

}