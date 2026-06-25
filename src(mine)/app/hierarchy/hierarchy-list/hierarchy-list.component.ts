import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HierarchyService, HierarchyItem } from '../hierarchy.service';
import { CommonModule } from '@angular/common';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../app.config';
import { FormsModule } from '@angular/forms';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { PermissionService, ModulePermission } from '../../services/permission.service';
import { DepartmentListService } from '../../department-list/department-list.service';

export interface HierarchyItem1 {
  id: number;
  designation: string;
  parentId: number | null;
  isTreeItem?: boolean;
  expanded?: boolean;
}

export interface Node {
  id: number;
  name: string;
  parentId: number | null;
  children?: Node[];
  expanded?: boolean;
}

@Component({
  selector: 'app-hierarchy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertsComponent],
  templateUrl: './hierarchy-list.component.html',
  styleUrl: './hierarchy-list.component.scss'
})

export class HierarchyListComponent implements OnInit {
  selectedIds = [101];
  expanded: boolean = true;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  hierarchyData: any;
  allhierarchyData: any;
  showCreateModal = false;
  newHierarchyName = '';
  hierarchyName: string = '';
  hierarchyId: number = 0;
  member_id: any;
  modalError: string = '';
  showModal: boolean = false;
  // Loader
  isLoading: boolean = false;
  departments: any = null;
  nameLengthError: boolean = false;

  constructor(
    private hierarchyService: HierarchyService,
    private router: Router,
    private authTokenService: AuthTokenService,
    private alertService: AlertsService,
    private localService: LocalStorageService,
    private permissionService: PermissionService,
    private departmentService: DepartmentListService
  ) { }

  ngOnInit(): void {
    this.selectedIds = [101];
    this.member_id = this.localService.get('MemberId');
    if (this.member_id) {
      this.getAllDepartments(this.member_id);
      this.getAllHierarchy(this.member_id)
    }
  }

  // -------------
  // Permission helpers for template bindings
  // -------------
  get canReadSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_read_permission ?? false;
  }

  get canAddSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_add_permission ?? false;
  }

  get canEditSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_edit_permission ?? false;
  }

  get canDeleteSystemSettings(): boolean {
    const permission = this.permissionService.getModulePermission('SYSTEM SETTINGS');
    return permission?.has_delete_permission ?? false;
  }

  async getAllHierarchy(memberId: any): Promise<void> {
    // Show loader when loading data
    this.isLoading = true;
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: this.authTokenService.getDomain(),
        user_id: this.authTokenService.getUserId(),
        extras: {
          find: {
            member_id: memberId
          }
        }
      };
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.GET_HIERARCHY).subscribe(
        resp => {
          if (resp) {
            this.allhierarchyData = resp.result.data[0];
            // console.log('Hierarchy data of this member:', this.allhierarchyData);
            // Hide loader if no data is found
            this.isLoading = false;
            resolve();
          } else {
            // Hide loader if no data is found
            this.isLoading = false;
            resolve();
          }
        },
        err => {
          // Hide loader if there is an error
          this.isLoading = false;
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
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

  viewHierarchy(hierarchyId: any) {
    // Check if hierarchy exists but is empty (hierarchy array length is 0)
    if (this.allhierarchyData &&
      this.allhierarchyData.hasOwnProperty('hierarchy') &&
      Array.isArray(this.allhierarchyData.hierarchy) &&
      this.allhierarchyData.hierarchy.length === 0) {
      // Navigate directly to edit-hierarchy page if hierarchy is empty
      this.router.navigate(['/edit-hierarchy', hierarchyId]);
    } else {
      // Navigate to view-customer-hierarchy page if hierarchy has items
      this.router.navigate(['/view-customer-hierarchy', hierarchyId]);
    }
  }

  async getid(id: number) {
    this.hierarchyId = id;
    this.showModal = true;
    this.getHierarchyById(this.hierarchyId)
  }

  getHierarchyById(hierarchyId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: this.authTokenService.getDomain(),
        user_id: this.authTokenService.getUserId(),
        extras: {
          find: {
            id: hierarchyId
          }
        }
      };
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.GETBYID_HIERARCHY).subscribe(
        resp => {
          if (resp) {
            this.hierarchyData = resp.result.data[0];
            this.hierarchyName = this.hierarchyData.name;
            resolve();
          }
        },
        err => {
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
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

  // For updating hierarchy name
  updateHierarchyData() {
    this.modalError = '';
    if (!this.hierarchyName || this.hierarchyName.trim() === '') {
      this.modalError = "Hierarchy name cannot be empty!";
      // this.alertService.error("Hierarchy name field cannot be empty. The update could not continue without it.", this.options);
      return; // stop the function
    }
    // Clears modal error when valid
    this.modalError = '';
    delete this.hierarchyData._id;
    this.hierarchyData["name"] = this.hierarchyName;
    let requestBody = {
      domain_name: this.authTokenService.getDomain(),
      user_id: this.authTokenService.getUserId(),
      payload: {
        hierarchy_updation: this.hierarchyData
      },
      extras: {
        find: {
          id: this.hierarchyId
        }
      }
    }
    this.hierarchyService.apiCall(requestBody, ENDPOINTS.UPDATE_HIERARCHY).subscribe(
      resp => {
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // Close modal ONLY on success
            this.clearModal();
            this.alertService.success('Hierarchy name updated successfully', this.options);
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigate(['member-hierarchy']);
            });
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

  clearModal() {
    this.showModal = false;
    this.hierarchyName = '';
    this.modalError = '';
  }

  createNewHierarchy() {
    this.router.navigate([`/create-new-hierarchy`], { skipLocationChange: false });
  }

  getItemsByIds(ids: number[]): HierarchyItem[] {
    const allItems = this.getHierarchyData(); // <== This is probably undefined
    return ids
      .map(id => allItems.find(item => item.id === id)) // Error happens here
      .filter((item): item is HierarchyItem => !!item);
  }

  getLevel(item: HierarchyItem): number {
    const allItems = this.getHierarchyData();
    let level = 0;
    let parentId = item.parentId;
    while (parentId !== undefined) {
      const parent = allItems.find(i => i.id === parentId);
      if (!parent) break;
      level++;
      parentId = parent.parentId;
    }
    return level;
  }

  getHierarchyData(): HierarchyItem[] {
    return this.hierarchyService.getHierarchyData();
  }

  getChildren(parentId: number | undefined): HierarchyItem[] {
    return this.getHierarchyData().filter(item => item.parentId === parentId);
  }

  toggleExpand(item: HierarchyItem1): void {
    item.expanded = !item.expanded;
  }
  toggleNode(node: Node) {
    node.expanded = !node.expanded;
  }

  getAllDepartments(memberId: any) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { member_id: memberId }
      }
    };
    this.departmentService.getAllDepartments(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.departments = resp.result.data;// Map assignedDept for services
        } else {
          this.departments = [];
        }
      },
      (err: any) => {
        this.departments = [];
        console.log(err);
      }
    );
  }

  checkNameLength(){
    if(this.hierarchyName.length >= 50){
      this.nameLengthError = true;
    }else{
      this.nameLengthError = false;
    }
  }

}
