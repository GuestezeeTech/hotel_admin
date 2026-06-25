import { LoaderService } from './../../shared/loader/loader.service';
import { HotelEnrollmentTabviewService } from './../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { CommonModule } from '@angular/common';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, OnInit } from '@angular/core';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { Router } from '@angular/router';
import { StaffListingService } from './staff-listing.service';
import { ReactiveFormsModule } from '@angular/forms';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { FirestoreListenerService } from '../../firestore-listener.service';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../staff/staff.service';
import { PermissionService, ModulePermission } from '../../services/permission.service';

@Component({
  selector: 'app-staff-listing',
  standalone: true,
  imports: [AlertsComponent, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './staff-listing.component.html',
  styleUrl: './staff-listing.component.scss'
})
export class StaffListingComponent implements OnInit {
  selectedStaffIds: number[] = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isDeleteModalOpen: boolean = false;
  isDeleteStaffModalOpen: boolean = false;
  staves: any = [];
  allStaves: any = [];
  isApiModal: boolean = false;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalStaves: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  hotelId: any;
  memberId: any;

  constructor(
    private alertService: AlertsService,
    private routeUrl: Router,
    private staffListingService: StaffListingService,
    private localStorageService: LocalStorageService,
    private firestoreListenerService: FirestoreListenerService,
    private staffService: StaffService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private permissionService: PermissionService
  ) { }

  ngOnInit() {
    this.firestoreListenerService.listenToHitServiceChange();
    this.firestoreListenerService.hitServiceChanged$.subscribe((changed) => {
      if (changed) {
        this.isApiModal = true;
        // alert("HitService has been updated to true for authority ID 1!");
        this.firestoreListenerService.resetHitServiceChangeFlag();
      }
    });
    this.hotelId = Number(this.localStorageService.get('UserId'));
    // console.log('Hotel Id:', this.hotelId);
    // First get customer → then fetch staves
    this.getCustomerById()
      .then(() => {
        // Now that memberId is set, call staves API
        this.getAllStaves();
      })
      .catch(err => {
        console.error("Error in getting customer by ID:", err);
      });

  }

  // Permission helpers for USER ACCESS
  get canReadUserAccess(): boolean {
    const permission = this.permissionService.getModulePermission('USER ACCESS');
    return permission?.has_read_permission ?? false;
  }

  get canAddUserAccess(): boolean {
    const permission = this.permissionService.getModulePermission('USER ACCESS');
    return permission?.has_add_permission ?? false;
  }

  get canEditUserAccess(): boolean {
    const permission = this.permissionService.getModulePermission('USER ACCESS');
    return permission?.has_edit_permission ?? false;
  }

  get canDeleteUserAccess(): boolean {
    const permission = this.permissionService.getModulePermission('USER ACCESS');
    return permission?.has_delete_permission ?? false;
  }

  getCustomerById(): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            "customer_member_id": this.localStorageService.get('MemberId')
            // "id": this.hotelId
          }
        }
      };
      this.loaderService.emitLoading();
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        resp => {
          if (resp) {
            const customerdata = resp.result.data[0];
            // console.log('Customer Data:', customerdata);
            this.memberId = customerdata.customer_member_id;
            // console.log('Member Id:', this.memberId);
            resolve();
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.routeUrl.navigate([`/login`], { skipLocationChange: false });
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

  getAllStaves() {
    //console.log('Member id:', this.localStorageService.get('MemberId'));
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "member_id": this.localStorageService.get('MemberId')
        },
        "pagination": true,
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    }
    this.loaderService.emitLoading();
    this.staffListingService.getAllStaves(requestBody).subscribe({
      next: (response) => {
        this.loaderService.emitComplete();
        if (response?.success) {
          this.staves = response.result.data;
          this.allStaves = response.result.data; //For pagination
          // console.log('All staves:', this.staves);
          this.totalStaves = this.staves.length;
          //console.log('Total Staves:', this.totalStaves);
          this.totalPages = Math.ceil(this.totalStaves / this.pageSize);
          //console.log('Total Pages:', this.totalPages);
          this.updatePaginatedStaves();
        } else {
          //console.error('No staves found:', response?.message);
        }
      },
      error: (err) => {
        this.loaderService.emitComplete();
        //console.error('API Error:', err);
      }
    });
  }

  updatePaginatedStaves() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allStaves = this.staves.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedStaves();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedStaves();
    }
  }

  toggleSelection(event: any, staffId: number) {
    if (event.target.checked) {
      this.selectedStaffIds.push(staffId);
    } else {
      this.selectedStaffIds = this.selectedStaffIds.filter(id => id !== staffId);
    }
  }

  // To navigate to role page with id
  setInitialValues(staffId: any) {
    if (!this.canEditUserAccess) return;
    this.localStorageService.set('isFirstStaff', false);
    this.routeUrl.navigate(['/staff', staffId]);
  }

  viewStaff(staffId: any) {
    if (!this.canReadUserAccess) return;
    this.localStorageService.set('isFirstStaff', false);
    this.routeUrl.navigate(['/staff', staffId], { state: { mode: 'view' } });
  }

  openDeleteModal() {
    if (!this.canDeleteUserAccess) {
      this.alertService.error('You do not have permission to delete staff.', this.options);
      return;
    }
    //  Check if any selected staff is a higher_level_officer for others
    const blockedStaffIds = this.allStaves
      .filter((staff: any) => staff.higher_level_officer && this.selectedStaffIds.includes(staff.higher_level_officer.id))
      .map((staff: any) => staff.higher_level_officer.id);
    if (this.selectedStaffIds.length == 0) {
      this.alertService.error("Please select at least one staff to delete.", this.options);
    }
    // else if (blockedStaffIds.length > 0) {
    //   this.isDeleteStaffModalOpen = true;
    //   return;
    // }
    else {
      this.isDeleteModalOpen = true;
    }
  }

  // This function closes the delete modal
  closeDeleteModal() {
    this.selectedStaffIds = [];
    this.isDeleteModalOpen = false;
  }

  closeDeleteStaffModal() {
    this.selectedStaffIds = [];
    this.isDeleteStaffModalOpen = false;
  }

  deleteSelectedStaves() {
    this.isDeleteModalOpen = false;
    if (this.selectedStaffIds.length === 0) {
      this.alertService.error("Please select at least one staff to delete.", this.options);
      return;
    }
    //console.log(this.selectedStaffIds, "this.selectedRoleIds")
    let jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        delete_data: {},
        variants: []
      },
      extras: {
        find: {
          id: this.selectedStaffIds
        }
      }
    };
    // alert("Are you sure you want to delete the selected staff members? This action cannot be undone.");
    this.loaderService.emitLoading();
    this.staffListingService.deleteStaff(jsonObj).subscribe(
      resp => {
        this.loaderService.emitComplete();
        if (resp.success === 0 && resp.status_code === 200 && resp.message === "Record not deleted") {
          this.isDeleteStaffModalOpen = true;
          this.selectedStaffIds = []; // Clear selected IDs
          return;
        }
        if (resp.success === 1) {
          this.alertService.success("Staff deleted successfully!", this.options);
          this.selectedStaffIds = []; // Clear selected IDs after successful deletion
          this.getAllStaves(); // Refreshes the role list
        } else {
          this.alertService.error("Something went wrong. Please try again!", this.options);
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error.statusCode === 403) {
          this.alertService.error("Session Time Out! Please login Again", this.options);
          this.routeUrl.navigate([`/login`], { skipLocationChange: false });
        } else if (err.error.message) {
          this.alertService.error(err.error.message, this.options);
        } else {
          this.alertService.error("Something bad happened. Please try again!", this.options);
        }
      }
    );
  }

  navigateToTaskManagement() {
    this.isApiModal = false;
    this.routeUrl.navigate(['/task-management']);
  }

  // To navigate to role page with id
  // toggleAddStaff() {
  //   this.routeUrl.navigate(['/staff']);
  // }

  // To handle first staff creation
  async toggleAddStaff() {
    // console.log('Staff length:', this.allStaves.length);
    if (!this.allStaves || this.allStaves.length === 0) {
      // first staff flow — fetch and store default hierarchy in service
      await this.staffService.getDefaultHierarchyForFirstStaff();
      // console.log('Contacting staff service...');
    } else {
      // clear first-staff flags
      this.staffService.defaultHierarchy = null;
      this.staffService.isFirstStaff = false;
      this.localStorageService.set('isFirstStaff', this.staffService.isFirstStaff);
      // console.log('Is first staff while listing staff', this.localStorageService.get('isFirstStaff'));
    }
    // navigate (no query params)
    this.routeUrl.navigate(['/staff']);
  }

  getRoomLabels(staff: any): string {
    if (!staff.room_no || staff.room_no.length === 0) {
      return '';
    }
    return staff.room_no.map((r: any) => r.label).join(', ');
  }

}
