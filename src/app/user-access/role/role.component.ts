import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleService } from './role.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserAccessService } from '../user-access.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { ENDPOINTS } from '../../app.config';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { Alert } from '../../shared/alerts/alerts.model';
import { AlertsComponent } from '../../shared/alerts/alerts.component';

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent],
  templateUrl: './role.component.html',
  styleUrl: './role.component.scss'
})

export class RoleComponent implements OnInit {
  roles: any = [];
  isStandardRole: boolean = true;
  isActive: boolean = true;
  showAddRoleForm = false;
  validateForm: boolean = false;
  dashboardForm !: FormGroup;
  customersForm !: FormGroup;
  paymentForm !: FormGroup;
  systemSettingsForm !: FormGroup;
  marketingForm !: FormGroup;
  userAccessForm !: FormGroup;
  roleForm !: FormGroup;
  editScreen: boolean = false;
  eventlistForm!: FormGroup;
  authorizationForm !: FormGroup;
  storeSetupForm !: FormGroup;
  storeFrontForm !: FormGroup;
  enableEdit = false;
  showalertmsg: boolean = true;
  isExitModalOpen: boolean = false;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  alertOptions = {
    autoClose: true,
    keepAfterRouteChange: true
  };
  roleName: string | null = null;
  roleId: any;

  constructor(
    private roleService: RoleService,
    private formBuilder: FormBuilder,
    private router: ActivatedRoute,
    private userAccessService: UserAccessService,
    private localService: LocalStorageService,
    private authTokenService: AuthTokenService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private routeUrl: Router,
  ) { }

  ngOnInit(): void {
    this.roleName = this.localService.get('roleName');
    this.roleService.clearAdminFormEvent();
    this.roleForm = new FormGroup({
      role_name: this.formBuilder.control('', [Validators.required, Validators.maxLength(40), Validators.minLength(3)]),
      is_standard: this.formBuilder.control(false),
      is_active: this.formBuilder.control(false)
    })
    //console.log('Standard Role:', this.roleForm.controls['is_standard'].value)
    //console.log('Active:', this.roleForm.controls['is_active'].value)
    this.dashboardForm = new FormGroup({
      create: this.formBuilder.control(false),
      edit: this.formBuilder.control(false),
      read: this.formBuilder.control(false),
      delete: this.formBuilder.control(false),
      all: this.formBuilder.control(false)
    })
    this.customersForm = new FormGroup({
      create: this.formBuilder.control(false),
      edit: this.formBuilder.control(false),
      read: this.formBuilder.control(false),
      delete: this.formBuilder.control(false),
      all: this.formBuilder.control(false)
    })
    this.marketingForm = new FormGroup({
      create: this.formBuilder.control(false),
      edit: this.formBuilder.control(false),
      read: this.formBuilder.control(false),
      delete: this.formBuilder.control(false),
      all: this.formBuilder.control(false)
    })
    this.paymentForm = new FormGroup({
      create: this.formBuilder.control(false),
      edit: this.formBuilder.control(false),
      read: this.formBuilder.control(false),
      delete: this.formBuilder.control(false),
      all: this.formBuilder.control(false)
    })
    this.userAccessForm = new FormGroup({
      create: this.formBuilder.control(false),
      edit: this.formBuilder.control(false),
      read: this.formBuilder.control(false),
      delete: this.formBuilder.control(false),
      all: this.formBuilder.control(false)
    })
    this.systemSettingsForm = new FormGroup({
      create: this.formBuilder.control(false),
      edit: this.formBuilder.control(false),
      read: this.formBuilder.control(false),
      delete: this.formBuilder.control(false),
      all: this.formBuilder.control(false)
    })
    // For getting id from router
    if (this.router.snapshot.params['id'] !== undefined) {
      this.roleId = this.router.snapshot.params['id'];
      this.setInitialValues(this.roleId);
    } else {
      this.editScreen = false;
    }
    // if (this.editScreen) {
    //   this.setInitialValues(this.roleId)
    //   if (!this.userAccessService.getUserAccess().AUTHORIZATION.has_edit_permission) {
    //     this.enableEdit = false;
    //     this.roleForm.disable();
    //     this.dashboardForm.disable();
    //     this.customersForm.disable();
    //     this.marketingForm.disable();
    //     this.paymentForm.disable();
    //     this.userAccessForm.disable();
    //     this.systemSettingsForm.disable();
    //   }
    // }
    // this.roleService.currentData.subscribe(currentData => {
    //   if (this.editScreen) {
    //     if (!this.userAccessService.getUserAccess().AUTHORIZATION.has_edit_permission) {
    //       if (currentData === 'saveData') {
    //         this.alertService.error('Sorry, you do not have permission to Save data.', this.alertOptions);
    //       }
    //       else if (currentData === 'cancelData') {
    //         this.cancelForm();
    //       }
    //       else if (currentData === 'resetData') {
    //         this.alertService.error('Sorry, you do not have permission to reset data.', this.alertOptions);
    //       }
    //     }
    //     else {
    //       if (currentData === 'saveData') {
    //         this.saveForm();
    //       }
    //       else if (currentData === 'cancelData') {
    //         this.cancelForm();
    //       }
    //       else if (currentData === 'resetData') {
    //         this.resetForm();
    //       }
    //     }
    //   }
    //   else {
    //     if (currentData === 'saveData') {
    //       this.saveForm();
    //     }
    //     else if (currentData === 'cancelData') {
    //       this.cancelForm();
    //     }
    //     else if (currentData === 'resetData') {
    //       this.resetForm();
    //     }
    //   }
    // })

  }

  get f() { return this.roleForm.controls };

  // For checking all options in modules
  allOptions(option: any) {
    if (option === "dashboard") {
      this.dashboardForm.controls['create'].setValue(true);
      this.dashboardForm.controls['edit'].setValue(true);
      this.dashboardForm.controls['read'].setValue(true);
      this.dashboardForm.controls['delete'].setValue(true);
    }
    else if (option === "specDashboard") {
      this.dashboardForm.controls['all'].setValue(false);
    }
    else if (option === "customers") {
      this.customersForm.controls['create'].setValue(true);
      this.customersForm.controls['edit'].setValue(true);
      this.customersForm.controls['read'].setValue(true);
      this.customersForm.controls['delete'].setValue(true);
    }
    else if (option === "specCustomers") {
      this.customersForm.controls['all'].setValue(false);
    }
    else if (option === "payment") {
      this.paymentForm.controls['create'].setValue(true);
      this.paymentForm.controls['edit'].setValue(true);
      this.paymentForm.controls['read'].setValue(true);
      this.paymentForm.controls['delete'].setValue(true);
    }
    else if (option === "specPayment") {
      this.paymentForm.controls['all'].setValue(false);
    }
    else if (option === "marketing") {
      this.marketingForm.controls['create'].setValue(true);
      this.marketingForm.controls['edit'].setValue(true);
      this.marketingForm.controls['read'].setValue(true);
      this.marketingForm.controls['delete'].setValue(true);
    }
    else if (option === "specMarketing") {
      this.marketingForm.controls['all'].setValue(false);
    }
    else if (option === "systemSettings") {
      this.systemSettingsForm.controls['create'].setValue(true);
      this.systemSettingsForm.controls['edit'].setValue(true);
      this.systemSettingsForm.controls['read'].setValue(true);
      this.systemSettingsForm.controls['delete'].setValue(true);
    }
    else if (option === "specSystemSettings") {
      this.systemSettingsForm.controls['all'].setValue(false);
    }
    else if (option === "userAccess") {
      this.userAccessForm.controls['create'].setValue(true);
      this.userAccessForm.controls['edit'].setValue(true);
      this.userAccessForm.controls['read'].setValue(true);
      this.userAccessForm.controls['delete'].setValue(true);
    }
    else if (option === "specUserAccess") {
      this.userAccessForm.controls['all'].setValue(false);
    }
  }

  // For setting existing values
  setInitialValues(roleId: any) {
    this.roleId = roleId;
    let jsonObj = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "id": Number(roleId)
        }
      }
    }
    this.loaderService.emitLoading();
    this.roleService.postApiCall(jsonObj, ENDPOINTS.GETBYID_ROLES).subscribe(resp => {
      this.loaderService.emitComplete();
      if (resp.success === 1 && resp.status_code === 200) {
        let respData = resp.result.data[0];
        this.roleForm.controls["role_name"].setValue(respData.name)
        this.roleForm.controls["is_standard"].setValue(respData.is_standard)
        this.roleForm.controls["is_active"].setValue(respData.is_active)
        respData.modules.forEach((element: any) => {
          if (element.module_name === "DASHBOARD") {
            this.dashboardForm.controls["create"].setValue(element.permission.has_add_permission)
            this.dashboardForm.controls["edit"].setValue(element.permission.has_edit_permission)
            this.dashboardForm.controls["read"].setValue(element.permission.has_read_permission)
            this.dashboardForm.controls["delete"].setValue(element.permission.has_delete_permission)
          }
          else if (element.module_name === "CUSTOMERS") {
            this.customersForm.controls["create"].setValue(element.permission.has_add_permission)
            this.customersForm.controls["edit"].setValue(element.permission.has_edit_permission)
            this.customersForm.controls["read"].setValue(element.permission.has_read_permission)
            this.customersForm.controls["delete"].setValue(element.permission.has_delete_permission)
          }
          else if (element.module_name === "MARKETING") {
            this.marketingForm.controls["create"].setValue(element.permission.has_add_permission)
            this.marketingForm.controls["edit"].setValue(element.permission.has_edit_permission)
            this.marketingForm.controls["read"].setValue(element.permission.has_read_permission)
            this.marketingForm.controls["delete"].setValue(element.permission.has_delete_permission)
          }
          else if (element.module_name === "PAYMENT") {
            this.paymentForm.controls["create"].setValue(element.permission.has_add_permission)
            this.paymentForm.controls["edit"].setValue(element.permission.has_edit_permission)
            this.paymentForm.controls["read"].setValue(element.permission.has_read_permission)
            this.paymentForm.controls["delete"].setValue(element.permission.has_delete_permission)
          }
          else if (element.module_name === "USER ACCESS") {
            this.userAccessForm.controls["create"].setValue(element.permission.has_add_permission)
            this.userAccessForm.controls["edit"].setValue(element.permission.has_edit_permission)
            this.userAccessForm.controls["read"].setValue(element.permission.has_read_permission)
            this.userAccessForm.controls["delete"].setValue(element.permission.has_delete_permission)
          }
          else if (element.module_name === "SYSTEM SETTINGS") {
            this.systemSettingsForm.controls["create"].setValue(element.permission.has_add_permission)
            this.systemSettingsForm.controls["edit"].setValue(element.permission.has_edit_permission)
            this.systemSettingsForm.controls["read"].setValue(element.permission.has_read_permission)
            this.systemSettingsForm.controls["delete"].setValue(element.permission.has_delete_permission)
          }
        },
          this.enableEdit = true,
          this.showAddRoleForm = true);
      }
    })
  }

  // For again navigatinh to listing page
  cancelForm() {
    this.routeUrl.navigate(['/role-listing']);
  }

  // For resetting form values to empty and unchecked
  resetForm() {
    this.validateForm = false;
    this.roleForm.controls["role_name"].setValue("");
    this.roleForm.controls["is_standard"].setValue(false);
    this.roleForm.controls["is_active"].setValue(false);
    this.dashboardForm.controls["create"].setValue(false);
    this.dashboardForm.controls["edit"].setValue(false);
    this.dashboardForm.controls["read"].setValue(false);
    this.dashboardForm.controls["delete"].setValue(false);
    this.dashboardForm.controls["all"].setValue(false);
    this.customersForm.controls["create"].setValue(false);
    this.customersForm.controls["edit"].setValue(false);
    this.customersForm.controls["read"].setValue(false);
    this.customersForm.controls["delete"].setValue(false);
    this.customersForm.controls["all"].setValue(false);
    this.paymentForm.controls["create"].setValue(false);
    this.paymentForm.controls["edit"].setValue(false);
    this.paymentForm.controls["read"].setValue(false);
    this.paymentForm.controls["delete"].setValue(false);
    this.paymentForm.controls["all"].setValue(false);
    this.marketingForm.controls["create"].setValue(false);
    this.marketingForm.controls["edit"].setValue(false);
    this.marketingForm.controls["read"].setValue(false);
    this.marketingForm.controls["delete"].setValue(false);
    this.marketingForm.controls["all"].setValue(false);
    this.userAccessForm.controls["create"].setValue(false);
    this.userAccessForm.controls["edit"].setValue(false);
    this.userAccessForm.controls["read"].setValue(false);
    this.userAccessForm.controls["delete"].setValue(false);
    this.userAccessForm.controls["all"].setValue(false);
    this.systemSettingsForm.controls["create"].setValue(false);
    this.systemSettingsForm.controls["edit"].setValue(false);
    this.systemSettingsForm.controls["read"].setValue(false);
    this.systemSettingsForm.controls["delete"].setValue(false);
    this.systemSettingsForm.controls["all"].setValue(false);
  }

  // For add new role - create
  saveForm() {
    this.alertService.clear();
    this.showalertmsg = true;
    if (this.roleForm.valid) {
      if (!this.dashboardForm.value.create && !this.dashboardForm.value.edit && !this.dashboardForm.value.read && !this.dashboardForm.value.delete && !this.marketingForm.value.create && !this.marketingForm.value.edit && !this.marketingForm.value.read && !this.marketingForm.value.delete && !this.customersForm.value.create && !this.customersForm.value.edit && !this.customersForm.value.read && !this.customersForm.value.delete && !this.paymentForm.value.create && !this.paymentForm.value.edit && !this.paymentForm.value.read && !this.paymentForm.value.delete && !this.userAccessForm.value.create && !this.userAccessForm.value.edit && !this.userAccessForm.value.read && !this.userAccessForm.value.delete && !this.systemSettingsForm.value.create && !this.systemSettingsForm.value.edit && !this.systemSettingsForm.value.read && !this.systemSettingsForm.value.delete) {
        this.alertService.error("Please select atleast one permission for the Role given", this.options);
      }
      else {
        this.validateForm = false;
        this.loaderService.emitLoading();
        let rolePermissions = [
          {
            "module_name": "DASHBOARD",
            "permission": {
              "has_add_permission": this.dashboardForm.value.create,
              "has_edit_permission": this.dashboardForm.value.edit,
              "has_read_permission": this.dashboardForm.value.read,
              "has_delete_permission": this.dashboardForm.value.delete
            }
          },
          {
            "module_name": "CUSTOMERS",
            "permission": {
              "has_add_permission": this.customersForm.value.create,
              "has_edit_permission": this.customersForm.value.edit,
              "has_read_permission": this.customersForm.value.read,
              "has_delete_permission": this.customersForm.value.delete
            }
          },
          {
            "module_name": "PAYMENT",
            "permission": {
              "has_add_permission": this.paymentForm.value.create,
              "has_edit_permission": this.paymentForm.value.edit,
              "has_read_permission": this.paymentForm.value.read,
              "has_delete_permission": this.paymentForm.value.delete
            }
          },
          {
            "module_name": "MARKETING",
            "permission": {
              "has_add_permission": this.marketingForm.value.create,
              "has_edit_permission": this.marketingForm.value.edit,
              "has_read_permission": this.marketingForm.value.read,
              "has_delete_permission": this.marketingForm.value.delete
            }
          },
          {
            "module_name": "SYSTEM SETTINGS",
            "permission": {
              "has_add_permission": this.systemSettingsForm.value.create,
              "has_edit_permission": this.systemSettingsForm.value.edit,
              "has_read_permission": this.systemSettingsForm.value.read,
              "has_delete_permission": this.systemSettingsForm.value.delete
            }
          },
          {
            "module_name": "USER ACCESS",
            "permission": {
              "has_add_permission": this.userAccessForm.value.create,
              "has_edit_permission": this.userAccessForm.value.edit,
              "has_read_permission": this.userAccessForm.value.read,
              "has_delete_permission": this.userAccessForm.value.delete
            }
          }
        ]
        var payloadData = {
          name: this.roleForm.value.role_name,
          is_standard: this.roleForm.value.is_standard,
          is_active: this.roleForm.value.is_active,
          modules: rolePermissions
        }
        if (true) {
          let requestData = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              role_updation: payloadData
            },
            // extras: {
            //   find: {
                // id: Number(this.roleId)
            //   }
            // }
          }
          this.roleService.postApiCall(requestData, ENDPOINTS.CREATE_ROLES).subscribe(resp => {
            this.loaderService.emitComplete();
            if (resp) {
              if (resp.success === 1 && resp.status_code === 200) {
                this.roleService.clearAdminFormEvent();
                this.alertService.success(resp.message, this.options);
                setTimeout(() => this.routeUrl.navigate(['/role-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
              }
              else if (resp.success === 0) {
                if (resp.message) {
                  this.alertService.error(resp.message, this.alertOptions);
                }
              }
              else if (resp.message && resp.status_code !== 200) {
                this.alertService.error(resp.message, this.alertOptions);
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
              }
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          },
            err => {
              this.loaderService.emitComplete();
              if (err.error.statusCode === 403) {
                this.alertService.error('Session Time Out! Please login Again', this.options)
                this.routeUrl.navigate([`/login`], { skipLocationChange: false });
              }
              else if (err.error.message) {
                this.alertService.error(err.error.message, this.alertOptions)
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
              }
            })
        }
      }
    }
    else {
      this.validateForm = true;
    }
  }

  // For updating role - updates based on id
  saveFormChanges() {
    this.alertService.clear();
    this.showalertmsg = true;
    if (this.roleForm.valid) {
      if (!this.dashboardForm.value.create && !this.dashboardForm.value.edit && !this.dashboardForm.value.read && !this.dashboardForm.value.delete && !this.marketingForm.value.create && !this.marketingForm.value.edit && !this.marketingForm.value.read && !this.marketingForm.value.delete && !this.customersForm.value.create && !this.customersForm.value.edit && !this.customersForm.value.read && !this.customersForm.value.delete && !this.paymentForm.value.create && !this.paymentForm.value.edit && !this.paymentForm.value.read && !this.paymentForm.value.delete && !this.userAccessForm.value.create && !this.userAccessForm.value.edit && !this.userAccessForm.value.read && !this.userAccessForm.value.delete && !this.systemSettingsForm.value.create && !this.systemSettingsForm.value.edit && !this.systemSettingsForm.value.read && !this.systemSettingsForm.value.delete) {
        this.alertService.error("Please select atleast one permission for the Role given", this.options);
      }
      else {
        this.validateForm = false;
        this.loaderService.emitLoading();
        let rolePermissions = [
          {
            "module_name": "DASHBOARD",
            "permission": {
              "has_add_permission": this.dashboardForm.value.create,
              "has_edit_permission": this.dashboardForm.value.edit,
              "has_read_permission": this.dashboardForm.value.read,
              "has_delete_permission": this.dashboardForm.value.delete
            }
          },
          {
            "module_name": "CUSTOMERS",
            "permission": {
              "has_add_permission": this.customersForm.value.create,
              "has_edit_permission": this.customersForm.value.edit,
              "has_read_permission": this.customersForm.value.read,
              "has_delete_permission": this.customersForm.value.delete
            }
          },
          {
            "module_name": "PAYMENT",
            "permission": {
              "has_add_permission": this.paymentForm.value.create,
              "has_edit_permission": this.paymentForm.value.edit,
              "has_read_permission": this.paymentForm.value.read,
              "has_delete_permission": this.paymentForm.value.delete
            }
          },
          {
            "module_name": "MARKETING",
            "permission": {
              "has_add_permission": this.marketingForm.value.create,
              "has_edit_permission": this.marketingForm.value.edit,
              "has_read_permission": this.marketingForm.value.read,
              "has_delete_permission": this.marketingForm.value.delete
            }
          },
          {
            "module_name": "SYSTEM SETTINGS",
            "permission": {
              "has_add_permission": this.systemSettingsForm.value.create,
              "has_edit_permission": this.systemSettingsForm.value.edit,
              "has_read_permission": this.systemSettingsForm.value.read,
              "has_delete_permission": this.systemSettingsForm.value.delete
            }
          },
          {
            "module_name": "USER ACCESS",
            "permission": {
              "has_add_permission": this.userAccessForm.value.create,
              "has_edit_permission": this.userAccessForm.value.edit,
              "has_read_permission": this.userAccessForm.value.read,
              "has_delete_permission": this.userAccessForm.value.delete
            }
          }
        ]
        var payloadData = {
          name: this.roleForm.value.role_name,
          is_standard: this.roleForm.value.is_standard,
          is_active: this.roleForm.value.is_active,
          modules: rolePermissions
        }
        //console.log('Role id:', this.roleId)
        let requestData = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          payload: {
            role_creation: payloadData
          },
          "extras": {
            "find": {
              "id": Number(this.roleId)
            }
          }
        }
        this.roleService.postApiCall(requestData, ENDPOINTS.UPDATE_ROLES).subscribe(resp => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.roleService.clearAdminFormEvent();
              // this.showAddRoleForm = false;
              this.resetForm();
              this.alertService.success(resp.message, this.options);
              setTimeout(() => this.routeUrl.navigate(['/role-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
              // this.routeUrl.navigate(['/role-listing']);
            }
            else if (resp.success === 0) {
              if (resp.message) {
                this.alertService.error(resp.message, this.alertOptions);
              }
            }
            else if (resp.message && resp.status_code !== 200) {
              this.alertService.error(resp.message, this.alertOptions);
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
          }
        },
          err => {
            this.loaderService.emitComplete();
            if (err.error.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.options)
              this.routeUrl.navigate([`/login`], { skipLocationChange: false });
            }
            else if (err.error.message) {

              this.alertService.error(err.error.message, this.alertOptions)
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          })
      }
    }
    else {
      this.validateForm = true;
    }
  }

  openExitModal() {
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }
}

