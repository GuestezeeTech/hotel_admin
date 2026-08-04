/* 
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ENDPOINTS } from '../../app.config';
import { config, find } from 'rxjs';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { OutletCreationService } from '../outlet-creation.service';
import { appConfig } from '../../app.config';
import { LoaderService } from '../../shared/loader/loader.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalStorageService } from '../../auth-services/local-storage.service';

@Component({
  selector: 'app-outlet-creation',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule, // ✅ required for [formGroup]
    FormsModule],
  templateUrl: './outlet-creation.component.html',
  styleUrl: './outlet-creation.component.scss'
})

export class OutletCreationComponent {
  outletForm!: FormGroup;
  outletdata: any = {};
  hotelid: number = 0;
  outlet_id: number = 0;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };

  constructor(private fb: FormBuilder, private outletCreationService: OutletCreationService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private route: ActivatedRoute,
    private localService: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.outletForm = this.fb.group({
      owner_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      companyphone: [''],
      name: ['', Validators.required],
      gstno: [''],
      association: [''],
      address: [''],
      address1: [''],
      doorno: [''],
      location: [''],
      pincode: [''],
      delivery_pickup_point_pincode: [''],
      country: ['India'],
      open_time: [],
      close_time: [],
      enable_distance_radius: [false],
      sendordermail: [true],
      takephoto: [''],
    });



    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.outlet_id = Number(id)
      if (id) {
        // console.log('Editing Outlet with ID:', id);
        this.getOutletById(Number(id));
        // fetch and patch data
      } else {
        // console.log('Creating new Outlet');
      }
    });

    this.route.queryParams.subscribe(params => {
        if (params['outlet_type']) {
            this.passedOutletType = params['outlet_type'];
        }
    });
  }

  onPhotoUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Upload or preview logic here
    }
  }

  onSubmit(): void {

    if (this.outletForm.valid) {
      let outletObject = {
        owner_name: this.outletForm.value.owner_name,
        email: this.outletForm.value.email,
        phone: this.outletForm.value.phone,
        companyphone: this.outletForm.value.companyphone,
        name: this.outletForm.value.name,
        gstno: this.outletForm.value.gstno,
        association: this.outletForm.value.association,
        address: this.outletForm.value.address,
        address1: this.outletForm.value.address1,
        doorno: this.outletForm.value.doorno,
        location: this.outletForm.value.location,
        pincode: this.outletForm.value.pincode,
        delivery_pickup_point_pincode: this.outletForm.value.delivery_pickup_point_pincode,
        country: this.outletForm.value.country,
        shift_title: this.outletForm.value.shift_title,
        time_slot: this.outletForm.value.time_slot,
        open_time: this.outletForm.value.open_time,
        close_time: this.outletForm.value.close_time,
        enable_distance_radius: this.outletForm.value.enable_distance_radius,
        sendordermail: this.outletForm.value.sendordermail,
        takephoto: this.outletForm.value.takephoto,
        winhms_outlet_id: this.outletForm.value.winhms_outlet_id,
        property_name: this.outletForm.value.property_name,
        x_api_key: this.outletForm.value.x_api_key,
        Hotel_Code: this.outletForm.value.Hotel_Code,
        status: "Pending", // optionally add custom fields
        is_active: true,
        customer_id: Number(this.localService.get('UserId'))
      };

      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          outlet_creation: outletObject
        }
      }
      if (this.outlet_id == 0) {
        this.outletCreationService.postApiCall(requestBody, ENDPOINTS.OUTLET_CREATE).subscribe(
          resp => {
            this.loaderService.emitComplete();
            if (resp) {
              if (resp.success === 1 && resp.status_code === 200) {
                // ////console.log(resp);

                this.alertService.success(resp.message, this.options);
                this.router.navigate([`/outlet-list`], { skipLocationChange: false });

                // this.afterCustomerCreate();

                // setTimeout(() => {
                //   this.router.navigate([`/all-customers`], { skipLocationChange: false });
                // }, 1000);
                // this.router.navigate(['/all-customers'], { state: { result: resp.message }, relativeTo: this.activatedRoute, skipLocationChange: false });
              }
              else if (resp.success === 0) {
                if (resp.message) {
                  this.alertService.error(resp.message, this.options);
                }
              }
              else if (resp.message && resp.status_code !== 200) {
                this.alertService.error(resp.message, this.options);
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.options);
              }
            }
          },
          err => {
            this.loaderService.emitComplete();
            if (err.error.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.options)
              this.router.navigate([`/login`], { skipLocationChange: false });
            }
            else if (err.error.message) {
              this.alertService.error(err.error.message, this.options)
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          }
        )

      }
      else {
        let requestBody1: any = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          payload: {
            outlet_creation:
              outletObject

          },
          extras: {
            find: {
              "id": this.outlet_id
            }
          }
        }
        this.outletCreationService.postApiCall(requestBody1, ENDPOINTS.OUTLET_UPDATE).subscribe(
          resp => {
            this.loaderService.emitComplete();
            if (resp) {
              if (resp.success === 1 && resp.status_code === 200) {
                // ////console.log(resp);

                this.alertService.success(resp.message, this.options);
                this.router.navigate([`/outlet-list`], { skipLocationChange: false });


              }
              else if (resp.success === 0) {
                if (resp.message) {
                  this.alertService.error(resp.message, this.options);
                }
              }
              else if (resp.message && resp.status_code !== 200) {
                this.alertService.error(resp.message, this.options);
              }
              else {
                this.alertService.error('Something bad happened. Please try again!', this.options);
              }
            }
          },
          err => {
            this.loaderService.emitComplete();
            if (err.error.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.options)
              this.router.navigate([`/login`], { skipLocationChange: false });
            }
            else if (err.error.message) {
              this.alertService.error(err.error.message, this.options)
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
            }
          }
        )
      }

    }
  }

  getOutletById(id: number) {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": 16,
      "extras": {
        "find": {
          id: id
        },
        "pagination": false,
        "paginationDetails":
        {
          "limit": 0,
          "pageSize": 2
        },
        "sorting": false
      }
    }

    this.outletCreationService.postApiCall(requestBody, ENDPOINTS.OUTLET_GETBYID).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // ////console.log(resp);

            this.alertService.success(resp.message, this.options);
            this.outletdata = resp.result.data[0];
            this.outletForm.patchValue({
              owner_name: this.outletdata.owner_name,
              email: this.outletdata.email,
              phone: this.outletdata.phone,
              companyphone: this.outletdata.companyphone,
              name: this.outletdata.name,
              gstno: this.outletdata.gstno,
              association: this.outletdata.association,
              address: this.outletdata.address,
              address1: this.outletdata.address1,
              doorno: this.outletdata.doorno,
              location: this.outletdata.location,
              pincode: this.outletdata.pincode,
              delivery_pickup_point_pincode: this.outletdata.delivery_pickup_point_pincode,
              country: this.outletdata.country,
              shift_title: this.outletdata.shift_title,
              time_slot: this.outletdata.time_slot,
              open_time: this.outletdata.open_time,
              close_time: this.outletdata.close_time,
              enable_distance_radius: this.outletdata.enable_distance_radius,
              sendordermail: this.outletdata.sendordermail,
              takephoto: this.outletdata.takephoto
            });

            // this.afterCustomerCreate();

            // setTimeout(() => {
            //   this.router.navigate([`/all-customers`], { skipLocationChange: false });
            // }, 1000);
            // this.router.navigate(['/all-customers'], { state: { result: resp.message }, relativeTo: this.activatedRoute, skipLocationChange: false });
          }
          else if (resp.success === 0) {
            if (resp.message) {
              this.alertService.error(resp.message, this.options);
            }
          }
          else if (resp.message && resp.status_code !== 200) {
            this.alertService.error(resp.message, this.options);
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alertService.error(err.error.message, this.options)
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
      }
    )


  }




}
 */
import { Component, ElementRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { ENDPOINTS, DOMAIN_NAME, USER_ID } from '../../app.config';
import { OutletCreationService } from '../outlet-creation.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { ProfileService } from '../../profile/profile.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { PermissionService, ModulePermission } from '../../services/permission.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { TechnicalInfoService } from '../../hotel-enrollment-tabview/technical-info/technical-info.service';
import { UpsellService } from '../../features/upsell.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { focusFirstInvalidField } from '../../shared/form-focus.util';

@Component({
  selector: 'app-outlet-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AlertsComponent],
  templateUrl: './outlet-creation.component.html',
  styleUrls: ['./outlet-creation.component.scss']
})

export class OutletCreationComponent implements OnInit {
  outletForm!: FormGroup;
  outletdata: any = {};
  outlet_id: number = 0;
  photoPreview: string = '';
  photoName: string = ''; // To store the filename for UI display
  maxSizeMB = 2;
  submitted = false;
  options = { autoClose: true, keepAfterRouteChange: false };
  isExitModalOpen: boolean = false;
  member_id: any;
  editScreen: boolean = false;
  isViewMode: boolean = false;

  // --- Added to mirror feature-creation ---
  customerData: any = null;

  technicalInfos: any[] = [];
  hours: string[] = ['00', ...Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))];
  minutes: string[] = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  periods: string[] = ['AM', 'PM'];
  upsellName: string = 'Outlet';
  passedOutletType: string = '';
  countryDropdownList: any[] = [
    { "country": "Afghanistan" }, { "country": "Albania" }, { "country": "Algeria" }, { "country": "Andorra" },
    { "country": "Angola" }, { "country": "Argentina" }, { "country": "Armenia" }, { "country": "Australia" },
    { "country": "Austria" }, { "country": "Azerbaijan" }, { "country": "Bahamas" }, { "country": "Bahrain" },
    { "country": "Bangladesh" }, { "country": "Belarus" }, { "country": "Belgium" }, { "country": "Bhutan" },
    { "country": "Bolivia" }, { "country": "Brazil" }, { "country": "Bulgaria" }, { "country": "Cambodia" },
    { "country": "Cameroon" }, { "country": "Canada" }, { "country": "Chile" }, { "country": "China" },
    { "country": "Colombia" }, { "country": "Croatia" }, { "country": "Cuba" }, { "country": "Cyprus" },
    { "country": "Czech Republic" }, { "country": "Denmark" }, { "country": "Egypt" }, { "country": "Estonia" },
    { "country": "Ethiopia" }, { "country": "Finland" }, { "country": "France" }, { "country": "Georgia" },
    { "country": "Germany" }, { "country": "Ghana" }, { "country": "Greece" }, { "country": "Guatemala" },
    { "country": "Honduras" }, { "country": "Hong Kong" }, { "country": "Hungary" }, { "country": "Iceland" },
    { "country": "India" }, { "country": "Indonesia" }, { "country": "Iran" }, { "country": "Iraq" },
    { "country": "Ireland" }, { "country": "Israel" }, { "country": "Italy" }, { "country": "Jamaica" },
    { "country": "Japan" }, { "country": "Jordan" }, { "country": "Kazakhstan" }, { "country": "Kenya" },
    { "country": "Kuwait" }, { "country": "Laos" }, { "country": "Latvia" }, { "country": "Lebanon" },
    { "country": "Libya" }, { "country": "Lithuania" }, { "country": "Luxembourg" }, { "country": "Malaysia" },
    { "country": "Maldives" }, { "country": "Malta" }, { "country": "Mexico" }, { "country": "Moldova" },
    { "country": "Mongolia" }, { "country": "Morocco" }, { "country": "Myanmar" }, { "country": "Nepal" },
    { "country": "Netherlands" }, { "country": "New Zealand" }, { "country": "Nigeria" }, { "country": "Norway" },
    { "country": "Oman" }, { "country": "Pakistan" }, { "country": "Palestine" }, { "country": "Panama" },
    { "country": "Peru" }, { "country": "Philippines" }, { "country": "Poland" }, { "country": "Portugal" },
    { "country": "Qatar" }, { "country": "Romania" }, { "country": "Russia" }, { "country": "Rwanda" },
    { "country": "Saudi Arabia" }, { "country": "Senegal" }, { "country": "Serbia" }, { "country": "Singapore" },
    { "country": "Slovakia" }, { "country": "Slovenia" }, { "country": "Somalia" }, { "country": "South Africa" },
    { "country": "South Korea" }, { "country": "Spain" }, { "country": "Sri Lanka" }, { "country": "Sudan" },
    { "country": "Sweden" }, { "country": "Switzerland" }, { "country": "Syria" }, { "country": "Taiwan" },
    { "country": "Tanzania" }, { "country": "Thailand" }, { "country": "Tunisia" }, { "country": "Turkey" },
    { "country": "Uganda" }, { "country": "Ukraine" }, { "country": "United Arab Emirates" }, { "country": "United Kingdom" },
    { "country": "United States" }, { "country": "Uruguay" }, { "country": "Uzbekistan" }, { "country": "Venezuela" },
    { "country": "Vietnam" }, { "country": "Yemen" }, { "country": "Zambia" }, { "country": "Zimbabwe" }
  ];
  // -----------------------------------------
  upsellList: any[] = []; // Outlet type dropdown — fetched from upsell API

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
    private technicalInfoService: TechnicalInfoService,
    private upsellService: UpsellService,
    private authTokenService: AuthTokenService,
    private eRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.member_id = this.localService.get('MemberId');
    // console.log('Member id:', this.member_id);

    this.outletForm.get('is_third_party_outlet_id_exist')?.valueChanges.subscribe(exist => {
      const idControl = this.outletForm.get('third_party_outlet_id');
      if (exist === true || exist === 'true') {
        idControl?.setValidators([this.noWhitespaceValidator.bind(this)]);
      } else {
        idControl?.setValue('', { emitEvent: false });
        idControl?.clearValidators();
      }
      idControl?.updateValueAndValidity();
    });
    // Trigger initial validation setup
    const initialExist = this.outletForm.get('is_third_party_outlet_id_exist')?.value;
    const idControl = this.outletForm.get('third_party_outlet_id');
    if (initialExist === true || initialExist === 'true') {
      idControl?.setValidators([this.noWhitespaceValidator.bind(this)]);
    } else {
      idControl?.clearValidators();
    }
    idControl?.updateValueAndValidity();

    // Check if in view mode from navigation state
    const navState = window.history.state as any;
    this.isViewMode = navState?.mode === 'view';

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      // console.log('Outlet id:', id);
      this.outlet_id = id ? Number(id) : 0;
      if (id) {
        this.editScreen = true;
        this.getOutletById(Number(id));
      }
    });

    if (this.member_id) {
      this.getHotelTechnicalInfo();
      this.loadUpsellList(); // Populate outlet_type dropdown
      this.getCustomerById();
    }


    // Update upsellName dynamically when outlet_type changes
    this.outletForm.get('outlet_type')?.valueChanges.subscribe(val => {
      if (val) this.upsellName = val;
    });

    // Disable form if in view mode
    if (this.isViewMode) {
      this.outletForm.disable({ emitEvent: false });
    }
  }

  // get canAddRestaurants(): boolean {
  get canAddOutlets(): boolean {
    // const permission = this.permissionService.getModulePermission('RESTAURANTS');
    const permission = this.permissionService.getModulePermission('OUTLETS');
    return permission?.has_add_permission ?? false;
  }

  // get canEditRestaurants(): boolean {
  get canEditOutlets(): boolean {
    // const permission = this.permissionService.getModulePermission('RESTAURANTS');
    const permission = this.permissionService.getModulePermission('OUTLETS');
    return permission?.has_edit_permission ?? false;
  }

  private buildForm() {
    this.outletForm = this.fb.group({
      owner_name: ['', [this.noWhitespaceValidator.bind(this), Validators.maxLength(50)]],
      // Newly added & commented for consective dots
      // email: ['', [this.noWhitespaceValidator.bind(this), Validators.pattern(/^[a-zA-Z0-9_%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,4}$/)]],
      email: ['', [this.noWhitespaceValidator.bind(this), Validators.pattern(/^[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/)]],
      // End of newly added & commented for consective dots
      phone: ['', [this.noWhitespaceValidator.bind(this), Validators.minLength(10), Validators.maxLength(10), this.onlyNumbersValidator]],
      companyphone: ['', [this.optionalNumbersValidator]],
      name: ['', [this.noWhitespaceValidator.bind(this), Validators.maxLength(50)]],
      // gstno: ['', [Validators.required, this.gstValidator]],
      gstno: ['', [this.gstValidator]],
      association: [''],
      // address: ['', Validators.required],
      address: [''],
      address1: [''],
      // doorno: ['', Validators.required],
      doorno: [''],
      // location: ['', Validators.required],
      location: [''],
      // pincode: ['', [Validators.required, this.onlyNumbersValidator]],
      pincode: ['', [Validators.minLength(6), Validators.maxLength(6), this.onlyNumbersValidator]],
      delivery_pickup_point_pincode: [''],
      country: [''],
      open_time: ['', [this.time12HrValidator]],
      close_time: ['', [this.time12HrValidator]],
      enable_distance_radius: [false],
      sendordermail: [true],
      takephoto: [''],
      third_party_outlet_id: [''],
      is_third_party_outlet_id_exist: [false],
      // winhms_outlet_id: ['', Validators.required],
      // property_name: ['', Validators.required],
      // x_api_key: ['', Validators.required],
      // Hotel_Code: ['', Validators.required],
      property_name: [''],
      x_api_key: [''],
      Hotel_Code: [''],
      is_active: [true],

      // Separate time dropdown controls (mirrors feature-creation)
      open_hour: ['', Validators.required],
      open_minute: ['', Validators.required],
      open_period: ['', Validators.required],
      close_hour: ['', Validators.required],
      close_minute: ['', Validators.required],
      close_period: ['', Validators.required],

      // Outlet type — selected from upsell list
      outlet_type: ['', Validators.required]
    });
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

  noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined) {
      return { 'required': true };
    }
    const isWhitespace = value.toString().trim().length === 0;
    return isWhitespace ? { 'required': true } : null;
  }

  time12HrValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null;
    return /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(v)
      ? null
      : { invalidTime: true };
  }

  validateNumberInput(field: string) {
    const c = this.outletForm.get(field);
    if (!c) return;
    let raw = c.value ?? '';
    let clean = raw.replace(/\D+/g, '');
    // Enforce digit limits per field
    const limit = (field === 'pincode' || field === 'delivery_pickup_point_pincode') ? 6 : 10;
    if (clean.length > limit) {
      clean = clean.substring(0, limit);
    }
    if (clean !== raw) c.setValue(clean, { emitEvent: false });
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

  // GST Number Validator Function
  gstValidator(control: any) {
    if (!control.value) return null; // required validator handles empty case
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!gstRegex.test(control.value)) {
      return {
        invalidGST: {
          message: 'Please enter a valid 15-digit GST Number (e.g., 29ABCDE1234F1Z5)'
        }
      };
    }
    return null;
  }

  // IMAGE UPLOAD
  onPhotoUpload(event: any) {
    if (this.isViewMode) return; // Prevent upload in view mode
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.photoName = file.name; // Saves filename for UI
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
        if (this.editScreen) {
          this.alertService.success(
            'Photo uploaded successfully. Changes are not saved yet — please click “Save” to apply the update.',
            this.options
          );
        }
      },
      () => {
        this.alertService.error('Upload error', this.options);
        inputEl.value = '';
        this.photoPreview = '';
        this.photoName = '';
      }
    );
  }

  private updateOnlyImage(url: string) {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: this.outlet_id } },
      payload: { outlet_creation: { takephoto: url } }
    };
    this.outletCreationService.postApiCall(payload, ENDPOINTS.OUTLET_UPDATE).subscribe(
      (r: any) => {
        if (r.success === 1) this.alertService.success('Image updated!', this.options);
        else this.alertService.error(r?.message || 'Save failed', this.options);
      },
      () => this.alertService.error('Save error', this.options)
    );
  }

  removePhoto() {
    if (this.isViewMode) return; // Prevent removal in view mode
    this.photoPreview = '';
    this.photoName = '';
    this.outletForm.patchValue({ takephoto: '' });
    // Reset the file input field
    const input: any = document.getElementById('photoInput');
    if (input) input.value = '';
    const message = this.editScreen
      ? 'Photo removed successfully. Changes are not saved yet — please click "Save" to apply the update.'
      : 'Photo removed successfully!';
    this.alertService.success(message, this.options);
  }

  getOutletById(id: number) {
    const req = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: id
        }
      }
    };
    this.outletCreationService.postApiCall(req, ENDPOINTS.OUTLET_GETBYID).subscribe(
      (resp: any) => {
        const data = resp?.result?.data?.[0] || {};
        this.outletdata = data;
        // console.log('Outlet data(based on id:', this.outletdata);

        // Check if is_third_party_outlet_id_exist key exists and its value
        const isThirdPartyIdExist = (data.hasOwnProperty('is_third_party_outlet_id_exist') && data.is_third_party_outlet_id_exist !== null && data.is_third_party_outlet_id_exist !== undefined)
          ? (data.is_third_party_outlet_id_exist === true || data.is_third_party_outlet_id_exist === 'true')
          : false;

        this.outletForm.patchValue({
          ...data,
          is_third_party_outlet_id_exist: isThirdPartyIdExist,
          third_party_outlet_id: isThirdPartyIdExist ? (data.third_party_outlet_id || data.winhms_outlet_id || '') : ''
        });
        this.photoPreview = data.takephoto || data.takePhoto || '';
        this.photoName = this.getFileNameFromUrl(data.takephoto || data.takePhoto);
        // Split existing time strings into dropdowns
        if (data.open_time) this.parseTimeToDropdown(data.open_time, 'open');
        if (data.close_time) this.parseTimeToDropdown(data.close_time, 'close');
      }
    );
  }

  // Mirrors feature-creation: fetch hotel & technical info for auto-population
  private getHotelTechnicalInfo() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { customer_member_id: this.member_id } }
    };
    this.hotelEnrollmentService.getLoginCustomerById(requestBody).subscribe((resp: any) => {
      if (resp?.success === 1 && resp?.result?.data?.[0]) {
        this.customerData = resp.result.data[0];
      }
    });
    this.technicalInfoService.getAllTechnicalInfo(requestBody).subscribe((resp: any) => {
      if (resp?.success === 1 && resp?.result?.data?.[0]) {
        this.technicalInfos = resp.result.data[0].customer_technical_info || [];
      }
    });
  }

  // Fetch upsell names to populate the outlet_type dropdown
  private loadUpsellList() {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { member_id: this.member_id } }
    };
    this.upsellService.getAllUpsells(payload).subscribe((resp: any) => {
      if (resp?.success === 1) {
        this.upsellList = resp.result.data || [];
        // If coming with a pre-selected type from query param, patch the form
        if (this.passedOutletType) {
          this.outletForm.patchValue({ outlet_type: this.passedOutletType });
        }
      }
    });
  }

  private extractTechInfo(key: string): string {
    if (!this.technicalInfos || !Array.isArray(this.technicalInfos)) return '';
    const parts = key.toLowerCase().split('_');
    const searchBase = (parts[0] === 'x' && parts.length > 1) ? parts[1] : parts[0];
    for (const info of this.technicalInfos) {
      for (const objKey in info) {
        if (typeof info[objKey] === 'string' && objKey.toLowerCase().includes(searchBase)) {
          if (info[objKey]) return info[objKey];
        }
      }
      if (info.attributes && Array.isArray(info.attributes)) {
        for (const attr of info.attributes) {
          if (attr?.key?.toLowerCase().includes(searchBase) && attr.value) {
            return attr.value;
          }
        }
      }
    }
    if (this.customerData) {
      if (searchBase === 'property' && this.customerData.property_name) return this.customerData.property_name;
      if (searchBase === 'property' && this.customerData.name) return this.customerData.name;
    }
    return '';
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
      // Get last segment after slash
      let name = url.split('/').pop() || '';
      // Remove query string or fragment if present
      name = name.split('?')[0].split('#')[0];
      // Decode URL encoded characters (e.g. %20 -> space)
      name = decodeURIComponent(name);
      return name;
    } catch (e) {
      return '';
    }
  }

  onSubmit() {
    if (this.isViewMode) return; // Prevent submission in view mode
    this.submitted = true;
    Object.values(this.outletForm.controls).forEach(c => c.markAsTouched());
    if (this.outletForm.invalid) {
      this.alertService.error('Please fill all required fields correctly!', this.options);
      focusFirstInvalidField(this.eRef.nativeElement);
      return;
    }
    const fv = this.outletForm.value;

    // Combine separate time dropdown controls into time strings
    const openTime = fv.open_hour && fv.open_minute && fv.open_period ?
      `${fv.open_hour}:${fv.open_minute} ${fv.open_period}` : '';
    const closeTime = fv.close_hour && fv.close_minute && fv.close_period ?
      `${fv.close_hour}:${fv.close_minute} ${fv.close_period}` : '';

    const existBool = fv.is_third_party_outlet_id_exist === true || fv.is_third_party_outlet_id_exist === 'true';
    const outletObj = {
      ...fv,
      open_time: openTime,
      close_time: closeTime,
      customer_id: Number(this.localService.get('UserId')) || Number(USER_ID),
      member_id: this.member_id,
      outlet_type: fv.outlet_type, // taken from the dropdown selection
      // Programmatic mapping (mirrors feature-creation)
      Hotel_Code: this.customerData?.Hotel_Code || '',
      winhms_outlet_id: fv.third_party_outlet_id,
      is_third_party_outlet_id_exist: existBool,
      property_name: this.extractTechInfo('property_name') || this.extractTechInfo('Property Name') || '',
      x_api_key: this.extractTechInfo('x_api_key') || this.extractTechInfo('X API Key') || ''
    };
    // Sync upsellName so success messages use the selected type
    this.upsellName = fv.outlet_type || 'Outlet';
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { outlet_creation: outletObj }
    };
    // console.log('Request Body of outlet:', requestBody)
    if (this.outlet_id === 0) {
      this.outletCreationService.postApiCall(requestBody, ENDPOINTS.OUTLET_CREATE).subscribe(
        (resp: any) => {
          if (resp.success === 1) {
            this.alertService.success(`${this.upsellName} created successfully!`, this.options);
            setTimeout(() => {
              this.navigateToList();
            }, 1000);
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
            setTimeout(() => {
              this.navigateToList();
            }, 1000);
          } else {
            this.alertService.error(resp.message || 'Update failed', this.options);
          }
        }
      );
    }
  }

  openExitModal() {
    if (this.isViewMode) {
      this.navigateToList(); // Bypass confirmation in view mode
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
    // this.router.navigateByUrl('outlet-list')
    this.router.navigate(['/outlet-list']);
  }

  getCustomerById() {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: this.member_id
        }
      }
    };
    this.hotelEnrollmentService.getLoginCustomerById(requestBody).subscribe(
      (resp: any) => {
        if (resp && resp.success === 1) {
          this.customerData = resp.result.data[0];
        }
      },
      (err: any) => {
        // Silent error for background data fetch
      }
    );
  }

}
