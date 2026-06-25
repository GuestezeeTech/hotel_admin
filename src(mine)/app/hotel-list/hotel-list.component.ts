import { Component, OnInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { MenuBarComponent } from '../shared/menu-bar/menu-bar.component';
import { ActivatedRoute, Router } from '@angular/router';
import { LoaderService } from '../shared/loader/loader.service';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { HotelListService } from './hotel-list.service';
import { AlertsService } from '../shared/alerts/alerts.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from 'bootstrap';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../app.config';
import { LocalStorageService } from '../auth-services/local-storage.service';

@Component({
  selector: 'app-hotel-list',
  standalone: true,
  imports: [HeaderComponent, MenuBarComponent, CommonModule, FormsModule, AlertsComponent],
  templateUrl: './hotel-list.component.html',
  styleUrl: './hotel-list.component.scss'
})
export class HotelListComponent implements OnInit {
  @ViewChild('deleteModal') deleteModal!: ElementRef;
  @ViewChild('approvalModal') approvalModal!: ElementRef;
  private modalInstance!: Modal;
  customerList: any[] = [];
  data: any;
  userRoleName: string = "";
  adminUserData: any = {};
  selectedStatus: string = 'approved';
  customerdata: any
  idlistToDelete: any = []
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  alertOptions = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isModalHidden: boolean = true;



  //pagination
  currentPage: number = 1;
  totalPages: number = 1; // Change this as per your data
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authTokenService: AuthTokenService,
    private hotellistservice: HotelListService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private renderer: Renderer2, private el: ElementRef,
    private localStorageService: LocalStorageService
  ) { }
  ngOnInit() {

    this.getUserDetailById();

  }
  addNew() {
    this.router.navigate(["/add-new-hotel"]);


  }
  editCustomer(customerId: number) {
    this.router.navigate(["/edit-new-hotel", customerId]);

  }

  getAllCustomers() {
    this.loaderService.emitLoading();
    // MAKE A SERVICE CALL HERE...
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": {},
        "pagination": true,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 10
        },
        "sorting": true,
        "sortingDetails": {
          "email": -1
        }
      }
    }
    this.hotellistservice.getAllCustomers(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          this.customerList = resp.result.data;
          this.totalPages = resp.result.total_count;
          //console.log(this.customerList, "this.customerList")

        }
      },
      err => {
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
  getCategoryLabel(propertySize: string | undefined): string {
    switch (propertySize) {
      case '01-50 Rooms': return 'Bronze';
      case '51-101 Rooms': return 'Silver';
      case '101-150 Rooms': return 'Gold';
      case '150 and above Rooms': return 'Platinum';
      default: return ''; // Empty string when no match
    }
  }

  getCategoryClass(propertySize: string | undefined): string {
    switch (propertySize) {
      case '01-50 Rooms': return 'bronze';
      case '51-101 Rooms': return 'silver';
      case '101-150 Rooms': return 'gold';
      case '150 and above Rooms': return 'platinum';
      default: return ''; // No class if no match
    }
  }
  onsearch(text: any) {
    let data = text.target.value;

    {




      let searchBody = {
        "domain_name": DOMAIN_NAME,
        "user_id": USER_ID,
        "extras": {
          "find": {
            "search": data
          }
        }
      }



      {
        this.hotellistservice.getCustomerByName(searchBody).subscribe(resp => {
          if (resp.status_code === 200) {
            this.customerList = resp.result.data;
            this.totalPages = resp.result.total_count
          }
          else {
            this.alertService.error('Sorry, No data avilable for this Product', this.alertOptions);
          }
        },
          err => {
            if (err.error.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.options)
              this.router.navigate([`/login`], { skipLocationChange: false });
            }
            else if (err.error.message) {

              this.alertService.error(err.error.message, this.alertOptions)
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          })
      }

    }
  }


  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
  deleteCustomer(id: number) {
    const index = this.idlistToDelete.indexOf(id);
    if (index === -1) {
      // Add ID if not already selected
      this.idlistToDelete.push(id);
      //console.log(this.idlistToDelete, "delete data");
    } else {
      // Remove ID if already selected
      this.idlistToDelete.splice(index, 1);
      //console.log(this.idlistToDelete, "delete data12");
    }



  }

  openModal() {
    //console.log("click");
    this.deleteModal.nativeElement.style.display = 'block';
    //console.log("click12333333");
  }

  closeModal() {
    var modal = document.getElementById("deleteModal"); // Get the element by its ID
    if (modal) { // Check if the element exists
      modal.style.display = 'none'; // Hide the modal
    } else {
      //console.error("Element not found!");
    }
  }

  confirmDelete() {
    //console.log('Item deleted!');

    let requestBody =
    {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "payload": {
        "delete_data": {},
        "variants": []
      },
      "extras":
      {
        "find":
          { "id": this.idlistToDelete }
      }
    }

    this.hotellistservice.deleteCustomer(requestBody).subscribe(resp => {
      if (resp.status_code === 200) {
        // this.customerList = resp.result.data;
        // this.totalPages = resp.result.total_count;
        this.closeModal();
        location.reload();
        // this.router.navigateByUrl("/hotel-list");
      }
      else {
        this.alertService.error('Sorry, No data avilable for this Product', this.alertOptions);
      }
    },
      err => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options)
          this.router.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {

          this.alertService.error(err.error.message, this.alertOptions)
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
        }
      })
    this.closeModal();
  }
  openApprovalModal(data: any) {

    //console.log(data, "data")

    this.isModalHidden = false;

    this.data = data;
    this.selectedStatus = this.data.status
  }
  updateStatus() {
    //console.log(this.data.id, "this.data.id", this.selectedStatus)
    this.getCustomerById(this.data.id)
      .then(() => {
        return this.customerUpdate(this.selectedStatus);  // Once function12 completes, call function1
      })
      .then(() => {
        //console.log("Both functions executed sequentially.");
      })
      .catch((error) => {
        //console.error("Error:", error);
      });

  }







  ngAfterViewInit() {
    // You can safely access the DOM element after the view has been initialized
    if (this.deleteModal) {
      //console.log(this.deleteModal.nativeElement); // Logs the DOM element
    }
  }




  async customerUpdate(status: string) {

    delete this.customerdata._id;



    //console.log(this.customerdata, "this.customerdata")
    this.customerdata.status = status;

    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        customer_update: this.customerdata
      },
      extras: {
        find: {
          id: this.customerdata.id
        }
      }
    }
    //console.log("123")
    this.hotellistservice.updateCustomer(requestBody).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            const closeButton = document.getElementById("closeapproval");
            if (closeButton) {
              closeButton.click();  // Only call click if closeButton is not null
            } else {
              //console.error("Element with id 'closeapproval' not found.");
            }


            this.alertService.success(resp.message, this.options);
            this.getAllCustomers();

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
  getCustomerById(data: any): Promise<void> {

    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            id: Number(this.data.id)
          }
        }
      };

      this.hotellistservice.getCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];



            //console.log(this.customerdata, "RESPDATA");
            //console.log(Array.isArray(this.customerdata));
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


  getUserDetailById() {

    let jsonObj = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": { "id": USER_ID }
      }
    };

    this.hotellistservice.postApiCall(jsonObj, ENDPOINTS.GETBYID_ADMINUSERS).subscribe(resp => {
      //console.log("Fetched Profile Data:", resp);

      if (resp.success === 1 && resp.status_code === 200) {
        this.adminUserData = resp.result.data[0];
        this.userRoleName = this.adminUserData.role_name;
        if (this.userRoleName == "Super Admin") {
          this.getAllCustomers();

        }
        else {
          let requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
              find: {
                created_by: Number(this.localStorageService.get('UserId'))
              }
            }
          };

          this.hotellistservice.getCustomerById(requestBody).subscribe(
            resp => {
              this.loaderService.emitComplete();
              if (resp) {
                this.customerList = resp.result.data;



                //console.log(this.customerdata, "RESPDATA");
                //console.log(Array.isArray(this.customerdata));

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

            }
          );


        }

        // if (!this.adminUserData) {
        //   //console.error("No admin user data returned!");
        //   return;
        // }







      }
      else {
        //console.warn("Failed to fetch updated profile data.");
      }
    })
  }

}



