import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { ENDPOINTS, DOMAIN_NAME, USER_ID } from '../../app.config';
import { OutletCreationService } from '../../Outlet/outlet-creation.service'; // Reusing service
import { LoaderService } from '../../shared/loader/loader.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { ProfileService } from '../../profile/profile.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { PermissionService } from '../../services/permission.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { TechnicalInfoService } from '../../hotel-enrollment-tabview/technical-info/technical-info.service';

@Component({
  selector: 'app-feature-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AlertsComponent],
  templateUrl: './feature-creation.component.html',
  styleUrls: ['./feature-creation.component.scss']
})

export class FeatureCreationComponent implements OnInit {
  outletForm!: FormGroup;
  outletdata: any = {};
  outlet_id: number = 0;
  photoPreview: string = '';
  photoName: string = '';
  maxSizeMB = 2;
  submitted = false;
  options = { autoClose: true, keepAfterRouteChange: false };
  isExitModalOpen: boolean = false;
  member_id: any;
  editScreen: boolean = false;
  isViewMode: boolean = false;

  customerData: any;
  technicalInfos: any[] = [];

  hours: string[] = ['00', ...Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))];
  minutes: string[] = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  periods: string[] = ['AM', 'PM'];
  countryDropdownList: any[] = [
    { "country": "Afghanistan" }, { "country": "Åland (Finland)" }, { "country": "Albania" }, { "country": "Algeria" },
    { "country": "American Samoa (US)" }, { "country": "Andorra" }, { "country": "Angola" }, { "country": "Anguilla (BOT)" },
    { "country": "Antigua and Barbuda" }, { "country": "Argentina" }, { "country": "Armenia" }, { "country": "Artsakh" },
    { "country": "Aruba (Netherlands)" }, { "country": "Australia" }, { "country": "Austria" }, { "country": "Azerbaijan" },
    { "country": "Bahamas" }, { "country": "Bahrain" }, { "country": "Bangladesh" }, { "country": "Barbados" },
    { "country": "Belarus" }, { "country": "Belgium" }, { "country": "Belize" }, { "country": "Benin" },
    { "country": "Bermuda (BOT)" }, { "country": "Bhutan" }, { "country": "Bolivia" }, { "country": "Bonaire (Netherlands)" },
    { "country": "Bosnia and Herzegovina" }, { "country": "Botswana" }, { "country": "Brazil" }, { "country": "British Virgin Islands (BOT)" },
    { "country": "Brunei" }, { "country": "Bulgaria" }, { "country": "Burkina Faso" }, { "country": "Burundi" },
    { "country": "Cambodia" }, { "country": "Cameroon" }, { "country": "Canada" }, { "country": "Cape Verde" },
    { "country": "Cayman Islands (BOT)" }, { "country": "Central African Republic" }, { "country": "Chad" }, { "country": "Chile" },
    { "country": "China" }, { "country": "Christmas Island (Australia)" }, { "country": "Cocos (Keeling) Islands (Australia)" }, { "country": "Colombia" },
    { "country": "Comoros" }, { "country": "Congo" }, { "country": "Cook Islands" }, { "country": "Costa Rica" },
    { "country": "Croatia" }, { "country": "Cuba" }, { "country": "Curaçao (Netherlands)" }, { "country": "Cyprus" },
    { "country": "Czech Republic" }, { "country": "Denmark" }, { "country": "Djibouti" }, { "country": "Dominica" },
    { "country": "Dominican Republic" }, { "country": "DR Congo" }, { "country": "East Timor" }, { "country": "Ecuador" },
    { "country": "Egypt" }, { "country": "El Salvador" }, { "country": "Equatorial Guinea" }, { "country": "Eritrea" },
    { "country": "Estonia" }, { "country": "Eswatini" }, { "country": "Ethiopia" }, { "country": "Falkland Islands (BOT)" },
    { "country": "Faroe Islands (Denmark)" }, { "country": "Fiji" }, { "country": "Finland" }, { "country": "France" },
    { "country": "French Guiana (France)" }, { "country": "French Polynesia (France)" }, { "country": "Gabon" }, { "country": "Gambia" },
    { "country": "Georgia" }, { "country": "Germany" }, { "country": "Ghana" }, { "country": "Gibraltar (BOT)" },
    { "country": "Greece" }, { "country": "Greenland (Denmark)" }, { "country": "Grenada" }, { "country": "Guadeloupe (France)" },
    { "country": "Guam (US)" }, { "country": "Guatemala" }, { "country": "Guernsey (Crown Dependency)" }, { "country": "Guinea" },
    { "country": "Guinea-Bissau" }, { "country": "Guyana" }, { "country": "Haiti" }, { "country": "Honduras" },
    { "country": "Hong Kong" }, { "country": "Hungary" }, { "country": "Iceland" }, { "country": "India" },
    { "country": "Indonesia" }, { "country": "Iran" }, { "country": "Iraq" }, { "country": "Ireland" },
    { "country": "Isle of Man (Crown Dependency)" }, { "country": "Israel" }, { "country": "Italy" }, { "country": "Ivory Coast" },
    { "country": "Jamaica" }, { "country": "Japan" }, { "country": "Jersey (Crown Dependency)" }, { "country": "Jordan" },
    { "country": "Kazakhstan" }, { "country": "Kenya" }, { "country": "Kiribati" }, { "country": "Kosovo" },
    { "country": "Kuwait" }, { "country": "Kyrgyzstan" }, { "country": "Laos" }, { "country": "Latvia" },
    { "country": "Lebanon" }, { "country": "Lesotho" }, { "country": "Liberia" }, { "country": "Libya" },
    { "country": "Liechtenstein" }, { "country": "Lithuania" }, { "country": "Luxembourg" }, { "country": "Macau" },
    { "country": "Madagascar" }, { "country": "Malawi" }, { "country": "Malaysia" }, { "country": "Maldives" },
    { "country": "Mali" }, { "country": "Malta" }, { "country": "Marshall Islands" }, { "country": "Martinique (France)" },
    { "country": "Mauritania" }, { "country": "Mauritius" }, { "country": "Mayotte (France)" }, { "country": "Mexico" },
    { "country": "Micronesia" }, { "country": "Moldova" }, { "country": "Monaco" }, { "country": "Mongolia" },
    { "country": "Montenegro" }, { "country": "Montserrat (BOT)" }, { "country": "Morocco" }, { "country": "Mozambique" },
    { "country": "Myanmar" }, { "country": "Namibia" }, { "country": "Nauru" }, { "country": "Nepal" },
    { "country": "Netherlands" }, { "country": "New Caledonia (France)" }, { "country": "New Zealand" }, { "country": "Nicaragua" },
    { "country": "Niger" }, { "country": "Nigeria" }, { "country": "Niue" }, { "country": "Norfolk Island (Australia)" },
    { "country": "North Korea" }, { "country": "North Macedonia" }, { "country": "Northern Cyprus" }, { "country": "Northern Mariana Islands (US)" },
    { "country": "Norway" }, { "country": "Oman" }, { "country": "Pakistan" }, { "country": "Palau" },
    { "country": "Palestine" }, { "country": "Panama" }, { "country": "Papua New Guinea" }, { "country": "Paraguay" },
    { "country": "Peru" }, { "country": "Philippines" }, { "country": "Pitcairn Islands (BOT)" }, { "country": "Poland" },
    { "country": "Portugal" }, { "country": "Puerto Rico (US)" }, { "country": "Qatar" }, { "country": "Réunion (France)" },
    { "country": "Romania" }, { "country": "Russia" }, { "country": "Rwanda" }, { "country": "Saba (Netherlands)" },
    { "country": "Saint Barthélemy (France)" }, { "country": "Saint Helena, Ascension and Tristan da Cunha (BOT)" }, { "country": "Saint Kitts and Nevis" }, { "country": "Saint Lucia" },
    { "country": "Saint Martin (France)" }, { "country": "Saint Pierre and Miquelon (France)" }, { "country": "Saint Vincent and the Grenadines" }, { "country": "Samoa" },
    { "country": "San Marino" }, { "country": "São Tomé and Príncipe" }, { "country": "Saudi Arabia" }, { "country": "Senegal" },
    { "country": "Serbia" }, { "country": "Seychelles" }, { "country": "Sierra Leone" }, { "country": "Singapore" },
    { "country": "Sint Eustatius (Netherlands)" }, { "country": "Sint Maarten (Netherlands)" }, { "country": "Slovakia" }, { "country": "Slovenia" },
    { "country": "Solomon Islands" }, { "country": "Somalia" }, { "country": "South Africa" }, { "country": "South Korea" },
    { "country": "South Sudan" }, { "country": "Spain" }, { "country": "Sri Lanka" }, { "country": "Sudan" },
    { "country": "Suricountry" }, { "country": "Svalbard and Jan Mayen (Norway)" }, { "country": "Sweden" }, { "country": "Switzerland" },
    { "country": "Syria" }, { "country": "Taiwan" }, { "country": "Tajikistan" }, { "country": "Tanzania" },
    { "country": "Thailand" }, { "country": "Togo" }, { "country": "Tokelau (NZ)" }, { "country": "Tonga" },
    { "country": "Transnistria" }, { "country": "Trinidad and Tobago" }, { "country": "Tunisia" }, { "country": "Turkey" },
    { "country": "Turkmenistan" }, { "country": "Turks and Caicos Islands (BOT)" }, { "country": "Tuvalu" }, { "country": "U.S. Virgin Islands (US)" },
    { "country": "Uganda" }, { "country": "Ukraine" }, { "country": "United Arab Emirates" }, { "country": "United Kingdom" },
    { "country": "United States" }, { "country": "Uruguay" }, { "country": "Uzbekistan" }, { "country": "Vanuatu" },
    { "country": "Vatican City" }, { "country": "Venezuela" }, { "country": "Vietnam" }, { "country": "Wallis and Futuna (France)" },
    { "country": "Western Sahara" }, { "country": "Yemen" }
  ];

  upsellName: string = 'Feature'; // For labels
  passedOutletType: string = ''; // For categorization

  constructor(
    private fb: FormBuilder,
    private outletCreationService: OutletCreationService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private route: ActivatedRoute,
    private localService: LocalStorageService,
    private profileService: ProfileService,
    private permissionService: PermissionService,
    private hotelEnrollmentService: HotelEnrollmentTabviewService,
    private technicalInfoService: TechnicalInfoService
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.member_id = this.localService.get('MemberId');
    console.log(this.member_id);

    // Capture Dynamic Info from Query Params
    this.route.queryParams.subscribe(params => {
      if (params['outlet_type']) {
        this.passedOutletType = params['outlet_type'];
        this.upsellName = params['outlet_type'];
      }
    });

    const navState = window.history.state as any;
    this.isViewMode = navState?.mode === 'view';

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.outlet_id = id ? Number(id) : 0;
      if (id) {
        this.editScreen = true;
        this.getOutletById(Number(id));
      }
    });

    if (this.member_id) {
      this.getHotelTechnicalInfo();
    }

    if (this.isViewMode) {
      this.outletForm.disable({ emitEvent: false });
    }
  }

  // Permission helpers - Reuse FEATURES permission
  get canAddFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_add_permission ?? false;
  }

  get canEditFeatures(): boolean {
    const permission = this.permissionService.getModulePermission('FEATURES');
    return permission?.has_edit_permission ?? false;
  }

  private buildForm() {
    this.outletForm = this.fb.group({
      owner_name: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,4}$/)]],
      phone: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10), this.onlyNumbersValidator]],
      companyphone: ['', [this.optionalNumbersValidator]],
      name: ['', [Validators.required, Validators.maxLength(50)]],
      // gstno: ['', [Validators.required, this.gstValidator]],
      gstno: ['',[this.gstValidator]],
      association: [''],
      // address: ['', Validators.required],
      address: [''],
      address1: [''],
      // doorno: ['', Validators.required],
      doorno: [''],
      // location: ['', Validators.required],
      location: ['', Validators.required],
      // pincode: ['', [Validators.required, this.onlyNumbersValidator]],
      pincode: ['', [Validators.minLength(6), Validators.maxLength(6), this.onlyNumbersValidator]],
      delivery_pickup_point_pincode: [''],
      country: [''],
      // open_time: ['', [Validators.required, this.time12HrValidator]],
      open_time: ['', [this.time12HrValidator]],
      close_time: ['', [this.time12HrValidator]],
      enable_distance_radius: [false],
      sendordermail: [true],
      takephoto: [''],
      // winhms_outlet_id: ['', Validators.required],
      third_party_outlet_id: ['', Validators.required],
      // property_name: ['', Validators.required],
      // x_api_key: ['', Validators.required],
      // Hotel_Code: ['', Validators.required],
      property_name: [''],
      x_api_key: [''],
      Hotel_Code: [''],
      is_active: [true],

      // Separate time controls
      open_hour: ['', Validators.required],
      open_minute: ['', Validators.required],
      open_period: ['', Validators.required],
      close_hour: ['', Validators.required],
      close_minute: ['', Validators.required],
      close_period: ['', Validators.required]
    });
  }

  private getHotelTechnicalInfo() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: this.member_id
        }
      }
    };

    // 1. Get Hotel Code from Customer Data
    this.hotelEnrollmentService.getLoginCustomerById(requestBody).subscribe((resp: any) => {
      if (resp?.success === 1 && resp?.result?.data?.[0]) {
        this.customerData = resp.result.data[0];
        console.log('Fetched Customer Data for Feature Creation:', this.customerData);
      }
    });

    // 2. Get Technical Info for Property Name and API Key
    this.technicalInfoService.getAllTechnicalInfo(requestBody).subscribe((resp: any) => {
      if (resp?.success === 1 && resp?.result?.data?.[0]) {
        // Based on technical-info.component.ts logic, it might be in customer_technical_info
        this.technicalInfos = resp.result.data[0].customer_technical_info || [];
        console.log('Fetched Technical Infos for Feature Creation:', this.technicalInfos);
      }
    });
  }

  private extractTechInfo(key: string): string {
    if (!this.technicalInfos || !Array.isArray(this.technicalInfos)) return '';

    // Normalize search base word (e.g., 'x_api_key' -> 'api')
    const parts = key.toLowerCase().split('_');
    const searchBase = (parts[0] === 'x' && parts.length > 1) ? parts[1] : parts[0];

    for (const info of this.technicalInfos) {
      // 1. Check all direct properties of the info object (e.g., info.api_key, info.property_id)
      for (const objKey in info) {
        if (typeof info[objKey] === 'string' && objKey.toLowerCase().includes(searchBase)) {
          if (info[objKey]) return info[objKey];
        }
      }

      // 2. Deep check inside attributes array
      if (info.attributes && Array.isArray(info.attributes)) {
        for (const attr of info.attributes) {
          if (attr && attr.key && attr.value) {
            const attrKey = attr.key.toLowerCase();
            if (attrKey.includes(searchBase)) {
              return attr.value;
            }
          }
        }
      }
    }

    // 3. Last fallback: Check common Customer Data fields
    if (this.customerData) {
      if (searchBase === 'property' && this.customerData.property_name) return this.customerData.property_name;
      if (searchBase === 'property' && this.customerData.name) return this.customerData.name;
    }

    return '';
  }

  onlyNumbersValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null;
    return /^[0-9]+$/.test(v) ? null : { numbersOnly: true };
  }

  optionalNumbersValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null;
    return /^[0-9]+$/.test(v) ? null : { numbersOnly: true };
  }

  time12HrValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null;
    return /^(0?[0-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(v)
      ? null
      : { invalidTime: true };
  }

  validateNumberInput(field: string) {
    const c = this.outletForm.get(field);
    if (!c) return;
    let raw = c.value ?? '';
    let clean = raw.replace(/\D+/g, '');
    
    // Set limits
    const limit = (field === 'pincode' || field === 'delivery_pickup_point_pincode') ? 6 : 10;
    if (clean.length > limit) {
      clean = clean.substring(0, limit);
    }

    if (clean !== raw) {
      c.setValue(clean, { emitEvent: false });
    }
  }

  validateTimeFormat(field: string) {
    const ctrl = this.outletForm.get(field);
    if (!ctrl) return;
    const err = this.time12HrValidator(ctrl);
    if (err) ctrl.setErrors({ ...ctrl.errors, invalidTime: true });
    else {
      if (ctrl.errors) {
        const e = { ...ctrl.errors };
        delete e['invalidTime'];
        ctrl.setErrors(Object.keys(e).length ? e : null);
      }
    }
  }

  gstValidator(control: any) {
    if (!control.value) return null;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!gstRegex.test(control.value)) {
      return {
        invalidGST: { message: 'Enter a valid 15-digit GST Number' }
      };
    }
    return null;
  }

  // IMAGE UPLOAD
  onPhotoUpload(event: any) {
    if (this.isViewMode) return;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.photoName = file.name;
    if (!file.type.startsWith('image/')) {
      this.alertService.error('Only image files allowed', this.options);
      input.value = '';
      this.photoName = '';
      return;
    }
    if (file.size / 1024 / 1024 > this.maxSizeMB) {
      this.alertService.error(`Max size ${this.maxSizeMB}MB allowed`, this.options);
      input.value = '';
      this.photoName = '';
      return;
    }
    this.photoPreview = URL.createObjectURL(file);

    // Validate dimensions 1280x720
    const img = new Image();
    img.onload = () => {
      if (img.width !== 1280 || img.height !== 720) {
        this.alertService.error('Image must be exactly 1280 x 720 pixels', this.options);
        input.value = '';
        this.photoPreview = '';
        this.photoName = '';
        return;
      }
      this.uploadImage(file, input);
    };
    img.src = this.photoPreview;
  }

  private uploadImage(file: File, inputEl: HTMLInputElement) {
    const fd = new FormData();
    fd.append('upload', file);
    const headers = new HttpHeaders()
      .set('source', 'Product')
      .set('domain_name', String(DOMAIN_NAME));
    this.profileService.sendImage(fd, headers).subscribe(
      (r: any) => {
        const url = r?.result?.data?.[0]?.location;
        if (!url) {
          this.alertService.error('Upload failed', this.options);
          this.photoPreview = '';
          this.photoName = '';
          return;
        }
        this.photoPreview = url;
        this.outletForm.patchValue({ takephoto: url });
        this.alertService.success('Photo uploaded successfully', this.options);
      },
      () => {
        this.alertService.error('Upload error', this.options);
        this.photoPreview = '';
        this.photoName = '';
      }
    );
  }

  removePhoto() {
    if (this.isViewMode) return;
    this.photoPreview = '';
    this.photoName = '';
    this.outletForm.patchValue({ takephoto: '' });
    const input: any = document.getElementById('photoInput');
    if (input) input.value = '';
    this.alertService.success('Photo removed successfully!', this.options);
  }

  getOutletById(id: number) {
    const req = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: id,
          member_id: this.member_id
        }
      }
    };
    this.outletCreationService.postApiCall(req, ENDPOINTS.OUTLET_GETBYID).subscribe(
      (resp: any) => {
        const data = resp?.result?.data?.[0] || {};
        this.outletdata = data;
        this.outletForm.patchValue({ ...data });
        this.photoPreview = data.takephoto || data.takePhoto || '';
        this.photoName = this.getFileNameFromUrl(data.takephoto || data.takePhoto);

        // Split existing time strings into dropdowns
        if (data.open_time) this.parseTimeToDropdown(data.open_time, 'open');
        if (data.close_time) this.parseTimeToDropdown(data.close_time, 'close');
      }
    );
  }

  private parseTimeToDropdown(timeStr: string, prefix: string) {
    const match = timeStr.trim().match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/i);
    if (match) {
      this.outletForm.patchValue({
        [`${prefix}_hour`]: match[1].padStart(2, '0'),
        [`${prefix}_minute`]: match[2],
        [`${prefix}_period`]: match[3].toUpperCase()
      });
    }
  }

  private getFileNameFromUrl(url?: string): string {
    if (!url) return '';
    try {
      let name = url.split('/').pop() || '';
      name = name.split('?')[0].split('#')[0];
      name = decodeURIComponent(name);
      return name;
    } catch (e) {
      return '';
    }
  }

  onSubmit() {
    if (this.isViewMode) return;
    this.submitted = true;
    Object.values(this.outletForm.controls).forEach(c => c.markAsTouched());
    if (this.outletForm.invalid) {
      this.alertService.error('Please fill all required fields correctly!', this.options);
      return;
    }
    const fv = this.outletForm.value;

    // Combine separate time controls back into strings
    const openTime = fv.open_hour && fv.open_minute && fv.open_period ? 
                     `${fv.open_hour}:${fv.open_minute} ${fv.open_period}` : '';
    const closeTime = fv.close_hour && fv.close_minute && fv.close_period ? 
                      `${fv.close_hour}:${fv.close_minute} ${fv.close_period}` : '';

    const outletObj = {
      ...fv,
      open_time: openTime,
      close_time: closeTime,
      customer_id: Number(this.localService.get('UserId')) || Number(USER_ID),
      member_id: this.member_id,
      outlet_type: this.passedOutletType, // Explicitly passing the type

      // Programmatic mapping for hidden/removed fields
      Hotel_Code: this.customerData?.Hotel_Code || '',
      winhms_outlet_id: fv.third_party_outlet_id,
      property_name: this.extractTechInfo('property_name') || this.extractTechInfo('Property Name') || '',
      x_api_key: this.extractTechInfo('x_api_key') || this.extractTechInfo('X API Key') || ''
    };
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { outlet_creation: outletObj }
    };

    if (this.outlet_id === 0) {
      this.outletCreationService.postApiCall(requestBody, ENDPOINTS.OUTLET_CREATE).subscribe(
        (resp: any) => {
          if (resp.success === 1) {
            this.alertService.success(`${this.upsellName} created successfully!`, this.options);
            this.navigateToList();
          } else {
            this.alertService.error(resp.message || 'Create failed', this.options);
          }
        }
      );
    }
    else {
      const req = {
        ...requestBody,
        extras: { find: { id: this.outlet_id } }
      };
      this.outletCreationService.postApiCall(req, ENDPOINTS.OUTLET_UPDATE).subscribe(
        (resp: any) => {
          if (resp.success === 1) {
            this.alertService.success(`${this.upsellName} updated successfully!`, this.options);
            this.navigateToList();
          } else {
            this.alertService.error(resp.message || 'Update failed', this.options);
          }
        }
      );
    }
  }

  openExitModal() {
    if (this.isViewMode) {
      this.navigateToList();
      return;
    }
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }

  confirmExit() {
    this.isExitModalOpen = false;
    this.navigateToList();
  }

  navigateToList() {
    this.router.navigate(['/features-list'], { queryParams: { outlet_type: this.passedOutletType } });
  }
}
