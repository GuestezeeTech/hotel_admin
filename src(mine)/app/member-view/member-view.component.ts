import { LocalStorageService } from './../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from './../app.config';
import { AlertsService } from './../shared/alerts/alerts.service';
import { Component } from '@angular/core';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../shared/loader/loader.service';
import { Router } from '@angular/router';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { ServiceDetailService } from '../hotel-enrollment-tabview/service-details/service-details.service';

@Component({
  selector: 'app-member-view',
  standalone: true,
  imports: [AlertsComponent, CommonModule, ReactiveFormsModule],
  templateUrl: './member-view.component.html',
  styleUrl: './member-view.component.scss'
})

export class MemberViewComponent {
  constructor(
    private fb: FormBuilder,
    private localService: LocalStorageService,
    private router: Router,
    private loaderService: LoaderService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private alertService: AlertsService,
    private localStorageService: LocalStorageService,
    private serviceDetailService: ServiceDetailService
  ) { }

  propertyViewForm!: FormGroup;
  officeViewForm!: FormGroup;
  customerdata: any;
  hotelId: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  exemptedServices: any;
  hotelName: any;
  customerServiceData: any;
  services: any;
  apiSelectedServices: any;

  ngOnInit(): void {
    this.hotelId = Number(this.localService.get('UserId'));
    this.initialForm();
    this.loadData();
  }

  initialForm(): void {
    this.officeViewForm = this.fb.group({
      first_name: [''],
      last_name: [''],
      designation: [''],
      phone_number: [''],
      email: [''],
      gender: [''],
      sec_first_name: [''],
      sec_last_name: [''],
      sec_designation: [''],
      sec_phone_number: [''],
      sec_email: [''],
      sec_gender: [''],
      company_name: [''],
      door_no: [''],
      address: [''],
      country: [''],
      state: [''],
      city: [''],
      pincode: [''],
      pan_no: [''],
      gst_no: ['']
    });
    this.propertyViewForm = this.fb.group({
      hotel_name: [''],
      contact_person: [''],
      contact_designation: [''],
      contact_email: [''],
      primary_phone_number: [''],
      secondary_phone_number: [''],
      brand: [''],
      property_doorno: [''],
      property_address: [''],
      property_city: [''],
      property_state: [''],
      property_location: [''],
      property_country: [''],
      property_pincode: [''],
      property_pan: [''],
      property_gst: [''],
      property_size: ['']
    });
  }

  async loadData(): Promise<void> {
    try {
      await this.getCustomerById();
      this.getServicesById();
      if (!this.customerdata) {
        //console.warn('Customer data is empty');
        return;
      }
      const address = this.customerdata.registered_address || {};
      const contactDetails = this.customerdata.property_details?.contact_details || {};
      const propertyAddress = this.customerdata.property_details?.property_address || {};
      this.exemptedServices = this.customerdata.service_details?.['exempted services'] || []
      this.hotelName = contactDetails.hotel_name;

      this.officeViewForm.patchValue({
        first_name: this.customerdata.first_name || '',
        last_name: this.customerdata.last_name || '',
        designation: this.customerdata.designation || '',
        phone_number: this.customerdata.phone_number || '',
        email: this.customerdata.email || '',
        gender: this.customerdata.gender || '',
        sec_first_name: this.customerdata.sec_first_name || '',
        sec_last_name: this.customerdata.sec_last_name || '',
        sec_designation: this.customerdata.sec_designation || '',
        sec_phone_number: this.customerdata.sec_phone_number || '',
        sec_email: this.customerdata.sec_email || '',
        sec_gender: this.customerdata.sec_gender || '',
        company_name: address.company_name || '',
        door_no: address.door_no || '',
        address: address.address || '',
        country: address.country || '',
        state: address.state || '',
        city: address.city || '',
        pincode: address.pincode || '',
        pan_no: address.pan_no || '',
        gst_no: address.gst_no || ''
      });

      this.propertyViewForm.patchValue({
        hotel_name: contactDetails.hotel_name || '',
        contact_person: contactDetails.contact_person || '',
        contact_designation: contactDetails.designation || '',
        contact_email: contactDetails.email || '',
        primary_phone_number: contactDetails.primary_phone_number || '',
        secondary_phone_number: contactDetails.secondary_phone_number || '',
        brand: contactDetails.brand || '',
        property_doorno: propertyAddress.property_doorno || '',
        property_address: propertyAddress.property_address || '',
        property_city: propertyAddress.property_city || '',
        property_state: propertyAddress.property_state || '',
        property_location: propertyAddress.property_location || '',
        property_country: propertyAddress.property_country || '',
        property_pincode: propertyAddress.property_pincode || '',
        property_pan: propertyAddress.property_pan || '',
        property_gst: propertyAddress.property_gst || '',
        property_size: propertyAddress.property_size || ''
      });

      this.officeViewForm.disable();
      this.propertyViewForm.disable();
    } catch (error) {
      //console.error("Error loading customer data:", error);
    }
  }

  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            id: this.hotelId
          }
        }
      };
      this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          const data = resp?.result?.data;
          if (Array.isArray(data) && data.length > 0) {
            this.customerdata = data[0];
            //console.log("Customer Data:", this.customerdata);
            resolve();
          } else {
            //console.warn("No valid data returned from API", resp);
            reject(new Error("No valid customer data found"));
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error?.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate(['/login'], { skipLocationChange: false });
          } else if (err.error?.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);
        }
      );
    });
  }

  getServicesById() {
    let checkExistingServiceAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID, //Default user id
      "extras": {
        "find": {
          // Newly added for getting member id for customer type
          // "customer_id": this.hotelId
          "member_id": this.localService.get('MemberId')
        }
      }
    }
    this. serviceDetailService.getAllServices(checkExistingServiceAvailbility).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          this.customerServiceData = resp.result.data[0];
          //console.log('Customer service data', this.customerdata);
          if (this.customerServiceData.length > 0) {
            this.services = this.customerdata.services;
            // Filters services where service_required is false
            this.apiSelectedServices = this.services.filter(
              (service: any) => service.service_required === false
            );
            //console.log('Customer all service', this.services, this.apiSelectedServices);
            // //console.log('Customer service(not required)', this.services)
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        //console.error('getCustomerById error:', err);
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate([`/login`], { skipLocationChange: false });
        } else if (err.error.message) {
          this.alertService.error(err.error.message, this.options);
        } else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }

      }
    );
  }

  goToOfficeDetailsTab() {
    this.localStorageService.set('targetTabIndex', '0');
    this.router.navigate(["/edit-new-hotel", this.hotelId]);
  }

  goToPropertyDetailsTab() {
    this.localStorageService.set('targetTabIndex', '1');
    this.router.navigate(["/edit-new-hotel", this.hotelId]);
  }

  goToServicesDetailsTab() {
    this.localStorageService.set('targetTabIndex', '2');
    this.router.navigate(["/edit-new-hotel", this.hotelId]);
  }
}
