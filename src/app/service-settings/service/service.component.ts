import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { FormGroup, FormControl } from '@angular/forms';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { Router, ActivatedRoute } from '@angular/router';
import { LoaderService } from '../../shared/loader/loader.service';
import { CustomValidators } from '../../hotel-enrollment-tabview/validators';
// import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { ServiceSettingsService } from '../service-settings.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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

  departments = ['FO', 'EHK', 'Engineering', 'F&B'];
  serviceTypes = ['Scheduled', 'Non-Scheduled'];
  selectedFileName: string = 'Choose file...';
  quantityEnabled: boolean = false;
  timeBoundEnabled: boolean = false;
  showHoursBefore: boolean = false;
  previewImgUrl: string | null = null;
  imageName: string = '';
  enableEdit: boolean = true;
  imgFile: File | null = null;
  logo_image: string = '';
  service_id: number = 0;
  service_image: string = '';
  serviceData: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  serviceForm: FormGroup = new FormGroup({});
  belongsToList = []
  showBackModal = false;
  isViewMode: boolean = false;

  constructor(
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private serviceSettingsService: ServiceSettingsService,
    private authTokenService: AuthTokenService
  ) { }


  ngOnInit(): void {
    this.serviceForm = new FormGroup({
      service_name: new FormControl('', Validators.required),
      department: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      is_active: new FormControl(false),
      is_time_bound: new FormControl(false),
      hours_before: new FormControl(''),
      service_type: new FormControl('', Validators.required),
      time_bound_value: new FormControl(''),
      quantity: new FormControl(false),
      minimum_quantity: new FormControl(''),
      maximum_quantity: new FormControl(''),
      icon: new FormControl(''),
      image: new FormControl(''),
      belongs_to: new FormControl('', Validators.required),
    });
    const serviceId = this.activatedRoute.snapshot.paramMap.get('id');
    // detect mode from router state
    const navState = history.state;
    console.log('Navigation State:', navState);
    this.isViewMode = navState?.['mode'] === 'view';
    console.log('Is view mode:', this.isViewMode);
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
    this.serviceForm.get('service_type')?.valueChanges.subscribe(serviceType => {
      const hoursControl = this.serviceForm.get('hours_before');
      if (serviceType === 'Scheduled') {
        hoursControl?.setValidators([Validators.required]);
      } else {
        hoursControl?.clearValidators();
        hoursControl?.setValue(''); // optionally clear the value
      }
      hoursControl?.updateValueAndValidity();
    });
    this.serviceForm.get('is_time_bound')?.valueChanges.subscribe(isTimeBound => {
      const timeBoundValueControl = this.serviceForm.get('time_bound_value');
      if (isTimeBound === true) {
        timeBoundValueControl?.setValidators([Validators.required]);
      } else {
        timeBoundValueControl?.clearValidators();
        timeBoundValueControl?.setValue(''); // optionally clear
      }
      timeBoundValueControl?.updateValueAndValidity();
    });
    this.serviceForm.get('quantity')?.valueChanges.subscribe(isQuantity => {
      const minQtyControl = this.serviceForm.get('minimum_quantity');
      const maxQtyControl = this.serviceForm.get('maximum_quantity');
      if (isQuantity) {
        minQtyControl?.setValidators([Validators.required]);
        maxQtyControl?.setValidators([Validators.required]);
      } else {
        minQtyControl?.clearValidators();
        minQtyControl?.setValue('');
        maxQtyControl?.clearValidators();
        maxQtyControl?.setValue('');
      }
      minQtyControl?.updateValueAndValidity();
      maxQtyControl?.updateValueAndValidity();
    });

  }

  toggleChanged(event: any) {
    this.quantityEnabled = event.target.checked;
  }

  toggleTimeBound(event: any) {
    this.timeBoundEnabled = event.target.checked;
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
    if (this.serviceForm.valid) {
      console.log("Form Submitted");
      this.addNewService();
    } else {
      console.log("Form is invalid!");
      this.serviceForm.markAllAsTouched();
      this.alertService.error('Please fill all the fields before submitting the form.', this.options);
    }
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
    var reader = new FileReader();
    this.imageName = file_data.name
    let splitFileName = this.imageName.split(".")
    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file_data.size > maxBytes) {
      this.serviceForm.get('icon')?.setErrors({ sizeHigh: true });
      // optionally clear the control so the user has to re‐select
      this.serviceForm.get('icon')?.setValue(null);
      return;
    }
    if (Math.round((file_data.size / 1000)) > 2000) {
      this.serviceForm.controls['icon'].setErrors({ 'sizehigh': true });
      return
    }
    //CHECKING FILE TYPE
    if (!["jpg", "jpeg", "png", "gif", "JPG", "JPEG", "PNG", "GIF"].includes(splitFileName[splitFileName.length - 1])) {
      this.serviceForm.controls['icon'].setErrors({ 'type': true });
      return
    }
    reader.onload = (evt: any) => {
      this.previewImgUrl = evt.target.result;
      this.serviceForm.controls['icon'].setValue('');
      this.imgFile = event.target.files[0];
    }
    //BASED ON EVENT READ FILE
    if (!dragEvent) {
      reader.readAsDataURL(event.target.files[0]);
      this.imgFile = event.target.files[0];
    }
    else {
      reader.readAsDataURL(event.dataTransfer.files[0]);
      this.imgFile = event.dataTransfer.files[0];
    }
    let headers = new HttpHeaders().set("source", "Brand").set("domain_name", this.authTokenService.getDomain())
    let formData_imageCate = new FormData();
    if (this.imgFile !== null) {
      formData_imageCate.append('upload', this.imgFile)
    }
    this.serviceSettingsService.sendImage(formData_imageCate, headers).subscribe(resp => {
      if (resp && resp.success === 1 && resp.status_code === 200) {
        let imgVariable = resp.result.data[0];
        if (this.imgFile !== null) {
          this.logo_image = imgVariable.location;
        }
      }
    })
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
    var reader = new FileReader();
    this.imageName = file_data.name
    let splitFileName = this.imageName.split(".")
    if (Math.round((file_data.size / 1000)) > 2000) {
      this.serviceForm.controls['image'].setErrors({ 'sizehigh': true });
      return
    }
    //CHECKING FILE TYPE
    if (!["jpg", "jpeg", "png", "gif", "JPG", "JPEG", "PNG", "GIF"].includes(splitFileName[splitFileName.length - 1])) {
      this.serviceForm.controls['image'].setErrors({ 'type': true });
      return
    }
    reader.onload = (evt: any) => {
      this.previewImgUrl = evt.target.result;
      // this.serviceForm.controls['image'].setValue(evt.target.result)
      this.imgFile = event.target.files[0];
    }
    //BASED ON EVENT READ FILE
    if (!dragEvent) {
      reader.readAsDataURL(event.target.files[0]);
      this.imgFile = event.target.files[0];
    }
    else {
      reader.readAsDataURL(event.dataTransfer.files[0]);
      this.imgFile = event.dataTransfer.files[0];
    }
    let headers = new HttpHeaders().set("source", "Brand").set("domain_name", this.authTokenService.getDomain())
    let formData_imageCate = new FormData();
    if (this.imgFile !== null) {
      formData_imageCate.append('upload', this.imgFile)
    }
    this.serviceSettingsService.sendImage(formData_imageCate, headers).subscribe(resp => {
      if (resp && resp.success === 1 && resp.status_code === 200) {
        let imgVariable = resp.result.data[0];
        if (this.imgFile !== null) {
          this.service_image = imgVariable.location;
        }
      }
    })
  }


  addNewService() {
    let serviceObject = {
      name: this.serviceForm.value.service_name,
      department: this.serviceForm.value.department,
      description: this.serviceForm.value.description,
      is_active: this.serviceForm.value.is_active,
      service_type: this.serviceForm.value.service_type,
      hours_before: this.serviceForm.value.hours_before,
      is_time_bound: this.serviceForm.value.is_time_bound,
      time_bound_value: this.serviceForm.value.time_bound_value,
      quantity: this.serviceForm.value.quantity,
      minimum_quantity: this.serviceForm.value.minimum_quantity,
      maximum_quantity: this.serviceForm.value.maximum_quantity,
      icon: this.logo_image,
      image: this.service_image
    }
    if (this.service_id == undefined || this.service_id == 0 || this.service_id == null) {
      let requestBody = {
        domain_name: this.authTokenService.getDomain(),
        user_id: this.authTokenService.getUserId(),
        payload: {
          service_creation: serviceObject
        }
      }
      this.serviceSettingsService.createService(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.router.navigate([`/service-list`], { skipLocationChange: false });
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
      let requestBody = {
        domain_name: this.authTokenService.getDomain(),
        user_id: this.authTokenService.getUserId(),
        payload: {
          service_updation: serviceObject
        },
        extras: {
          find: {
            id: this.service_id
          }
        }
      }
      //console.log("123")
      this.serviceSettingsService.updateService(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.router.navigate([`/service-list`], { skipLocationChange: false });
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
            this.serviceForm.patchValue({
              service_name: this.serviceData.name != null ? this.serviceData.name : '',
              department: this.serviceData.department != null ? this.serviceData.department : '',
              description: this.serviceData.description != null ? this.serviceData.description : '',
              is_active: this.serviceData.is_active != null ? this.serviceData.is_active : false,
              hours_before: this.serviceData.hours_before != null ? this.serviceData.hours_before : '',
              service_type: this.serviceData.service_type != null ? this.serviceData.service_type : '',
              is_time_bound: this.serviceData.is_time_bound != null ? this.serviceData.is_time_bound : false,
              time_bound_value: this.serviceData.time_bound_value != null ? this.serviceData.time_bound_value : '',
              quantity: this.serviceData.quantity != null ? this.serviceData.quantity : false,
              minimum_quantity: this.serviceData.minimum_quantity != null ? this.serviceData.minimum_quantity : '',
              maximum_quantity: this.serviceData.maximum_quantity != null ? this.serviceData.maximum_quantity : '',
              belongs_to: this.serviceData.belongs_to != null ? this.serviceData.belongs_to : '',
              // icon: this.serviceData.icon != null ? this.serviceData.icon : '',
              // image: this.serviceData.image != null ? this.serviceData.image : ''
            });
            if (this.serviceData.quantity != null || this.serviceData.quantity == false) {
              this.quantityEnabled = true
            }
            if (this.serviceData.is_time_bound != null || this.serviceData.is_time_bound == false) {
              this.timeBoundEnabled = true
            }
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

  deleteIcon() {
    this.logo_image = "";
  }
  deleteImage() {
    this.service_image = "";
  }

  openBackModal() {
    this.showBackModal = true;
  }

  closeBackModal() {
    this.showBackModal = false;
  }

  navigateBack() {
    this.showBackModal = false;
    this.router.navigate(['/service-list']);
  }

}



