import { HotelEnrollmentTabviewService } from './../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { USER_ID } from './../app.config';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertsService } from '../shared/alerts/alerts.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { ProfileService } from '../profile/profile.service';
import { DOMAIN_NAME } from '../app.config';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { Router } from '@angular/router';

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
  errorMessage = '';
  isFormValid = false;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  // Newly added - to update room numbers
  rooms: any[] = [
    { id: '', startRoom: '', endRoom: '', label: '' }
  ];
  roomErrorMessage: string = '';
  isRoomModalOpen: boolean = false;
  isRoomFormValid: boolean = false;

  constructor(
    private fb: FormBuilder,
    private alertService: AlertsService,
    private localService: LocalStorageService,
    private profileService: ProfileService,
    private routerUrl: Router,
    private hotelEnrollmentTabviewService: HotelEnrollmentTabviewService
  ) { }

  ngOnInit(): void {
    this.passwordUpdateForm = this.fb.group({
      current_password: ['', [Validators.minLength(6), Validators.required]],
      new_password: ['', [Validators.minLength(6), Validators.required]],
      confirm_password: ['', [Validators.minLength(6), Validators.required]],
    });
    // Customer id
    this.hotelId = Number(this.localService.get('UserId'));
    // this.availableStartTimes = this.generateTimeList('12:00 AM', '11:59 PM');
  }

  get p() { return this.passwordUpdateForm.controls; }

  openPasswordModal() {
    this.isPasswordModalOpen = true;
  }

  closePasswordModal(event: Event) {
    if (event.target === event.currentTarget) {
      this.isPasswordModalOpen = false;
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

  savePasswordChanges() {
    if (this.passwordUpdateForm.valid) {
      this.validateForm2 = true;
      const storedPassword = this.localService.get('Password');
      //console.log("pwrd", storedPassword)
      const currentPassword = this.p['current_password'].value;
      // Check if current password matches the stored password
      if (storedPassword !== currentPassword) {
        console.log("storedPassword", storedPassword, "currentPassword", currentPassword)
        this.p['current_password'].setErrors({ incorrect: true });
        this.alertService.error(("Current Password is incorrect."), this.options);
        return;
      }
      // Ensure passwords match
      if (this.p['new_password'].value !== this.p['confirm_password'].value) {
        console.log("newPassword", this.p['new_password'].value, "confirmPassword", this.p['confirm_password'].value)
        this.p['confirm_password'].setErrors({ matchError: true });
        this.alertService.error(("New Password and Confirm Password do not match."), this.options);
        return;
      }
      // Ensure passwords match
      if (this.p['new_password'].value == storedPassword) {
        console.log("newPassword", this.p['new_password'].value, "storedPassword", storedPassword)
        this.alertService.error(("New Password cannot be same as old Password"), this.options);
        return;
      }
      this.localService.set('Password', this.p['new_password'].value);
      let formData = {
        new_password: this.p['new_password'].value,
        // old_password: this.p['current_password'].value
      };
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
            this.passwordUpdateForm.reset();
            this.isPasswordModalOpen = false;
            this.alertService.success(("Password updated successfully!"), this.options);
            this.localService.set('Password', this.p['new_password'].value);
            setTimeout(() => {
              this.alertService.clear(); // Clears the alert message
            }, 2000);
          } else {
            this.alertService.error((resp?.message || "Something went wrong."), this.options);
            setTimeout(() => {
              this.alertService.clear(); // Clears the alert message
            }, 2000);
          }
        },
        err => {
          this.alertService.error(("Error updating password: " + (err.error?.message || "Please try again!")), this.options);
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

  openPaymentPlan() {
    //console.log('openPaymentPlan');
    this.routerUrl.navigateByUrl('/payment-subscription');
  }

  openDurationModal() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: this.hotelId } }
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
        console.log("Fetched shifts: ", this.shifts);
        // Finally open modal
        this.isDurationModalOpen = true;
      },
      (err: any) => {
        this.shifts = [{ id: '', startTime: '', startMeridian: 'AM', endTime: '', endMeridian: 'AM', label: '' }];
        this.isDurationModalOpen = true;
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
    this.shifts.push({ id: '', startTime: '', startMeridian: 'AM', endTime: '', endMeridian: 'AM', label: '' });
  }

  // Allow only numbers + colon in time input
  restrictTimeInput(event: any) {
    const allowed = /^[0-9:]*$/;
    if (!allowed.test(event.key)) {
      event.preventDefault();
    }
  }

  validateId(index: number) {
    if (!this.shifts[index].id || this.shifts[index].id.trim() === '') {
      this.errorMessage = 'Please set a unique ID for this shift.';
      this.isFormValid = false;
      return;
    }
    this.errorMessage = '';
    this.checkFormValidity();
  }

  validateTime(index: number, type: 'start' | 'end') {
    const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/; // 12hr format
    const value = type === 'start' ? this.shifts[index].startTime : this.shifts[index].endTime;
    if (!value) {
      this.errorMessage = type === 'start' ? 'Please enter start time.' : 'Please enter end time.';
      this.isFormValid = false;
      return;
    }
    if (!timePattern.test(value)) {
      this.errorMessage = 'Invalid time! Use 12-hour format (HH:MM, e.g., 9:00 or 12:30).';
      this.isFormValid = false;
      return;
    }
    this.errorMessage = '';
    this.checkFormValidity();
  }

  validateLabel(index: number) {
    if (!this.shifts[index].label || this.shifts[index].label.trim() === '') {
      this.errorMessage = 'Please set a label for shift timing.';
      this.isFormValid = false;
      return;
    }
    this.errorMessage = '';
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
  }

  saveShifts() {
    for (let i = 0; i < this.shifts.length; i++) {
      if (!this.shifts[i].id) {
        this.errorMessage = 'Please enter an ID for shift.';
        return;
      }
      if (!this.shifts[i].startTime && !this.shifts[i].endTime && !this.shifts[i].label) {
        this.errorMessage = 'Please enter the time details.';
        return;
      }
      if (!this.shifts[i].startTime) {
        this.errorMessage = 'Please enter start time.';
        return;
      }
      if (!this.shifts[i].endTime) {
        this.errorMessage = 'Please enter end time.';
        return;
      }
      if (!/^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(this.shifts[i].startTime) ||
        !/^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(this.shifts[i].endTime)) {
        this.errorMessage = 'Invalid time! Use 12-hour format (HH:MM, e.g., 9:00 or 12:30).';
        return;
      }
      if (!this.shifts[i].label || this.shifts[i].label.trim() === '') {
        this.errorMessage = 'Please set a label for shift timing.';
        return;
      }
    }
    // Check duplicate IDs
    const labels = this.shifts.map(s => s.label);
    if (new Set(labels).size !== labels.length) {
      this.errorMessage = 'Shift Labels must be unique!';
      return;
    }
    // Check duplicate IDs
    const ids = this.shifts.map(s => s.id);
    if (new Set(ids).size !== ids.length) {
      this.errorMessage = 'Shift IDs must be unique!';
      return;
    }
    this.checkFormValidity();
    if (!this.isFormValid) {
      this.errorMessage = 'Please fix errors before saving!';
      return;
    }
    console.log("Saved shifts: ", this.shifts);
    // Remove is_existing before saving
    const cleanShifts = this.shifts.map(s => {
      const { is_existing, ...rest } = s;
      return rest;
    });
    this.saveShiftSettings(cleanShifts);
    this.closeShiftModal();
  }

  removeShift(index: number) {
    this.shifts.splice(index, 1);
  }

  saveShiftSettings(savedShifts: any[]) {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: this.hotelId
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
          console.log(" Final Updated Shifts:", updatedShifts);
          //  Merge with existing settings (don’t overwrite other keys like room_range)
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
            extras: { find: { id: this.hotelId } }
          };
          // Call update API
          this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe(
            (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                this.localService.set('selectedSlots', JSON.stringify(updatedShifts));
                this.alertService.success('Shift timings saved successfully!', this.options);
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
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: this.hotelId } }
    };
    this.hotelEnrollmentTabviewService.getCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
          const existingData = resp.result.data[0];
          if (existingData.settings && existingData.settings.room_range) {
            // If already exists → prefill modal
            // this.rooms = [...existingData.settings.room_range];
            // mark only for UI use
            this.rooms = existingData.settings.room_range.map((r: any) => ({ ...r, is_existing: true }));
          } else {
            // No room_range found → add empty row
            this.rooms = [{ id: '', startRoom: '', endRoom: '', label: '' }];
          }
        } else {
          // No data found → just initialize empty
          this.rooms = [{ id: '', startRoom: '', endRoom: '', label: '' }];
        }
        console.log("Fetched rooms: ", this.rooms);
        // Finally open modal
        this.isRoomModalOpen = true;
      },
      (err: any) => {
        // API error → still open modal with empty row
        this.rooms = [{ id: '', startRoom: '', endRoom: '', label: '' }];
        this.isRoomModalOpen = true;
      }
    );
  }

  addRoom() {
    this.rooms.push({ id: '', startRoom: '', endRoom: '', label: '' });
  }

  removeRoom(index: number) {
    this.rooms.splice(index, 1);
  }

  validateRoom(index: number, type: 'start' | 'end') {
    const value = type === 'start' ? this.rooms[index].startRoom : this.rooms[index].endRoom;
    if (value.length > 5) {
      this.roomErrorMessage = 'Room number must be 5 characters or less.';
    } else {
      this.roomErrorMessage = '';
    }
  }

  closeRoomModal() {
    this.isRoomModalOpen = false;
  }

  checkRoomFormValidity() {
    this.isRoomFormValid = this.rooms.every(r =>
      r.id && r.startRoom && r.endRoom && r.label &&
      r.startRoom.length <= 5 && r.endRoom.length <= 5
    );
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

  saveRooms() {
    for (let i = 0; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      // Required checks
      if (!room.startRoom || room.startRoom.trim() === '') {
        this.roomErrorMessage = `Please enter a Start Room for "${room.label || room.id || 'this entry'}".`;
        return;
      }
      if (!room.endRoom || room.endRoom.trim() === '') {
        this.roomErrorMessage = `Please enter an End Room for "${room.label || room.id || 'this entry'}".`;
        return;
      }
      if (!room.label || room.label.trim() === '') {
        this.roomErrorMessage = `Please set a Label for "${room.id || `Start:${room.startRoom}-End:${room.endRoom}`}".`;
        return;
      }
      if (!room.id || room.id.trim() === '') {
        this.roomErrorMessage = `Please enter an ID for "${room.label || `Start:${room.startRoom}-End:${room.endRoom}`}".`;
        return;
      }
      if (room.startRoom.length > 5) {
        this.roomErrorMessage = `Start Room cannot exceed 5 characters for "${room.label || room.id}".`;
        return;
      }
      if (room.endRoom.length > 5) {
        this.roomErrorMessage = `End Room cannot exceed 5 characters for "${room.label || room.id}".`;
        return;
      }
      // Convert start/end to numbers for overlap validation
      const start = Number(room.startRoom);
      const end = Number(room.endRoom);
      if (isNaN(start) || isNaN(end)) {
        this.roomErrorMessage = `Start/End Room must be numeric for "${room.label || room.id}".`;
        return;
      }
      if (start > end) {
        this.roomErrorMessage = `Start Room cannot be greater than End Room for "${room.label || room.id}".`;
        return;
      }
      // Overlap check with all previous rooms
      for (let j = 0; j < this.rooms.length; j++) {
        if (i === j) continue;
        const otherStart = Number(this.rooms[j].startRoom);
        const otherEnd = Number(this.rooms[j].endRoom);
        if (!(end < otherStart || start > otherEnd)) {
          this.roomErrorMessage = `Room range ${start}-${end} overlaps with existing range ${otherStart}-${otherEnd}.`;
          return;
        }
      }
    }
    // Uniqueness checks
    const labels = this.rooms.map(r => r.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) {
      this.roomErrorMessage = 'Room Labels must be unique!';
      return;
    }
    const ids = this.rooms.map(r => r.id.trim().toLowerCase());
    if (new Set(ids).size !== ids.length) {
      this.roomErrorMessage = 'Room IDs must be unique!';
      return;
    }
    const ranges = this.rooms.map(r => `${r.startRoom.trim().toLowerCase()}-${r.endRoom.trim().toLowerCase()}`);
    if (new Set(ranges).size !== ranges.length) {
      this.roomErrorMessage = 'Room ranges must be unique!';
      return;
    }
    // Final validity check
    this.checkRoomFormValidity();
    if (!this.isRoomFormValid) {
      this.roomErrorMessage = 'Please fix errors before saving!';
      return;
    }
    // All validations passed
    this.roomErrorMessage = '';
    console.log("Saved rooms: ", this.rooms);
    // remove is_existing before saving
    const cleanRooms = this.rooms.map(r => {
      const { is_existing, ...rest } = r;
      return rest;
    });
    console.log("Cleared rooms: ", cleanRooms);
    this.saveRoomSettings(cleanRooms);
    this.closeRoomModal();
  }

  saveRoomSettings(savedRooms: any[]) {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: this.hotelId } }
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
          console.log("Final Updated Rooms:", updatedRooms);
          // Merge with existing settings (don’t overwrite)
          const mergedSettings = {
            ...existingData.settings,
            room_range: updatedRooms
          };
          const updateRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
              customer_update: {
                settings: mergedSettings
              }
            },
            extras: { find: { id: this.hotelId } }
          };
          this.hotelEnrollmentTabviewService.updateCustomer(updateRequestBody).subscribe(
            (updateResp: any) => {
              if (updateResp.success === 1 && updateResp.status_code === 200) {
                this.localService.set('roomRange', JSON.stringify(updatedRooms));
                this.alertService.success('Room ranges saved successfully!', this.options);
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




}
