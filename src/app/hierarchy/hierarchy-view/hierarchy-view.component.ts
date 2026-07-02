import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HierarchyService, HierarchyItem } from '../hierarchy.service';
import { CommonModule } from '@angular/common';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { ENDPOINTS } from '../../app.config';
// import { HierarchyService, HierarchyItem } from '../../services/hierarchy.service';
// Newly added
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { LoaderService } from './../../shared/loader/loader.service';
import { PermissionService, ModulePermission } from '../../services/permission.service';

@Component({
  selector: 'app-hierarchy-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hierarchy-view.component.html',
  styleUrls: ['./hierarchy-view.component.scss']
})

export class HierarchyViewComponent {
  expandedMap: { [id: number]: boolean } = {};
  hierarchyData: any;
  isTreeForm = false;
  parentId?: number;
  hierarchyId?: number;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  hotelId!: number;


  getLevelBadge(level: number): string {
    if (level === 0) return 'ROOT';
    return `Level ${level}`;
  }

  hasTreeItems = false;


  constructor(
    private hierarchyService: HierarchyService,
    private router: Router,
    private authTokenService: AuthTokenService,
    private alertService: AlertsService,
    private activatedRoute: ActivatedRoute,
    private localStorageService: LocalStorageService,
    private permissionService: PermissionService
  ) { }

  ngOnInit() {
    // this.hierarchyService.hierarchyData$.subscribe(data => {
    //   //console.log('[HierarchyViewComponent] Received data:', data);
    //   this.hasTreeItems = data.some(item => item.isTreeItem);
    //   //console.log(  this.hasTreeItems,"  this.hasTreeItems")
    // });


    const id = this.activatedRoute.snapshot.paramMap.get('id');
    this.hierarchyId = Number(id);
    //console.log(this.hierarchyId)

    if (this.hierarchyId != 0) {
      //console.log("123")
      this.updateHierarchyById(this.hierarchyId)
      // this.getHierarchyById(this.hierarchyId);
    }

    this.hotelId = Number(this.localStorageService.get('UserId'));
    //console.log(this.hotelId, "this.hotelId")
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

  onAdd(parentId?: number, department?: string) {
    // Respect add permission
    if (!this.canAddSystemSettings) {
      return;
    }
    this.router.navigate(['/edit-hierarchy', this.hierarchyId], {
      state: { parentId, department }
    });
  }

  onAddRoot() {
    // Respect add permission
    if (!this.canAddSystemSettings) {
      return;
    }
    this.router.navigate(['/edit-hierarchy', this.hierarchyId]);
  }

  onEdit(id: number) {
    // Respect edit permission
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

  onDelete(id: number) {
    // Respect delete permission
    if (!this.canDeleteSystemSettings) {
      return;
    }
    const all = this.hierarchyService.getHierarchyData();
    const children = all.filter(item => item.parentId === id);
    if (children.length > 1) {
      this.alertService.error('Before deleting this specific hierarchy delete the child hierarchies', this.options);
      return;
    }
    if (confirm('Are you sure you want to delete this item? Only this item will be deleted; its children will be moved up one level.')) {
      // Find the item to delete
      const itemToDelete = all.find(item => item.id === id);
      if (!itemToDelete) return;
      // Re-parent all direct children to the deleted item's parent
      const updated = all.map(item =>
        item.parentId === id ? { ...item, parentId: itemToDelete.parentId } : item
      ).filter(item => item.id !== id);
      this.hierarchyService['hierarchyData'].next(updated);
      let tempdata: any;
      tempdata = updated;
      //console.log(tempdata, 'tempdata');
      this.updateHierarchyData(tempdata);
    }
  }

  hasTreeChildren(parentId: number | undefined): boolean {
    return this.getChildren(parentId).some(child => child.isTreeItem);
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
            id: hierarchyId
          }
        }
      };
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.GETBYID_HIERARCHY).subscribe(
        resp => {
          //console.log("test", "123")
          //console.log(resp.result.data, "resp")
          if (resp) {
            //console.log(resp.result.data, "resp")
            this.hierarchyData = resp.result.data[0].hierarchy;
            //console.log(this.hierarchyData, "this.hierarchyData")
            const hierarchyItems1: HierarchyItem[] = this.hierarchyData.map((item: any) => ({
              id: item.id,
              designation: item.designation,
              escalationTime: item.escalationTime,
              department: item.department,
              isTopLevel: item.isTopLevel,
              isTreeItem: true,                        // Set this explicitly
              parentId: item.parentId  //  Make sure parentId is assigned
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

  updateHierarchyData(obj: any) {
    // delete this.getdataforupdate[0]._id;
    // //console.log( this.getdataforupdate," this.getdataforupdate")
    //  this.getdataforupdate[0].hierarchy.push(obj[0]);
    //  var temdata = {

    //    hierarchy_creation: {

    //         }

    // }

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
            // this.getHierarchyById(Number(this.hierarchyId))
            // .then(() => {
            this.hierarchyService.clearHierarchyData();
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigate(['/view-hierarchy', this.hierarchyId]);
            });

            //});
            //             this.hierarchyData =resp.result.data;
            //              const hierarchyItems: HierarchyItem[] = this.hierarchyData.map((item: any) => ({
            //   id: item.id,
            //   designation: item.designation,
            //   escalationTime: item.escalationTime,
            //   department: item.department,
            //   isTopLevel: item.isTopLevel,
            //   organization_id: item.organization_id,
            //   store_id: item.store_id,
            //   created_on: item.created_on,
            //   modified_on: item.modified_on,
            //   is_deleted: item.is_deleted,
            //   is_active: item.is_active
            //   // `isTreeItem` and `parentId` are set by the method
            // }));
            // this.hierarchyService.setHierarchyData(  this.hierarchyData, this.isTreeForm, this.parentId);







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

  back() {
    this.router.navigate(['/edit-new-hotel', this.hotelId], {
      queryParams: { tab: 3 } 
    });
  }

}
