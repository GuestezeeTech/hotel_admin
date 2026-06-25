export interface PincodeRule {
  pattern: RegExp;
  maxLength: number;
  digitsOnly: boolean;
  errorMessage: string;
}

export const PINCODE_RULES: { [countryName: string]: PincodeRule } = {
  'Austria': {
    pattern: /^\d{4}$/,
    maxLength: 4,
    digitsOnly: true,
    errorMessage: 'Pincode must be exactly 4 digits.'
  },
  'Germany': {
    pattern: /^\d{5}$/,
    maxLength: 5,
    digitsOnly: true,
    errorMessage: 'Pincode must be exactly 5 digits.'
  },
  'India': {
    pattern: /^\d{6}$/,
    maxLength: 6,
    digitsOnly: true,
    errorMessage: 'Pincode must be exactly 6 digits.'
  },
  'Poland': {
    pattern: /^\d{2}-\d{3}$/,
    maxLength: 6,
    digitsOnly: false,
    errorMessage: 'Pincode must be in XX-XXX format (e.g. 00-001).'
  },
  'Romania': {
    pattern: /^\d{6}$/,
    maxLength: 6,
    digitsOnly: true,
    errorMessage: 'Pincode must be exactly 6 digits.'
  },
  'Spain': {
    pattern: /^\d{5}$/,
    maxLength: 5,
    digitsOnly: true,
    errorMessage: 'Pincode must be exactly 5 digits.'
  },
  'Switzerland': {
    pattern: /^\d{4}$/,
    maxLength: 4,
    digitsOnly: true,
    errorMessage: 'Pincode must be exactly 4 digits.'
  },
  'United Kingdom': {
    pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    maxLength: 8,
    digitsOnly: false,
    errorMessage: 'Invalid UK postcode format (e.g. SW1A 1AA).'
  },
  'default': {
    pattern: /^[a-zA-Z0-9\s\-]{3,10}$/,
    maxLength: 10,
    digitsOnly: false,
    errorMessage: 'Postal code must be between 3 and 10 alphanumeric characters.'
  }
};

export interface TaxRule {
  regex: RegExp;
  errorMessage: string;
}

export const VAT_RULES: { [countryName: string]: TaxRule } = {
  'India': {
    regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    errorMessage: '❌ Invalid PAN format (e.g., ABCDE1234F).'
  },
  'Austria': {
    regex: /^ATU[0-9]{8}$/,
    errorMessage: '❌ Invalid Austria VAT format (e.g., ATU12345678).'
  },
  'Germany': {
    regex: /^DE[0-9]{9}$/,
    errorMessage: '❌ Invalid Germany VAT format (e.g., DE123456789).'
  },
  'Poland': {
    regex: /^PL[0-9]{10}$/,
    errorMessage: '❌ Invalid Poland VAT format (e.g., PL1234567890).'
  },
  'Romania': {
    regex: /^RO[0-9]{2,10}$/,
    errorMessage: '❌ Invalid Romania VAT format (e.g., RO123456).'
  },
  'Spain': {
    regex: /^ES[A-Z0-9][0-9]{7}[A-Z0-9]$/,
    errorMessage: '❌ Invalid Spain VAT format (e.g., ESA1234567B).'
  },
  'Spain_Canary': {
    regex: /^[A-Z0-9][0-9]{7}[A-Z0-9]$/,
    errorMessage: '❌ Invalid Canary Islands IGIC format (e.g., A1234567B).'
  },
  'Switzerland': {
    regex: /^(CHE-?[0-9]{9} ?(MWST|TVA|IVA)?|CHE-?[0-9]{3}\.?[0-9]{3}\.?[0-9]{3} ?(MWST|TVA|IVA)?)$/,
    errorMessage: '❌ Invalid Switzerland VAT format (e.g., CHE-123.456.789 MWST).'
  },
  'United Kingdom': {
    regex: /^(GB[0-9]{9}|GB[0-9]{12})$/,
    errorMessage: '❌ Invalid UK VAT format (e.g., GB123456789).'
  }
};

export const TIN_RULES: { [countryName: string]: TaxRule } = {
  'India': {
    regex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/,
    errorMessage: '❌ Invalid GST Format (e.g., 27ABCDE1234F1Z5).'
  },
  'Austria': {
    regex: /^[0-9]{9}$/,
    errorMessage: '❌ Invalid Austria TIN format (must be 9 digits).'
  },
  'Germany': {
    regex: /^[0-9]{11}$/,
    errorMessage: '❌ Invalid Germany TIN format (must be 11 digits).'
  },
  'Poland': {
    regex: /^[0-9]{10,11}$/,
    errorMessage: '❌ Invalid Poland TIN/PESEL format (must be 10 or 11 digits).'
  },
  'Romania': {
    regex: /^[0-9]{2,13}$/,
    errorMessage: '❌ Invalid Romania TIN/CNP format (must be 2 to 13 digits).'
  },
  'Spain': {
    regex: /^[A-Z0-9][0-9]{7}[A-Z0-9]$/,
    errorMessage: '❌ Invalid Spain NIF/NIE format (e.g., A1234567B).'
  },
  'Switzerland': {
    regex: /^(CHE-?[0-9]{9}|CHE-?[0-9]{3}\.?[0-9]{3}\.?[0-9]{3})$/,
    errorMessage: '❌ Invalid Switzerland UID format (e.g., CHE-123.456.789).'
  },
  'United Kingdom': {
    regex: /^[0-9]{10}$/,
    errorMessage: '❌ Invalid UK UTR format (must be 10 digits).'
  }
};

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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
  
  static dynamicPincodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      
      const formGroup = control.parent;
      if (!formGroup) {
        return null;
      }

      // Check for country control name (either 'country' or 'property_country')
      const countryControl = formGroup.get('country') || formGroup.get('property_country');
      const country = countryControl?.value || 'default';
      const rule = PINCODE_RULES[country] || PINCODE_RULES['default'];

      if (!rule.pattern.test(control.value)) {
        return { 
          invalidPincode: {
            message: rule.errorMessage
          }
        };
      }
      return null;
    };
  }

  static dynamicTaxValidator(type: 'VAT' | 'TIN'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const formGroup = control.parent;
      if (!formGroup) {
        return null;
      }

      const countryControl = formGroup.get('country') || formGroup.get('property_country');
      const country = countryControl?.value;

      const stateControl = formGroup.get('state') || formGroup.get('property_state');
      const state = stateControl?.value;

      if (!country) return null;

      const rules = type === 'VAT' ? VAT_RULES : TIN_RULES;
      let rule = rules[country];

      if (country === 'Spain' && type === 'VAT' && state === 'Canary Islands') {
        rule = VAT_RULES['Spain_Canary'];
      }

      if (rule) {
        const isValid = rule.regex.test(control.value);
        if (!isValid) {
          return {
            invalidTaxId: {
              message: rule.errorMessage
            }
          };
        }
      }
      return null;
    };
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
