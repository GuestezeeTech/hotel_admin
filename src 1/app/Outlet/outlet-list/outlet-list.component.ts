import { Component, OnInit } from '@angular/core';
import { OutletCreationService } from '../outlet-creation.service';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { ENDPOINTS } from '../../app.config';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { FormsModule } from '@angular/forms';
import { PermissionService, ModulePermission } from '../../services/permission.service';

@Component({
  selector: 'app-outlet-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outlet-list.component.html',
  styleUrl: './outlet-list.component.scss'
})

export class OutletListComponent implements OnInit {
  outletdata: any = [];
  allOutletData: any = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  member_id: any;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalOutlets: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  // Newly added for loader
  isLoading: boolean = false;

  constructor(private outletCreationService: OutletCreationService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private router: Router,
    private localService: LocalStorageService,
    private permissionService: PermissionService
  ) { }

  ngOnInit(): void {
    this.member_id = this.localService.get('MemberId');
    // console.log('Member id:', this.member_id);
    if (this.member_id) {
      this.outletGetAll();
    }
  }

  get canReadRestaurants(): boolean {
    const permission = this.permissionService.getModulePermission('RESTAURANTS');
    return permission?.has_read_permission ?? false;
  }

  get canAddRestaurants(): boolean {
    const permission = this.permissionService.getModulePermission('RESTAURANTS');
    return permission?.has_add_permission ?? false;
  }

  get canEditRestaurants(): boolean {
    const permission = this.permissionService.getModulePermission('RESTAURANTS');
    return permission?.has_edit_permission ?? false;
  }

  outletGetAll() {
    this.isLoading = true;
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": 16,
      "extras": {
        "find": {
          "member_id": this.member_id
        },
      }
    }
    this.outletCreationService.postApiCall(requestBody, ENDPOINTS.GET_ALL_OUTLETS).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            this.outletdata = resp.result.data;
            // console.log('Outlets:', this.outletdata);
            this.totalOutlets = this.outletdata.length;
            // total pages calculated
            this.totalPages = Math.ceil(this.totalOutlets / this.pageSize);
            // load first page outlets
            this.updatePaginatedOutlets();
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
        this.isLoading = false;
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
        this.isLoading = false;
      }
    )
  }

  updatePaginatedOutlets() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allOutletData = this.outletdata.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedOutlets();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedOutlets();
    }
  }

  navigateToOutlet() {
    this.router.navigate(['/create-outlet']);
  }

  navigateById(id: number) {
    this.router.navigate(['/view-outlet', id]);
  }

  viewOutlet(id: number) {
    this.router.navigate(['/view-outlet', id], { state: { mode: 'view' } });
  }

  viewProducts(outlet_id: number) {
    // console.log('Outlet id:', outlet_id);
    this.router.navigate(['/product-list', outlet_id]);
  }


}
