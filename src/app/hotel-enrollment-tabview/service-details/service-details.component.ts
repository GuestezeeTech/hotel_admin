import { USER_ID } from './../../app.config';
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { DOMAIN_NAME } from '../../app.config';
import { ServiceDetailService } from './service-details.service';

@Component({
  selector: 'app-service-details',
  standalone: true,
  imports: [CommonModule, AlertsComponent],
  templateUrl: './service-details.component.html',
  styleUrl: './service-details.component.scss'
})

export class ServiceDetailsComponent implements OnInit {
  selectedServices: any[] = [];
  apiSelectedServices: any[] = []; // Stores API-selected services
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  customerdata: any = {};
  customerdatalength: any = {};
  hotelId: Number | null = null;
  activeTab: Number = 1;
  hotelName: any;
  allServices: any[] = [];
  requiredServices: any[] = [];
  checkExistingServiceChoosen!: Number;
  services: any;
  allAvailableServices: any[] = [];
  isServiceExist: boolean = false;
  // Newly added
  @Output() continue = new EventEmitter<void>();
  // Newly added for payment done
  @Input() paymentDone!: boolean;
  member_id: any;

  constructor(
    private authTokenService: AuthTokenService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private localService: LocalStorageService,
    private activatedRoute: ActivatedRoute,
    private serviceDetailService: ServiceDetailService
  ) { }

  async ngOnInit(): Promise<void> {
    this.hotelId = Number(this.localService.get('UserId'));
    ////console.log('Hotel ID:', this.hotelId);
    this.getCustomerById();
    this.getAllServices();
  }

  getCustomerById(): Promise<void> {
    this.selectedServices = [];
    return new Promise((resolve, reject) => {
      let requestBody = {
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
          if (resp) {
            this.customerdata = resp.result.data[0];
            console.log(this.customerdata.customer_member_id, "Member id");
            this.member_id = this.customerdata.customer_member_id;
            this.hotelName = this.customerdata.property_details.contact_details.hotel_name;
            resolve();  // Resolve promise when data is set
          }
        },
        err => {
          this.loaderService.emitComplete();
          ////console.error('getCustomerById error:', err);
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

  isSelected(serviceId: number): boolean {
    // ////console.log(this.selectedServices.some(s => s.id === serviceId) ||  this.apiSelectedServices.some(s => s.id === serviceId))
    return this.apiSelectedServices.some(s => s.id === serviceId);
  }

  isApiSelectedServiceType1(serviceName: string) {
    ////console.log(serviceName, this.apiSelectedServices.some(s => s.service_type === serviceName), "check")
    return (this.apiSelectedServices.some(s => s.service_type === serviceName));
    // ////console.log(this.selectedServices.some(s => s.id === serviceId) ||  this.apiSelectedServices.some(s => s.id === serviceId))
    // return    this.selectedServices.some(s => s.id === serviceId);
  }

  isApiSelectedServiceType2(serviceName: string) {
    ////console.log(serviceName, this.apiSelectedServices.some(s => s.service_type === serviceName, ////console.log(serviceName)), "check")
    return (this.apiSelectedServices.some(s => s.service_type === serviceName));
    // ////console.log(this.selectedServices.some(s => s.id === serviceId) ||  this.apiSelectedServices.some(s => s.id === serviceId))
    // return    this.selectedServices.some(s => s.id === serviceId);
  }

  isApiSelectedServiceType3(serviceName: string) {
    ////console.log(serviceName, this.apiSelectedServices.some(s => s.service_type === serviceName), "check")
    return (this.apiSelectedServices.some(s => s.service_type === serviceName));
    // ////console.log(this.selectedServices.some(s => s.id === serviceId) ||  this.apiSelectedServices.some(s => s.id === serviceId))
    // return    this.selectedServices.some(s => s.id === serviceId);
  }

  isServiceActive(service: any): boolean {
    return service.service_type === "General Services";
  }

  isServiceTypeIIActive(service: any): boolean {
    return service.service_type === "In-Room Amenities";
  }
  isServiceTypeIIIActive(service: any): boolean {
    return service.service_type === "Other Services";
  }

  async GetSelectedService(serviceName: string) {
    const selectedService = this.services.find((service: any) => service.name === serviceName);
    //console.log(selectedService, "selectedService")
    if (!selectedService) return;
    const index = this.selectedServices.findIndex(s => s.id == selectedService.id);
    const index1 = this.apiSelectedServices.findIndex(s => s.id == selectedService.id);
    if (index > -1) {
      // Already selected – remove it (unselect)
      this.selectedServices.splice(index, 1);
    }
    else {
      // Not selected – add it
      this.selectedServices.push(selectedService);
    }
    if (index1 > -1) {
      this.apiSelectedServices.splice(index1, 1);
    }
    else {
      this.apiSelectedServices.push(selectedService);
    }
    // this.apiSelectedServices = this.selectedServices;
    //console.log('Api', this.apiSelectedServices); // Debugging
  }

  tabCount() {
    this.activeTab = 2;
  }

  thirdTabCount() {
    this.activeTab = 3;
  }

  firstTabCount() {
    this.activeTab = 1;

  }

  handleSubmit() {
    // this.customerUpdate();
    let checkExistingServiceAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID, //Default user id
      "extras": {
        "find": {
          "customer_id": this.hotelId
        }
      }
    }
    this.serviceDetailService.getAllServices(checkExistingServiceAvailbility).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          this.customerdatalength = resp.result.data.length;
          this.customerdata = resp.result.data[0];
          this.checkExistingServiceChoosen = this.customerdata;
          if (this.customerdatalength == 0) {
            this.serviceCreate();
            // this.getCustomerById(); For storing hotel name am calling this           
          }
          else {
            this.serviceUpdate();
          }
        }
      }
    );
  }

  nextTabService() {
    ////console.log('Exist:', this.isServiceExist);
    if (this.isServiceExist == true) {
      this.serviceUpdate();
    }
    else {
      this.serviceCreate();
    }
  }

  getAllServices(departmentName?: string) {
    let checkExistingServiceAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID, //Default user id
      "extras": {
        "find": {
          "customer_id": this.hotelId
        }
      }
    }
    this.serviceDetailService.getAllServices(checkExistingServiceAvailbility).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          this.customerdata = resp.result.data[0];
          //console.log
          ////console.log('Customer service data', this.customerdata);
          this.customerdatalength = resp.result.data.length;
          ////console.log('checkExistingServiceAvailbility', this.customerdatalength);
          this.checkExistingServiceChoosen = this.customerdata;
          if (this.customerdatalength == 0) {
            this.isServiceExist = false;
            let requestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              "extras": {
                "find": {}
              }
            }
            this.serviceDetailService.getAllServices(requestBody).subscribe(
              (resp: any) => {
                this.loaderService.emitComplete();
                if (resp.success === 1 && resp.status_code === 200) {
                  ////console.log('All Services:', resp.result.data);
                  if (resp.result.data.length > 0) {
                    this.services = resp.result.data.filter((service: any) => service.customer_id === undefined);
                    ////console.log(this.services, 'Common Services');
                  }
                }
              },
              (err: any) => {
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
            this.isServiceExist = true;
            this.services = this.customerdata.services;
            // Filters services where service_required is false;
            this.apiSelectedServices = this.services.filter(
              (service: any) => service.service_required === false
            );
            //console.log(this.apiSelectedServices, " this.apiSelectedServices");
            ////console.log('Customer all service', this.services, this.apiSelectedServices);
            // ////console.log('Customer service(not required)', this.services)
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        ////console.error('getCustomerById error:', err);
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

  getAllServices1(departmentName?: string) {
    let checkExistingServiceAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID, //Default user id
      "extras": {
        "find": {
          "customer_id": this.hotelId
        }
      }
    }
    this.serviceDetailService.getAllServices(checkExistingServiceAvailbility).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          this.customerdata = resp.result.data[0];
          //console.log
          ////console.log('Customer service data', this.customerdata);
          this.customerdatalength = resp.result.data.length;
          ////console.log('checkExistingServiceAvailbility', this.customerdatalength);
          this.checkExistingServiceChoosen = this.customerdata;
          if (this.customerdatalength == 0) {
            this.isServiceExist = false;
            let requestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              "extras": {
                "find": {}
              }
            }
            this.serviceDetailService.getAllServices(requestBody).subscribe(
              (resp: any) => {
                this.loaderService.emitComplete();
                if (resp.success === 1 && resp.status_code === 200) {
                  ////console.log('All Services:', resp.result.data);
                  if (resp.result.data.length > 0) {
                    this.services = resp.result.data.filter((service: any) => service.customer_id === undefined);
                    ////console.log(this.services, 'Common Services');
                  }
                }
              },
              (err: any) => {
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
            this.isServiceExist = true;
            this.services = this.customerdata.services;
            // Filters services where service_required is false
            // this.apiSelectedServices = this.services.filter(
            //   (service: any) => service.service_required === false
            // );
            this.continueService();
            // this.getAllServices();
            ////console.log('Customer all service', this.services, this.apiSelectedServices);
            // ////console.log('Customer service(not required)', this.services)
          }
        }
      },
      err => {
        this.loaderService.emitComplete();
        ////console.error('getCustomerById error:', err);
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

  getServicesByType(department: string) {
    ////console.log('Department:', department);
    ////console.log('All Services:', this.services);
    if (department == '') {
      // Return all services that are NOT "Others" or "House Keeping"
      ////console.log('General Services:', this.services);
      if (!this.services || this.services.length === 0) {
        return [];
      }
      return this.services.filter(
        (service: any) => service.department !== 'Others' && service.department !== 'House Keeping'
      );
    }
    else {
      // Returns only services that matches the given department
      ////console.log('Department Services:', this.services);
      if (!this.services || this.services.length === 0) {
        return [];
      }
      return this.services.filter((service: any) => service.department === department);
    }
  }

  async serviceCreate(): Promise<void> {
    const memberId = this.localService.get('MemberId');
    return new Promise((resolve, reject) => {
      const selectedIds = new Set(this.selectedServices.map(s => s.id));  // Efficient lookup
      const service_details1 = this.services.map((service: any) => {
        const isExempted = selectedIds.has(service.id);
        return {
          ...service,
          service_required: !isExempted  // false if selected, true otherwise
        };
      });
      ////console.log("service_details", service_details1);
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          create_Service: {
            customer_id: this.hotelId,
            services: service_details1,
            member_id: memberId
          }
        }
      };
      //Call API
      this.serviceDetailService.addCustomerService(requestBody).subscribe(
        (resp: any) => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.customerdata = resp.result.data[0];
              this.updateCustomer();
              ////console.log(this.customerdata, "cst");
              this.isServiceExist = true;
              if (this.activeTab == 1) {
                ////console.log(this.activeTab, 'this.activeTab1')
                var tab = document.getElementById("inroom-tab")
                if (tab != undefined) {
                  tab.click();
                }
              }
              // Newly added for auto next tab
              if (this.activeTab == 3) {
                this.continue.emit();
              }
              resolve();
            } else if (resp.success === 0 && resp.message) {
              this.alertService.error(resp.message, this.options);
              reject(resp.message);
            } else if (resp.message && resp.status_code !== 200) {
              this.alertService.error(resp.message, this.options);
              reject(resp.message);
            } else {
              this.alertService.error('Something bad happened. Please try again!', this.options);
              reject('Unknown error');
            }
          }
        },
        (err: any) => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate(['/login'], { skipLocationChange: false });
          } else if (err.error.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);
        }
      );
    });
  }

  async serviceUpdate() {
    await this.getAllServices1();
    // await this.continueService();
  }

  async continueService() {
    let old_service_details = [];
    //console.log(this.customerdata.services, "this.customerdata.services")
    let service_details = this.customerdata.services;
    for (let i = 0; i < service_details.length; i++) {
      if (service_details[i].service_required === false) {
        old_service_details.push(service_details[i]);
      }
    }
    //console.log(old_service_details, "old_service_details");
    delete this.customerdata._id;
    const selectedIds = new Set(this.apiSelectedServices.map(s => s.id));  // Efficient lookup
    ////console.log(selectedIds, " ////console.log(selectedIds)")
    const updatedServices = this.services.map((service: any) => {
      const isExempted = selectedIds.has(service.id);
      return {
        ...service,
        service_required: !isExempted  // false if selected, true otherwise
      };
    });
    //console.log(updatedServices, "updatedServices")
    // for(){
    // for (let oldService of old_service_details) {
    //   const matchIndex = updatedServices.findIndex((service: any) => service.id === oldService.id);
    //   if (matchIndex !== -1) {
    //     // Remove the matching updated service
    //     updatedServices.splice(matchIndex, 1);
    //     // Push the old service instead
    //     updatedServices.push(oldService);
    //   }
    // }
    //console.log(updatedServices, "updatedServices")
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_Service: {
          ...this.customerdata,
          services: updatedServices
        }
      },
      extras: {
        find: {
          "customer_id": this.hotelId
        }
      }
    };
    this.serviceDetailService.updateService(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          this.updateCustomer();
          this.alertService.success(resp.message, this.options);
          if (this.activeTab == 1) {
            ////console.log(this.activeTab, 'this.activeTab1')
            var tab = document.getElementById("inroom-tab")
            if (tab != undefined) {
              tab.click();
            }
          }
          else if (this.activeTab == 2) {
            ////console.log(this.activeTab, 'this.activeTab2')
            var tab = document.getElementById("other-tab")
            if (tab != undefined) {
              tab.click();
            }
          }
          else if (this.activeTab == 3) {
            this.continue.emit();
          }
          ////console.log('Api sleected services', this.apiSelectedServices);
        } else {
          const message = resp?.message || 'Something bad happened. Please try again!';
          this.alertService.error(message, this.options);
        }
      },
      err => {
        this.loaderService.emitComplete();
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertService.error(errorMsg, this.options);
        if (err?.error?.statusCode === 403) {
          this.router.navigate(['/login'], { skipLocationChange: false });
        }
      }
    );
  }

  // async serviceUpdate() {
  //   delete this.customerdata._id;
  //   ////console.log(this.customerdata._id, this.customerdata, "test check ");

  //   //request body
  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: {
  //       create_Service: this.customerdata
  //     },
  //     extras: {
  //       find: {
  //         id: this.hotelId
  //       }
  //     }
  //   };

  //   ////console.log("123");

  //   // Making the API call
  //   this.serviceDetailService.updateService(requestBody).subscribe(
  //     resp => {
  //       this.loaderService.emitComplete();
  //       if (resp) {
  //         if (resp.success === 1 && resp.status_code === 200) {

  //           this.alertService.success(resp.message, this.options);     
  //         }
  //         else if (resp.success === 0) {
  //           if (resp.message) {
  //             this.alertService.error(resp.message, this.options);
  //           }
  //         }
  //         else if (resp.message && resp.status_code !== 200) {
  //           this.alertService.error(resp.message, this.options);
  //         }
  //         else {
  //           this.alertService.error('Something bad happened. Please try again!', this.options);
  //         }
  //       }
  //     },
  //     err => {
  //       this.loaderService.emitComplete();
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.options);
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       }
  //       else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.options);
  //       }
  //       else {
  //         this.alertService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   );
  // }


  // getAllServices(departmentName?: string) {
  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID, //Default user id
  //     "extras": {
  //       "find": {
  //         "department": departmentName
  //       }
  //     }
  //   }
  //   this.serviceDetailService.getAllServices(requestBody).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp.success === 1 && resp.status_code === 200) {
  //         if (resp.result.data.length > 0) {
  //           this.services1 = resp.result.data;
  //           ////console.log(this.services, 'All Services')
  //         }
  //       }
  //     },
  //     (err: any) => {
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.options)
  //         this.router.navigate([`/login`], { skipLocationChange: false });
  //       }
  //       else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.options)
  //       }
  //       else {
  //         this.alertService.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   )
  // }

  back() {
    switch (this.activeTab) {
      case 3:
        var tab = document.getElementById("inroom-tab")
        if (tab != undefined) {
          tab.click();
          window.scroll(0, 0);
        }
        break;
      case 2:
        var back = document.getElementById('general-tab');
        if (back) {
          back.click();
          window.scroll(0, 0);
        }
        break;
      case 1:
        var back = document.getElementById('Property Details');
        if (back) {
          back.click();
          window.scroll(0, 0);
        }

    }
  }

  updateCustomer() {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        "customer_update": {
          "is_service_exists": true
        }
      },
      extras: {
        find: {
          id: this.hotelId
        }
      }
    }
    this.hotelenrollmenttabviewService.updateCustomer(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // //console.log(resp);
            this.hotelenrollmenttabviewService.clearAdminFormEvent();
            //console.log(resp.message, "resp.message")
            this.alertService.success(resp.message, this.options);
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
