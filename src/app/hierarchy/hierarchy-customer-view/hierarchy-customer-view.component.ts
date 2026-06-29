import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HierarchyService, HierarchyItem } from '../hierarchy.service';
import { CommonModule } from '@angular/common';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { ENDPOINTS } from '../../app.config';
// Newly added
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { PermissionService, ModulePermission } from '../../services/permission.service';

@Component({
  selector: 'app-hierarchy-view',
  standalone: true,
  imports: [CommonModule, AlertsComponent],
  templateUrl: './hierarchy-customer-view.component.html',
  styleUrls: ['./hierarchy-customer-view.component.scss']
})

export class HierarchyCustomerViewComponent {
  expandedMap: { [id: number]: boolean } = {};
  hierarchyData: any;
  isTreeForm = false;
  parentId?: number;
  hierarchyId?: number;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  hasTreeItems = false;
  hotelId: any;
  paymentDone: any;
  // Newly added for disabling 
  customerStatus: any;
  showDeleteModal = false;
  deleteId: number | null = null;
  memberId: any;

  constructor(
    private hierarchyService: HierarchyService,
    private router: Router,
    private authTokenService: AuthTokenService,
    private alertService: AlertsService,
    private activatedRoute: ActivatedRoute,
    // Newly added
    private localStorageService: LocalStorageService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private permissionService: PermissionService
  ) { }

  ngOnInit() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    this.hierarchyId = Number(id);
    // Newly added
    this.hotelId = Number(this.localStorageService.get('UserId'));
    this.memberId = this.localStorageService.get('MemberId');
    if (this.hierarchyId != 0) {
      //console.log("123")
      this.updateHierarchyById(this.hierarchyId)
    }
    // Newly added for disabling 
    if (this.hotelId && this.memberId) {
      this.getCustomerById();
    }
  }

  getLevelBadge(level: number): string {
    if (level === 0) return 'ROOT';
    return `Level ${level}`;
  }

  getHierarchyData(): HierarchyItem[] {
    return this.hierarchyService.getHierarchyData();
  }

  getChildren(parentId: number | undefined): HierarchyItem[] {
    return this.getHierarchyData().filter(item => item.parentId === parentId);
  }

  isExpanded(id: number): boolean {
    return this.expandedMap[id] !== false;
  }

  toggleExpand(id: number) {
    this.expandedMap[id] = !this.isExpanded(id);
  }

  onAddRoot() {
    // Block root add when user has no add permission
    if (!this.canAddSystemSettings) {
      return;
    }
    this.router.navigate(['/edit-hierarchy', this.hierarchyId]);
  }

  onEdit(id: number) {
    // Block edit when user has no edit permission
    if (!this.canEditSystemSettings) {
      return;
    }
    this.router.navigate(['/edit-hierarchy', this.hierarchyId], {
      state: { editId: id }
    });
  }

  isLastItem(items: HierarchyItem[], index: number): boolean {
    return index === items.length - 1;
  }

  deleteHierarchy(id: any) {
    const all = this.hierarchyService.getHierarchyData();
    // Find the item to delete
    const itemToDelete = all.find(item => item.id === id);
    if (!itemToDelete) return;
    // Re-parent all direct children to the deleted item's parent
    const updated = all.map(item =>
      item.parentId === id ? { ...item, parentId: itemToDelete.parentId } : item
    ).filter(item => item.id !== id);
    // this.hierarchyService['hierarchyData'].next(updated); // newly added to Removed premature UI update to prevent items from disappearing if deletion fails on the server
    let tempdata: any;
    tempdata = updated;
    this.updateHierarchyData(tempdata);
  }

  onDeleteClick(id: number) {
    // Block delete when user has no delete permission
    if (!this.canDeleteSystemSettings) {
      return;
    }
    this.deleteId = id; // newly added
    this.showDeleteModal = true;
    // this.deleteId = id;
  }

  hasTreeChildren(parentId: number | undefined): boolean {
    return this.getChildren(parentId).some(child => child.isTreeItem);
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

  async getHierarchyById(hierarchyId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: 16,
        extras: {
          find: {
            id: hierarchyId
          }
        }
      };
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.GETBYID_HIERARCHY).subscribe(
        resp => {
          //console.log("test", "123")
          if (resp) {
            // Newly changed(customer_hierarchy)
            this.hierarchyData = resp.result.data[0].hierarchy;
            const hierarchyItems: HierarchyItem[] = this.hierarchyData.map((item: any) => ({
              id: item.id,
              designation: item.designation,
              escalationTime: item.escalationTime,
              department: item.department,
              isTopLevel: item.isTopLevel,
              organization_id: item.organization_id,
              store_id: item.store_id,
              created_on: item.created_on,
              modified_on: item.modified_on,
              is_deleted: item.is_deleted,
              is_active: item.is_active,
              parentId: item.parentId != null ? item.parentId : 0

              // `isTreeItem` and `parentId` are set by the method
            }));
            //console.log("test", "123");
            this.hierarchyService.clearHierarchyData();
            //console.log(this.parentId, "this.parentid", hierarchyItems)
            // this.hierarchyService.setHierarchyData(hierarchyItems, this.isTreeForm, this.parentId);

            // this.hierarchyService.getHierarchyData();





            resolve();  // Resolve promise when data is set
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
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }


  async updateHierarchyById(hierarchyId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: 16,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            // customer_id: this.hotelId
            member_id: this.memberId
          }
        }
      };
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.GETBYID_HIERARCHY).subscribe(
        resp => {
          //console.log("test", "123")
          //console.log(resp.result.data, "resp")
          if (resp && resp.result && resp.result.data && resp.result.data.length > 0) {
            //console.log(resp.result.data, "resp")
            const fullHierarchyData = resp.result.data[0];
            this.hierarchyData = resp.result.data[0].hierarchy || [];
            // console.log(this.hierarchyData, "this.hierarchyData")
            // Check if hierarchy exists but is empty (hierarchy field exists but array length is 0)
            // If empty, redirect directly to edit-hierarchy page
            if (fullHierarchyData &&
              fullHierarchyData.hasOwnProperty('hierarchy') &&
              Array.isArray(this.hierarchyData) &&
              this.hierarchyData.length === 0) {
              // Redirect to edit-hierarchy page if hierarchy is empty
              this.router.navigate(['/edit-hierarchy', this.hierarchyId]);
              resolve();
              return;
            }
            // Only map if hierarchy has items
            if (this.hierarchyData && this.hierarchyData.length > 0) {
              const hierarchyItems1: HierarchyItem[] = this.hierarchyData.map((item: any) => ({
                id: item.id,
                designation: item.designation,
                escalationTime: item.escalationTime,
                department: item.department,
                isTopLevel: item.isTopLevel,
                isTreeItem: true,
                parentId: item.parentId
              }));
              const hierarchyItems: HierarchyItem[] = hierarchyItems1.map(item =>
                Object.fromEntries(
                  Object.entries(item).filter(([_, v]) => v !== undefined)
                ) as HierarchyItem
              );
              //console.log(this.parentId, "this.parentid", hierarchyItems);
              this.hierarchyService.clearHierarchyData();
              //console.log('Cleared hierarchy data');
              this.hierarchyService.setHierarchyData(hierarchyItems);
              //console.log('Set new hierarchy data');
              //console.log(this.hierarchyService.getHierarchyData())
            } else {
              // Clear hierarchy data if empty
              this.hierarchyService.clearHierarchyData();
            }
            resolve();  // Resolve promise when data is set
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
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }

  updateHierarchyData(obj: any) {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        hierarchy_creation: {
          "hierarchy": obj
        }
      },
      extras: {
        find: {
          id: this.hierarchyId
        }
      }
    }
    //console.log("123")
    this.hierarchyService.apiCall(requestBody, ENDPOINTS.UPDATE_HIERARCHY).subscribe(
      resp => {

        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            this.hierarchyService.clearHierarchyData();
            this.deleteId = null;
            this.showDeleteModal = false; //newly added to close the delete modal
            // Navigate first, then show success so alert is visible on the target page
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]).then(() => {
                setTimeout(() => {
                  // Newly added for deletion resp message 
                  // this.alertService.success('Hierarchy item deleted successfully', this.options);
                  if (resp.message.includes('Record successfully updated')) {
                    this.alertService.success('Hierarchy item deleted successfully', this.options);
                  }
                  else {
                    this.alertService.success(resp.message, this.options);
                  }
                  // End of newly added for deletion resp message 
                }, 100);
              });
            });
          }
          else if (resp.success === 0) {
            this.showDeleteModal = false; //newly added to close the delete modal
            if (resp.message) {
              this.alertService.error(resp.message, this.options);
            }
          }
          else if (resp.message && resp.status_code !== 200) {
            this.showDeleteModal = false; //newly added to close the delete modal
            this.alertService.error(resp.message, this.options);
          }
          else {
            this.showDeleteModal = false; //newly added to close the delete modal
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
        }
      },
      err => {
        this.showDeleteModal = false; //newly added to close the delete modal
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

  back() {
    this.router.navigate(['/member-hierarchy']);
  }

  async getCustomerById(): Promise<void> {
    // console.log('Hotel ID:', this.hotelId);
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            // id: this.hotelId
            member_id: this.memberId
          }
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        async (resp: any) => {
          if (resp?.result?.data?.length) {
            const customerdata = resp.result.data[0];
            // console.log('Customer Data:', customerdata);
            this.customerStatus = customerdata.status;
            // console.log('Customer status:', this.customerStatus)
            resolve();
          } else {
            reject(' No customer data found.');
          }
        },
        (err: any) => {
          if (err.error?.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate(['/login'], { skipLocationChange: false });
          } else if (err.error?.message) {
            this.alertService.error(err.error.message, this.options);
          } else {
            this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);
        }
      );
    });
  }

  // onDelete(id: number) {
  //   this.deleteId = id;
  //   this.showDeleteModal = true;   // Open custom modal
  // }

  closeDeleteModal() {
    this.showDeleteModal = false;  // Simply close
    this.deleteId = null;
    if (this.hierarchyId) {
      this.updateHierarchyById(this.hierarchyId);
    }
  }

  /*   onAdd(parentId?: number, department?: string) {
    // Block add when user has no add permission
    if (!this.canAddSystemSettings) {
      return;
    }
    //console.log("onAdd", parentId, department)
    this.router.navigate(['/edit-hierarchy', this.hierarchyId], {
      state: { parentId, department }
    });
  } */

  onAdd(parentId?: number, department?: string) {
    if (!this.canAddSystemSettings) {
      return;
    }
    const hasChildren = this.getChildren(parentId).length > 0;
    this.router.navigate(['/edit-hierarchy', this.hierarchyId], {
      state: {
        parentId,
        department,
        hasChildren
      }
    });
  }

}

