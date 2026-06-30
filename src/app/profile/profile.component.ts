import { USER_ID } from './../app.config';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthTokenService } from '../auth-services/auth-token.service'; // For calling methods in auth-token
import { LocalStorageService } from '../auth-services/local-storage.service'; // For getting data's from local storage
import { DOMAIN_NAME, ENDPOINTS } from '../app.config'; // For getting endpoints
import { LoaderService } from '../shared/loader/loader.service';
import { LoginService } from '../login/login.service'; // For getting service methods
import { Router } from '@angular/router';
import { UntypedFormGroup, UntypedFormBuilder, Validators, FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms'; // For validating forms
import { AlertsService } from '../shared/alerts/alerts.service'; // For alert services
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { ProfileService } from './profile.service';
import { AlertsComponent } from "../shared/alerts/alerts.component";
import { HotelListService } from '../hotel-list/hotel-list.service';
import { TaskManagementService } from '../task-management/task-management.service';
import { PushService } from '../services/push.service';
import { StaffService } from '../user-access/staff/staff.service';
import { UserAccessService } from '../user-access/user-access.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AlertsComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  // For online/offline
  isOnline: boolean = true;

  // Modal
  isPasswordModalOpen = false;
  isEmailModalOpen = false;

  // For eye visibility
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  mail: any;
  currentEmail = '';
  newEmail = '';
  currentEmailError = '';
  newEmailError = '';
  adminUserData: any = {};
  maskedPassword: string = "********";
  userRegistartionForm!: UntypedFormGroup;
  passwordUpdateForm!: UntypedFormGroup;
  validFirstName: boolean = false;
  validLastName: boolean = false;
  isExitModalOpen: boolean = false;
  validateForm2: Boolean = false;
  validateImage: Boolean = false;
  hotelId: Number | null = null;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  customerType: any;
  addBrandForm !: FormGroup;
  previewImgUrl: string | null = null;
  imageName: string = '';
  enableEdit: boolean = true;
  imgFile: File | null = null;
  // profile_image: string | null = '../../assets/images/guestezee/profile.png';
  profile_image: string | null = 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp';


  constructor(
    private localService: LocalStorageService,
    private authService: AuthTokenService,
    private loaderService: LoaderService,
    private formBuilder: UntypedFormBuilder,
    private fb: FormBuilder,
    private router: Router,
    private alertService: AlertsService,
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private profileService: ProfileService,
    // Newly added & commented for logout
    private hotellistService: HotelListService,
    private taskManagementService: TaskManagementService,
    private pushService: PushService,
    private staffService: StaffService,
    private userAccessService: UserAccessService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService
  ) { }

  ngOnInit(): void {
    this.hotelId = Number(this.localService.get('UserId'));
    this.customerType = this.localService.get('CustomerType');
    // this.getAdminProfileDetails();
    this.profileService.getAdminProfileDetails(this.hotelId, this.customerType).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        const data = resp.result.data[0];
        //console.log("data", data);
        this.mail = this.localService.get('UserEmail');
        //console.log("mail", this.mail);
        const profileImage = data?.profile_image?.trim() || null;
        // this.profile_image = profileImage || '../../assets/images/guestezee/profile.png';
        this.profile_image = profileImage || 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp';
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
        // Updates the profile service
        this.profileService.updateProfileImage(profileImage);
        this.profileService.updateProfileName(profileName);
        // Patch form values
        if (this.customerType === 'Staff') {
          this.userRegistartionForm.patchValue({
            full_name: data?.full_name || '',
            profile_image: profileImage
          });
        }
        else {
          this.userRegistartionForm.patchValue({
            first_name: data?.first_name || '',
            last_name: data?.last_name || '',
            profile_image: profileImage
          });
        }
      }
    });
    this.initializeForms();
    //console.log('Form Initialized:', this.userRegistartionForm);
  }


  // Initialize both profile and password update forms
  initializeForms() {
    if (this.customerType === 'Staff') {
      this.userRegistartionForm = this.formBuilder.group({
        full_name: ['', [Validators.maxLength(40), Validators.pattern("^[a-zA-Z][a-z A-Z]*$")]],
        // profile_image: '../../assets/images/guestezee/profile.png',
        profile_image: 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp',
        imageFile: [''],
      });
    }
    else {
      this.userRegistartionForm = this.formBuilder.group({
        first_name: ['', [Validators.maxLength(40), Validators.pattern("^[a-zA-Z][a-z A-Z]*$")]],
        last_name: ['', [Validators.maxLength(40), Validators.pattern("^[a-zA-Z][a-z A-Z]*$")]],
        // profile_image: '../../assets/images/guestezee/profile.png',
        profile_image: 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp',
        imageFile: [''],
      });
    }
    this.passwordUpdateForm = this.fb.group({
      current_password: ['', [Validators.minLength(6), Validators.required]],
      new_password: ['', [Validators.minLength(6), Validators.required]],
      confirm_password: ['', [Validators.minLength(6), Validators.required]],
    },
      // Newly added for matching new password and confirm password
      {
        validators: this.passwordMatchValidator('new_password', 'confirm_password')
      });
    // End of newly added for matching new password and confirm password
  }

  get f() { return this.userRegistartionForm.controls; }
  get p() { return this.passwordUpdateForm.controls; }

  formCheck() {
    if (this.customerType === 'Staff') {
      this.validFirstName = this.f['full_name'].invalid;
    }
    else {
      this.validFirstName = this.f['first_name'].invalid;
      this.validLastName = this.f['last_name'].invalid;
    }
    if (this.userRegistartionForm.valid) {
      this.profileUpdate(this.profile_image);
    }
  }

  imageupload(event: any): void {
    let dragEvent = false;
    let file_data = { name: "", size: 0 };
    let originalFile: File | null = null;

    if (event.target && event.target.files && event.target.files[0]) {
      originalFile = event.target.files[0];
      file_data = event.target.files[0];
    } else if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      originalFile = event.dataTransfer.files[0];
      file_data = event.dataTransfer.files[0];
      dragEvent = true;
    }

    if (!originalFile) {
      return;
    }

    this.validateImage = true;
    this.imageName = file_data.name;
    let splitFileName = this.imageName.split(".");

    if (Math.round((file_data.size / 1000)) > 2000) {
      this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizehigh': true });
      this.alertService.error("File size must be less than 2MB.", this.options);
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    if (!["jpg", "jpeg", "png", "gif", "JPG", "JPEG", "PNG", "GIF"].includes(splitFileName[splitFileName.length - 1])) {
      this.userRegistartionForm.controls['imageFile'].setErrors({ 'type': true });
      this.alertService.error("Invalid image format. Allowed types: JPG, JPEG, PNG, GIF.", this.options);
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    this.userRegistartionForm.controls['imageFile'].setErrors({ 'type': false });
    this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizehigh': false });

    // Validate dimensions: must be exactly 200 x 200 pixels to look good in header profile
    const img = new Image();
    img.src = window.URL.createObjectURL(originalFile);
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      window.URL.revokeObjectURL(img.src);

      if (width !== 200 || height !== 200) {
        this.userRegistartionForm.controls['imageFile'].setErrors({ 'dimensions': true });
        this.alertService.error(`Image dimensions must be exactly 200 × 200 pixels. (Uploaded image: ${width} × ${height} pixels)`, this.options);
        if (event.target) {
          event.target.value = '';
        }
        return;
      }

      // Valid size - proceed with preview and upload original file to maintain quality
      this.imgFile = originalFile;
      
      const reader = new FileReader();
      reader.onload = (evt: any) => {
        this.previewImgUrl = evt.target.result;
        this.userRegistartionForm.controls['imageFile'].setValue(evt.target.result);
      };
      reader.readAsDataURL(originalFile);

      let headers = new HttpHeaders().set("source", "Brand").set("domain_name", DOMAIN_NAME);
      let formData_imageCate = new FormData();
      formData_imageCate.append('upload', originalFile);

      this.profileService.sendImage(formData_imageCate, headers).subscribe(resp => {
        if (resp && resp.success === 1 && resp.status_code === 200) {
          let imgVariable = resp.result.data[0];
          this.profile_image = imgVariable.location;
          this.profileUpdate(this.profile_image, "Profile image uploaded successfully!");
        }
        if (event.target) {
          event.target.value = '';
        }
      }, error => {
        this.alertService.error("Error uploading profile image.", this.options);
        if (event.target) {
          event.target.value = '';
        }
      });
    };

    img.onerror = () => {
      window.URL.revokeObjectURL(img.src);
      this.alertService.error('Invalid image file.', this.options);
      if (event.target) {
        event.target.value = '';
      }
    };
  }

  deleteImage() {
    // this.profile_image = '../../assets/images/guestezee/profile.png';
    this.profile_image = 'https://images.ecbee.net/GuestEzee/Brand/ChatGPT_Image_Jun_19__2026__01_25_37_PM.webp';
    this.profileUpdate(this.profile_image, "Profile image deleted successfully!");
    this.userRegistartionForm.controls['imageFile'].setErrors({ 'type': false });
    this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizehigh': false });
    this.closeExitModal();

  }

  // getAdminProfileDetails() {
  //   let jsonObj = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": 16,
  //     "extras": {
  //       "find": { "id": this.hotelId }
  //     }
  //   };
  //   this.profileService.postApiCall(jsonObj, ENDPOINTS.GET_LOGIN_CUSTOMER).subscribe(resp => {
  //     //console.log("Fetched Profile Data:", resp);
  //     if (resp.success === 1 && resp.status_code === 200) {
  //       this.adminUserData = {
  //         ...resp.result.data[0],
  //         profile_image: resp.result.data[0]?.profile_image ?? '../../assets/images/guestezee/profile.png'
  //       };

  //       if (!this.adminUserData) {
  //         //console.error("No admin user data returned!");
  //         return;
  //       }

  //       //console.log("Updated Profile Details:", this.adminUserData);
  //       //console.log(this.adminUserData)
  //       if (this.adminUserData) {
  //         this.userRegistartionForm.patchValue({
  //           first_name: this.adminUserData.first_name || '',
  //           last_name: this.adminUserData.last_name || '',
  //           profile_image: this.adminUserData.profile_image
  //         });

  //         // this.localService.set('profile_image', this.adminUserData.profile_image);
  //         // Update the profile image using BehaviorSubject
  //         const firstName = this.adminUserData.first_name?.trim();
  //         const lastName = this.adminUserData.last_name?.trim();
  //         const profileName = (firstName || lastName) ? `${firstName || ''} ${lastName || ''}`.trim() : (this.adminUserData.phone_number);
  //         const profileImage = this.adminUserData.profile_image?.trim() || '../../assets/images/guestezee/profile.png';

  //         this.profileService.updateProfileName(profileName);
  //         // this.profile_image = this.adminUserData.profile_image || '../../assets/images/guestezee/profile.png';
  //         this.profileService.updateProfileImage(profileImage);
  //          // this.profileService.updateProfileName(this.adminUserData.first_name + ' ' + this.adminUserData.last_name);

  //       }
  //     }
  //     else {
  //       //console.warn("Failed to fetch updated profile data.");
  //     }
  //   })
  // }

  profileUpdate(profile_image: any, successMessage: string = "Profile updated successfully!") {
    //console.log("profile_image", profile_image)
    if (this.userRegistartionForm.valid) {
      let formData;
      if (this.customerType === 'Staff') {
        formData = {
          full_name: this.userRegistartionForm.value.full_name,
          profile_image: profile_image
        };
      }
      else {
        formData = {
          first_name: this.userRegistartionForm.value.first_name,
          last_name: this.userRegistartionForm.value.last_name,
          profile_image: profile_image
        };
      }
      let updateData = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          customer_update: formData
        },
        extras: {
          find:
            this.customerType == 'Staff'
              ? { staff_id: this.hotelId } :
              { id: this.hotelId }

        }
      };
      //console.log("Updating profile with data:", updateData);
      this.profileService.postApiCall(updateData, ENDPOINTS.UPDATE_LOGIN_CUSTOMER).subscribe(resp => {
        if (resp.success === 1) {
          //console.log("Update Success:", resp);
          this.alertService.success(successMessage, this.options);
          // Manually patch the form and service with the updated data
          const updatedProfileImage = profile_image || this.userRegistartionForm.value.profile_image;
          const updatedProfileName = this.customerType == 'Staff' ? this.userRegistartionForm.value.full_name : `${this.userRegistartionForm.value.first_name} ${this.userRegistartionForm.value.last_name}`.trim();

          this.profileService.updateProfileImage(updatedProfileImage);
          this.profileService.updateProfileName(updatedProfileName);

          // Patch form with the new data
          if (this.customerType == 'Staff') {
            this.userRegistartionForm.patchValue({
              full_name: this.userRegistartionForm.value.full_name,
              profile_image: updatedProfileImage
            });
          }
          else {
            this.userRegistartionForm.patchValue({
              first_name: this.userRegistartionForm.value.first_name,
              last_name: this.userRegistartionForm.value.last_name,
              profile_image: updatedProfileImage
            });
          }

        } else {
          //console.warn("Update Failed:", resp.message);
          this.alertService.error(resp.message, this.options);
        }
      }, err => {
        //console.error("Update Error:", err);
        this.alertService.error("Error updating profile: " + (err.error?.message || "Please try again!"), this.options);
      });
    }
  }

  // savePasswordChanges() {
  //   if (this.passwordUpdateForm.valid) {
  //     this.validateForm2 = true;

  //     const storedPassword = this.localService.get('Password');
  //     //console.log("pwrd", storedPassword)
  //     const currentPassword = this.p['current_password'].value;

  //     // Check if current password matches the stored password
  //     if (storedPassword !== currentPassword) {
  //       this.p['current_password'].setErrors({ incorrect: true });
  //       this.alertService.error("Current Password is incorrect.");
  //       return;
  //     }

  //     // Ensure passwords match
  //     if (this.p['new_password'].value !== this.p['confirm_password'].value) {
  //       this.p['confirm_password'].setErrors({ matchError: true });
  //       this.alertService.error("New Password and Confirm Password do not match.");
  //       return;
  //     }


  //     // if ( pwrd == this.p['current_password'].value) {
  //       let formData = {
  //         new_password: this.p['new_password'].value,
  //         // old_password: this.p['current_password'].value
  //       };

  //       let jsonObj = {
  //         domain_name: DOMAIN_NAME,
  //         user_id: USER_ID,
  //         payload: { password_details: formData },
  //         extras: { find: { id: this.hotelId } }
  //       };

  //       this.profileService.updatePassword(jsonObj).subscribe(
  //         resp => {
  //           if (resp?.success === 1) {
  //             this.passwordUpdateForm.reset();
  //             this.isPasswordModalOpen = false;
  //             this.alertService.success("Password updated successfully!");
  //             this.localService.set('Password', this.p['new_password'].value);
  //             setTimeout(() => {
  //               this.alertService.clear(); // Clears the alert message
  //             }, 2000);
  //           } else {
  //             this.alertService.error(resp?.message || "Something went wrong.");
  //             setTimeout(() => {
  //               this.alertService.clear(); // Clears the alert message
  //             }, 2000);
  //           }
  //         },
  //         err => {
  //           this.alertService.error("Error updating password: " + (err.error?.message || "Please try again!"));
  //           setTimeout(() => {
  //             this.alertService.clear(); // Clears the alert message
  //           }, 2000);
  //         }
  //       );
  //     } else {
  //       this.passwordUpdateForm.markAllAsTouched();
  //       this.validateForm2 = true;
  //     }

  // }

  savePasswordChanges() {
    // Reset custom validation errors to allow validation re-run
    const currentPassCtrl = this.p['current_password'];
    const newPassCtrl = this.p['new_password'];
    const confirmPassCtrl = this.p['confirm_password'];

    if (currentPassCtrl.errors) {
      const errors = { ...currentPassCtrl.errors };
      delete errors['incorrect'];
      currentPassCtrl.setErrors(Object.keys(errors).length ? errors : null);
    }
    if (newPassCtrl.errors) {
      const errors = { ...newPassCtrl.errors };
      delete errors['sameAsOld'];
      newPassCtrl.setErrors(Object.keys(errors).length ? errors : null);
    }
    if (confirmPassCtrl.errors) {
      const errors = { ...confirmPassCtrl.errors };
      delete errors['matchError'];
      confirmPassCtrl.setErrors(Object.keys(errors).length ? errors : null);
    }

    // Force validation update
    this.passwordUpdateForm.updateValueAndValidity();

    // 1. First check if all filled / valid
    if (!this.passwordUpdateForm.valid) {
      this.passwordUpdateForm.markAllAsTouched();
      this.validateForm2 = true;
      return;
    }

    this.validateForm2 = true;
    const storedPassword = this.localService.get('Password');
    const currentPassword = currentPassCtrl.value;

    // 2. Then check current password (only if storedPassword exists in local storage)
    if (storedPassword && storedPassword !== currentPassword) {
      currentPassCtrl.setErrors({ incorrect: true });
      this.alertService.error("Current Password is incorrect.", this.options);
      return;
    }

    // 3. Then new and confirm password match
    if (newPassCtrl.value !== confirmPassCtrl.value) {
      confirmPassCtrl.setErrors({ matchError: true });
      this.alertService.error("New Password and Confirm Password do not match.", this.options);
      return;
    }

    // 4. Then current and new password (new password cannot be same as old/current password)
    if (storedPassword && newPassCtrl.value === storedPassword) {
      newPassCtrl.setErrors({ sameAsOld: true });
      this.alertService.error("New Password cannot be same as old Password", this.options);
      return;
    }

    let formData: any = {
      new_password: newPassCtrl.value
    };
    // Add password_to_customer only if NOT staff
    if (this.customerType !== 'Staff') {
      formData.password_to_customer = newPassCtrl.value;
    }
    let jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { password_details: formData },
      extras: {
        find:
          this.customerType == 'Staff'
            ? { staff_id: this.hotelId }
            : { id: this.hotelId }
      }
    };
    this.profileService.updatePassword(jsonObj).subscribe(
      resp => {
        if (resp?.success === 1) {
          this.localService.set('Password', newPassCtrl.value);
          this.passwordUpdateForm.reset();
          this.isPasswordModalOpen = false;
          this.validateForm2 = false;
          this.alertService.success("Password updated successfully!", this.options);
        } else {
          this.alertService.error(resp?.message || "Something went wrong.", this.options);
        }
      },
      err => {
        this.alertService.error("Error updating password: " + (err.error?.message || "Please try again!"), this.options);
      }
    );
  }

  toggleStatus() {
    this.isOnline = !this.isOnline;
  }

  openPasswordModal() {
    this.isPasswordModalOpen = true;
    this.alertService.clear();
  }

  closePasswordModal() {
    this.passwordUpdateForm.reset(); // Resets all input fields
    this.isPasswordModalOpen = false;
    this.validateForm2 = false; // Clear validation state so errors don't show when reopened
    this.alertService.clear();
  }

  togglePasswordVisibility(type: string) {
    if (type === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (type === 'new') {
      this.showNewPassword = !this.showNewPassword;
    } else if (type === 'confirm') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  openEmailModal() {
    this.isEmailModalOpen = true;
  }

  closeEmailModal(event: Event) {
    if (event.target === event.currentTarget) {
      this.isEmailModalOpen = false;
    }
  }

  validateEmails() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.currentEmailError = !this.currentEmail.trim()
      ? "Current email is required."
      : !emailPattern.test(this.currentEmail)
        ? "Enter a valid email address."
        : "";
    this.newEmailError = !this.newEmail.trim()
      ? "New email is required."
      : !emailPattern.test(this.newEmail)
        ? "Enter a valid email address."
        : "";
  }

  openExitModal() {
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }

  // Newly added & commented for logout
  // logout() {
  //   this.localService.remove('accessToken');
  //   this.localService.remove('refreshToken');
  //   this.localService.remove('expireTime');
  //   this.localService.remove('UserName');
  //   this.localService.remove('UserEmail');
  //   this.localService.remove('UserId');
  //   this.localService.remove('domainName');
  //   this.localService.remove('rexpireTime');
  //   this.localService.remove('db_schema');
  //   this.localService.remove('Password');
  //   this.localService.remove('MemberId');
  //   this.localService.remove('CustomerType');
  //   this.localService.remove('guestData');
  //   this.localService.remove('maxTabReached');
  //   this.localService.remove('currentTab');
  //   this.localService.remove('StaffData');
  //   this.localService.remove('hierarchy');
  //   this.localService.remove('roleName');
  //   this.localService.remove('role_id');
  //   this.localService.remove('selectedSlots');
  //   this.localService.remove('USERACCESS');
  //   this.router.navigate([''], { skipLocationChange: false });
  // }
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
              if (hasTokenChanged) {
                const updateBody = {
                  domain_name: DOMAIN_NAME,
                  user_id: USER_ID,
                  payload: { customer_update: { fcm_token: updatedTokens } },
                  extras: { find: { [customerFindKey]: userId } }
                };
                await this.hotelenrollmenttabviewService.updateCustomerFcm(updateBody).toPromise();
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
                if (hasTokenChanged) {
                  const updateBody = {
                    domain_name: DOMAIN_NAME,
                    user_id: USER_ID,
                    payload: { staff_updation: { fcm_token: updatedTokens } },
                    extras: { find: { id: userId } }
                  };
                  await this.staffService.updateStaff(updateBody).toPromise();
                }
                const remainingCount = updatedTokens.length;
                const isAvailableValue = remainingCount >= 1;
                const availableUpdateBody = {
                  domain_name: DOMAIN_NAME,
                  user_id: USER_ID,
                  payload: { staff_updation: { is_available: isAvailableValue } },
                  extras: { find: { id: userId } }
                };
                await this.staffService.updateStaff(availableUpdateBody).toPromise();
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

  // Newly added for matching new password and confirm password
  passwordMatchValidator(controlName: string, matchingControlName: string) {
    return (formGroup: UntypedFormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];
      if (!control || !matchingControl) {
        return;
      }
      const errors = { ...matchingControl.errors };
      if (matchingControl.value && control.value !== matchingControl.value) {
        errors['matchError'] = true;
        matchingControl.setErrors(errors);
      } else {
        delete errors['matchError'];
        matchingControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    };
  }
  // End of newly added for matching new password and confirm password

}

