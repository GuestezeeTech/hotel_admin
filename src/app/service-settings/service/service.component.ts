import { DOMAIN_NAME } from './../../app.config';
import { Component, OnInit } from '@angular/core';
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
  departments = ['Electrical', 'House Keeping', 'Front Desk', 'Others'];
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
  serviceForm: FormGroup = new FormGroup({});

  constructor(
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private serviceSettingsService: ServiceSettingsService,
    private AuthTokenService: AuthTokenService
  ) { }

  ngOnInit(): void {
    this.serviceForm = new FormGroup({
      service_name: new FormControl('', Validators.required),
      department: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      is_active: new FormControl(false),
      hours_before: new FormControl('', Validators.required),
      service_type: new FormControl('', Validators.required),
      is_time_bound: new FormControl(false),
      time_bound_value: new FormControl('', Validators.required),
      quantity: new FormControl(false),
      minimum_quantity: new FormControl('', Validators.required),
      maximum_quantity: new FormControl('', Validators.required),
      icon: new FormControl('', Validators.required),
      image: new FormControl('', Validators.required),
    });
  }

  toggleChanged(event: any) {
    this.quantityEnabled = event.target.checked;
    //console.log('Toggle is now:', this.quantityEnabled);
    // You can now call other logic here based on toggle value
  }

  toggleTimeBound(event: any) {
    this.timeBoundEnabled = event.target.checked;
    //console.log('Toggle is now:', this.quantityEnabled);
    // You can now call other logic here based on toggle value
  }
  selectedServiceType(event: any) {
    if (event.target.value == "Scheduled") {
      this.showHoursBefore = true;
    }
    else {
      this.showHoursBefore = false;
    }
    //console.log('Toggle is now:', this.showHoursBefore);
    // You can now call other logic here based on toggle value
  }

  async onSubmit() {
    if (this.serviceForm.valid) {
      //console.log("Form Submitted");
      // if (this.hotelId == 0) {
      //   try {
      //     // await this.customerCreate().then(()=>{
      //       // this.afterCustomerCreate();   // Now customerdata.id will be available
      //     // }); 
      //   } catch (err) {
      //     //console.error("Customer creation failed:", err);
      //   }
      // } else {
      //   // this.customerUpdate();
      // }
    } else {
      //console.log("Form is invalid!");
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
    }
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
    //CHECKING FILE NAME
    // if (splitFileName.length == 0) {
    //   this.userRegistartionForm.controls['imageFile'].setErrors({ 'invalid': true });
    //   return
    // }

    // if (file_data.size == 0) {
    //   this.userRegistartionForm.controls['imageFile'].setErrors({ 'sizezero': true });
    //   return
    // }
    if (Math.round((file_data.size / 1000)) > 2000) {
      this.serviceForm.controls['imageFile'].setErrors({ 'sizehigh': true });
      return
    }
    //CHECKING FILE TYPE
    if (!["jpg", "jpeg", "png", "gif", "JPG", "JPEG", "PNG", "GIF"].includes(splitFileName[splitFileName.length - 1])) {
      this.serviceForm.controls['imageFile'].setErrors({ 'type': true });
      return
    }
    reader.onload = (evt: any) => {
      this.previewImgUrl = evt.target.result;
      this.serviceForm.controls['imageFile'].setValue(evt.target.result)
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
    let headers = new HttpHeaders().set("source", "Brand").set("domain_name", DOMAIN_NAME)
    let formData_imageCate = new FormData();
    if (this.imgFile !== null) {
      formData_imageCate.append('upload', this.imgFile)
    }
    this.serviceSettingsService.sendImage(formData_imageCate, headers).subscribe(resp => {
      if (resp && resp.success === 1 && resp.status_code === 200) {
        let imgVariable = resp.result.data[0];
        if (this.imgFile !== null) {
          this.logo_image = imgVariable.location;
          //console.log("this.logoImage" + this.logo_image)
          // Store profile image in localStorage
        }
      }
    })
  }
}
