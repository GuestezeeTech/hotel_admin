import { HotelListService } from './../../hotel-list/hotel-list.service';
import { HotelEnrollmentTabviewService } from './../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserListingService } from './user-listing.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENDPOINTS } from '../../app.config';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { Alert } from '../../shared/alerts/alerts.model';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { FormsModule } from '@angular/forms';
import { PermissionService, ModulePermission } from '../../services/permission.service';

@Component({
  selector: 'app-usering',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent, FormsModule],
  templateUrl: './user-listing.component.html',
  styleUrl: './user-listing.component.scss'
})

export class UserListingComponent {
  users: any = [];
  allUsers: any = [];
  showAddUserForm = false;
  enableEdit = false;
  editScreen: boolean = false;
  userId: any;
  selectedUserIds: number[] = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isDeleteModalOpen: boolean = false;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalUsers: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  // Newly added
  usersWithRoles: any = [];

  constructor(
    private userListingService: UserListingService,
    private alertService: AlertsService,
    private routeUrl: Router,
    private authTokenService: AuthTokenService,
    private localStorageService: LocalStorageService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private hotellistService: HotelListService,
    private permissionService: PermissionService) {
  }

  ngOnInit(): void {
    // To initially load all user data's
    this.getAllUsers();
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

  // To navigate to role page with id
  toggleAddUser() {
    if (!this.canAddUserAccess) return;
    this.routeUrl.navigate(['/user']);
  }

  // To navigate to role page with id
  setInitialValues(userId: any) {
    if (!this.canEditUserAccess) return;
    this.routeUrl.navigate(['/user', userId]);
  }

  viewUser(userId: any) {
    if (!this.canReadUserAccess) return;
    this.routeUrl.navigate(['/user', userId], { state: { mode: 'view' } });
  }

  // To get all role data's
  // getAllUsers() {
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": {
  //         "member_id": this.localStorageService.get('MemberId')
  //       },
  //       "pagination": true,
  //       "paginationDetails": {
  //         "limit": 0,
  //         "pageSize": 1
  //       },
  //       "sorting": true,
  //       "sortingDetails": {
  //         "id": -1
  //       }
  //     }
  //   }
  //   this.userListingService.getAllUsers(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         this.users = response.result.data;
  //         // console.log('All users:', this.users);
  //         this.allUsers = response.result.data; //For pagination
  //         this.totalUsers = this.users.length;
  //         //console.log('Total Staves:', this.totalUsers);
  //         this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
  //         //console.log('Total Pages:', this.totalPages);
  //         this.updatePaginatedUsers();
  //       } else {
  //         //console.error('No users found:', response?.message);
  //       }
  //     },
  //     error: (err) => {
  //       //console.error('API Error:', err);
  //     }
  //   });
  // }

  getAllUsers() {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "member_id": this.localStorageService.get('MemberId')
        },
        "pagination": true,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 1
        },
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    }
    this.hotellistService.getSignupAllCustomers(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.users = response.result.data;
          // console.log('All users:', this.users);
          // Filter or store users that contain both role fields
          this.usersWithRoles = this.users
            .filter((u: any) => u.role_id && u.role_name)
            .map((u: any) => ({
              ...u,
              role_id: u.role_id,
              role_name: u.role_name
            }));
          // console.log("Users with role:", this.usersWithRoles);
          this.allUsers = this.usersWithRoles; //For pagination
          this.totalUsers = this.usersWithRoles.length;
          //console.log('Total Staves:', this.totalUsers);
          this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
          //console.log('Total Pages:', this.totalPages);
          this.updatePaginatedUsers();
        } else {
          //console.error('No users found:', response?.message);
        }
      },
      error: (err) => {
        //console.error('API Error:', err);
      }
    });
  }

  updatePaginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allUsers = this.usersWithRoles.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedUsers();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedUsers();
    }
  }

  toggleSelection(event: any, userId: number) {
    if (event.target.checked) {
      this.selectedUserIds.push(userId);
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
    }
  }

  // This function opens the delete modal
  openDeleteModal() {
    if (this.selectedUserIds.length == 0) {
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

  deleteSelectedUsers() {
    this.isDeleteModalOpen = false;
    if (this.selectedUserIds.length === 0) {
      this.alertService.error("Please select at least one user to delete.", this.options);
      return;
    }
    let jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        delete_data: {},
        variants: []
      },
      extras: {
        find: {
          id: this.selectedUserIds
        }
      }
    };
    this.hotellistService.deleteUserCustomer(jsonObj).subscribe(
      resp => {
        if (resp.success === 1) {
          this.alertService.success("Users deleted successfully!", this.options);
          this.selectedUserIds = []; // Clear selected IDs after successful deletion
          this.getAllUsers(); // Refresh the user list
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

