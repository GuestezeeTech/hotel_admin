import { AbstractControl, ValidationErrors } from '@angular/forms';

export class CustomValidators {
  static panValidator(control: AbstractControl): ValidationErrors | null {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (control.value && !panRegex.test(control.value)) {
      return { invalidPAN: true }; // Return error if PAN is invalid
    }
    return null;
  }
  static pincodeValidator(control: AbstractControl): ValidationErrors | null {
    const pincodeRegex = /^\d{6}$/; // Exactly 6 digits
    if (control.value && !pincodeRegex.test(control.value)) {
      return { invalidPincode: true };
    }
    return null;
  }
  

  static gstValidator(control: AbstractControl): ValidationErrors | null {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (control.value && !gstRegex.test(control.value)) {
      return { invalidGST: true }; // Return error if GST is invalid
    }
    return null;
  }
  static phoneValidator(control: AbstractControl): ValidationErrors | null {
    const phoneRegex = /^[6-9]\d{9}$/; // Starts with 6-9 and has exactly 10 digits
    if (control.value && !phoneRegex.test(control.value)) {
      return { invalidPhone: true }; // Return error if phone is invalid
    }
    return null;
  }
}
