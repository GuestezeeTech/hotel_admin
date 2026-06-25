import { LoaderService } from './../../shared/loader/loader.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview.service';
import { Router } from '@angular/router';
import { HierarchyDetailService } from './hierarchy-details.service';


@Component({
  selector: 'app-hierarchy-details',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertsComponent],
  templateUrl: './hierarchy-details.component.html',
  styleUrl: './hierarchy-details.component.scss'
})

export class HierarchyDetailsComponent {
  // Newly added
  @Output() continue = new EventEmitter<void>();
  selectedTemplate: string | null = null;
  hotelId: any;
  customerdata: any = {};
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  hierarchyData: any; // hold iniital hierarchy data
  hierarchydatalength: any; // hold iniital hierarchy data length
  checkExistingHierarchyChoosen!: Number; // check if hierarchy is already choosen
  hierarchies: any; //store whole hierarchy data
  hierarchyLevel: any = [];
  selectedHierarchyToCreate: any = null; // Holds the chosen hierarchy
  isHierarchyExists: boolean = false; // Flag to check if hierarchy exists
  isSelectedHierarchyId: any; // Holds the selected hierarchy id
  setActiveId: any = 0;
  shouldRenderComponent = true;
  // Newly added for payment done
  @Input() paymentDone!: boolean;
  customerStatus: any;

  constructor(
    private localService: LocalStorageService,
    private alertService: AlertsService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private router: Router,
    private hierarchyService: HierarchyDetailService
  ) { }

  async ngOnInit(): Promise<void> {
    this.hotelId = Number(this.localService.get('UserId'));
    // console.log("id:", this.hotelId)
    if (this.hotelId !== 0) {
      try {
        // console.log('Hotel id:', this.hotelId)
        await this.getCustomerById();
        this.getAllHierarchy();
      } catch (err) {
        ////console.error('Failed to get customer by ID:', err);
      }
    }
  }
  get disableButtonFn() {
    return (hierarchy: any) => hierarchy?.hasOwnProperty('customer_id');
  }

  getCustomerById(): Promise<void> {
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
            // console.log(this.customerdata.customer_member_id, "Member id");
            // Sets the radio button value based on `hierarchy_details`
            if (this.customerdata?.hierarchy_details) {
              this.selectedTemplate = this.customerdata.hierarchy_details;
            }
            ////console.log(this.customerdata, "RESPDATA");
            ////console.log(Array.isArray(this.customerdata));
            // Newly added for disabling form on payment done to approving the customer
            this.customerStatus = this.customerdata.status;
            // console.log('Customer status:', this.customerStatus);
            resolve();
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

  // async customerUpdate() {
  //   delete this.customerdata._id;
  //   ////console.log(this.customerdata._id, this.customerdata, "test check ");
  //   // Adding hierarchy_details 
  //   let hierarchyDetails: string | null = this.selectedTemplate;
  //   // Assign hierarchy details to customer data
  //   this.customerdata["hierarchy_details"] = hierarchyDetails;
  //   // Reset Password value
  //   this.customerdata["password"] = this.localService.get('Password');

  //   ////console.log(hierarchyDetails);
  //   ////console.log(this.customerdata, " this.customerdata");

  //   // Preparing the request body
  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: {
  //       customer_update: this.customerdata
  //     },
  //     extras: {
  //       find: {
  //         id: this.hotelId
  //       }
  //     }
  //   };

  //   ////console.log("123");

  //   // Making the API call
  //   this.hotelenrollmenttabviewService.updateCustomer(requestBody).subscribe(
  //     resp => {
  //       this.loaderService.emitComplete();
  //       if (resp) {
  //         if (resp.success === 1 && resp.status_code === 200) {
  //           this.hotelenrollmenttabviewService.clearAdminFormEvent();
  //           ////console.log("alerttttt");
  //           this.alertService.success(resp.message, this.options);
  //           this.onContinue();
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

  getAllHierarchy() {
    let checkExistingHierarchyAvailbility = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID, //Default user id
      "extras": {
        "find": {
          "customer_id": this.hotelId
        }
      }
    }
    this.hierarchyService.getAllHierarchy(checkExistingHierarchyAvailbility).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp) {
          this.hierarchyData = resp.result.data[0];
          ////console.log('Customer hierarchy data', this.hierarchyData);
          this.hierarchydatalength = resp.result.data.length;
          ////console.log('checkExistingHierarchyAvailbility', this.hierarchydatalength);
          this.checkExistingHierarchyChoosen = this.hierarchyData;
          if (this.hierarchydatalength == 0) {
            let requestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              "extras": {
                "find": {}
              }
            }
            this.hierarchyService.getAllHierarchy(requestBody).subscribe(
              (resp: any) => {
                this.loaderService.emitComplete();
                if (resp.success === 1 && resp.status_code === 200) {
                  this.isHierarchyExists = false;
                  // console.log('Hierarchy Exists:', this.isHierarchyExists);
                  ////console.log('All Hierarchies:', resp.result.data);
                  ////console.log('All Hierarchies Length:', resp.result.data.length);
                  ////console.log('Selected Hierarchy id:', this.isSelectedHierarchyId);
                  if (resp.result.data.length > 0) {
                    // console.log(resp.result.data, 'All Hierarchy Data');
                    this.hierarchies = resp.result.data.filter((hierarchy: any) => hierarchy.customer_id === undefined);
                    // console.log(this.hierarchies, 'Common Hierarchy Data');
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
            this.isHierarchyExists = true;
            // console.log('Hierarchy Exists:', this.isHierarchyExists);
            let requestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              "extras": {
                "find": {}
              }
            }
            this.hierarchyService.getAllHierarchy(requestBody).subscribe(
              (resp: any) => {
                this.loaderService.emitComplete();
                if (resp.success === 1 && resp.status_code === 200) {
                  if (resp.result.data.length > 0) {
                    //console.log(this.hierarchyData.name, "this.hierarchyData.name")
                    this.hierarchies = resp.result.data.filter((hierarchy: any) => (hierarchy.customer_id == undefined && hierarchy.name != this.hierarchyData.name) || (hierarchy.customer_id == this.hotelId));
                    ////console.log(this.hierarchies, 'Common customer Hierarchy Data');
                    this.isSelectedHierarchyId = this.hierarchyData.id;
                    ////console.log('Selected Hierarchy:', this.isSelectedHierarchyId);
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
            // this.hierarchies =  resp.result.data.filter((hierarchy: any) => hierarchy.customer_id === undefined);   
            // Filters services where service_required is false
            // this.apiSelectedServices = this.services.filter(
            //   (service: any) => service.service_required === false
            // );
            // ////console.log('Customer all service', this.services, this.apiSelectedServices);
            // ////console.log('Customer service(not required)', this.services)
          }
        }
      },
      (err: any) => {
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

  // chooseHierarchy(hierarchy: any) {
  //   this.selectedHierarchyToCreate = hierarchy;
  //   //console.log('Selected hierarchy to be created:', this.selectedHierarchyToCreate);
  //   this.setActiveId = hierarchy.id;
  // }

  // Newly added for hierarchy selection
  chooseHierarchy(hierarchy: any) {
    if (this.setActiveId === hierarchy.id) {
      // Unselects if the same item is clicked again
      this.setActiveId = null;
      this.selectedHierarchyToCreate = null;
      //console.log('Hierarchy unselected');
    } else {
      // Select the hierarchy
      this.setActiveId = hierarchy.id;
      this.selectedHierarchyToCreate = hierarchy;
      //console.log('Selected hierarchy to be created:', this.selectedHierarchyToCreate);
    }
  }


  save() {
    if (this.isHierarchyExists) {
      this.updateHierarchy(this.selectedHierarchyToCreate);
    }
    else {
      if (this.selectedHierarchyToCreate) {
        ////console.log('Creating hierarchy with:', this.selectedHierarchyToCreate);
        this.hierarchyCreate(this.selectedHierarchyToCreate);
      } else {
        this.alertService.warn('Please choose a hierarchy before proceeding.', this.options);
      }
    }
    //  window.location.reload();
  }

  async hierarchyCreate(selectedHierarchyToCreate: any): Promise<void> {
    const memberId = this.localService.get('MemberId');
    delete this.selectedHierarchyToCreate._id
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          create_Hierarchy: {
            customer_id: this.hotelId,
            hierarchy: selectedHierarchyToCreate.hierarchy,
            name: selectedHierarchyToCreate.name,
            member_id: memberId
          }
        }
      };
      //Call API
      this.hierarchyService.addCustomerHierarchy(requestBody).subscribe(
        (resp: any) => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              // this.customerdata = resp.result.data;
              this.isSelectedHierarchyId = selectedHierarchyToCreate.id;
              ////console.log('Selected hierarchy id', this.isSelectedHierarchyId);
              ////console.log(this.customerdata, "cst");
              this.isHierarchyExists = true;
              const currentUrl = this.router.url;
              this.getAllHierarchy();
              this.updateCustomer();
              // this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              //   this.router.navigate([currentUrl]);
              // });
              this.continue.emit();
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
  async updateHierarchy(selectedHierarchyToCreate: any): Promise<void> {

    if (selectedHierarchyToCreate == null || selectedHierarchyToCreate == undefined) {
      this.continue.emit();

    }
    else {
      delete this.selectedHierarchyToCreate._id
      return new Promise((resolve, reject) => {
        let requestBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,

          payload: {
            update_Hierarchy: {
              customer_id: this.hotelId,
              hierarchy: selectedHierarchyToCreate.hierarchy,
              name: selectedHierarchyToCreate.name
            }

          },
          extras: {
            find: {
              "customer_id": this.hotelId
            }
          }
        };
        //Call API
        this.hierarchyService.updateCustomerHierarchy(requestBody).subscribe(
          (resp: any) => {
            this.loaderService.emitComplete();
            if (resp) {
              if (resp.success === 1 && resp.status_code === 200) {
                //  this.customerdata = resp.result.data;
                this.isSelectedHierarchyId = selectedHierarchyToCreate.id;
                ////console.log('Selected hierarchy id', this.isSelectedHierarchyId);
                ////console.log(this.customerdata, "cst");
                this.isHierarchyExists = true;
                this.updateCustomer();
                this.getAllHierarchy();

                this.continue.emit();
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

  }

  onViewHierarchy(id: string, customer_id: string | undefined) {
    if (customer_id === undefined) {
      this.router.navigate(['/view-hierarchy', id]);
    } else if (customer_id === this.hotelId) {
      this.router.navigate(['/view-customer-hierarchy', id]);
    }
  }
  back() {
    var back = document.getElementById('Services');
    if (back) {
      back.click();
      window.scroll(0, 0);

    }
  }


  updateCustomer() {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        "customer_update": {
          "is_hierarchy_exists": true

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
            // ////console.log(resp);
            this.hotelenrollmenttabviewService.clearAdminFormEvent();
            ////console.log(resp.message, "resp.message")
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
