import { HotelEnrollmentTabviewService } from './../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { DOMAIN_NAME, USER_ID } from './../app.config';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertsService } from '../shared/alerts/alerts.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { ProfileService } from '../profile/profile.service';;
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { LoaderService } from '../shared/loader/loader.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AlertsComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})

export class SettingsComponent implements OnInit {
  // Modal
  isPasswordModalOpen = false;
  // For eye visibility
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  // Form validation
  passwordUpdateForm!: UntypedFormGroup;
  validateForm2: Boolean = false;
  // stores customer id
  hotelId: Number | null = null;
  // Slot duration
  isDurationModalOpen = false;
  durations = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // duration in hours
  availableStartTimes: string[] = [];
  selectedDuration: number | null = null;
  selectedStartTime: string | null = null;
  availableSlots: { start: string, end: string }[] = [];
  selectedSlots: { start: string, end: string }[] = [];
  // Newly added - to update shift timings
  shifts: any[] = [{ id: '', startTime: '', startMeridian: 'AM', endTime: '', endMeridian: 'AM', label: '' }];
  errorMessage: string[] = [];
  shiftRowErrors: { [key: number]: string } = {};
  isFormValid = false;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  // Newly added - to update room numbers
  rooms: any[] = [
    { id: '', startRoom: '', endRoom: '', label: '' }
  ];
  labelOption: string = 'same';
  customLabels: { [key: string]: string } = {};
  roomErrorMessage: string[] = [];
  roomRowErrors: { [key: number]: string } = {};
  invalidFields: { [key: number]: { id?: boolean; startRoom?: boolean; endRoom?: boolean; label?: boolean } } = {};
  invalidCustomLabels: { [key: string]: boolean } = {};
  isRoomModalOpen: boolean = false;
  isRoomFormValid: boolean = false;
  customerType: any;
  lateCheckoutRequired: boolean = false;
  hasAtLeastOneRoomRange: boolean = false;
  hasAtLeastOneShift: boolean = false;
  // View mode flags
  isShiftViewMode: boolean = false;
  isRoomViewMode: boolean = false;
  // Newly added for getting member id for customer type
  customerStatus: any;
  memberId: any;
  allowedRoomCount: any;

  /**
   * Enable/disable background page scrolling when any modal is open.
   */
  private updateBodyScrollLock(): void {
    const anyModalOpen =
      this.isPasswordModalOpen ||
      this.isDurationModalOpen ||
      this.isRoomModalOpen;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  constructor(
    private fb: FormBuilder,
    private alertService: AlertsService,
    private localService: LocalStorageService,
    private profileService: ProfileService,
    private routerUrl: Router,
    private hotelEnrollmentTabviewService: HotelEnrollmentTabviewService,
    private permissionService: PermissionService,
    private loaderService: LoaderService
  ) { }

  async ngOnInit(): Promise<void> {
    this.passwordUpdateForm = this.fb.group({
      current_password: ['', [Validators.minLength(6), Validators.required]],
      new_password: ['', [Validators.minLength(6), Validators.required]],
      confirm_password: ['', [Validators.minLength(6), Validators.required]],
    },
      // Newly added for matching new password and confirm password
      {
        validators: this.passwordMatchValidator('new_password', 'confirm_password')
      }
      // End of newly added for matching new password and confirm password
    );
    // Customer id
    this.customerType = this.localService.get('CustomerType');
    // Newly added for getting customer id for customer type
    this.hotelId = Number(this.localService.get('UserId'));
    if (this.hotelId !== undefined && this.hotelId !== null) {
      await this.getCustomerStatus(this.hotelId);
    }
    // End of newly added for getting customer id for customer type
    // this.availableStartTimes = this.generateTimeList('12:00 AM', '11:59 PM');
    // Load late checkout setting
    this.getLateCheckoutSettings();
    this.getRoomCount();
  }

  getCustomerStatus(userId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            id: userId
          }
        }
      };
      this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe({
        next: (res: any) => {
          if (res && res.result.data.length > 0) {
            const customer = res.result.data[0];
            // Set memberId based on availability of customer_member_id or member_id
            this.memberId = customer.customer_member_id
              ? customer.customer_member_id
              : customer.member_id;
            this.customerStatus = customer.status;
            /*  console.log('Customer Status:', this.customerStatus);
             console.log('Member ID:', this.memberId); */
            resolve(this.memberId); // resolves with memberId
          } else {
            reject('No customer found');
          }
        },
        error: (err: any) => {
          reject(err); // handle API error
        }
      });
    });

  }

  get p() { return this.passwordUpdateForm.controls; }

  // Permission helpers for SYSTEM SETTINGS
  get canReadSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_read_permission ?? false;
  }

  get canAddSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_add_permission ?? false;
  }

  get canEditSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_edit_permission ?? false;
  }

  get canDeleteSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_delete_permission ?? false;
  }

  // Helper to check if user can modify (add, edit, or delete)
  get canModifySystemSettings(): boolean {
    return this.canAddSystemSettings || this.canEditSystemSettings || this.canDeleteSystemSettings;
  }

  openPasswordModal() {
    this.isPasswordModalOpen = true;
    this.alertService.clear();
    this.updateBodyScrollLock();
  }

  closePasswordModal() {
    // Clear all entered values and validation states when closing the modal
    if (this.passwordUpdateForm) {
      this.passwordUpdateForm.reset();
      this.passwordUpdateForm.markAsPristine();
      this.passwordUpdateForm.markAsUntouched();
    }
    // Reset eye icon visibility states
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    // Reset internal validation flag if used elsewhere
    this.validateForm2 = false;
    this.alertService.clear();

    this.isPasswordModalOpen = false;
    this.updateBodyScrollLock();
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
      this.alertService.error(("Current Password is incorrect."), this.options);
      return;
    }

    // 3. Then new and confirm password match
    if (newPassCtrl.value !== confirmPassCtrl.value) {
      confirmPassCtrl.setErrors({ matchError: true });
      this.alertService.error(("New Password and Confirm Password do not match."), this.options);
      return;
    }

    // 4. Then current and new password (new password cannot be same as old/current password)
    if (storedPassword && newPassCtrl.value === storedPassword) {
      newPassCtrl.setErrors({ sameAsOld: true });
      this.alertService.error(("New Password cannot be same as old Password"), this.options);
      return;
    }

    this.localService.set('Password', newPassCtrl.value);
    let formData: any = {
      new_password: newPassCtrl.value
    };
    // Add password_to_customer only if NOT staff
    if (this.customerType !== 'Staff') {
      formData.password_to_customer = newPassCtrl.value;
    }
    let jsonObj: any = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { password_details: formData },
      extras: { find: {} }
    };
    const customerType = this.localService.get('CustomerType');
    // conditionally assign
    if (customerType === 'Staff') {
      jsonObj.extras.find['staff_id'] = this.hotelId;  // use staff_id
    } else {
      jsonObj.extras.find['id'] = this.hotelId; // use id
    }
    this.profileService.updatePassword(jsonObj).subscribe(
      resp => {
        if (resp?.success === 1) {
          this.localService.set('Password', newPassCtrl.value);
          this.passwordUpdateForm.reset();
          this.isPasswordModalOpen = false;
          this.validateForm2 = false;
          this.alertService.success(("Password updated successfully!"), this.options);
        } else {
          this.alertService.error((resp?.message || "Something went wrong."), this.options);
        }
      },
      err => {
        this.alertService.error(("Error updating password: " + (err.error?.message || "Please try again!")), this.options);
      }
    );
  }

  openPaymentPlan() {
    //console.log('openPaymentPlan');
    this.routerUrl.navigateByUrl('/payment-subscription');
  }

  openDurationModal() {
    if (!this.canModifySystemSettings && !this.canReadSystemSettings) return;
    this.isShiftViewMode = false;
    this.loadShiftData();
  }

  viewShiftTimings() {
    if (!this.canReadSystemSettings) return;
    this.isShiftViewMode = true;
    this.loadShiftData();
  }

  private loadShiftData() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: this.hotelId 
          customer_member_id: this.memberId
        }
      }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          if (existingData.settings && existingData.settings.shift_timings) {
            // If already exists → prefill modal
            // this.shifts = [...existingData.settings.shift_timings];
            // add is_existing only for UI
            this.shifts = existingData.settings.shift_timings.map((s: any) => ({
              ...s,
              is_existing: true
            }));
          } else {
            // No shift_timings found → add empty row
            this.shifts = [{ id: '', startTime: '', startMeridian: 'AM', endTime: '', endMeridian: 'AM', label: '' }];
          }
        } else {
          // No data found → just initialize empty
          this.shifts = [{ id: '', startTime: '', startMeridian: 'AM', endTime: '', endMeridian: 'AM', label: '' }];
        }
        // console.log("Fetched shifts: ", this.shifts);
        // Clear row errors when opening modal
        this.shiftRowErrors = {};
        this.errorMessage = [];
        // Check if at least one shift is filled
        this.checkAtLeastOneShift();
        // Finally open modal
        this.isDurationModalOpen = true;
        this.updateBodyScrollLock();
      },
      (err: any) => {
        this.shifts = [{ id: '', startTime: '', startMeridian: 'AM', endTime: '', endMeridian: 'AM', label: '' }];
        this.shiftRowErrors = {};
        this.errorMessage = [];
        this.checkAtLeastOneShift();
        this.isDurationModalOpen = true;
        this.updateBodyScrollLock();
      }
    );
    // To salect previously saved slots
    // const storedSlots = this.localService.get('selectedSlots');
    // this.selectedSlots = storedSlots ? JSON.parse(storedSlots) : [];
    // Restore duration & start time
    // const storedDurationData = this.localService.get('durationData');
    // if (storedDurationData) {
    //   const parsedData = JSON.parse(storedDurationData);
    //   this.selectedDuration = parsedData.selectedDuration || null;
    //   this.selectedStartTime = parsedData.selectedStartTime || null;
    //   // Rebuild available slots based on restored values
    //   if (this.selectedDuration && this.selectedStartTime) {
    //     this.updateAvailableSlots();
    //   }
    // }
  }

  // checks if a slot is already selected
  // isSlotSelected(slot: { start: string, end: string }): boolean {
  //   return this.selectedSlots.some(s => s.start === slot.start && s.end === slot.end);
  // }

  // generateTimeList(start: string, end: string): string[] {
  //   const times: string[] = [];
  //   let current = this.toDateObj(start);
  //   const endDate = this.toDateObj(end);
  //   while (current <= endDate) {
  //     times.push(this.formatAMPM(current));
  //     current.setMinutes(current.getMinutes() + 30);
  //   }
  //   // Ensure 11.59 PM is included if not exactly on 30-min interval
  //   const lastFormatted = this.formatAMPM(endDate);
  //   if (!times.includes(lastFormatted)) {
  //     times.push(lastFormatted);
  //   }
  //   return times;
  // }

  // toDateObj(timeStr: string): Date {
  //   // Normalize input: replace dot with colon and ensure upper case AM/PM
  //   const cleanTime = timeStr.replace('.', ':').toUpperCase();
  //   const date = new Date();
  //   const [time, modifier] = cleanTime.split(' ');
  //   let [hours, minutes] = time.split(':').map(Number);
  //   if (modifier === 'PM' && hours !== 12) hours += 12;
  //   if (modifier === 'AM' && hours === 12) hours = 0;
  //   date.setHours(hours, minutes, 0, 0);
  //   return date;
  // }

  // formatAMPM(date: Date): string {
  //   let hours = date.getHours();
  //   const minutes = date.getMinutes();
  //   const ampm = hours >= 12 ? 'PM' : 'AM';
  //   hours = hours % 12 || 12;
  //   const mins = minutes < 10 ? '0' + minutes : minutes;
  //   return `${hours}.${mins} ${ampm}`;
  // }

  // updateAvailableSlots() {
  //   this.availableSlots = [];
  //   // this.selectedSlots = [];
  //   if (!this.selectedDuration || !this.selectedStartTime) return;
  //   const startIndex = this.availableStartTimes.indexOf(this.selectedStartTime);
  //   const totalSlots = 48; // 24 hours * 2 (30-min slots)
  //   const slotsNeeded = this.selectedDuration * 2;
  //   let currentIndex = startIndex;
  //   let remainingSlots = totalSlots - startIndex;
  //   while (remainingSlots > 0) {
  //     const start = this.availableStartTimes[currentIndex];
  //     let endIndex = currentIndex + slotsNeeded;
  //     if (endIndex >= this.availableStartTimes.length) {
  //       // Cap end index at the last slot
  //       endIndex = this.availableStartTimes.length - 1;
  //     }
  //     const end = this.availableStartTimes[endIndex];
  //     if (start && end) {
  //       this.availableSlots.push({ start, end });
  //     }
  //     // Move to the next block
  //     currentIndex = endIndex;
  //     remainingSlots = totalSlots - currentIndex;
  //   }
  // }

  // onSlotSelect(event: any, slot: { start: string, end: string }) {
  //   if (event.target.checked) {
  //     this.selectedSlots.push(slot);
  //   } else {
  //     this.selectedSlots = this.selectedSlots.filter(s => s.start !== slot.start || s.end !== slot.end);
  //   }
  // }

  // closeDurationModal() {
  //   this.isDurationModalOpen = false;
  //   this.resetFields();
  // }

  // saveDuration() {
  //   // Convert array of objects to JSON string before saving
  //   this.localService.set('selectedSlots', JSON.stringify(this.selectedSlots));
  //   // Retrieve and parse it back to object array
  //   const storedSlots = this.localService.get('selectedSlots');
  //   const parsedSlots = storedSlots ? JSON.parse(storedSlots) : [];
  //   const durationData = {
  //     selectedDuration: this.selectedDuration,
  //     selectedStartTime: this.selectedStartTime
  //   };
  //   this.localService.set('durationData', JSON.stringify(durationData));
  //   console.log('Selected Slots:', storedSlots);
  //   console.log('Selected Duration:', this.selectedDuration);
  //   console.log('Selected Start Time:', this.selectedStartTime);
  //   this.isDurationModalOpen = false;
  //   // this.resetFields();
  // }

  // resetFields() {
  //   this.selectedDuration = null;
  //   this.selectedStartTime = null;
  //   this.availableSlots = [];
  //   this.selectedSlots = [];
  // }

  addShift() {
    if (this.isShiftViewMode || !this.canModifySystemSettings) return;
    this.shifts.push({ id: '', startTime: '', startMeridian: 'AM', endTime: '', endMeridian: 'AM', label: '' });
    this.shiftRowErrors = {};
    this.checkAtLeastOneShift();
  }

  // Allow only numbers + colon in time input
  restrictTimeInput(event: any) {
    const allowed = /^[0-9:]*$/;
    if (!allowed.test(event.key)) {
      event.preventDefault();
    }
  }

  restrictSpecialChars(event: any) {
    const allowedKeys = /^[0-9]*$/;
    if (!allowedKeys.test(event.key)) {
      event.preventDefault();
    }
  }

  validateId(index: number) {
    // Clear row error when user starts typing
    if (this.shiftRowErrors[index]) {
      delete this.shiftRowErrors[index];
    }
    if (!this.shifts[index].id || this.shifts[index].id.trim() === '') {
      this.errorMessage = ['Please set a unique ID for this shift.'];
      this.isFormValid = false;
      return;
    }
    this.errorMessage = [];
    this.checkFormValidity();
    this.checkAtLeastOneShift();
  }

  validateTime(index: number, type: 'start' | 'end') {
    // Clear row error when user starts typing
    if (this.shiftRowErrors[index]) {
      delete this.shiftRowErrors[index];
    }
    const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/; // 12hr format
    const value = type === 'start' ? this.shifts[index].startTime : this.shifts[index].endTime;
    if (!value) {
      this.errorMessage = [type === 'start' ? 'Please enter start time.' : 'Please enter end time.'];
      this.isFormValid = false;
      return;
    }
    if (!timePattern.test(value)) {
      this.errorMessage = ['Invalid time! Use 12-hour format (HH:MM, e.g., 9:00 or 12:30).'];
      this.isFormValid = false;
      return;
    }
    this.errorMessage = [];
    this.checkFormValidity();
    this.checkAtLeastOneShift();
  }

  validateLabel(index: number) {
    if (!this.shifts[index].label || this.shifts[index].label.trim() === '') {
      this.errorMessage = ['Please set a label for shift timing.'];
      this.isFormValid = false;
      return;
    }
    this.errorMessage = [];
    this.checkFormValidity();
  }

  checkFormValidity() {
    this.isFormValid = this.shifts.every(shift =>
      shift.id &&
      shift.startTime &&
      shift.endTime &&
      shift.label &&
      /^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(shift.startTime) &&
      /^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(shift.endTime) &&
      shift.label.trim() !== ''
    );
  }

  closeShiftModal() {
    this.isDurationModalOpen = false;
    this.isShiftViewMode = false;
    this.updateBodyScrollLock();
  }

  saveShifts() {
    if (this.isShiftViewMode || !this.canModifySystemSettings) return;
    this.errorMessage = [];
    this.shiftRowErrors = {};
    const errors: string[] = [];

    // Validate each shift and populate row-specific errors
    for (let i = 0; i < this.shifts.length; i++) {
      const shift = this.shifts[i];
      const rowErrors: string[] = [];

      if (!shift.id || shift.id.trim() === '') {
        rowErrors.push('ID');
      }
      if (!shift.startTime || shift.startTime.trim() === '') {
        rowErrors.push('Start Time');
      }
      if (!shift.endTime || shift.endTime.trim() === '') {
        rowErrors.push('End Time');
      }
      if (shift.startTime && !/^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(shift.startTime)) {
        rowErrors.push('Start Time format');
      }
      if (shift.endTime && !/^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(shift.endTime)) {
        rowErrors.push('End Time format');
      }
      if (!shift.label || shift.label.trim() === '') {
        rowErrors.push('Label');
      }

      if (rowErrors.length > 0) {
        this.shiftRowErrors[i] = `Please fill all required fields: ${rowErrors.join(', ')}.`;
      }
    }

    // Check duplicate labels
    // const labels = this.shifts.map(s => s.label).filter(l => l && l.trim() !== '');
    const labels = this.shifts
      .map(s => s.label?.trim().toLowerCase().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (new Set(labels).size !== labels.length) {
      errors.push('Shift Labels must be unique!');
    }

    // Check duplicate IDs
    // const ids = this.shifts.map(s => s.id).filter(id => id && id.trim() !== '');
    const ids = this.shifts
      .map(s => s.id?.trim().toLowerCase().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      errors.push('Shift IDs must be unique!');
    }

    // If there are row errors or general errors, display them
    if (Object.keys(this.shiftRowErrors).length > 0 || errors.length > 0) {
      this.errorMessage = errors;
      return;
    }

    // Final validity check
    this.checkFormValidity();
    if (!this.isFormValid) {
      this.errorMessage = ['Please fix errors before saving!'];
      return;
    }

    // All validations passed
    // console.log("Saved shifts: ", this.shifts);
    // Remove is_existing before saving
    const cleanShifts = this.shifts.map(s => {
      const { is_existing, ...rest } = s;
      return rest;
    });
    this.saveShiftSettings(cleanShifts);
  }

  removeShift(index: number) {
    if (this.isShiftViewMode || !this.canModifySystemSettings) return;

    const shiftToDelete = this.shifts[index];

    // If it's a new row (not yet saved to DB), just remove it
    if (!shiftToDelete.is_existing) {
      this.shifts.splice(index, 1);
      this.updateShiftRowErrorsAfterDelete(index);
      this.checkAtLeastOneShift();
      return;
    }

    // If it's an existing row, verify deletion via updateCustomer API
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: this.memberId
        }
      }
    };

    this.loaderService.emitLoading();
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe({
      next: (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          if (!existingData.settings || !Array.isArray(existingData.settings.shift_timings)) {
            this.loaderService.emitComplete();
            this.alertService.error('No existing settings found!', this.options);
            return;
          }

          // Prepare updated shifts by excluding the one to be deleted
          const updatedShifts = existingData.settings.shift_timings.filter((s: any) => s.id !== shiftToDelete.id);

          const updateRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              customer_update: {
                settings: {
                  ...existingData.settings,
                  shift_timings: updatedShifts
                }
              }
            },
            extras: {
              find: {
                customer_member_id: this.memberId
              }
            }
          };

          this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe({
            next: (updateResp: any) => {
              this.loaderService.emitComplete();
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                if (updateResp.message === 'Record successfully updated') {
                  this.shifts.splice(index, 1);
                  this.updateShiftRowErrorsAfterDelete(index);
                  this.checkAtLeastOneShift();
                  this.localService.set('selectedSlots', JSON.stringify(updatedShifts));
                  this.alertService.success('Shift timing removed successfully!', this.options);
                } else {
                  this.alertService.error(updateResp.message, this.options);
                }
              } else {
                this.alertService.error(updateResp?.message || 'Something went wrong while removing shift.', this.options);
              }
            },
            error: () => {
              this.loaderService.emitComplete();
              this.alertService.error('Error while removing shift!', this.options);
            }
          });
        } else {
          this.loaderService.emitComplete();
          this.alertService.error('Could not fetch existing settings.', this.options);
        }
      },
      error: () => {
        this.loaderService.emitComplete();
        this.alertService.error('Something went wrong while fetching existing settings!', this.options);
      }
    });
  }

  private updateShiftRowErrorsAfterDelete(index: number) {
    const newErrors: { [key: number]: string } = {};
    Object.keys(this.shiftRowErrors).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex < index) {
        newErrors[oldIndex] = this.shiftRowErrors[oldIndex];
      } else if (oldIndex > index) {
        newErrors[oldIndex - 1] = this.shiftRowErrors[oldIndex];
      }
    });
    this.shiftRowErrors = newErrors;
  }

  saveShiftSettings(savedShifts: any[]) {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: this.hotelId
          customer_member_id: this.memberId
        }
      }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          // Ensure `settings` key exists
          if (!existingData.settings) {
            existingData.settings = {};
          }
          // Ensure `shift_timings` key exists
          if (!Array.isArray(existingData.settings.shift_timings)) {
            existingData.settings.shift_timings = [];
          }
          // Start with existing shifts
          let updatedShifts = [...existingData.settings.shift_timings];
          // Remove shifts that are no longer in savedShifts
          updatedShifts = updatedShifts.filter((shift: any) =>
            savedShifts.some((newShift: any) => newShift.id === shift.id)
          );
          // Update existing or push new ones
          savedShifts.forEach((newShift: any) => {
            const index = updatedShifts.findIndex((s: any) => s.id === newShift.id);
            if (index > -1) {
              updatedShifts[index] = { ...updatedShifts[index], ...newShift };
            } else {
              updatedShifts.push(newShift);
            }
          });
          // console.log(" Final Updated Shifts:", updatedShifts);
          //  Merge with existing settings (don't overwrite other keys like room_range)
          const mergedSettings = {
            ...existingData.settings,
            shift_timings: updatedShifts
          };
          // Prepare update payload
          const updateRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              customer_update: {
                settings: mergedSettings
              }
            },
            extras: {
              find: {
                // id: this.hotelId
                customer_member_id: this.memberId
              }
            }
          };
          // Call update API
          this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe(
            (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                this.localService.set('selectedSlots', JSON.stringify(updatedShifts));
                this.alertService.success('Shift timings saved successfully!', this.options);
                this.closeShiftModal();
              } else {
                const message = updateResp?.message || 'Something went wrong while saving shifts.';
                this.alertService.error(message, this.options);
              }
            },
            () => {
              this.alertService.error('Error while saving shifts!', this.options);
            }
          );
        } else {
          this.alertService.error('No existing settings found!', this.options);
        }
      },
      () => {
        this.alertService.error('Something went wrong while fetching existing settings!', this.options);
      }
    );
  }

  // saveShiftSettings(savedShifts: any[]) {
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: {
  //         id: this.hotelId
  //       }
  //     }
  //   }
  //   this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
  //         // Ensure `settings` key exists
  //         const existingData = resp.result.data[0];
  //         if (!existingData.settings) {
  //           existingData.settings = {};
  //         }
  //         // Ensure `shift_timings` key exists
  //         if (!Array.isArray(existingData.settings.shift_timings)) {
  //           existingData.settings.shift_timings = [];
  //         }
  //         // Merge existing shifts with new ones
  //         let updatedShifts = [...existingData.settings.shift_timings];
  //         // Remove shifts that are not in savedShifts anymore
  //         updatedShifts = updatedShifts.filter((shift: any) =>
  //           savedShifts.some((newShift: any) => newShift.id === shift.id)
  //         );
  //         // Loop through new shifts and update/push
  //         savedShifts.forEach((newShift: any) => {
  //           const index = updatedShifts.findIndex(
  //             (s: any) => s.id === newShift.id //  or use better unique condition
  //           );
  //           if (index > -1) {
  //             // update existing
  //             updatedShifts[index] = { ...updatedShifts[index], ...newShift };
  //           } else {
  //             // add new
  //             updatedShifts.push(newShift);
  //           }
  //         });
  //         console.log("Updated Shifts:", updatedShifts);
  //         // payload for update
  //         let updateRequestBody = {
  //           domain_name: DOMAIN_NAME,
  //           user_id: USER_ID,
  //           payload: {
  //             customer_update: {
  //               settings: {
  //                 shift_timings: updatedShifts
  //               }
  //             }
  //           },
  //           extras: { find: { id: this.hotelId } }
  //         };
  //         // Call update API
  //         this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe(
  //           (updateResp: any) => {
  //             if (updateResp.success === 1 && updateResp.status_code === 200) {
  //               this.localService.set('selectedSlots', JSON.stringify(updatedShifts));
  //               this.alertService.success('Shift timings saved successfully!', this.options);
  //             } else {
  //               const message = updateResp?.message || 'Something went wrong while saving shifts.';
  //               this.alertService.error(message, this.options);
  //             }
  //           },
  //           (err: any) => {
  //             this.alertService.error('Error while saving shifts!', this.options);
  //           }
  //         );
  //       } else {
  //         this.alertService.error('No existing settings found!', this.options);
  //       }
  //     },
  //     (err: any) => {
  //       this.alertService.error('Something went wrong while fetching existing settings!', this.options);
  //     }
  //   );
  // }

  // Room Modal
  openRoomModal() {
    if (!this.canModifySystemSettings && !this.canReadSystemSettings) return;
    this.isRoomViewMode = false;
    this.loadRoomData();
  }

  viewRoomNumbers() {
    if (!this.canReadSystemSettings) return;
    this.isRoomViewMode = true;
    this.loadRoomData();
  }

  private loadRoomData() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: this.hotelId
          customer_member_id: this.memberId
        }
      }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          this.labelOption = existingData.settings?.label_option || 'same';
          this.customLabels = existingData.settings?.custom_labels || {};
          if (existingData.settings && existingData.settings.room_range && existingData.settings.room_range.length > 0) {
            this.rooms = existingData.settings.room_range.map((r: any) => ({ ...r, is_existing: true }));
          } else {
            this.rooms = [{ id: '', startRoom: '', endRoom: '', label: '' }];
          }
        } else {
          this.labelOption = 'same';
          this.customLabels = {};
          this.rooms = [{ id: '', startRoom: '', endRoom: '', label: '' }];
        }
        // console.log("Fetched rooms: ", this.rooms);
        // Clear row errors when opening modal
        this.roomRowErrors = {};
        this.invalidFields = {};
        this.invalidCustomLabels = {};
        this.roomErrorMessage = [];
        // Check if at least one room range is filled
        this.checkAtLeastOneRoomRange();
        // Finally open modal
        this.isRoomModalOpen = true;
        this.updateBodyScrollLock();
      },
      (err: any) => {
        // API error → still open modal with empty row
        this.labelOption = 'same';
        this.customLabels = {};
        this.rooms = [{ id: '', startRoom: '', endRoom: '', label: '' }];
        this.roomRowErrors = {};
        this.invalidFields = {};
        this.invalidCustomLabels = {};
        this.roomErrorMessage = [];
        this.checkAtLeastOneRoomRange();
        this.isRoomModalOpen = true;
        this.updateBodyScrollLock();
      }
    );
  }

  getIndividualRoomNumbers(): string[] {
    const list: string[] = [];
    for (const room of this.rooms) {
      if (room.startRoom !== undefined && room.startRoom !== null && String(room.startRoom).trim() !== '' &&
          room.endRoom !== undefined && room.endRoom !== null && String(room.endRoom).trim() !== '') {
        const start = Number(room.startRoom);
        const end = Number(room.endRoom);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            list.push(String(i));
          }
        }
      }
    }
    const unique = Array.from(new Set(list));
    return unique.sort((a, b) => Number(a) - Number(b));
  }

  onLabelOptionChange() {
    if (this.labelOption === 'different') {
      const individualRooms = this.getIndividualRoomNumbers();
      for (const num of individualRooms) {
        if (!this.customLabels[num]) {
          this.customLabels[num] = '';
        }
      }
    } else {
      this.customLabels = {};
    }
    this.onRoomFieldChange();
  }

  /* addRoom() {
    if (this.isRoomViewMode || !this.canModifySystemSettings) return;
    this.rooms.push({ id: '', startRoom: '', endRoom: '', label: '' });
    this.roomRowErrors = {};
    this.checkAtLeastOneRoomRange();
  } */

  addRoom() {
    if (this.isRoomViewMode || !this.canModifySystemSettings) return;
    if (this.allowedRoomCount === 1) return;
    const totalRoomsCreated = this.calculateTotalRooms();
    if (totalRoomsCreated >= this.allowedRoomCount) {
      this.roomErrorMessage = [
        `Maximum ${this.allowedRoomCount} rooms allowed. Cannot add more.`
      ];
      return;
    }
    this.rooms.push({ id: '', startRoom: '', endRoom: '', label: '' });
    this.roomRowErrors = {};
    this.checkAtLeastOneRoomRange();
  }


  removeRoom(index: number) {
    if (this.isRoomViewMode || !this.canModifySystemSettings) return;

    const roomToDelete = this.rooms[index];

    // If it's a new row, just remove it
    if (!roomToDelete.is_existing) {
      this.rooms.splice(index, 1);
      this.updateRoomRowErrorsAfterDelete(index);
      this.cleanCustomLabelsAfterRangeUpdate();
      this.validateAllRoomsLive();
      this.checkAtLeastOneRoomRange();
      return;
    }

    // If it's an existing row, verify deletion via updateCustomer API
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: this.memberId
        }
      }
    };

    this.loaderService.emitLoading();
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe({
      next: (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          if (!existingData.settings || !Array.isArray(existingData.settings.room_range)) {
            this.loaderService.emitComplete();
            this.alertService.error('No existing settings found!', this.options);
            return;
          }

          const updatedRooms = existingData.settings.room_range.filter((r: any) => r.id !== roomToDelete.id);

          // Compute active rooms for the updated ranges
          const activeRooms: string[] = [];
          for (const room of updatedRooms) {
            if (room.startRoom !== undefined && room.startRoom !== null && String(room.startRoom).trim() !== '' &&
                room.endRoom !== undefined && room.endRoom !== null && String(room.endRoom).trim() !== '') {
              const start = Number(room.startRoom);
              const end = Number(room.endRoom);
              if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let r = start; r <= end; r++) {
                  activeRooms.push(String(r));
                }
              }
            }
          }
          const activeSet = new Set(activeRooms);
          const cleanedCustomLabels = { ...existingData.settings.custom_labels };
          Object.keys(cleanedCustomLabels).forEach(key => {
            if (!activeSet.has(key)) {
              delete cleanedCustomLabels[key];
            }
          });

          const updateRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              customer_update: {
                settings: {
                  ...existingData.settings,
                  room_range: updatedRooms,
                  label_option: updatedRooms.length === 0 ? '' : (existingData.settings.label_option || ''),
                  custom_labels: cleanedCustomLabels
                }
              }
            },
            extras: {
              find: {
                customer_member_id: this.memberId
              }
            }
          };

          this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe({
            next: (updateResp: any) => {
              this.loaderService.emitComplete();
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                if (updateResp.message === 'Record successfully updated') {
                  this.rooms.splice(index, 1);
                  this.updateRoomRowErrorsAfterDelete(index);
                  this.cleanCustomLabelsAfterRangeUpdate();
                  this.validateAllRoomsLive();
                  this.checkAtLeastOneRoomRange();
                  this.localService.set('roomRange', JSON.stringify(updatedRooms));
                  this.alertService.success('Room range removed successfully!', this.options);
                } else {
                  this.alertService.error(updateResp.message, this.options);
                }
              } else {
                this.alertService.error(updateResp?.message || 'Something went wrong while removing room range.', this.options);
              }
            },
            error: () => {
              this.loaderService.emitComplete();
              this.alertService.error('Error while removing room range!', this.options);
            }
          });
        } else {
          this.loaderService.emitComplete();
          this.alertService.error('Could not fetch existing settings.', this.options);
        }
      },
      error: () => {
        this.loaderService.emitComplete();
        this.alertService.error('Something went wrong while fetching existing settings!', this.options);
      }
    });
  }

  private updateRoomRowErrorsAfterDelete(index: number) {
    const newErrors: { [key: number]: string } = {};
    Object.keys(this.roomRowErrors).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex < index) {
        newErrors[oldIndex] = this.roomRowErrors[oldIndex];
      } else if (oldIndex > index) {
        newErrors[oldIndex - 1] = this.roomRowErrors[oldIndex];
      }
    });
    this.roomRowErrors = newErrors;
  }

  validateRoom(index: number, type: 'start' | 'end') {
    // Clear row error when user starts typing
    if (this.roomRowErrors[index]) {
      delete this.roomRowErrors[index];
    }
    const value = type === 'start' ? this.rooms[index].startRoom : this.rooms[index].endRoom;
    if (value.length > 5) {
      // Clear previous errors and set new one for real-time validation
      this.roomErrorMessage = ['Room number must be 5 characters or less.'];
    } else {
      // Clear error if validation passes
      this.roomErrorMessage = [];
    }
    this.checkAtLeastOneRoomRange();
  }

  closeRoomModal() {
    this.isRoomModalOpen = false;
    this.isRoomViewMode = false;
    this.updateBodyScrollLock();
  }

  checkRoomFormValidity() {
    this.isRoomFormValid = this.rooms.every(r =>
      r.id && (r.startRoom !== undefined && r.startRoom !== null && String(r.startRoom).trim() !== '') &&
      (r.endRoom !== undefined && r.endRoom !== null && String(r.endRoom).trim() !== '') && r.label &&
      String(r.startRoom).length <= 5 && String(r.endRoom).length <= 5
    ) && (this.labelOption !== 'different' || this.getIndividualRoomNumbers().every(num => this.customLabels[num] && this.customLabels[num].trim() !== ''));
  }

  checkAtLeastOneRoomRange() {
    this.hasAtLeastOneRoomRange = this.rooms.some(room =>
      room.id && room.id.trim() !== '' &&
      room.startRoom !== undefined && room.startRoom !== null && String(room.startRoom).trim() !== '' &&
      room.endRoom !== undefined && room.endRoom !== null && String(room.endRoom).trim() !== '' &&
      room.label && room.label.trim() !== ''
    ) && (this.labelOption !== 'different' || this.getIndividualRoomNumbers().every(num => this.customLabels[num] && this.customLabels[num].trim() !== ''));
  }

  checkAtLeastOneShift() {
    this.hasAtLeastOneShift = this.shifts.some(shift =>
      shift.id && shift.id.trim() !== '' &&
      shift.startTime && shift.startTime.trim() !== '' &&
      shift.endTime && shift.endTime.trim() !== '' &&
      shift.label && shift.label.trim() !== '' &&
      /^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(shift.startTime) &&
      /^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(shift.endTime)
    );
  }

  clearShiftRowError(index: number) {
    if (this.shiftRowErrors[index]) {
      delete this.shiftRowErrors[index];
    }
  }

  clearRoomRowError(index: number) {
    if (this.roomRowErrors[index]) {
      delete this.roomRowErrors[index];
    }
  }

  // saveRooms() {
  //   for (let i = 0; i < this.rooms.length; i++) {
  //     const room = this.rooms[i];
  //     // Start Room required
  //     if (!room.startRoom || room.startRoom.trim() === '') {
  //       this.roomErrorMessage = `Please enter a Start Room for "${room.label || room.id || 'this entry'}".`;
  //       return;
  //     }
  //     // End Room required
  //     if (!room.endRoom || room.endRoom.trim() === '') {
  //       this.roomErrorMessage = `Please enter an End Room for "${room.label || room.id || 'this entry'}".`;
  //       return;
  //     }
  //     // Label required
  //     if (!room.label || room.label.trim() === '') {
  //       this.roomErrorMessage = `Please set a Label for "${room.id || `Start:${room.startRoom}-End:${room.endRoom}`}".`;
  //       return;
  //     }
  //     // ID required
  //     if (!room.id || room.id.trim() === '') {
  //       this.roomErrorMessage = `Please enter an ID for "${room.label || `Start:${room.startRoom}-End:${room.endRoom}`}".`;
  //       return;
  //     }
  //     // Max length check (≤ 5 chars)
  //     if (room.startRoom.length > 5) {
  //       this.roomErrorMessage = `Start Room cannot exceed 5 characters for "${room.label || room.id}".`;
  //       return;
  //     }
  //     if (room.endRoom.length > 5) {
  //       this.roomErrorMessage = `End Room cannot exceed 5 characters for "${room.label || room.id}".`;
  //       return;
  //     }
  //   }
  //   // Check unique Labels (case-insensitive)
  //   const labels = this.rooms.map(r => r.label.trim().toLowerCase());
  //   if (new Set(labels).size !== labels.length) {
  //     this.roomErrorMessage = 'Room Labels must be unique!';
  //     return;
  //   }
  //   // Check unique IDs (case-insensitive)
  //   const ids = this.rooms.map(r => r.id.trim().toLowerCase());
  //   if (new Set(ids).size !== ids.length) {
  //     this.roomErrorMessage = 'Room IDs must be unique!';
  //     return;
  //   }
  //   // Check unique Start/End Room ranges
  //   const ranges = this.rooms.map(r => `${r.startRoom.trim().toLowerCase()}-${r.endRoom.trim().toLowerCase()}`);
  //   if (new Set(ranges).size !== ranges.length) {
  //     this.roomErrorMessage = 'Room ranges must be unique!';
  //     return;
  //   }
  //   // Call your existing form validity check
  //   this.checkRoomFormValidity();
  //   if (!this.isRoomFormValid) {
  //     this.roomErrorMessage = 'Please fix errors before saving!';
  //     return;
  //   }
  //   // All validations passed
  //   this.roomErrorMessage = '';
  //   console.log("Saved rooms: ", this.rooms);
  //   this.saveRoomSettings(this.rooms);
  //   this.closeRoomModal();
  // }

  // saveRooms() {
  //   // helper: expand A..Z, AA.. etc
  //   const expandAlphaRange = (start: string, end: string): string[] => {
  //     const result: string[] = [];
  //     const toNumber = (str: string) => {
  //       let n = 0;
  //       for (let i = 0; i < str.length; i++) {
  //         n = n * 26 + (str.charCodeAt(i) - 65 + 1);
  //       }
  //       return n;
  //     };
  //     const toLetters = (num: number) => {
  //       let s = '';
  //       while (num > 0) {
  //         const rem = (num - 1) % 26;
  //         s = String.fromCharCode(65 + rem) + s;
  //         num = Math.floor((num - 1) / 26);
  //       }
  //       return s;
  //     };
  //     const sNum = toNumber(start.toUpperCase());
  //     const eNum = toNumber(end.toUpperCase());
  //     for (let i = sNum; i <= eNum; i++) result.push(toLetters(i));
  //     return result;
  //   };
  //   // helper: expand a single range like "A1-A5" or "1-10" -> array of concrete room names
  //   const expandRange = (startRaw: string, endRaw: string): string[] => {
  //     const start = String(startRaw).trim();
  //     const end = String(endRaw).trim();
  //     if (!start || !end) return [];
  //     // Case 1: Pure numeric 1-100
  //     if (!isNaN(Number(start)) && !isNaN(Number(end))) {
  //       const s = Number(start), e = Number(end);
  //       if (s > e) return [];
  //       const out: string[] = [];
  //       for (let i = s; i <= e; i++) out.push(String(i));
  //       return out;
  //     }
  //     // Case 2: Pure alphabetic A-C
  //     if (/^[A-Z]+$/i.test(start) && /^[A-Z]+$/i.test(end)) {
  //       return expandAlphaRange(start.toUpperCase(), end.toUpperCase());
  //     }
  //     // Case 3: NumberPrefix + LetterSuffix (e.g. 10A-10C)
  //     if (/^\d+[A-Z]+$/i.test(start) && /^\d+[A-Z]+$/i.test(end)) {
  //       const startMatch = start.match(/^(\d+)([A-Z]+)$/i);
  //       const endMatch = end.match(/^(\d+)([A-Z]+)$/i);
  //       const sPrefix = startMatch![1];
  //       const ePrefix = endMatch![1];
  //       const sSuffix = startMatch![2].toUpperCase();
  //       const eSuffix = endMatch![2].toUpperCase();
  //       // Case 3A: Same numeric prefix, suffix increases → 10A-10C
  //       if (sPrefix === ePrefix) {
  //         const suffixes = expandAlphaRange(sSuffix, eSuffix);
  //         return suffixes.map(suf => `${sPrefix}${suf}`);
  //       }
  //       // Case 3B: Numeric increases, suffix fixed → 1A-100A  (YOUR CASE)
  //       if (sSuffix === eSuffix) {
  //         const sNum = Number(sPrefix);
  //         const eNum = Number(ePrefix);
  //         if (sNum > eNum) return [];
  //         const out: string[] = [];
  //         for (let i = sNum; i <= eNum; i++) out.push(`${i}${sSuffix}`);
  //         return out;
  //       }
  //     }
  //     // Case 4: LetterPrefix + NumberSuffix (e.g. A1-A5)
  //     if (/^[A-Z]+\d+$/i.test(start) && /^[A-Z]+\d+$/i.test(end)) {
  //       const prefix = (start.match(/^[A-Z]+/i) || [''])[0];
  //       const sNum = parseInt(start.slice(prefix.length));
  //       const eNum = parseInt(end.slice(prefix.length));
  //       if (isNaN(sNum) || isNaN(eNum) || sNum > eNum) return [];
  //       const out: string[] = [];
  //       for (let i = sNum; i <= eNum; i++) out.push(`${prefix}${i}`);
  //       return out;
  //     }
  //     // fallback
  //     if (start === end) return [start];
  //     return [];
  //   };
  //   // validations 
  //   for (let i = 0; i < this.rooms.length; i++) {
  //     const room = this.rooms[i];
  //     // Required checks (same as before)
  //     if (!room.startRoom || room.startRoom.trim() === '') {
  //       this.roomErrorMessage = `Please enter a Start Room for "${room.label || room.id || 'this entry'}".`;
  //       return;
  //     }
  //     if (!room.endRoom || room.endRoom.trim() === '') {
  //       this.roomErrorMessage = `Please enter an End Room for "${room.label || room.id || 'this entry'}".`;
  //       return;
  //     }
  //     if (!room.label || room.label.trim() === '') {
  //       this.roomErrorMessage = `Please set a Label for "${room.id || `Start:${room.startRoom}-End:${room.endRoom}`}".`;
  //       return;
  //     }
  //     if (!room.id || room.id.trim() === '') {
  //       this.roomErrorMessage = `Please enter an ID for "${room.label || `Start:${room.startRoom}-End:${room.endRoom}`}".`;
  //       return;
  //     }
  //     if (room.startRoom.length > 5) {
  //       this.roomErrorMessage = `Start Room cannot exceed 5 characters for "${room.label || room.id}".`;
  //       return;
  //     }
  //     if (room.endRoom.length > 5) {
  //       this.roomErrorMessage = `End Room cannot exceed 5 characters for "${room.label || room.id}".`;
  //       return;
  //     }
  //     // If both start and end are numeric: check start <= end (keeps old behavior)
  //     const startNum = Number(room.startRoom);
  //     const endNum = Number(room.endRoom);
  //     if (!isNaN(startNum) && !isNaN(endNum)) {
  //       if (startNum > endNum) {
  //         this.roomErrorMessage = `Start Room cannot be greater than End Room for "${room.label || room.id}".`;
  //         return;
  //       }
  //     } else {
  //       // For non-numeric ranges we will not throw a numeric-only error here,
  //       // but we do a lightweight sanity check: if expansion returns empty treat as invalid range
  //       const expanded = expandRange(room.startRoom, room.endRoom);
  //       if (!expanded || expanded.length === 0) {
  //         this.roomErrorMessage = `Invalid range "${room.startRoom}-${room.endRoom}" for "${room.label || room.id}".`;
  //         return;
  //       }
  //     }
  //   }
  //   // Build expanded value lists for each room so we can detect overlaps and duplicates robustly
  //   const expandedPerRoom: string[][] = [];
  //   for (let i = 0; i < this.rooms.length; i++) {
  //     const r = this.rooms[i];
  //     const expanded = expandRange(r.startRoom, r.endRoom).map(x => String(x).trim());
  //     // If expansion produced duplicates inside the same room, reduce to unique
  //     expandedPerRoom.push([...new Set(expanded)]);
  //   }
  //   // Overlap check: if any two rooms share any expanded room name -> overlap
  //   for (let i = 0; i < expandedPerRoom.length; i++) {
  //     for (let j = 0; j < expandedPerRoom.length; j++) {
  //       if (i === j) continue;
  //       const setA = new Set(expandedPerRoom[i]);
  //       for (const val of expandedPerRoom[j]) {
  //         if (setA.has(val)) {
  //           this.roomErrorMessage = `Room range ${this.rooms[i].startRoom}-${this.rooms[i].endRoom} overlaps with existing range ${this.rooms[j].startRoom}-${this.rooms[j].endRoom}.`;
  //           return;
  //         }
  //       }
  //     }
  //   }
  //   // Uniqueness checks (labels & ids unchanged)
  //   const labels = this.rooms.map(r => r.label.trim().toLowerCase());
  //   if (new Set(labels).size !== labels.length) {
  //     this.roomErrorMessage = 'Room Labels must be unique!';
  //     return;
  //   }
  //   const ids = this.rooms.map(r => r.id.trim().toLowerCase());
  //   if (new Set(ids).size !== ids.length) {
  //     this.roomErrorMessage = 'Room IDs must be unique!';
  //     return;
  //   }
  //   // Also check that no single expanded room value is repeated across the whole set (additional safety)
  //   const allExpanded = expandedPerRoom.flat();
  //   if (new Set(allExpanded).size !== allExpanded.length) {
  //     this.roomErrorMessage = 'Room ranges expand to duplicate room numbers — please adjust ranges so expanded rooms are unique.';
  //     return;
  //   }
  //   // Final validity check (keeps your existing check)
  //   this.checkRoomFormValidity();
  //   if (!this.isRoomFormValid) {
  //     this.roomErrorMessage = 'Please fix errors before saving!';
  //     return;
  //   }
  //   // All validations passed
  //   this.roomErrorMessage = '';
  //   console.log("Saved rooms: ", this.rooms);
  //   // remove is_existing before saving
  //   const cleanRooms = this.rooms.map(r => {
  //     const { is_existing, ...rest } = r;
  //     return rest;
  //   });
  //   console.log("Cleared rooms: ", cleanRooms);
  //   // If you want to persist the expanded values to this.labelRoomArray as prepareAndCallProcessedTaskApi does:
  //   // this.labelRoomArray = allExpanded;  // uncomment if intended
  //   this.saveRoomSettings(cleanRooms);
  //   this.closeRoomModal();
  // }

  saveRoomSettings(savedRooms: any[]) {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: this.hotelId
          customer_member_id: this.memberId
        }
      }
    };

    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          if (!existingData.settings) {
            existingData.settings = {};
          }
          if (!Array.isArray(existingData.settings.room_range)) {
            existingData.settings.room_range = [];
          }
          let updatedRooms = [...existingData.settings.room_range];
          // Remove rooms not in savedRooms
          updatedRooms = updatedRooms.filter((room: any) =>
            savedRooms.some((newRoom: any) => newRoom.id === room.id)
          );
          // Merge / Add rooms
          savedRooms.forEach((newRoom: any) => {
            const index = updatedRooms.findIndex((r: any) => r.id === newRoom.id);
            if (index > -1) {
              updatedRooms[index] = { ...updatedRooms[index], ...newRoom };
            } else {
              updatedRooms.push(newRoom);
            }
          });
          // console.log("Final Updated Rooms:", updatedRooms);
          // Merge with existing settings (don't overwrite)
          const mergedSettings = {
            ...existingData.settings,
            room_range: updatedRooms,
            label_option: updatedRooms.length === 0 ? '' : this.labelOption,
            custom_labels: this.customLabels
          };
          const updateRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              customer_update: {
                settings: mergedSettings
              }
            },
            extras: {
              find: {
                // id: this.hotelId
                customer_member_id: this.memberId
              }
            }
          };
          this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe(
            (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                this.localService.set('roomRange', JSON.stringify(updatedRooms));
                this.alertService.success('Room ranges saved successfully!', this.options);
                this.closeRoomModal();
              } else {
                const message = updateResp?.message || 'Something went wrong while saving room ranges.';
                this.alertService.error(message, this.options);
              }
            },
            () => this.alertService.error('Error while saving room ranges!', this.options)
          );
        } else {
          this.alertService.error('No existing settings found!', this.options);
        }
      },
      () => this.alertService.error('Something went wrong while fetching existing settings!', this.options)
    );
  }

  //  openDurationModal() {
  //   this.isDurationModalOpen = true;
  //   // To salect previously saved slots
  //   const storedSlots = this.localService.get('selectedSlots');
  //   this.selectedSlots = storedSlots ? JSON.parse(storedSlots) : [];
  //   // Restore duration & start time
  //   const storedDurationData = this.localService.get('durationData');
  //   if (storedDurationData) {
  //     const parsedData = JSON.parse(storedDurationData);
  //     this.selectedDuration = parsedData.selectedDuration || null;
  //     this.selectedStartTime = parsedData.selectedStartTime || null;
  //     // Rebuild available slots based on restored values
  //     if (this.selectedDuration && this.selectedStartTime) {
  //       this.updateAvailableSlots();
  //     }
  //   }
  // }

  // checks if a slot is already selected
  // isSlotSelected(slot: { start: string, end: string }): boolean {
  //   return this.selectedSlots.some(s => s.start === slot.start && s.end === slot.end);
  // }

  // generateTimeList(start: string, end: string): string[] {
  //   const times: string[] = [];
  //   let current = this.toDateObj(start);
  //   const endDate = this.toDateObj(end);
  //   while (current <= endDate) {
  //     times.push(this.formatAMPM(current));
  //     current.setMinutes(current.getMinutes() + 30);
  //   }
  //   // Ensure 11.59 PM is included if not exactly on 30-min interval
  //   const lastFormatted = this.formatAMPM(endDate);
  //   if (!times.includes(lastFormatted)) {
  //     times.push(lastFormatted);
  //   }
  //   return times;
  // }

  // toDateObj(timeStr: string): Date {
  //   // Normalize input: replace dot with colon and ensure upper case AM/PM
  //   const cleanTime = timeStr.replace('.', ':').toUpperCase();
  //   const date = new Date();
  //   const [time, modifier] = cleanTime.split(' ');
  //   let [hours, minutes] = time.split(':').map(Number);
  //   if (modifier === 'PM' && hours !== 12) hours += 12;
  //   if (modifier === 'AM' && hours === 12) hours = 0;
  //   date.setHours(hours, minutes, 0, 0);
  //   return date;
  // }

  // formatAMPM(date: Date): string {
  //   let hours = date.getHours();
  //   const minutes = date.getMinutes();
  //   const ampm = hours >= 12 ? 'PM' : 'AM';
  //   hours = hours % 12 || 12;
  //   const mins = minutes < 10 ? '0' + minutes : minutes;
  //   return `${hours}.${mins} ${ampm}`;
  // }

  // updateAvailableSlots() {
  //   this.availableSlots = [];
  //   // this.selectedSlots = [];
  //   if (!this.selectedDuration || !this.selectedStartTime) return;
  //   const startIndex = this.availableStartTimes.indexOf(this.selectedStartTime);
  //   const totalSlots = 48; // 24 hours * 2 (30-min slots)
  //   const slotsNeeded = this.selectedDuration * 2;
  //   let currentIndex = startIndex;
  //   let remainingSlots = totalSlots - startIndex;
  //   while (remainingSlots > 0) {
  //     const start = this.availableStartTimes[currentIndex];
  //     let endIndex = currentIndex + slotsNeeded;
  //     if (endIndex >= this.availableStartTimes.length) {
  //       // Cap end index at the last slot
  //       endIndex = this.availableStartTimes.length - 1;
  //     }
  //     const end = this.availableStartTimes[endIndex];
  //     if (start && end) {
  //       this.availableSlots.push({ start, end });
  //     }
  //     // Move to the next block
  //     currentIndex = endIndex;
  //     remainingSlots = totalSlots - currentIndex;
  //   }
  // }

  // onSlotSelect(event: any, slot: { start: string, end: string }) {
  //   if (event.target.checked) {
  //     this.selectedSlots.push(slot);
  //   } else {
  //     this.selectedSlots = this.selectedSlots.filter(s => s.start !== slot.start || s.end !== slot.end);
  //   }
  // }

  // closeDurationModal() {
  //   this.isDurationModalOpen = false;
  //   this.resetFields();
  // }

  // saveDuration() {
  //   // Convert array of objects to JSON string before saving
  //   this.localService.set('selectedSlots', JSON.stringify(this.selectedSlots));
  //   // Retrieve and parse it back to object array
  //   const storedSlots = this.localService.get('selectedSlots');
  //   const parsedSlots = storedSlots ? JSON.parse(storedSlots) : [];
  //   const durationData = {
  //     selectedDuration: this.selectedDuration,
  //     selectedStartTime: this.selectedStartTime
  //   };
  //   this.localService.set('durationData', JSON.stringify(durationData));
  //   console.log('Selected Slots:', storedSlots);
  //   console.log('Selected Duration:', this.selectedDuration);
  //   console.log('Selected Start Time:', this.selectedStartTime);
  //   this.isDurationModalOpen = false;
  //   // this.resetFields();
  // }

  // resetFields() {
  //   this.selectedDuration = null;
  //   this.selectedStartTime = null;
  //   this.availableSlots = [];
  //   this.selectedSlots = [];
  // }

  navigateToPrivacy() {
    this.routerUrl.navigate(['/privacy-policy']);
  }

  navigateToTerms() {
    this.routerUrl.navigate(['/terms-conditions']);
  }

  getLateCheckoutSettings() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: this.hotelId 
          customer_member_id: this.memberId
        }
      }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          if (existingData.settings && existingData.settings.late_checkout_required !== undefined) {
            this.lateCheckoutRequired = existingData.settings.late_checkout_required;
          }
        }
      },
      (err: any) => {
        console.error('Error loading late checkout setting:', err);
        this.lateCheckoutRequired = false;
      }
    );
  }

  onLateCheckoutToggle() {
    if (!this.canModifySystemSettings) {
      // Revert toggle if no permission
      this.lateCheckoutRequired = !this.lateCheckoutRequired;
      return;
    }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: this.hotelId
          customer_member_id: this.memberId
        }
      }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          // Ensure `settings` key exists
          if (!existingData.settings) {
            existingData.settings = {};
          }
          // Update late checkout setting
          const mergedSettings = {
            ...existingData.settings,
            late_checkout_required: this.lateCheckoutRequired
          };
          // Prepare update payload
          const updateRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              customer_update: {
                settings: mergedSettings
              }
            },
            extras: {
              find: {
                // id: this.hotelId
                customer_member_id: this.memberId
              }
            }
          };
          // Call update API
          this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe(
            (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                // this.alertService.success('Late checkout setting updated successfully!', this.options);
                const msg = this.lateCheckoutRequired
                  ? 'Late checkout has been enabled.'
                  : 'Late checkout has been disabled.';
                this.alertService.success(msg, this.options);
              } else {
                const message = updateResp?.message || 'Something went wrong while updating late checkout setting.';
                this.alertService.error(message, this.options);
                // Revert toggle on error
                this.lateCheckoutRequired = !this.lateCheckoutRequired;
              }
            },
            () => {
              this.alertService.error('Error while updating late checkout setting!', this.options);
              // Revert toggle on error
              this.lateCheckoutRequired = !this.lateCheckoutRequired;
            }
          );
        } else {
          this.alertService.error('No existing settings found!', this.options);
          // Revert toggle on error
          this.lateCheckoutRequired = !this.lateCheckoutRequired;
        }
      },
      () => {
        this.alertService.error('Something went wrong while fetching existing settings!', this.options);
        // Revert toggle on error
        this.lateCheckoutRequired = !this.lateCheckoutRequired;
      }
    );
  }

  // Newly added for room restiction
  getRoomCount() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: this.hotelId 
          customer_member_id: this.memberId
        }
      }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          const roomCount = existingData?.property_details?.property_address?.number_of_rooms;
          this.allowedRoomCount = Number(roomCount) || 0;
          // console.log('Room count:', this.allowedRoomCount);
        }
      },
      (err: any) => {
        console.error('Error loading room count:', err);
      }
    );
  }

  calculateTotalRooms(): number {
    let total = 0;
    for (const room of this.rooms) {
      if (room.startRoom !== undefined && room.startRoom !== null && String(room.startRoom).trim() !== '' &&
          room.endRoom !== undefined && room.endRoom !== null && String(room.endRoom).trim() !== '') {
        const start = Number(room.startRoom);
        const end = Number(room.endRoom);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          total += (end - start + 1);
        }
      }
    }
    return total;
  }

  onRoomFieldChange() {
    this.sanitizeRoomRanges();
    this.cleanCustomLabelsAfterRangeUpdate();
    this.checkAtLeastOneRoomRange();
    this.validateAllRoomsLive();
  }

  sanitizeRoomRanges() {
    for (const room of this.rooms) {
      if (room.startRoom) {
        let s = String(room.startRoom).replace(/^0+/, '');
        if (s !== room.startRoom) {
          room.startRoom = s;
        }
      }
      if (room.endRoom) {
        let e = String(room.endRoom).replace(/^0+/, '');
        if (e !== room.endRoom) {
          room.endRoom = e;
        }
      }
    }
  }

  cleanCustomLabelsAfterRangeUpdate() {
    const activeRooms = this.getIndividualRoomNumbers();
    const activeSet = new Set(activeRooms);
    Object.keys(this.customLabels).forEach(key => {
      if (!activeSet.has(key)) {
        delete this.customLabels[key];
      }
    });
  }

  saveRooms() {
    if (this.isRoomViewMode || !this.canModifySystemSettings) return;
    this.validateAllRoomsLive();
    if (Object.keys(this.roomRowErrors).length > 0 ||
      this.roomErrorMessage.length > 0) {
      return;
    }
    const cleanRooms = this.rooms.map(r => {
      const { is_existing, ...rest } = r;
      return rest;
    });
    this.saveRoomSettings(cleanRooms);
  }

  validateAllRoomsLive() {
    this.roomRowErrors = {};
    this.invalidFields = {};
    this.invalidCustomLabels = {};
    this.roomErrorMessage = [];
    const errors: string[] = [];
    // ------- Row-Level Validation --------
    for (let i = 0; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      const missingFields: string[] = [];
      const validationErrors: string[] = [];
      
      const isIdInvalid = !room.id?.trim();
      const isStartMissing = room.startRoom === undefined || room.startRoom === null || String(room.startRoom).trim() === '';
      const isEndMissing = room.endRoom === undefined || room.endRoom === null || String(room.endRoom).trim() === '';
      const isLabelInvalid = !room.label?.trim();
      
      let isStartInvalid = isStartMissing;
      let isEndInvalid = isEndMissing;

      if (isIdInvalid) missingFields.push('ID');
      if (isStartMissing) missingFields.push('Start Room');
      if (isEndMissing) missingFields.push('End Room');
      if (isLabelInvalid) missingFields.push('Label');

      if (room.startRoom && String(room.startRoom).length > 5) {
        validationErrors.push('Start Room exceeds 5 characters');
        isStartInvalid = true;
      }
      if (room.endRoom && String(room.endRoom).length > 5) {
        validationErrors.push('End Room exceeds 5 characters');
        isEndInvalid = true;
      }


      if (room.startRoom && room.endRoom) {
        const start = Number(room.startRoom);
        const end = Number(room.endRoom);
        if (isNaN(start) || isNaN(end)) {
          validationErrors.push('Start/End Room must be numeric');
          if (isNaN(start)) isStartInvalid = true;
          if (isNaN(end)) isEndInvalid = true;
        } else if (start > end) {
          validationErrors.push('Start Room cannot be greater than End Room');
          isStartInvalid = true;
          isEndInvalid = true;
        }
      }

      this.invalidFields[i] = {
        id: isIdInvalid,
        startRoom: isStartInvalid,
        endRoom: isEndInvalid,
        label: isLabelInvalid
      };

      if (missingFields.length || validationErrors.length) {
        let message = '';
        if (missingFields.length) {
          message = `Please fill: ${missingFields.join(', ')}.`;
        }
        if (validationErrors.length) {
          if (message) message += ' ';
          message += validationErrors.join(', ') + '.';
        }
        this.roomRowErrors[i] = message;
      }
    }
    // -------- Overlap Validation --------
    for (let i = 0; i < this.rooms.length; i++) {
      const r1 = this.rooms[i];
      const s1 = Number(r1.startRoom);
      const e1 = Number(r1.endRoom);
      if (isNaN(s1) || isNaN(e1)) continue;
      for (let j = i + 1; j < this.rooms.length; j++) {
        const r2 = this.rooms[j];
        const s2 = Number(r2.startRoom);
        const e2 = Number(r2.endRoom);
        if (isNaN(s2) || isNaN(e2)) continue;
        // TRUE overlap condition
        if (s1 <= e2 && s2 <= e1) {
          this.roomRowErrors[i] =
            `Room range overlaps with ${s2}-${e2}.`;
          this.roomRowErrors[j] =
            `Room range overlaps with ${s1}-${e1}.`;
          
          if (!this.invalidFields[i]) this.invalidFields[i] = {};
          this.invalidFields[i].startRoom = true;
          this.invalidFields[i].endRoom = true;

          if (!this.invalidFields[j]) this.invalidFields[j] = {};
          this.invalidFields[j].startRoom = true;
          this.invalidFields[j].endRoom = true;
        }
      }
    }
    // -------- Custom Labels Validation --------
    const totalRoomsCreated = this.calculateTotalRooms();
    if (this.labelOption === 'different' && this.getIndividualRoomNumbers().length > 0 && totalRoomsCreated <= this.allowedRoomCount) {
      const individualRooms = this.getIndividualRoomNumbers();
      let hasMissing = false;
      let hasTooLong = false;
      for (const num of individualRooms) {
        const val = this.customLabels[num];
        if (!val || !val.trim()) {
          hasMissing = true;
          this.invalidCustomLabels[num] = true;
        } else if (val.trim().length > 10) {
          hasTooLong = true;
          this.invalidCustomLabels[num] = true;
        }
      }
      if (hasMissing) {
        errors.push('Please enter a label for each custom room number.');
      }
      if (hasTooLong) {
        errors.push('Custom room labels cannot exceed 10 characters.');
      }
      // Check duplicate custom labels
      const customLabelsMap = new Map<string, string[]>();
      for (const num of individualRooms) {
        const val = this.customLabels[num]?.trim().toLowerCase().replace(/\s+/g, ' ');
        if (val) {
          if (!customLabelsMap.has(val)) customLabelsMap.set(val, []);
          customLabelsMap.get(val)!.push(num);
        }
      }
      let hasDuplicateCustom = false;
      customLabelsMap.forEach((nums) => {
        if (nums.length > 1) {
          hasDuplicateCustom = true;
          nums.forEach(num => {
            this.invalidCustomLabels[num] = true;
          });
        }
      });
      if (hasDuplicateCustom) {
        errors.push('Custom room labels must be unique.');
      }
    }
    // -------- Duplicate Labels --------
    const labelsMap = new Map<string, number[]>();
    this.rooms.forEach((r, idx) => {
      const lbl = r.label?.trim().toLowerCase().replace(/\s+/g, ' ');
      if (lbl) {
        if (!labelsMap.has(lbl)) labelsMap.set(lbl, []);
        labelsMap.get(lbl)!.push(idx);
      }
    });
    let hasDuplicateLabels = false;
    labelsMap.forEach((indices) => {
      if (indices.length > 1) {
        hasDuplicateLabels = true;
        indices.forEach(idx => {
          if (!this.invalidFields[idx]) this.invalidFields[idx] = {};
          this.invalidFields[idx].label = true;
        });
      }
    });
    if (hasDuplicateLabels) {
      errors.push('Room Labels must be unique!');
    }

    // -------- Duplicate IDs --------
    const idsMap = new Map<string, number[]>();
    this.rooms.forEach((r, idx) => {
      const idVal = r.id?.trim().toLowerCase().replace(/\s+/g, ' ');
      if (idVal) {
        if (!idsMap.has(idVal)) idsMap.set(idVal, []);
        idsMap.get(idVal)!.push(idx);
      }
    });
    let hasDuplicateIds = false;
    idsMap.forEach((indices) => {
      if (indices.length > 1) {
        hasDuplicateIds = true;
        indices.forEach(idx => {
          if (!this.invalidFields[idx]) this.invalidFields[idx] = {};
          this.invalidFields[idx].id = true;
        });
      }
    });
    if (hasDuplicateIds) {
      errors.push('Room IDs must be unique!');
    }

    // -------- Duplicate Ranges --------
    const rangesMap = new Map<string, number[]>();
    this.rooms.forEach((r, idx) => {
      if (r.startRoom && r.endRoom) {
        const rng = `${r.startRoom}-${r.endRoom}`;
        if (!rangesMap.has(rng)) rangesMap.set(rng, []);
        rangesMap.get(rng)!.push(idx);
      }
    });
    let hasDuplicateRanges = false;
    rangesMap.forEach((indices) => {
      if (indices.length > 1) {
        hasDuplicateRanges = true;
        indices.forEach(idx => {
          if (!this.invalidFields[idx]) this.invalidFields[idx] = {};
          this.invalidFields[idx].startRoom = true;
          this.invalidFields[idx].endRoom = true;
        });
      }
    });
    if (hasDuplicateRanges) {
      errors.push('Room ranges must be unique!');
    }

    // -------- Room Count Limit --------
    if (totalRoomsCreated > this.allowedRoomCount) {
      errors.push(
        `You are allowed to create only ${this.allowedRoomCount} rooms. Currently creating ${totalRoomsCreated}.`
      );
    }
    this.roomErrorMessage = errors;
  }



  /* saveRooms() {
  if (this.isRoomViewMode || !this.canModifySystemSettings) return;
  this.roomErrorMessage = [];
  this.roomRowErrors = {};
  const errors: string[] = [];
  // Validate each room and populate row-specific errors
  for (let i = 0; i < this.rooms.length; i++) {
    const room = this.rooms[i];
    const missingFields: string[] = [];
    const validationErrors: string[] = [];
    // Required checks
    if (!room.startRoom || room.startRoom.trim() === '') {
      missingFields.push('Start Room');
    }
    if (!room.endRoom || room.endRoom.trim() === '') {
      missingFields.push('End Room');
    }
    if (!room.label || room.label.trim() === '') {
      missingFields.push('Label');
    }
    if (!room.id || room.id.trim() === '') {
      missingFields.push('ID');
    }
    if (room.startRoom && room.startRoom.length > 5) {
      validationErrors.push('Start Room exceeds 5 characters');
    }
    if (room.endRoom && room.endRoom.length > 5) {
      validationErrors.push('End Room exceeds 5 characters');
    }
    // Convert start/end to numbers for validation
    if (room.startRoom && room.endRoom) {
      const start = Number(room.startRoom);
      const end = Number(room.endRoom);
      if (isNaN(start) || isNaN(end)) {
        validationErrors.push('Start/End Room must be numeric');
      } else {
        if (start > end) {
          validationErrors.push('Start Room cannot be greater than End Room');
        }
      }
    }
    // Build single consolidated message
    if (missingFields.length > 0 || validationErrors.length > 0) {
      let message = '';
      if (missingFields.length > 0) {
        message = `Please fill: ${missingFields.join(', ')}.`;
      }
      if (validationErrors.length > 0) {
        if (message) message += ' ';
        message += validationErrors.join(', ') + '.';
      }
      this.roomRowErrors[i] = message;
    }
  }
  // Overlap checks
  for (let i = 0; i < this.rooms.length; i++) {
    const room = this.rooms[i];
    if (room.startRoom && room.endRoom) {
      const start = Number(room.startRoom);
      const end = Number(room.endRoom);
      if (!isNaN(start) && !isNaN(end)) {
        for (let j = i + 1; j < this.rooms.length; j++) {
          const otherRoom = this.rooms[j];
          if (otherRoom.startRoom && otherRoom.endRoom) {
            const otherStart = Number(otherRoom.startRoom);
            const otherEnd = Number(otherRoom.endRoom);
            if (!isNaN(otherStart) && !isNaN(otherEnd)) {
              if (!(end < otherStart || start > otherEnd)) {
                const overlapError = `Room range overlaps with range ${otherStart}-${otherEnd}.`;
                if (this.roomRowErrors[i]) {
                  this.roomRowErrors[i] = `${this.roomRowErrors[i]} ${overlapError}`;
                } else {
                  this.roomRowErrors[i] = overlapError;
                }
                if (this.roomRowErrors[j]) {
                  this.roomRowErrors[j] = `${this.roomRowErrors[j]} ${overlapError}`;
                } else {
                  this.roomRowErrors[j] = overlapError;
                }
              }
            }
          }
        }
      }
    }
  }
  // Uniqueness checks
  const labels = this.rooms.map(r => r.label && r.label.trim() ? r.label.trim().toLowerCase() : '').filter(l => l !== '');
  if (new Set(labels).size !== labels.length) {
    errors.push('Room Labels must be unique!');
  }
  const ids = this.rooms.map(r => r.id && r.id.trim() ? r.id.trim().toLowerCase() : '').filter(id => id !== '');
  if (new Set(ids).size !== ids.length) {
    errors.push('Room IDs must be unique!');
  }
  const ranges = this.rooms
    .map(r => r.startRoom && r.endRoom ? `${r.startRoom.trim().toLowerCase()}-${r.endRoom.trim().toLowerCase()}` : '')
    .filter(r => r !== '');
  if (new Set(ranges).size !== ranges.length) {
    errors.push('Room ranges must be unique!');
  }
  // If there are row errors or general errors, display them
  if (Object.keys(this.roomRowErrors).length > 0 || errors.length > 0) {
    this.roomErrorMessage = errors;
    return;
  }
  // Newly added for room restiction
  const totalRoomsCreated = this.calculateTotalRooms();
  if (totalRoomsCreated > this.allowedRoomCount) {
    this.roomErrorMessage = [
      `You are allowed to create only ${this.allowedRoomCount} rooms. 
   Currently you are trying to create ${totalRoomsCreated} rooms.`
    ];
    return;
  }
  // End of room restiction
  // Final validity check
  this.checkRoomFormValidity();
  if (!this.isRoomFormValid) {
    this.roomErrorMessage = ['Please fix errors before saving!'];
    return;
  }
  // All validations passed
  // console.log("Saved rooms: ", this.rooms);
  // remove is_existing before saving
  const cleanRooms = this.rooms.map(r => {
    const { is_existing, ...rest } = r;
    return rest;
  });
  // console.log("Cleared rooms: ", cleanRooms);
  this.saveRoomSettings(cleanRooms);
  this.closeRoomModal();
} */

  // Allow only alphanumeric characters for IDs
  allowOnlyAlphanumeric(event: KeyboardEvent) {
    const allowed = /^[a-zA-Z0-9]*$/;
    if (!allowed.test(event.key)) {
      event.preventDefault();
    }
  }

  // Allow only numbers for room ranges, but do not allow a leading 0 (e.g., 0, 01, 000)
  allowOnlyNumbers(event: KeyboardEvent) {
    const allowed = /^[0-9]*$/;
    if (!allowed.test(event.key)) {
      event.preventDefault();
      return;
    }
    const inputElement = event.target as HTMLInputElement;
    const selectionStart = inputElement.selectionStart ?? 0;
    if (event.key === '0' && selectionStart === 0) {
      event.preventDefault();
    }
  }

  // Handle numeric-only paste and prevent leading 0
  handleNumericPaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^[0-9]*$/.test(pasted) || pasted.startsWith('0')) {
      event.preventDefault(); // Block non-numeric or leading 0
    }
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
