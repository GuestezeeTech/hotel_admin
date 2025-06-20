import { LocalStorageService } from './../../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleListingService } from './role-listing.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { Alert } from '../../shared/alerts/alerts.model';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-role-listing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent, FormsModule],
  templateUrl: './role-listing.component.html',
  styleUrl: './role-listing.component.scss'
})

export class RoleListingComponent implements OnInit {
  roles: any = [];
  allRoles: any = [];
  isStandardRole: boolean = true;
  isActive: boolean = true;
  showAddRoleForm = false;
  enableEdit = false;
  editScreen: boolean = false;
  roleId: any;
  selectedRoleIds: number[] = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isDeleteModalOpen: boolean = false;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalRoles: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages


  constructor(
    private roleListingService: RoleListingService,
    private alertService: AlertsService,
    private routeUrl: Router,
    private authTokenService: AuthTokenService,
    private localStorageService:LocalStorageService
  ) {
  }

  ngOnInit(): void {
    // To initially load all role data's
    this.getAllRoles();
  }

  // To navigate to role page with id
  toggleAddRole() {
    this.routeUrl.navigate(['/role']);
  }

  // To navigate to role page with id
  setInitialValues(roleId: any) {
    this.routeUrl.navigate(['/role', roleId]);
  }

  // To get all role data's
  getAllRoles() {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          //  "member_id": this.localStorageService.get('MemberId')
        },
        "pagination": false,
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    }
    this.roleListingService.getAllRoles(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.roles = response.result.data; //Full data
          this.allRoles = response.result.data; //For pagination
          this.totalRoles = this.roles.length;
          //console.log('Total Roles:', this.totalRoles);
          this.totalPages = Math.ceil(this.totalRoles / this.pageSize);
          //console.log('Total Pages:', this.totalPages);
          this.updatePaginatedRoles(); // Sets first page
        } else {
          //console.error('No roles found:', response?.message);
        }
      },
      error: (err) => {
        //console.error('API Error:', err);
      }
    });
  }

  updatePaginatedRoles() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allRoles = this.roles.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedRoles();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedRoles();
    }
  }

  toggleSelection(event: any, roleId: number) {
    if (event.target.checked) {
      this.selectedRoleIds.push(roleId);
    } else {
      this.selectedRoleIds = this.selectedRoleIds.filter(id => id !== roleId);
    }
  }

  // This function opens the delete modal
  openDeleteModal() {
    if (this.selectedRoleIds.length == 0) {
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

  deleteSelectedRoles() {
    this.isDeleteModalOpen = false;
    if (this.selectedRoleIds.length === 0) {
      this.alertService.error("Please select at least one user to delete.", this.options);
      return;
    }
    //console.log(this.selectedRoleIds, "this.selectedRoleIds")
    let jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        delete_data: {},
        variants: []
      },
      extras: {
        find: {
          id: this.selectedRoleIds
        }
      }
    };

    this.roleListingService.deleteRole(jsonObj).subscribe(
      resp => {
        if (resp.success === 1) {
          this.alertService.success("Roles deleted successfully!", this.options);
          this.selectedRoleIds = []; // Clear selected IDs after successful deletion
          this.getAllRoles(); // Refreshes the role list
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


}

