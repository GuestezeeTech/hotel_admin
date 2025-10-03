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
  profile_image: string | null = '../../assets/images/guestezee/profile.png';


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
    private profileService: ProfileService
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
        profile_image: '../../assets/images/guestezee/profile.png',
        imageFile: [''],
      });
    }
    else {
      this.userRegistartionForm = this.formBuilder.group({
        first_name: ['', [Validators.maxLength(40), Validators.pattern("^[a-zA-Z][a-z A-Z]*$")]],
        last_name: ['', [Validators.maxLength(40), Validators.pattern("^[a-zA-Z][a-z A-Z]*$")]],
        profile_image: '../../assets/images/guestezee/profile.png',
        imageFile: [''],
      });
    }
    this.passwordUpdateForm = this.fb.group({
      current_password: ['', [Validators.minLength(6), Validators.required]],
      new_password: ['', [Validators.minLength(6), Validators.required]],
      confirm_password: ['', [Validators.minLength(6), Validators.required]],
    });
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
    let dragEvent = false
    let file_data = { name: "", size: 0 }
    //CHECKING DRAG EVENT OR UPLOAD EVENT
    if (event.target && event.target.files && event.target.files[0]) {
      file_data = event.target.files[0]
    }
    else {
      file_data = event.dataTransfer.files[0]
      dragEvent = true
    }
    this.validateImage = true;
    var reader = new FileReader();
    this.imageName = file_data.name
    let splitFileName = this.imageName.split(".")
    //CHECKING FILE NAME
    // if (splitFileName.length == 0) {
    //   this.userRegistartionForm.controls['imageFile'].setErrors({ 'invalid': true });
    //   return
    // }

    // if (file_data.size == 0) {
    //   this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizezero': true });
    //   return
    // }

    if (Math.round((file_data.size / 1000)) > 2000) {
      this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizehigh': true });
      return
    }
    //CHECKING FILE TYPE
    if (!["jpg", "jpeg", "png", "gif", "JPG", "JPEG", "PNG", "GIF"].includes(splitFileName[splitFileName.length - 1])) {
      this.userRegistartionForm.controls['imageFile'].setErrors({ 'type': true });
      return
    }
    // this.userRegistartionForm.controls['imageFile'].setErrors({ 'invalid': false });
    // this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizezero': false });
    this.userRegistartionForm.controls['imageFile'].setErrors({ 'type': false });
    this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizehigh': false });
    reader.onload = (evt: any) => {
      this.previewImgUrl = evt.target.result;
      //console.log('Image url:', this.previewImgUrl)
      this.userRegistartionForm.controls['imageFile'].setValue(evt.target.result)
      this.imgFile = event.target.files[0];
    }
    //BASED ON EVENT READ FILE
    if (!dragEvent) {
      reader.readAsDataURL(event.target.files[0]);
      this.imgFile = event.target.files[0];
      //console.log('Image file 1:', this.imgFile)
    }
    else {
      reader.readAsDataURL(event.dataTransfer.files[0]);
      this.imgFile = event.dataTransfer.files[0];
      //console.log('Image file 2:', this.imgFile)
    }
    let headers = new HttpHeaders().set("source", "Brand").set("domain_name", DOMAIN_NAME);
    let formData_imageCate = new FormData();
    if (this.imgFile !== null) {
      formData_imageCate.append('upload', this.imgFile)
    }
    this.profileService.sendImage(formData_imageCate, headers).subscribe(resp => {
      if (resp && resp.success === 1 && resp.status_code === 200) {
        let imgVariable = resp.result.data[0];
        if (this.imgFile !== null) {
          this.profile_image = imgVariable.location;
          //console.log("this.logoImage" + this.profile_image)
          // Store profile image in localStorage
          this.profileUpdate(this.profile_image)
        }
      }
    })
  }

  deleteImage() {
    this.profile_image = '../../assets/images/guestezee/profile.png';
    this.profileUpdate(this.profile_image);
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

  profileUpdate(profile_image: any) {
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
          this.alertService.success("Profile updated successfully!", this.options);
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
    if (this.passwordUpdateForm.valid) {
      this.validateForm2 = true;
      const storedPassword = this.localService.get('Password');
      //console.log("pwrd", storedPassword)
      const currentPassword = this.p['current_password'].value;
      // Check if current password matches the stored password
      if (storedPassword !== currentPassword) {
        this.p['current_password'].setErrors({ incorrect: true });
        this.alertService.error("Current Password is incorrect.", this.options);
        return;
      }

      // Ensure passwords match
      if (this.p['new_password'].value !== this.p['confirm_password'].value) {
        this.p['confirm_password'].setErrors({ matchError: true });
        this.alertService.error("New Password and Confirm Password do not match.", this.options);
        return;
      }


      let formData = {
        new_password: this.p['new_password'].value,
        // old_password: this.p['current_password'].value
      };

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
            this.passwordUpdateForm.reset();
            this.isPasswordModalOpen = false;
            this.alertService.success("Password updated successfully!", this.options);
            this.localService.set('Password', this.p['new_password'].value);
            setTimeout(() => {
              this.alertService.clear(); // Clears the alert message
            }, 2000);
          } else {
            this.alertService.error(resp?.message || "Something went wrong.", this.options);
            setTimeout(() => {
              this.alertService.clear(); // Clears the alert message
            }, 2000);
          }
        },
        err => {
          this.alertService.error("Error updating password: " + (err.error?.message || "Please try again!"), this.options);
          setTimeout(() => {
            this.alertService.clear(); // Clears the alert message
          }, 2000);
        }
      );
    } else {
      this.passwordUpdateForm.markAllAsTouched();
      this.validateForm2 = true;
      //console.log('sss')
    }
  }

  toggleStatus() {
    this.isOnline = !this.isOnline;
  }

  openPasswordModal() {
    this.isPasswordModalOpen = true;
  }

  closePasswordModal(event: Event) {
    if (event.target === event.currentTarget) {
      this.passwordUpdateForm.reset(); // Resets all input fields
      this.isPasswordModalOpen = false;
      // this.validateForm2 = false;
    }
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

  logout() {
    this.localService.remove('accessToken');
    this.localService.remove('refreshToken');
    this.localService.remove('expireTime');
    this.localService.remove('UserName');
    this.localService.remove('UserEmail');
    this.localService.remove('UserId');
    this.localService.remove('domainName');
    this.localService.remove('rexpireTime');
    this.localService.remove('db_schema');
    this.localService.remove('Password');
    this.localService.remove('MemberId');
    this.localService.remove('CustomerType');
    this.localService.remove('guestData');
    this.localService.remove('maxTabReached');
    this.localService.remove('currentTab');
    this.localService.remove('StaffData');
    this.localService.remove('hierarchy');
    this.localService.remove('roleName');
    this.localService.remove('role_id');
    this.localService.remove('selectedSlots');
    this.localService.remove('USERACCESS');
    this.router.navigate([''], { skipLocationChange: false });
  }

}

