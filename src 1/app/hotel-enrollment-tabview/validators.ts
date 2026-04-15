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
  
  static noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value && typeof control.value === 'string') {
      const isWhitespace = control.value.trim().length === 0;
      return isWhitespace ? { whitespace: true } : null;
    }
    return null;
  }

  static minValueValidator(minValue: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null; // Let required validator handle empty values
      }
      const numValue = Number(control.value);
      if (isNaN(numValue) || numValue < minValue) {
        return { minValue: { requiredMin: minValue, actualValue: control.value } };
      }
      return null;
    };
  }

  static maxQuantityValidator(minQuantityControl: AbstractControl) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null; // Let required validator handle empty values
      }
      const maxValue = Number(control.value);
      const minValue = minQuantityControl?.value ? Number(minQuantityControl.value) : null;
      if (isNaN(maxValue)) {
        return { invalidNumber: true };
      }
      if (minValue !== null && !isNaN(minValue) && maxValue <= minValue) {
        return { maxQuantity: { minValue: minValue, maxValue: maxValue } };
      }
      return null;
    };
  }
}
