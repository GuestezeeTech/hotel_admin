
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ENDPOINTS } from '../../app.config';
import { config, find } from 'rxjs';
import { DOMAIN_NAME,USER_ID } from '../../app.config';
import { OutletCreationService } from '../outlet-creation.service';
import { appConfig } from '../../app.config';
import { LoaderService } from '../../shared/loader/loader.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { Router,ActivatedRoute } from '@angular/router';
import { LocalStorageService } from '../../auth-services/local-storage.service';

@Component({
  selector: 'app-outlet-creation',
  standalone: true,
  imports: [ CommonModule,
    ReactiveFormsModule, // ✅ required for [formGroup]
    FormsModule],
  templateUrl: './outlet-creation.component.html',
  styleUrl: './outlet-creation.component.scss'
})
export class OutletCreationComponent {
  
  outletForm!: FormGroup;
 

  constructor(private fb: FormBuilder,private outletCreationService:OutletCreationService,
    private loaderService:LoaderService,
    private alertService:AlertsService,
     private router: Router,
     private route:ActivatedRoute,
     private localService:LocalStorageService
  ) {}
  outletdata: any = {};
  hotelid:number=0;
  outlet_id:number=0;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  
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
      shift_title: ['Full Day'],
      time_slot: ['30mins'],
      open_time: ['12:00AM'],
      close_time: ['11:59PM'],
      enable_distance_radius: [false],
      sendordermail: [true],
      takephoto: [''],
    });



    this.route.paramMap.subscribe(params => {
  const id = params.get('id');
  this.outlet_id= Number(id)
  if (id) {
    console.log('Editing Outlet with ID:', id);
    this.getOutletById(Number(id));
    // fetch and patch data
  } else {
    console.log('Creating new Outlet');
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

  status: "Pending", // optionally add custom fields
  is_active: true,
  customer_id :Number(this.localService.get('UserId'))
};

       let requestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: {
                outlet_creation: outletObject
              }
            }
            if(this.outlet_id==0){
               this.outletCreationService.postApiCall(requestBody, ENDPOINTS.OUTLET_CREATE).subscribe(
              resp => {
                this.loaderService.emitComplete();
                if (resp) {
                  if (resp.success === 1 && resp.status_code === 200) {
                    // ////console.log(resp);
                   
                    this.alertService.success(resp.message, this.options);
                      this.router.navigate([`/outlet-list`], { skipLocationChange: false });
                    ////console.log(this.customerdata, "cst");
                    
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
            else{
             let  requestBody1:any = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: {
                outlet_creation:
                  outletObject

                } ,
                extras:{
                  find:{
                    "id":this.outlet_id
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

 getOutletById(id:number){
    let requestBody = {"domain_name":DOMAIN_NAME,
      "user_id":16,
      "extras":{
        "find":{
          id:id        },
        "pagination":false,
        "paginationDetails":
        {
          "limit":0,
          "pageSize":2
        },
        "sorting":false
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
