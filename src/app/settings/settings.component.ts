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


  constructor(
    private fb: FormBuilder,
    private alertService: AlertsService,
    private localService: LocalStorageService,
    private profileService: ProfileService,
    private routerUrl: Router
  ) { }

  ngOnInit(): void {
    this.passwordUpdateForm = this.fb.group({
      current_password: ['', [Validators.minLength(6), Validators.required]],
      new_password: ['', [Validators.minLength(6), Validators.required]],
      confirm_password: ['', [Validators.minLength(6), Validators.required]],
    });
    // Customer id
    this.hotelId = Number(this.localService.get('UserId'));
    this.availableStartTimes = this.generateTimeList('12:00 AM', '11:59 PM');
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
        this.p['current_password'].setErrors({ incorrect: true });
        this.alertService.error("Current Password is incorrect.");
        return;
      }
      // Ensure passwords match
      if (this.p['new_password'].value !== this.p['confirm_password'].value) {
        this.p['confirm_password'].setErrors({ matchError: true });
        this.alertService.error("New Password and Confirm Password do not match.");
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
        extras: { find: { id: this.hotelId } }
      };
      this.profileService.updatePassword(jsonObj).subscribe(
        resp => {
          if (resp?.success === 1) {
            this.passwordUpdateForm.reset();
            this.isPasswordModalOpen = false;
            this.alertService.success("Password updated successfully!");
            this.localService.set('Password', this.p['new_password'].value);
            setTimeout(() => {
              this.alertService.clear(); // Clears the alert message
            }, 2000);
          } else {
            this.alertService.error(resp?.message || "Something went wrong.");
            setTimeout(() => {
              this.alertService.clear(); // Clears the alert message
            }, 2000);
          }
        },
        err => {
          this.alertService.error("Error updating password: " + (err.error?.message || "Please try again!"));
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
    this.isDurationModalOpen = true;
  }

  generateTimeList(start: string, end: string): string[] {
    const times: string[] = [];
    let current = this.toDateObj(start);
    const endDate = this.toDateObj(end);
    while (current <= endDate) {
      times.push(this.formatAMPM(current));
      current.setMinutes(current.getMinutes() + 30);
    }
    // Ensure 11.59 PM is included if not exactly on 30-min interval
    const lastFormatted = this.formatAMPM(endDate);
    if (!times.includes(lastFormatted)) {
      times.push(lastFormatted);
    }
    return times;
  }

  toDateObj(timeStr: string): Date {
    // Normalize input: replace dot with colon and ensure upper case AM/PM
    const cleanTime = timeStr.replace('.', ':').toUpperCase();
    const date = new Date();
    const [time, modifier] = cleanTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  formatAMPM(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}.${mins} ${ampm}`;
  }

  updateAvailableSlots() {
    this.availableSlots = [];
    this.selectedSlots = [];
    if (!this.selectedDuration || !this.selectedStartTime) return;
    const startIndex = this.availableStartTimes.indexOf(this.selectedStartTime);
    const totalSlots = 48; // 24 hours * 2 (30-min slots)
    const slotsNeeded = this.selectedDuration * 2;
    let currentIndex = startIndex;
    let remainingSlots = totalSlots - startIndex;
    while (remainingSlots > 0) {
      const start = this.availableStartTimes[currentIndex];
      let endIndex = currentIndex + slotsNeeded;
      if (endIndex >= this.availableStartTimes.length) {
        // Cap end index at the last slot
        endIndex = this.availableStartTimes.length - 1;
      }
      const end = this.availableStartTimes[endIndex];
      if (start && end) {
        this.availableSlots.push({ start, end });
      }
      // Move to the next block
      currentIndex = endIndex;
      remainingSlots = totalSlots - currentIndex;
    }
  }


  onSlotSelect(event: any, slot: { start: string, end: string }) {
    if (event.target.checked) {
      this.selectedSlots.push(slot);
    } else {
      this.selectedSlots = this.selectedSlots.filter(s => s.start !== slot.start || s.end !== slot.end);
    }
  }

  closeDurationModal() {
    this.isDurationModalOpen = false;
    this.resetFields();
  }

  saveDuration() {
    //console.log("Selected Slots:", this.selectedSlots);
    // Convert array of objects to JSON string before saving
    this.localService.set('selectedSlots', JSON.stringify(this.selectedSlots));
    // Retrieve and parse it back to object array
    const storedSlots = this.localService.get('selectedSlots');
    const parsedSlots = storedSlots ? JSON.parse(storedSlots) : [];
    //console.log('Slots:', parsedSlots);  
    this.isDurationModalOpen = false;
    // this.resetFields();
  }
  

  resetFields() {
    this.selectedDuration = null;
    this.selectedStartTime = null;
    this.availableSlots = [];
    this.selectedSlots = [];
  }

}
