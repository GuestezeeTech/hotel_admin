import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { FormGroup, FormControl } from '@angular/forms';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { Router, ActivatedRoute } from '@angular/router';
import { LoaderService } from '../../shared/loader/loader.service';
import { CustomValidators } from '../../hotel-enrollment-tabview/validators';
import { ServiceSettingsService } from '../service-settings.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { DepartmentListService } from '../../department-list/department-list.service';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { ServiceTabListService } from '../../service-tab-list/service-tab-list.service';
import { PermissionService, ModulePermission } from '../../services/permission.service';

@Component({
  selector: 'app-service',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent],
  templateUrl: './service.component.html',
  styleUrl: './service.component.scss'
})

export class ServiceComponent implements OnInit {
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('iconInput') iconInput!: ElementRef<HTMLInputElement>;

  departments: any = [];
  serviceTabs: any = [];
  serviceTypes = ['Scheduled', 'Non-Scheduled'];
  selectedFileName: string = 'Choose file...';
  quantityEnabled: boolean = false;
  timeBoundEnabled: boolean = true; // Mandatory by default
  showHoursBefore: boolean = false;
  previewImgUrl: string | null = null;
  imageName: string = '';
  enableEdit: boolean = true;
  imgFile: File | null = null;
  logo_image: string = '';
  service_id: number = 0;
  service_image: string = '';
  serviceData: any;
  // Track whether icon/image originally came from API (existing service)
  initialIconFromApi: boolean = false;
  initialImageFromApi: boolean = false;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  serviceForm: FormGroup = new FormGroup({});
  belongsToList = []
  showBackModal = false;
  isViewMode: boolean = false;
  member_id: any;
  hotel_id: any;
  alertOptions = {
    autoClose: true,
    keepAfterRouteChange: true
  };
  // Image preview modal state
  previewImageSrc: string | null = null;
  isPreviewOpen: boolean = false;
  // Newly added for loader
  isLoadingDepartments: boolean = false;
  isLoadingServiceTabs: boolean = false;

  constructor(
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private serviceSettingsService: ServiceSettingsService,
    private authTokenService: AuthTokenService,
    private localService: LocalStorageService,
    private departmentService: DepartmentListService,
    private serviceTabListService: ServiceTabListService,
    private permissionService: PermissionService
  ) { }

  // -------------
  // Permission helpers for template bindings
  // -------------
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


  ngOnInit(): void {
    this.member_id = this.localService.get('MemberId');
    // console.log('Member Id:', this.member_id);
    this.hotel_id = Number(this.localService.get('UserId'));
    // console.log('Hotel Id:', this.hotel_id);
    if (this.member_id) {
      this.getDepartmentsById(this.member_id);
      this.getServiceTabsById(this.member_id);
    }
    this.serviceForm = new FormGroup({
      service_name: new FormControl(
        '',
        [Validators.required, CustomValidators.noWhitespaceValidator]
      ),
      department: new FormControl('', Validators.required),
      service_tab: new FormControl('', Validators.required),
      // Allow description to be empty, but if user types, it cannot be just spaces
      description: new FormControl('', [CustomValidators.noWhitespaceValidator]),
      is_active: new FormControl(false),
      is_time_bound: new FormControl(true), // Mandatory by default
      hours_before: new FormControl(''),
      service_type: new FormControl('', Validators.required),
      time_bound_value: new FormControl('', [
        Validators.required,
        CustomValidators.minValueValidator(1)
      ]),
      quantity: new FormControl(false),
      minimum_quantity: new FormControl(''),
      maximum_quantity: new FormControl(''),
      icon: new FormControl(''),
      image: new FormControl(''),
      belongs_to: new FormControl(
        '',
        [Validators.required, CustomValidators.noWhitespaceValidator]
      ),
    });
    const serviceId = this.activatedRoute.snapshot.paramMap.get('id');
    // detect mode from router state
    const navState = history.state;
    // console.log('Navigation State:', navState);
    this.isViewMode = navState?.['mode'] === 'view';
    // console.log('Is view mode:', this.isViewMode);
    // disable if view mode
    if (this.isViewMode) {
      this.serviceForm.disable();
    }
    if (serviceId != null && serviceId != undefined) {
      this.service_id = Number(serviceId);
      if (this.service_id != 0) {
        this.getserviceById();
      }
    }
    // Newly added & commented for validation
    /*   this.serviceForm.get('service_type')?.valueChanges.subscribe(serviceType => {
        const hoursControl = this.serviceForm.get('hours_before');
        if (serviceType === 'Scheduled') {
          hoursControl?.setValidators([
            Validators.required,
            CustomValidators.minValueValidator(1)
          ]);
          // Don't mark as touched when switching to Scheduled - let user interact first
          hoursControl?.markAsUntouched();
        } else {
          hoursControl?.clearValidators();
          hoursControl?.setValue(''); // optionally clear the value
          hoursControl?.markAsUntouched(); // Reset touched state when switching away
        }
        hoursControl?.updateValueAndValidity();
      }); */
    this.serviceForm.get('service_type')?.valueChanges.subscribe(serviceType => {
      const hoursControl = this.serviceForm.get('hours_before');
      if (serviceType === 'Scheduled') {
        hoursControl?.setValidators([
          Validators.required,
          CustomValidators.minValueValidator(1)
        ]);
      } else {
        hoursControl?.clearValidators();
        hoursControl?.setValue(null);
        hoursControl?.setErrors(null);
        hoursControl?.markAsPristine();
        hoursControl?.markAsUntouched();
      }
      hoursControl?.updateValueAndValidity();
    });
    // End
    // Time bound validation: mandatory unless Default Department
    this.serviceForm.get('department')?.valueChanges.subscribe(department => {
      this.updateTimeBoundValidation();
    });

    this.serviceForm.get('is_time_bound')?.valueChanges.subscribe(isTimeBound => {
      this.timeBoundEnabled = isTimeBound;
      this.updateTimeBoundValidation();
    });
    this.serviceForm.get('quantity')?.valueChanges.subscribe(isQuantity => {
      const minQtyControl = this.serviceForm.get('minimum_quantity');
      const maxQtyControl = this.serviceForm.get('maximum_quantity');
      if (isQuantity) {
        minQtyControl?.setValidators([
          Validators.required,
          CustomValidators.minValueValidator(1)
        ]);
        maxQtyControl?.setValidators([
          Validators.required,
          CustomValidators.maxQuantityValidator(minQtyControl!)
        ]);
      } else {
        minQtyControl?.clearValidators();
        minQtyControl?.setValue(0); // set to 0 instead of empty string
        maxQtyControl?.clearValidators();
        maxQtyControl?.setValue(0); // set to 0 instead of empty string
      }
      minQtyControl?.updateValueAndValidity();
      maxQtyControl?.updateValueAndValidity();
    });
    // Update maximum quantity validation when minimum quantity changes
    this.serviceForm.get('minimum_quantity')?.valueChanges.subscribe(() => {
      const maxQtyControl = this.serviceForm.get('maximum_quantity');
      const quantityEnabled = this.serviceForm.get('quantity')?.value;
      if (quantityEnabled && maxQtyControl) {
        maxQtyControl.updateValueAndValidity();
      }
    });
    // Initialize time bound validation
    this.updateTimeBoundValidation();
  }

  toggleChanged(event: any) {
    this.quantityEnabled = event.target.checked;
  }

  toggleTimeBound(event: any) {
    this.timeBoundEnabled = event.target.checked;
    this.updateTimeBoundValidation();
  }

  updateTimeBoundValidation() {
    const department = this.serviceForm.get('department')?.value;
    const isTimeBound = this.serviceForm.get('is_time_bound')?.value;
    const timeBoundValueControl = this.serviceForm.get('time_bound_value');
    const isTimeBoundControl = this.serviceForm.get('is_time_bound');

    // If Default Department, time bound can be disabled
    if (department === 'Default') {
      if (isTimeBound === true) {
        // If enabled, value is required
        timeBoundValueControl?.setValidators([
          Validators.required,
          CustomValidators.minValueValidator(1)
        ]);
      } else {
        // If disabled, clear validators and set value to 0
        timeBoundValueControl?.clearValidators();
        timeBoundValueControl?.setValue(0);
      }
      isTimeBoundControl?.clearValidators();
    } else {
      // For non-Default departments (or when department is not yet selected), time bound is mandatory
      isTimeBoundControl?.setValidators([Validators.requiredTrue]);
      if (isTimeBound === true) {
        // Value is required when time bound is enabled
        timeBoundValueControl?.setValidators([
          Validators.required,
          CustomValidators.minValueValidator(1)
        ]);
      } else {
        // Force time bound to be enabled for non-Default departments
        if (department) { // Only force if department is selected (not empty)
          isTimeBoundControl?.setValue(true, { emitEvent: false });
          this.timeBoundEnabled = true;
        }
        timeBoundValueControl?.setValidators([
          Validators.required,
          CustomValidators.minValueValidator(1)
        ]);
      }
    }
    timeBoundValueControl?.updateValueAndValidity();
    isTimeBoundControl?.updateValueAndValidity();
  }

  preventInvalidNumberInput(event: KeyboardEvent): void {
    // Allow: backspace, delete, tab, escape, enter, and arrow keys
    if ([46, 8, 9, 27, 13, 37, 38, 39, 40].indexOf(event.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (event.keyCode === 65 && event.ctrlKey === true) ||
      (event.keyCode === 67 && event.ctrlKey === true) ||
      (event.keyCode === 86 && event.ctrlKey === true) ||
      (event.keyCode === 88 && event.ctrlKey === true) ||
      // Allow: home, end, left, right
      (event.keyCode >= 35 && event.keyCode <= 39)) {
      return;
    }
    // Block: +, -, e, E, . (decimal point)
    if (event.key === '+' || event.key === '-' ||
      event.key === 'e' || event.key === 'E' ||
      event.key === '.' || event.key === ',') {
      event.preventDefault();
      return;
    }
    // Allow only numbers (0-9) from main keyboard and numpad
    if ((event.keyCode < 48 || event.keyCode > 57) &&
      (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }

  filterInvalidNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove any non-digit characters (+, -, e, E, decimal points)
    let value = input.value.replace(/[^0-9]/g, '');
    // Update the input value and form control
    if (input.value !== value) {
      const controlName = input.getAttribute('formControlName');
      if (controlName) {
        const numValue = value === '' ? null : (value === '0' ? null : Number(value));
        this.serviceForm.get(controlName)?.setValue(numValue, { emitEvent: true });
        // Update the input value to match
        input.value = value === '' ? '' : value;
      }
    }
  }

  deleteIcon() {
    const wasFromApi = this.initialIconFromApi && !!this.logo_image;
    this.logo_image = "";
    if (wasFromApi && this.service_id) {
      this.alertService.success(
        'Icon will be removed after you save the service.',
        this.alertOptions
      );
    } else {
      this.alertService.success('Icon removed successfully.', this.alertOptions);
    }
  }
  deleteImage() {
    const wasFromApi = this.initialImageFromApi && !!this.service_image;
    this.service_image = "";
    if (wasFromApi && this.service_id) {
      this.alertService.success(
        'Image will be removed after you save the service.',
        this.alertOptions
      );
    } else {
      this.alertService.success('Image removed successfully.', this.alertOptions);
    }
  }

  openBackModal() {
    if (this.isViewMode) {
      this.navigateBack();
    } else {
      this.showBackModal = true;
    }
  }

  closeBackModal() {
    this.showBackModal = false;
  }

  navigateBack() {
    this.showBackModal = false;
    this.router.navigate(['/service-list']);
  }

  selectedServiceType(event: any) {
    if (event.target.value == "Scheduled") {
      this.showHoursBefore = true;
    }
    else {
      this.showHoursBefore = false;
    }
  }

  async saveDta() {
    // Collect validation errors by type
    const requiredErrors: string[] = [];
    const minValueErrors: string[] = [];
    const otherErrors: string[] = [];

    const department = this.serviceForm.get('department')?.value;
    const isTimeBound = this.serviceForm.get('is_time_bound')?.value;
    const timeBoundValue = this.serviceForm.get('time_bound_value')?.value;
    const serviceType = this.serviceForm.get('service_type')?.value;
    const hoursBefore = this.serviceForm.get('hours_before')?.value;

    // Service name
    if (!this.serviceForm.get('service_name')?.value?.trim()) {
      this.serviceForm.get('service_name')?.markAsTouched();
      requiredErrors.push('Service Name');
    }
    // Department
    if (!this.serviceForm.get('department')?.value) {
      this.serviceForm.get('department')?.markAsTouched();
      requiredErrors.push('Department');
    }
    // Service Type
    if (!this.serviceForm.get('service_type')?.value) {
      this.serviceForm.get('service_type')?.markAsTouched();
      requiredErrors.push('Service Type');
    }
    // Service Tab
    if (!this.serviceForm.get('service_tab')?.value) {
      this.serviceForm.get('service_tab')?.markAsTouched();
      requiredErrors.push('Service Tab');
    }
    // Belongs To
    if (!this.serviceForm.get('belongs_to')?.value?.trim()) {
      this.serviceForm.get('belongs_to')?.markAsTouched();
      requiredErrors.push('Belongs To');
    }

    // Validate time bound before saving
    if (department && department !== 'Default' && !isTimeBound) {
      this.serviceForm.get('is_time_bound')?.setValue(true, { emitEvent: false });
      this.serviceForm.get('is_time_bound')?.markAsTouched();
      otherErrors.push('Time bound is mandatory for this department.');
    }
    if (isTimeBound) {
      // Check if empty or null/undefined (but not 0, as 0 is a valid value to check)
      if (timeBoundValue === null || timeBoundValue === undefined || timeBoundValue === '') {
        this.serviceForm.get('time_bound_value')?.markAsTouched();
        requiredErrors.push('Time bound value');
      } else {
        // Check if value is 0 or less than 1 (invalid value)
        const timeBoundNum = Number(timeBoundValue);
        if (isNaN(timeBoundNum) || timeBoundNum < 1 || timeBoundNum === 0) {
          this.serviceForm.get('time_bound_value')?.markAsTouched();
          minValueErrors.push('Time bound value');
        }
      }
    }

    // Validate hours_before for Scheduled service type
    // if (serviceType === 'Scheduled') {
    if (serviceType === 'Scheduled' && this.showHoursBefore) {
      // Check if empty or null/undefined (but not 0, as 0 is a valid value to check)
      if (hoursBefore === null || hoursBefore === undefined || hoursBefore === '') {
        this.serviceForm.get('hours_before')?.markAsTouched();
        requiredErrors.push('Hours before');
      } else {
        // Check if value is 0 or less than 1 (invalid value)
        const hoursBeforeNum = Number(hoursBefore);
        if (isNaN(hoursBeforeNum) || hoursBeforeNum < 1 || hoursBeforeNum === 0) {
          this.serviceForm.get('hours_before')?.markAsTouched();
          minValueErrors.push('Hours before');
        }
      }
    }

    // Validate quantity fields if quantity is enabled
    const quantityEnabled = this.serviceForm.get('quantity')?.value;
    if (quantityEnabled) {
      const minQuantity = this.serviceForm.get('minimum_quantity')?.value;
      const maxQuantity = this.serviceForm.get('maximum_quantity')?.value;

      // Validate minimum quantity
      if (minQuantity === null || minQuantity === undefined || minQuantity === '') {
        this.serviceForm.get('minimum_quantity')?.markAsTouched();
        requiredErrors.push('Minimum quantity');
      } else {
        const minQtyNum = Number(minQuantity);
        if (isNaN(minQtyNum) || minQtyNum < 1 || minQtyNum === 0) {
          this.serviceForm.get('minimum_quantity')?.markAsTouched();
          minValueErrors.push('Minimum quantity');
        } else {
          // Validate maximum quantity only if minimum is valid
          if (maxQuantity === null || maxQuantity === undefined || maxQuantity === '') {
            this.serviceForm.get('maximum_quantity')?.markAsTouched();
            requiredErrors.push('Maximum quantity');
          } else {
            const maxQtyNum = Number(maxQuantity);
            if (isNaN(maxQtyNum) || maxQtyNum < 1 || maxQtyNum === 0) {
              this.serviceForm.get('maximum_quantity')?.markAsTouched();
              minValueErrors.push('Maximum quantity');
            } else if (maxQtyNum <= minQtyNum) {
              this.serviceForm.get('maximum_quantity')?.markAsTouched();
              otherErrors.push('Maximum quantity must be greater than minimum quantity.');
            }
          }
        }
      }
    }

    // Mark all form fields as touched to show inline errors
    this.serviceForm.markAllAsTouched();

    // Build error messages by grouping similar errors
    const errorMessages: string[] = [];

    if (requiredErrors.length > 0) {
      const fields = requiredErrors.length === 1
        ? requiredErrors[0]
        : requiredErrors.slice(0, -1).join(', ') + ' and ' + requiredErrors[requiredErrors.length - 1];
      errorMessages.push(`${fields} ${requiredErrors.length === 1 ? 'is' : 'are'} required.`);
    }

    if (minValueErrors.length > 0) {
      const fields = minValueErrors.length === 1
        ? minValueErrors[0]
        : minValueErrors.slice(0, -1).join(', ') + ' and ' + minValueErrors[minValueErrors.length - 1];
      errorMessages.push(`${fields} must be at least 1.`);
    }

    if (otherErrors.length > 0) {
      errorMessages.push(...otherErrors);
    }

    // If there are custom validation errors, show them
    if (errorMessages.length > 0) {
      const errorMessage = errorMessages.join(' ');
      this.alertService.error(errorMessage, this.options);
      return;
    }

    // Check form validity for other required fields
    if (this.serviceForm.invalid) {
      this.alertService.error('Please fill all the required fields.', this.options);
      return;
    }

    // console.log("Form Submitted");
    this.addNewService();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
    }
  }

  logoupload(event: any): void {
    let dragEvent = false
    let file_data = { name: "", size: 0 }
    if (event.target && event.target.files && event.target.files[0]) {
      file_data = event.target.files[0]
    }
    else {
      file_data = event.dataTransfer.files[0]
      dragEvent = true
    }
    this.imageName = file_data.name
    let splitFileName = this.imageName.split(".")
    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file_data.size > maxBytes) {
      this.serviceForm.get('icon')?.setErrors({ sizeHigh: true });
      this.serviceForm.get('icon')?.setValue(null);
      this.alertService.error('Icon size should not exceed 2 MB.', this.options);
      return;
    }
    if (Math.round((file_data.size / 1000)) > 2000) {
      this.serviceForm.controls['icon'].setErrors({ 'sizehigh': true });
      this.alertService.error('Icon size is too large.', this.options);
      return
    }
    //CHECKING FILE TYPE (only jpg, jpeg, png)
    if (!["jpg", "jpeg", "png", "JPG", "JPEG", "PNG"].includes(splitFileName[splitFileName.length - 1])) {
      this.serviceForm.controls['icon'].setErrors({ 'type': true });
      this.alertService.error('Invalid icon format. Allowed types: JPG, JPEG, PNG.', this.options);
      return
    }
    // Dimension check: 150x150
    const iconImg = new Image();
    const iconUrl = URL.createObjectURL(file_data as any);
    iconImg.onload = () => {
      const validSize = iconImg.width === 150 && iconImg.height === 150;
      URL.revokeObjectURL(iconUrl);
      if (!validSize) {
        this.serviceForm.controls['icon'].setErrors({ invalidDimensions: true });
        this.alertService.error('Icon must be exactly 150x150 pixels.', this.options);
        return;
      }
      // Passed all checks, proceed with preview + upload
      this.imgFile = file_data as any;
      this.previewImgUrl = iconUrl;
      this.serviceForm.controls['icon'].setValue('');

      let headers = new HttpHeaders().set("source", "Brand").set("domain_name", this.authTokenService.getDomain())
      let formData_imageCate = new FormData();
      if (this.imgFile !== null) {
        formData_imageCate.append('upload', this.imgFile)
      }
      this.serviceSettingsService.sendImage(formData_imageCate, headers).subscribe(
        resp => {
          if (resp && resp.success === 1 && resp.status_code === 200) {
            const imgVariable = resp.result.data[0];
            if (this.imgFile !== null) {
              this.logo_image = imgVariable.location;
            }
            // If editing existing service, remind user to save to persist change
            if (this.service_id) {
              this.alertService.success(
                'Icon uploaded successfully. Please save the service to apply this change.',
                this.alertOptions
              );
            } else {
              this.alertService.success('Icon uploaded successfully.', this.alertOptions);
            }
          } else {
            this.alertService.error(resp?.message || 'Failed to upload icon.', this.options);
          }
        },
        () => {
          this.alertService.error('Failed to upload icon. Please try again.', this.options);
        }
      );
    };
    iconImg.onerror = () => {
      URL.revokeObjectURL(iconUrl);
      this.alertService.error('Unable to read icon image.', this.options);
    };
    iconImg.src = iconUrl;
  }

  openImagefile() {
    this.imageInput.nativeElement.click();
  }

  openLogofile() {
    this.iconInput.nativeElement.click();
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
    // this.validateImage = true;
    this.imageName = file_data.name
    let splitFileName = this.imageName.split(".")
    if (Math.round((file_data.size / 1000)) > 2000) {
      this.serviceForm.controls['image'].setErrors({ 'sizehigh': true });
      this.alertService.error('Image size is too large. Maximum allowed is 2 MB.', this.options);
      return
    }
    //CHECKING FILE TYPE (only jpg, jpeg, png)
    if (!["jpg", "jpeg", "png", "JPG", "JPEG", "PNG"].includes(splitFileName[splitFileName.length - 1])) {
      this.serviceForm.controls['image'].setErrors({ 'type': true });
      this.alertService.error('Invalid image format. Allowed types: JPG, JPEG, PNG.', this.options);
      return
    }
    // Dimension check: 1280x720
    const mainImg = new Image();
    const mainUrl = URL.createObjectURL(file_data as any);
    mainImg.onload = () => {
      const validSize = mainImg.width === 1280 && mainImg.height === 720;
      URL.revokeObjectURL(mainUrl);
      if (!validSize) {
        this.serviceForm.controls['image'].setErrors({ invalidDimensions: true });
        this.alertService.error('Image must be exactly 1280x720 pixels.', this.options);
        return;
      }
      // Passed all checks, proceed with preview + upload
      this.imgFile = file_data as any;
      this.previewImgUrl = mainUrl;

      let headers = new HttpHeaders().set("source", "Brand").set("domain_name", this.authTokenService.getDomain())
      let formData_imageCate = new FormData();
      if (this.imgFile !== null) {
        formData_imageCate.append('upload', this.imgFile)
      }
      this.serviceSettingsService.sendImage(formData_imageCate, headers).subscribe(
        resp => {
          if (resp && resp.success === 1 && resp.status_code === 200) {
            const imgVariable = resp.result.data[0];
            if (this.imgFile !== null) {
              this.service_image = imgVariable.location;
            }
            // If editing existing service, remind user to save to persist change
            if (this.service_id) {
              this.alertService.success(
                'Image uploaded successfully. Please save the service to apply this change.',
                this.alertOptions
              );
            } else {
              this.alertService.success('Image uploaded successfully.', this.alertOptions);
            }
          } else {
            this.alertService.error(resp?.message || 'Failed to upload image.', this.options);
          }
        },
        () => {
          this.alertService.error('Failed to upload image. Please try again.', this.options);
        }
      );
    };
    mainImg.onerror = () => {
      URL.revokeObjectURL(mainUrl);
      this.alertService.error('Unable to read image.', this.options);
    };
    mainImg.src = mainUrl;
  }

  addNewService() {
    // Convert quantity and time bound values to numbers
    const minQty = this.serviceForm.value.minimum_quantity
      ? Number(this.serviceForm.value.minimum_quantity)
      : 0;
    const maxQty = this.serviceForm.value.maximum_quantity
      ? Number(this.serviceForm.value.maximum_quantity)
      : 0;
    const timeBoundValue = this.serviceForm.value.time_bound_value
      ? Number(this.serviceForm.value.time_bound_value)
      : 0;
    let serviceObject = {
      name: this.serviceForm.value.service_name?.trim(),
      department: this.serviceForm.value.department,
      service_tab: this.serviceForm.value.service_tab,
      description: this.serviceForm.value.description,
      is_active: this.serviceForm.value.is_active,
      service_type: this.serviceForm.value.service_type,
      hours_before: this.serviceForm.value.hours_before,
      is_time_bound: this.serviceForm.value.is_time_bound,
      time_bound_value: timeBoundValue,
      quantity: this.serviceForm.value.quantity,
      minimum_quantity: minQty,
      maximum_quantity: maxQty,
      icon: this.logo_image,
      image: this.service_image,
      belongs_to: this.serviceForm.value.belongs_to,
      member_id: this.member_id,
      customer_id: this.hotel_id
    };
    // ----- Restricted Words Validation -----
    const restrictedWords = [
      "checkout",
      "latecheckout",
      "helpservice",
      "menuordering",
      "default"
    ];
    const clean = (str: any) =>
      (str || "")
        .toString()
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
    const cleanedName = clean(serviceObject.name);
    const cleanedBelongsTo = clean(serviceObject.belongs_to);
    if (restrictedWords.includes(cleanedName) || restrictedWords.includes(cleanedBelongsTo)) {
      this.alertService.error(
        "You are not allowed to create a service using restricted names like Checkout, Late Checkout, Help Service, or Menu Ordering.",
        this.options
      );
      return;
    }
    // Fetch all services to check for duplicates
    let fetchReq = {
      domain_name: this.authTokenService.getDomain(),
      user_id: this.authTokenService.getUserId(),
      extras: {
        find: { member_id: this.member_id }
      }
    };
    this.serviceSettingsService.getAllService(fetchReq).subscribe((resp: any) => {
      if (resp?.success !== 1) {
        this.alertService.error('Failed to fetch services!', this.options);
        return;
      }
      let all = resp.result.data || [];
      // console.log('All services fetched for duplicate check:', all);
      let nameLower = serviceObject.name.toLowerCase();
      // Checking for duplicate service name
      let duplicate = all.find((s: any) => {
        // console.log('Service id:', s.id, 'Against id:', this.service_id);
        // console.log('Service name lower:', s.name?.toLowerCase(), 'Against:', nameLower);
        return s.name?.toLowerCase() === nameLower &&
          s.id !== this.service_id        // ignore current record during update
      }
      );
      // console.log('Duplicate service found:', duplicate);
      if (duplicate) {
        this.alertService.error('Service name already exists!', this.options);
        return;
      }
      // Cretate 
      if (!this.service_id) {
        let createReq = {
          domain_name: this.authTokenService.getDomain(),
          user_id: this.authTokenService.getUserId(),
          payload: { service_creation: serviceObject }
        };
        this.serviceSettingsService.createService(createReq).subscribe(
          res => {
            if (res?.success === 1) {
              this.router.navigate(['/service-list']);
              this.alertService.success('Service created successfully', this.alertOptions);
            }
            else {
              this.alertService.error(res.message || 'Create failed', this.options);
            }
          },
          err => this.handleError(err)
        );
        return;
      }
      // Update
      let updateReq = {
        domain_name: this.authTokenService.getDomain(),
        user_id: this.authTokenService.getUserId(),
        payload: { service_updation: serviceObject },
        extras: {
          find: { id: this.service_id }
        }
      };
      this.serviceSettingsService.updateService(updateReq).subscribe(
        res => {
          if (res?.success === 1) {
            this.alertService.success('Service updated successfully', this.alertOptions);
            this.router.navigate(['/service-list']);
          }
          else {
            this.alertService.error(res.message || 'Update failed', this.options);
          }
        },
        err => this.handleError(err)
      );
    });
  }

  openImagePreview(type: 'icon' | 'image') {
    if (type === 'icon' && this.logo_image) {
      this.previewImageSrc = this.logo_image;
      this.isPreviewOpen = true;
    } else if (type === 'image' && this.service_image) {
      this.previewImageSrc = this.service_image;
      this.isPreviewOpen = true;
    }
    // Prevent background scroll while modal is open
    document.body.style.overflow = 'hidden';
  }

  closeImagePreview() {
    this.isPreviewOpen = false;
    this.previewImageSrc = null;
    // Restore background scroll
    document.body.style.overflow = '';
  }

  handleError(err: any) {
    this.loaderService.emitComplete();
    if (err?.error?.statusCode === 403) {
      this.alertService.error('Session Time Out! Please login Again', this.options);
      this.router.navigate(['/login'], { skipLocationChange: false });
    }
    else if (err?.error?.message) {
      this.alertService.error(err.error.message, this.options);
    }
    else {
      this.alertService.error('Something bad happened. Please try again!', this.options);
    }
  }

  getserviceById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: this.authTokenService.getDomain(),
        user_id: this.authTokenService.getUserId(),
        extras: {
          find: {
            id: this.service_id
          }
        }
      };
      this.serviceSettingsService.getServiceByid(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.serviceData = resp.result.data[0];
            this.logo_image = this.serviceData.icon;
            this.service_image = this.serviceData.image;
            // Remember that these values came from API for later delete messaging
            this.initialIconFromApi = !!this.logo_image;
            this.initialImageFromApi = !!this.service_image;
            this.serviceForm.patchValue({
              service_name: this.serviceData.name != null ? this.serviceData.name : '',
              department: this.serviceData.department != null ? this.serviceData.department : '',
              service_tab: this.serviceData.service_tab != null ? this.serviceData.service_tab : '',
              description: this.serviceData.description != null ? this.serviceData.description : '',
              is_active: this.serviceData.is_active != null ? this.serviceData.is_active : false,
              hours_before: this.serviceData.hours_before != null ? this.serviceData.hours_before : '',
              service_type: this.serviceData.service_type != null ? this.serviceData.service_type : '',
              is_time_bound: this.serviceData.is_time_bound != null ? this.serviceData.is_time_bound : false,
              time_bound_value: this.serviceData.time_bound_value != null && this.serviceData.time_bound_value > 0
                ? this.serviceData.time_bound_value
                : '',
              quantity: this.serviceData.quantity != null ? this.serviceData.quantity : false,
              minimum_quantity: this.serviceData.minimum_quantity != null ? this.serviceData.minimum_quantity : 0,
              maximum_quantity: this.serviceData.maximum_quantity != null ? this.serviceData.maximum_quantity : 0,
              belongs_to: this.serviceData.belongs_to != null ? this.serviceData.belongs_to : '',
              // icon: this.serviceData.icon != null ? this.serviceData.icon : '',
              // image: this.serviceData.image != null ? this.serviceData.image : ''
            });
            // Only show Quantity section if quantity is explicitly true
            this.quantityEnabled = this.serviceData.quantity === true;
            // Set time bound enabled state
            this.timeBoundEnabled = this.serviceData.is_time_bound === true;
            // Set showHoursBefore based on service type
            this.showHoursBefore = this.serviceData.service_type === 'Scheduled';

            // Ensure validators are set for enabled fields
            if (this.quantityEnabled) {
              const minQtyControl = this.serviceForm.get('minimum_quantity');
              const maxQtyControl = this.serviceForm.get('maximum_quantity');
              minQtyControl?.setValidators([
                Validators.required,
                CustomValidators.minValueValidator(1)
              ]);
              maxQtyControl?.setValidators([
                Validators.required,
                CustomValidators.maxQuantityValidator(minQtyControl!)
              ]);
              minQtyControl?.updateValueAndValidity();
              maxQtyControl?.updateValueAndValidity();
            }

            // Set validators for hours_before if service type is Scheduled
            if (this.serviceData.service_type === 'Scheduled') {
              const hoursControl = this.serviceForm.get('hours_before');
              hoursControl?.setValidators([
                Validators.required,
                CustomValidators.minValueValidator(1)
              ]);
              hoursControl?.updateValueAndValidity();
            }

            // Update time bound validation based on department and current state
            // For non-Default departments, ensure time bound is enabled
            const department = this.serviceForm.get('department')?.value;
            if (department !== 'Default' && !this.serviceData.is_time_bound) {
              this.serviceForm.get('is_time_bound')?.setValue(true);
              this.timeBoundEnabled = true;
            }

            // Apply time bound validation rules
            this.updateTimeBoundValidation();

            resolve();  // Resolve promise when data is set
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }

  getDepartmentsById(memberId: any) {
    this.isLoadingDepartments = true;
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: memberId
        }
      }
    };
    this.departmentService.getAllDepartments(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          // Assigns department data
          const allDepartments = resp.result.data;
          if (this.isViewMode) {
            this.departments = ["Default", ...allDepartments.map((dept: any) => dept.name)];
          }
          else {
            this.departments = allDepartments.map((dept: any) => dept.name);
          }
          // console.log('Department Data:', this.departments);
        } else {
          console.error('Failed to fetch department details:', resp.message);
          this.departments = [];
        }
        this.isLoadingDepartments = false;
      },
      (error: any) => {
        console.error('Error fetching department details:', error);
        this.isLoadingDepartments = false;
      }
    );
  }

  getServiceTabsById(memberId: any) {
    this.isLoadingServiceTabs = true;
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { member_id: memberId }
      }
    };
    this.serviceTabListService.getAllServiceTabs(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          // Assigns department data
          const allServiceTabs = resp.result.data;
          if (this.isViewMode) {
            this.serviceTabs = ["Default", ...allServiceTabs.map((dept: any) => dept.name)];
          }
          else {
            this.serviceTabs = allServiceTabs.map((serviceTab: any) => serviceTab.name);
          }
          // console.log('Service Tab Data:', this.serviceTabs);
        }
        else {
          console.error('Failed to fetch service tab details:', resp.message);
          this.serviceTabs = [];
        }
        this.isLoadingServiceTabs = false;
      },
      (error: any) => {
        console.error('Error fetching service tab details:', error);
        this.isLoadingServiceTabs = false;
      }
    );
  }


  //newly added for restrict numbers and special characters in service name field
  restrictSpecialChars(event: KeyboardEvent){
    const allowedKeys = /^[a-zA-Z]$/ ;
    const controlKeys = [
      'Backspace',
      'Tab',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Delete'
    ];

    // Allow Ctrl/Cmd shortcuts
    if (event.ctrlKey || event.metaKey) return;

    // Allow control keys
    if (controlKeys.includes(event.key)) return;
    if(!allowedKeys.test(event.key)){
       event.preventDefault();
    }
  }

  // Block only digits 0-9
  blockNumbersOnly(event: KeyboardEvent) {
    const allowed = /^[^0-9]$/; // Allow anything that is not a number
    const controlKeys = [
      'Backspace',
      'Tab',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Delete'
    ];

    // Allow Ctrl/Cmd shortcuts
    if (event.ctrlKey || event.metaKey) return;

    // Allow control keys
    if (controlKeys.includes(event.key)) return;

    if (!allowed.test(event.key)) {
      event.preventDefault();
    }
  }

  // Filter out numeric characters during paste
  handleServiceNamePaste(event: ClipboardEvent) {
    const pastedData = event.clipboardData?.getData('text') || '';
    if (/[0-9]/.test(pastedData)) {
      event.preventDefault();
    }
  }

}



