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
  staves: any = [];
  allStaves: any = [];
  isApiModal: boolean = false;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalStaves: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages


  constructor(
    private alertService: AlertsService,
    private routeUrl: Router,
    private staffListingService: StaffListingService,
    private localStorageService: LocalStorageService,
    private firestoreListenerService: FirestoreListenerService
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
    // To initially load all staff data's
    this.getAllStaves();

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
        "pagination": false,
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    }
    this.staffListingService.getAllStaves(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.staves = response.result.data;
          this.allStaves = response.result.data; //For pagination
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
    this.routeUrl.navigate(['/staff', staffId]);
  }

  openDeleteModal() {
    if (this.selectedStaffIds.length == 0) {
      this.alertService.error("Please select at least one user to delete.", this.options);
    }
    else {
      this.isDeleteModalOpen = true;
    }
  }

  // This function closes the delete modal
  closeDeleteModal() {
    this.isDeleteModalOpen = false;
  }

  deleteSelectedStaves() {
    this.isDeleteModalOpen = false;
    if (this.selectedStaffIds.length === 0) {
      this.alertService.error("Please select at least one user to delete.", this.options);
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
    this.staffListingService.deleteStaff(jsonObj).subscribe(
      resp => {
        if (resp.success === 1) {
          this.alertService.success("Staff deleted successfully!", this.options);
          this.selectedStaffIds = []; // Clear selected IDs after successful deletion
          this.getAllStaves(); // Refreshes the role list
        } else {
          this.alertService.error("Something went wrong. Please try again!", this.options);
        }
      },
      err => {
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
  toggleAddStaff() {
    this.routeUrl.navigate(['/staff']);
  }
}
