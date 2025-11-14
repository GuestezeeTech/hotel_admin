import { Component, OnInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ServiceSettingsModule } from './service-settings.module';
import { Router, ActivatedRoute } from '@angular/router';
import { ServiceSettingsService } from './service-settings.service';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { AlertsService } from '../shared/alerts/alerts.service';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-service-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-settings.component.html',
  styleUrl: './service-settings.component.scss'
})
export class ServiceSettingsComponent implements OnInit {
  @ViewChild('deleteModal') deleteModal!: ElementRef;
  serviceList: any;
  idlistToDelete: any = [];
  service_type = "FO"
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  alertOptions = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isModalHidden: boolean = true;

  constructor(
    private router: Router,
    private servicesetting: ServiceSettingsService,
    private authTokenService: AuthTokenService,
    private alertService: AlertsService
  ) { }

  ngOnInit(): void {
    this.getAllService()
  }

  navigateTNewService() {
    this.router.navigate([`/add-new-service`], { skipLocationChange: false });
  }

  // getAllService() {
  //   let requestBody = {
  //     domain_name: this.authTokenService.getDomain(),
  //     user_id: this.authTokenService.getUserId(),
  //     "extras": {
  //       "find": {},
  //     }
  //   }
  //   this.servicesetting.getAllService(requestBody).subscribe(
  //     resp => {
  //       if (resp) {
  //         this.serviceList = resp.result.data.filter((item: any) => (item.customer_id == undefined && item.department == this.service_type));
  //       }
  //     },
  //     err => {
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
  getIdToDeleteService(id: number) {
    const index = this.idlistToDelete.indexOf(id);
    if (index === -1) {
      // Add ID if not already selected
      this.idlistToDelete.push(id);
      //console.log(this.idlistToDelete,"delete data");
    } else {
      // Remove ID if already selected
      this.idlistToDelete.splice(index, 1);
      //console.log(this.idlistToDelete,"delete data12");
    }
  }

  confirmDelete() {
    let requestBody =
    {
      "domain_name": this.authTokenService.getDomain(),
      "user_id": this.authTokenService.getUserId(),
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

    this.servicesetting.deleteService(requestBody).subscribe(resp => {
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

  // filterBasedOnService(serviceType: any) {
  //   const filteredServices = this.serviceList.filter(
  //     (service: any) => service.department && service.department.toLowerCase().includes(serviceType.toLowerCase())
  //   );
  // }

  assignService(data: any) {
    this.service_type = data;
    this.getAllService()
  }

  getAllService() {
    console.log("Service Type Selected:", this.service_type);
    let requestBody = {
      domain_name: this.authTokenService.getDomain(),
      user_id: this.authTokenService.getUserId(),
      extras: { find: {} }
    };
    this.servicesetting.getAllService(requestBody).subscribe(
      (resp: any) => {
        if (resp) {
          const allServices = resp.result.data;
          // Convert service_type array to lowercase for safe comparison
          const lowerTypes = (Array.isArray(this.service_type)
            ? this.service_type
            : [this.service_type]
          ).map(t => t.toLowerCase());
          // CASE: User selected Checkout OR Late Checkout
          if (lowerTypes.includes('checkout') || lowerTypes.includes('late checkout')) {
            this.serviceList = allServices.filter((item: any) =>
              item.customer_id === undefined &&
              item.department === 'FO' &&
              (
                item.belongs_to?.toLowerCase() === 'checkout' ||
                item.belongs_to?.toLowerCase() === 'late checkout'
              )
            );
          } else {
            // Normal department filtering
            this.serviceList = allServices.filter((item: any) =>
              item.customer_id === undefined &&
              lowerTypes.includes(item.department?.toLowerCase())
            );
          }
          console.log("Filtered services", this.serviceList);
        }
      },
      (err) => {
        if (err.error.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.options);
          this.router.navigate(['/login'], { skipLocationChange: false });
        } else if (err.error.message) {
          this.alertService.error(err.error.message, this.options);
        } else {
          this.alertService.error('Something bad happened. Please try again!', this.options);
        }
      }
    );
  }

  editService(id: any) {
    this.router.navigate(["/edit-service", id], { state: { mode: 'edit' } });
  }

  viewService(id: any) {
    this.router.navigate(["/view-service", id], { state: { mode: 'view' } });
  }

}
