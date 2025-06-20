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


  constructor(
    private userListingService: UserListingService,
    private alertService: AlertsService,
    private routeUrl: Router,
    private authTokenService: AuthTokenService,
    private localStorageService: LocalStorageService) {
  }

  ngOnInit(): void {
    // To initially load all user data's
    this.getAllUsers();
  }

  // To navigate to role page with id
  toggleAddUser() {
    this.routeUrl.navigate(['/user']);
  }

  // To navigate to role page with id
  setInitialValues(userId: any) {
    this.routeUrl.navigate(['/user', userId]);
  }

  // To get all role data's
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
    this.userListingService.getAllUsers(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.users = response.result.data;
          this.allUsers = response.result.data; //For pagination
          this.totalUsers = this.users.length;
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
    this.allUsers = this.users.slice(startIndex, endIndex);
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
    this.userListingService.deleteUser(jsonObj).subscribe(
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

