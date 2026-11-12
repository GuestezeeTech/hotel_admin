import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { DOMAIN_NAME } from '../../app.config';
import { ProfileService } from '../../profile/profile.service';
import { COUNTRY_CODES, COUNTRY_STATES } from '../../shared/constants/countries';
import { CountryListService } from '../../shared/constants/country-list.service';
import { CustomValidators } from '../validators';
import { TaxLabels, taxLabelsFor } from '../../shared/tax-labels.util';

@Component({
  selector: 'app-registration-property-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration-property-popup.component.html',
  styleUrl: './registration-property-popup.component.scss'
})
export class RegistrationPropertyPopupComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() customerdata: any;
  @Input() submitting = false;
  @Output() submitted = new EventEmitter<any>();

  countryCodeList = COUNTRY_CODES;
  countryDropdownList = COUNTRY_STATES;
  statesDropdownList: any[] = [];

  form = new FormGroup({
    hotel_name: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
    country_code: new FormControl('+91', Validators.required),
    primary_phone_number: new FormControl('', [
      Validators.required,
      CustomValidators.noWhitespaceValidator,
      Validators.pattern(/^[0-9+\-\s()]+$/)
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ]),
    property_doorno: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
    property_address: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
    property_country: new FormControl('India', Validators.required),
    property_state: new FormControl({ value: 'Tamil Nadu', disabled: false }, Validators.required),
    property_city: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
    property_pincode: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{4,10}$/)]),
    property_pan: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    ]),
    property_gst: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    ]),
    // Outside India (same fields as the Property Details tab)
    property_vat: new FormControl(''),
    property_tin: new FormControl(''),
    number_of_rooms: new FormControl('', [Validators.required, Validators.min(1)]),
    register_pms_type: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
    register_door_lock_type: new FormControl('', [Validators.required, CustomValidators.noWhitespaceValidator]),
    company_status: new FormControl('Individual', Validators.required)
  });

  companyStatusOptions = [
    'Private Limited / Public Limited Company',
    'Sole Proprietor',
    'Partnership Firm / LLP',
    'Individual',
    'NGO or Other (Business Filing Status)'
  ];

  // Same document list as the Property Details tab (property-details1.component.ts)
  companyStatusDocuments: { [key: string]: string[] } = {
    'Private Limited / Public Limited Company': [
      'Company PAN card',
      'Signing authority PAN card',
      'Signing authority Aadhar card',
      'MOA & Certificate of Incorporation',
      'Office Address Proof (Landline/BanK Statement)',
      'GST Certificate',
      'Cancelled Cheque'
    ],
    'Sole Proprietor': [
      'Signing authority PAN card',
      'Signing authority Aadhar card',
      'Office Address Proof (Landline/BanK Statement)',
      'Shop and Establishment Certificate',
      'GST Certificate (if applicable)',
      'Cancelled Cheque'
    ],
    'Partnership Firm / LLP': [
      'Company PAN card',
      'Signing authority PAN card',
      'Signing authority Aadhar card',
      'Partnership Deed / LLP Agreement',
      'Office Address Proof (Landline/BanK Statement)',
      'GST Certificate',
      'Cancelled Cheque'
    ],
    'Individual': [
      'Signing authority PAN card',
      'Signing authority Aadhar card',
      'Cancelled Cheque'
    ],
    'NGO or Other (Business Filing Status)': [
      'Company PAN card',
      'Signing authority PAN card',
      'Signing authority Aadhar card',
      'Trust Deed',
      'Cancelled Cheque'
    ]
  };

  // Uploaded KYC document URLs keyed by document name.
  // Kept across company status changes, so switching back keeps earlier uploads.
  documentUrls: { [docName: string]: string } = {};
  uploadingDoc: string | null = null;
  selectedUploadDoc: string | null = null;
  uploadError = '';
  docsTouched = false;

  private statusSub?: Subscription;

  constructor(private profileService: ProfileService, public countryListService: CountryListService) {
    this.statusSub = this.form.get('company_status')?.valueChanges.subscribe(() => {
      this.uploadError = '';
      this.docsTouched = false;
    });
  }

  /** India: PAN & GST. Other countries: VAT & TIN, labelled per country like the Property Details tab. */
  get isIndia(): boolean {
    return this.form.get('property_country')?.value === 'India';
  }

  get taxLabels(): TaxLabels {
    return taxLabelsFor(this.form.get('property_country')?.value || '', this.form.get('property_state')?.value);
  }

  private applyTaxValidators(country: string): void {
    const pan = this.form.get('property_pan');
    const gst = this.form.get('property_gst');
    const vat = this.form.get('property_vat');
    const tin = this.form.get('property_tin');
    if (country === 'India') {
      pan?.setValidators([Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]);
      gst?.setValidators([
        Validators.required,
        Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      ]);
      vat?.clearValidators();
      tin?.clearValidators();
    } else {
      pan?.clearValidators();
      gst?.clearValidators();
      // Same rules as the Property Details tab (format checked per country)
      vat?.setValidators([Validators.required, CustomValidators.noWhitespaceValidator, CustomValidators.dynamicTaxValidator('VAT')]);
      tin?.setValidators([Validators.required, CustomValidators.noWhitespaceValidator, CustomValidators.dynamicTaxValidator('TIN')]);
    }
    [pan, gst, vat, tin].forEach(c => c?.updateValueAndValidity({ emitEvent: false }));
  }

  /** Error text for the VAT / TIN fields (country format message when there is one) */
  taxError(key: 'property_vat' | 'property_tin', label: string): string {
    const errors = this.form.get(key)?.errors;
    return errors?.['invalidTaxId']?.message || `Valid ${label} is required.`;
  }

  /** Spain's Canary Islands use IGIC instead of VAT: recheck the format when the state changes */
  onStateChange(): void {
    ['property_vat', 'property_tin'].forEach(k => this.form.get(k)?.updateValueAndValidity({ emitEvent: false }));
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
  }

  get selectedDocumentList(): string[] {
    const status = this.form.get('company_status')?.value || '';
    return this.companyStatusDocuments[status] || [];
  }

  get nextPendingDocument(): string | null {
    return this.selectedDocumentList.find(name => !this.documentUrls[name]) || null;
  }

  isAllDocumentsUploaded(): boolean {
    const list = this.selectedDocumentList;
    return list.length > 0 && list.every(name => !!this.documentUrls[name]);
  }

  triggerUpload(docName: string, input: HTMLInputElement): void {
    this.selectedUploadDoc = docName;
    input.value = '';
    input.click();
  }

  onFileChange(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    const docName = this.selectedUploadDoc ?? this.nextPendingDocument;
    this.selectedUploadDoc = null;
    fileInput.value = '';
    if (!file || !docName) {
      return;
    }

    this.uploadError = '';
    if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      this.uploadError = 'Only PDF, JPEG, JPG files are allowed.';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.uploadError = 'File size must be less than 2MB.';
      return;
    }

    const headers = new HttpHeaders().set('source', 'Brand').set('domain_name', DOMAIN_NAME);
    const formData = new FormData();
    formData.append('upload', file);

    this.uploadingDoc = docName;
    this.profileService.sendImage(formData, headers).subscribe({
      next: (resp: any) => {
        this.uploadingDoc = null;
        const location = resp?.result?.data?.[0]?.location;
        if (resp?.success === 1 && resp?.status_code === 200 && location) {
          this.documentUrls = { ...this.documentUrls, [docName]: location };
        } else {
          this.uploadError = `Upload failed for ${docName}. Please try again.`;
        }
      },
      error: () => {
        this.uploadingDoc = null;
        this.uploadError = `Upload failed for ${docName}. Please try again.`;
      }
    });
  }

  removeDocument(docName: string): void {
    const { [docName]: _removed, ...rest } = this.documentUrls;
    this.documentUrls = rest;
  }

  previewDocument(docName: string): void {
    const url = this.documentUrls[docName];
    if (url) {
      window.open(url, '_blank');
    } else {
      this.uploadError = `No file uploaded for ${docName}`;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue || changes['customerdata']) {
      // The country comes from the signup dial code, so wait for the API country list
      this.countryListService.load().then(() => this.prefillFromCustomer());
    }
  }

  private prefillFromCustomer(): void {
    const pd = this.customerdata?.property_details || {};
    const contact = pd.contact_details || {};
    const address = pd.property_address || {};
    const kyc = pd.kyc_documents || {};

    const urls: { [docName: string]: string } = {};
    (kyc.uploaded_documents || []).forEach((doc: any) => {
      if (doc?.document_name && doc?.document_url) {
        urls[doc.document_name] = doc.document_url;
      }
    });
    this.documentUrls = urls;
    this.uploadError = '';
    this.docsTouched = false;

    // Signup saves the dial code, phone and email, plus placeholder address values
    // (India / Tamil Nadu / Chennai). Until property details have been filled in (they
    // always include contact_details), take the country from the signup dial code and
    // leave state and city for the user to choose.
    const countryCode = contact.country_code || this.customerdata?.country_code || '+91';
    const signupCountry = this.countryCodeList.find((c: any) => c.code === countryCode)?.country;
    const propertyFilled = !!pd.contact_details;
    const country = propertyFilled
      ? (address.property_country || signupCountry || 'India')
      : (signupCountry || 'India');
    this.updateStatesForCountry(country);
    this.applyTaxValidators(country);

    this.form.patchValue({
      hotel_name: contact.hotel_name || this.customerdata?.name || '',
      country_code: countryCode,
      primary_phone_number: contact.primary_phone_number || this.customerdata?.phone_number || '',
      email: contact.email || this.customerdata?.email || '',
      property_doorno: address.property_doorno || '',
      property_address: address.property_address || '',
      property_country: country,
      property_state: propertyFilled ? (address.property_state || '') : '',
      property_city: propertyFilled ? (address.property_city || '') : '',
      property_pincode: address.property_pincode || '',
      property_pan: address.property_pan || '',
      property_gst: address.property_gst || '',
      property_vat: address.property_vat || '',
      property_tin: address.property_tin || '',
      number_of_rooms: address.number_of_rooms || '',
      register_pms_type: this.customerdata?.register_pms_type || '',
      register_door_lock_type: this.customerdata?.register_door_lock_type || '',
      company_status: kyc.company_status || 'Individual'
    });
  }

  onCountryChange(): void {
    const country = this.form.get('property_country')?.value || '';
    this.updateStatesForCountry(country);
    this.form.get('property_state')?.setValue('');
    // A different tax system: start the tax numbers empty, as in the Property Details tab
    this.form.patchValue({ property_pan: '', property_gst: '', property_vat: '', property_tin: '' });
    this.applyTaxValidators(country);
  }

  private updateStatesForCountry(countryName: string): void {
    const match = this.countryDropdownList.find((c: any) => c.country === countryName);
    this.statesDropdownList = match?.states || [];
  }

  private roomsToPropertySize(rooms: number): string {
    if (rooms <= 50) return '01-50 Rooms';
    if (rooms <= 101) return '51-101 Rooms';
    if (rooms <= 150) return '101-150 Rooms';
    return '50 and above Rooms';
  }

  onSubmit(): void {
    this.docsTouched = true;
    if (this.form.invalid || !this.isAllDocumentsUploaded() || this.uploadingDoc) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const rooms = Number(v.number_of_rooms) || 0;

    const property_details = {
      contact_details: {
        hotel_name: (v.hotel_name || '').trim(),
        contact_person: this.customerdata?.first_name
          ? `${this.customerdata.first_name || ''} ${this.customerdata.last_name || ''}`.trim()
          : (v.hotel_name || '').trim(),
        designation: this.customerdata?.designation || '',
        country_code: v.country_code,
        primary_phone_number: (v.primary_phone_number || '').trim(),
        secondary_phone_number: '',
        email: (v.email || '').trim(),
        brand: 'Others',
        other_brand_name: ''
      },
      property_address: {
        property_doorno: (v.property_doorno || '').trim(),
        property_address: (v.property_address || '').trim(),
        property_city: (v.property_city || '').trim(),
        property_state: v.property_state,
        property_location: '',
        property_country: v.property_country,
        property_pincode: String(v.property_pincode || '').trim(),
        property_size: this.roomsToPropertySize(rooms),
        number_of_rooms: rooms,
        ...(v.property_country === 'India'
          ? {
              property_pan: String(v.property_pan || '').trim().toUpperCase(),
              property_gst: String(v.property_gst || '').trim().toUpperCase()
            }
          : {
              property_vat: String(v.property_vat || '').trim(),
              property_tin: String(v.property_tin || '').trim()
            })
      },
      kyc_documents: {
        company_status: v.company_status,
        uploaded_documents: this.selectedDocumentList.map(name => ({
          document_name: name,
          document_url: this.documentUrls[name]
        }))
      },
      hotel_logo: this.customerdata?.property_details?.hotel_logo || ''
    };

    this.submitted.emit({
      property_details,
      name: property_details.contact_details.hotel_name,
      register_pms_type: (v.register_pms_type || '').trim(),
      register_door_lock_type: (v.register_door_lock_type || '').trim()
    });
  }
}
