import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, MaxLengthValidator, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HierarchyService, HierarchyItem } from '../hierarchy.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../app.config';
import { LocalStorageService } from '../../auth-services/local-storage.service'
import { DepartmentListService } from '../../department-list/department-list.service';
import { PermissionService, ModulePermission } from '../../services/permission.service';

@Component({
  selector: 'app-hierarchy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent],
  templateUrl: './hierarchy-form.component.html',
  styleUrls: ['./hierarchy-form.component.scss']
})

export class HierarchyFormComponent implements OnInit {
  editId?: number;
  isEditMode = false;
  parentDepartment: string = '';
  hierarchyForm: FormGroup;
  showTopLevelOption = false;
  hierarchyData: any;
  getdataforupdate: any;
  isTopLevel = false;
  showForm = false;
  isTreeForm = false;
  parentId?: number;
  hierarchyId?: number;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  updatedData: any;
  // Newly added
  hotel_id: any;
  member_id: any;
  departments: any;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private hierarchyService: HierarchyService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private alertService: AlertsService,
    private authTokenService: AuthTokenService,
    private localService: LocalStorageService,
    private departmentService: DepartmentListService,
    private permissionService: PermissionService
  ) {
    this.hierarchyForm = this.formBuilder.group({
      items: this.formBuilder.array([])
    });
    // Get parent ID or editId from navigation state if available
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      if (navigation.extras.state['parentId'] !== undefined) {
        this.parentId = navigation.extras.state['parentId'];
      } else {
        this.parentId = undefined;
      }
      if (navigation.extras.state['department'] !== undefined) {
        this.parentDepartment = navigation.extras.state['department'];
      } else {
        this.parentDepartment = "";
      }
      if (navigation.extras.state['editId'] !== undefined) {
        this.editId = navigation.extras.state['editId'];
        this.isEditMode = true;
      }
    }
  }

  ngOnInit() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    console.log('Hierarchy ID:', id);
    if (id != null && id != undefined && id != "") {
      this.hierarchyId = Number(id);
      this.getHierarchyById(this.hierarchyId);
    }
    if (this.parentDepartment != "") {
      this.hierarchyForm.get('parentDepartment')?.setValue(this.parentDepartment);
    }
    if (this.isEditMode && this.editId !== undefined) {
      console.log('Editing Hierarchy Item:', this.editId);
      // Load the item data and populate the form
      const item = this.hierarchyService.getHierarchyData().find(i => i.id === this.editId);
      if (item) {
        this.items.clear();
        const isTop = !item.parentId || item.parentId === 0;
        const itemForm = this.formBuilder.group({
          id: [item.id],
          designation: [item.designation, [Validators.required, Validators.maxLength(50)]],
          escalationTime: isTop
            ? [0]
            : [item.escalationTime, [Validators.required, Validators.min(1), Validators.pattern("^[0-9]*$")]],
          // escalationTime: [item.escalationTime, [Validators.required, Validators.min(1)]],
          department: [item.department, Validators.required],
          isTopLevel: [item.isTopLevel],
          isTreeItem: [item.isTreeItem],
        });
        // Newly added for disabling department field
        // Lock department only when the PARENT's department is a specific (non-Default) one.
        /* const allItems = this.hierarchyService.getHierarchyData();
        const parentItem = item.parentId ? allItems.find(d => d.id === item.parentId) : null;
        const parentDept = parentItem?.department ?? '';
        const parentIsSpecific = parentDept !== '' && parentDept !== 'Default';
        if (parentIsSpecific) {
          itemForm.get('department')?.disable();
        } */
        // Always disable the department field in edit mode
        itemForm.get('department')?.disable();
        // End of newly added code for disabling department field
        // Add parentId only if it exists AND not 0
        if (item.parentId && item.parentId !== 0) {
          (itemForm as any).addControl(
            'parentId',
            this.formBuilder.control(item.parentId)
          );
        }
        this.items.push(itemForm);
      }
      this.showForm = true;
    }
    this.hotel_id = Number(this.localService.get('UserId'));
    // console.log('Hotel Id:', this.hotel_id);
    this.member_id = this.localService.get('MemberId');
    // console.log('Member Id:', this.member_id);
    if (this.member_id) {
      this.getDepartmentsById(this.member_id);
    }
  }

  get items() {
    return this.hierarchyForm.get('items') as FormArray;
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

  get canEditForm(): boolean {
    // In edit mode user needs edit permission, otherwise add permission
    return this.isEditMode ? this.canEditSystemSettings : this.canAddSystemSettings;
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
            this.hierarchyData = resp.result.data[0].hierarchy;
            // console.log('Hierarchy data of this member:', this.hierarchyData)
            this.getdataforupdate = resp.result.data;
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
              is_active: item.is_active
            }));
            // If this existing record has an empty hierarchy array,
            // make sure the shared HierarchyService data is cleared.
            // Otherwise old hierarchy data from previous screens can
            // make it look like there are existing items and cause
            // strange first-click behaviour when creating the first level.
            if (Array.isArray(this.hierarchyData) && this.hierarchyData.length === 0) {
              this.hierarchyService.clearHierarchyData();
            }
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
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }

  // addItem() {
  //   console.log('Adding item...');
  //   console.log('Next id:', this.hierarchyService.getNextId());
  //   // const newId = this.hierarchyService.getNextId();
  //   const itemForm = this.formBuilder.group({
  //     // id: [newId],
  //     designation: ['', Validators.required],
  //     escalationTime: ['', [Validators.required, Validators.min(1)]],
  //     department: ['', Validators.required],
  //     isTopLevel: [false]
  //   });
  //   this.items.push(itemForm);
  //   // console.log('Items:', this.items);
  //   const firstItemValue = this.items.at(0).value;
  //   let length = this.hierarchyData?.length - 1;
  //   // itemForm.patchValue({
  //   //   department: this.hierarchyData[length].department,
  //   // });
  // }

  showOneLevelForm() {
    // console.log('Show one level form...');
    this.showForm = true;
    this.isTreeForm = false;
    this.addItem();
    // Show Top Level option if adding a child to a parent with children
    if (this.parentId !== undefined) {
      const siblings = this.hierarchyService.getHierarchyData().filter(item => item.parentId === this.parentId);
      this.showTopLevelOption = siblings.length > 0;
      // Reset isTopLevel checkbox in form
      if (this.items.length > 0) {
        this.items.at(0).get('isTopLevel')?.setValue(false);
      }
    } else {
      this.showTopLevelOption = false;
      if (this.items.length > 0) {
        this.items.at(0).get('isTopLevel')?.setValue(false);
      }
    }
  }

  showTreeForm() {
    this.showForm = true;
    this.isTreeForm = true;
    this.addItem();
  }


  // onSubmit() {
  //   console.log('Parent department:', this.parentDepartment);
  //   console.log('Form data:', this.hierarchyForm.value);
  //   if (!this.hierarchyForm.valid) return;
  //   const formData: HierarchyItem[] = this.items.value;
  //   console.log('Form Data of hierarchy:', formData);
  //   if (this.parentDepartment) {
  //     formData[0].department = this.parentDepartment;
  //   }
  //   const isTopLevelChecked = this.items.at(0).value.isTopLevel;
  //   const allData = this.hierarchyService.getHierarchyData();
  //   if (this.isEditMode && this.editId !== undefined) {
  //     // console.log('Top');
  //     // console.log("Edit existing Hierarchy");
  //     // Edit mode: update existing item without creating new ID
  //     const idx = allData.findIndex(i => i.id === this.editId);
  //     if (idx !== -1) {
  //       allData[idx] = {
  //         ...allData[idx],
  //         ...formData[0]
  //       };
  //       this.hierarchyService['hierarchyData'].next([...allData]);
  //       this.updateHierarchyData([...allData]);
  //     }
  //   } else {
  //     // console.log('Top1');
  //     // console.log('Is Top Level Checked:', isTopLevelChecked);
  //     // console.log('Parent Id:', this.parentId);
  //     // console.log('Is Show Top Level Option:', this.showTopLevelOption);
  //     // Create mode
  //     let newData: HierarchyItem[] = [];
  //     if (this.showTopLevelOption && isTopLevelChecked && this.parentId !== undefined) {
  //       // console.log('Sibling hierarchy creation');
  //       // console.log('Top2');
  //       const parentIdx = allData.findIndex(item => item.id === this.parentId);
  //       if (parentIdx !== -1) {
  //         const newId = this.hierarchyService.getNextId();
  //         const newItem: HierarchyItem = {
  //           ...formData[0],
  //           id: newId,
  //           parentId: this.parentId,
  //           isTopLevel: true
  //         };
  //         // Re-parent current children of parent
  //         for (let i = 0; i < allData.length; i++) {
  //           if (allData[i].parentId === this.parentId) {
  //             allData[i].parentId = newId;
  //           }
  //         }
  //         allData.splice(parentIdx + 1, 0, newItem);
  //         this.hierarchyService['hierarchyData'].next([...allData]);
  //         newData = [...allData];
  //       }
  //     } else {
  //       // console.log('Top3');
  //       // Regular insertion: assign IDs only if not already present
  //       formData.forEach(item => {
  //         if (!item.id || allData.findIndex(d => d.id === item.id) !== -1) {
  //           item.id = this.hierarchyService.getNextId();
  //         }
  //       });
  //       this.hierarchyService.setHierarchyData(formData, this.isTreeForm, this.parentId);
  //       newData = this.hierarchyService.getHierarchyData();
  //       // console.log('New Data:', newData);
  //     }
  //     this.createHierarchy(newData);
  //   }
  // }

  // Newly added & commented for disabling department field
  addItem() {
    const isParentNotDefault =
      this.parentDepartment &&
      this.parentDepartment !== '' &&
      this.parentDepartment !== 'Default';
    const isTop = !this.parentId || this.parentId === 0;
    const itemForm = this.formBuilder.group({
      id: [null],
      designation: ['', Validators.required],
      escalationTime: isTop ? [0] : ['', [Validators.required, Validators.min(1)]],
      department: [
        isParentNotDefault ? this.parentDepartment : '',
        Validators.required
      ],
      isTopLevel: [false],
      parentId: [this.parentId ?? 0]
    });
    // Disable department if parent is not Default
    if (isParentNotDefault) {
      itemForm.get('department')?.disable();
    }
    this.items.push(itemForm);
  }


  /* addItem() {
    // console.log('Adding item...');
    // Create form row and store parentId in the row so it doesn't depend on this.parentId later
    const itemForm = this.formBuilder.group({
      // id will be assigned later in onSubmit()
      id: [null],
      designation: ['', Validators.required],
      escalationTime: ['', [Validators.required, Validators.min(1)]],
      department: ['', Validators.required],
      isTopLevel: [false],
      parentId: [this.parentId ?? 0]   // store the shared parentId for all new rows
    });
    this.items.push(itemForm);
    // console.log('Form row added (no id yet), parentId stored:', itemForm.get('parentId')?.value);
  } */
  // End of newly added & commented for disabling department field

  removeItem(index: number) {
    // console.log('Removing item at index:', index);
    // Prevent removing the last remaining row so the form never becomes completely empty
    if (this.items.length > 1) {
      this.items.removeAt(index);
    } else {
      // If it's the only row, just reset its values
      const isTop = !this.parentId || this.parentId === 0;
      this.items.at(0).reset({
        id: null,
        designation: '',
        escalationTime: isTop ? 0 : '',
        department: '',
        isTopLevel: false,
        parentId: this.parentId ?? 0
      });
    }
  }

  onSubmit() {
    if (this.isSubmitting) {
      // console.log('Submit in progress, ignoring duplicate click');
      return;
    }
    // console.log('On submit...');
    // console.log('Parent department:', this.parentDepartment);
    // console.log('Form data:', this.hierarchyForm.value);
    if (!this.hierarchyForm.valid) return;
    this.isSubmitting = true;
    // collect rows (each row already contains parentId)
    // const formRows: any[] = this.items.value.map((r: any) => ({
    const formRows: any[] = this.items.getRawValue().map((r: any, idx: number) => {
      const itemGroup = this.items.at(idx) as FormGroup;
      const isTop = this.isRowTopLevel(itemGroup);
      return {
        id: r.id, // may be null for new rows
        parentId: r.parentId,
        designation: r.designation,
        department: r.department,
        escalationTime: isTop ? 0 : (Number(r.escalationTime) || 0),
        isTopLevel: !!r.isTopLevel
      };
    });
    // console.log('Form rows:', formRows);
    // If parentDepartment is forced, apply to first row
    // if (this.parentDepartment) {
    //   formRows[0].department = this.parentDepartment;
    // }
    const isTopLevelChecked = this.items.at(0).value.isTopLevel;
    const existing = this.hierarchyService.getHierarchyData() || [];
    // ---------- EDIT MODE ----------
    if (this.isEditMode && this.editId !== undefined) {
      // console.log('Edit existing Hierarchy');
      // console.log('Edit id:', this.editId);
      // console.log('Existing items:', existing);
      // Update only the edited item (use editId)
      const idx = existing.findIndex(i => i.id === this.editId);
      // console.log('Edit index:', idx);
      if (idx !== -1) {
        existing[idx] = {
          ...existing[idx],
          ...formRows[0] // do not change ID here
        };
        // console.log('Updated item:', existing[idx]);
        // update BehaviorSubject and call update API
        this.hierarchyService['hierarchyData'].next([...existing]);
        this.updateHierarchyData([...existing]);
      } else {
        // Nothing to update; release the submit lock so user can try again
        this.isSubmitting = false;
      }
      return;
    }
    // ---------- CREATE MODE ----------
    // console.log('Create mode - building new items');
    let mergedResult: any[] = [...existing];
    // If sibling(top-level insertion) flow is used
    if (this.showTopLevelOption && isTopLevelChecked && this.parentId !== undefined) {
      // console.log('Sibling hierarchy creation');
      const parentIdx = mergedResult.findIndex(item => item.id === this.parentId);
      if (parentIdx !== -1) {
        // assign IDs for formRows if missing (we will use getNextId() and increment)
        let nextId = this.hierarchyService.getNextId();
        // assign id to first formRow only (since sibling flow typically just one row)
        if (!formRows[0].id) formRows[0].id = nextId++;
        const newItem = {
          ...formRows[0],
          parentId: this.parentId,
          isTopLevel: true,
          isTreeItem: this.isTreeForm
        };
        // reparent existing children of parent to newItem.id
        for (let i = 0; i < mergedResult.length; i++) {
          if (mergedResult[i].parentId === this.parentId) {
            mergedResult[i].parentId = newItem.id;
          }
        }
        mergedResult.splice(parentIdx + 1, 0, newItem);
        // console.log('Merged result:', mergedResult);
        this.hierarchyService['hierarchyData'].next([...mergedResult]);
        // call update/create
        this.createHierarchy(mergedResult);
        return;
      }
    }
    // Regular insertion (multiple rows under same parent)
    // 1) compute nextId based on existing mergedResult
    let nextId = (existing.length ? Math.max(...existing.map((x: any) => x.id || 0)) : 0) + 1;
    // 2) assign ids to rows that are missing them and push into mergedResult
    for (const row of formRows) {
      if (!row.id) {
        row.id = nextId++;
      }
      // ensure parentId is numeric and valid (default 0)
      row.parentId = Number(row.parentId) || 0;
      // insert new row into mergedResult
      const newItem: any = {
        id: row.id,
        designation: row.designation,
        department: row.department,
        escalationTime: row.escalationTime,
        isTopLevel: row.isTopLevel,
        isTreeItem: this.isTreeForm
      };
      // Only include parentId when it is not 0  
      if (row.parentId !== 0) {
        newItem.parentId = row.parentId;
      }
      mergedResult.push(newItem);
    }
    // 3) update service with merged result and call API
    this.hierarchyService.setHierarchyData(mergedResult, this.isTreeForm, undefined);
    // console.log('New merged hierarchy:', mergedResult);
    // finally call create API for new data
    this.createHierarchy(mergedResult);
  }

  async createHierarchy(obj: any) {
    // console.log('Hierarchy id:', this.hierarchyId);
    if (this.hierarchyId == undefined || this.hierarchyId == 0 || this.hierarchyId == null) {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          hierarchy_creation: {
            customer_id: this.hotel_id,
            member_id: this.member_id,
            hierarchy: obj
          }
        }
      }
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.CREATE_HIERARCHY).subscribe(
        resp => {
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.hierarchyId = resp.result.data[0].id;
              // console.log('Hierarchy id(once creation done):', this.hierarchyId);
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
                is_active: item.is_active
              }));
              this.hierarchyForm.reset();
              this.items.clear();
              this.addItem();
              this.hierarchyService.clearHierarchyData();
              // Navigate first, then show success so alert is visible on the target page
              this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]).then(() => {
                setTimeout(() => {
                  this.alertService.success('Hierarchy created successfully', this.options);
                }, 100);
              });
              this.isSubmitting = false;
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
          this.isSubmitting = false;
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
          this.isSubmitting = false;
        }
      )
    }
    else {
      // Existing hierarchy document (including the case where hierarchy array is empty).
      // Reuse the standard update flow so behaviour is consistent and simpler.
      // console.log('Existing hierarchy doc, updating with obj:', obj);
      this.updateHierarchyData(obj);
    }
  }


  getDepartmentsById(member_id: any) {
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: member_id
        }
      }
    };
    this.departmentService.getAllDepartments(jsonObj).subscribe(
      (resp: any) => {
        if (resp.success === 1 && resp.status_code === 200) {
          // Assigns department data
          this.departments = ['Default', ...resp.result.data.map((item: any) => item.name)];
          // console.log('Department Data in hierarchy form:', this.departments);
        } else {
          console.error('Failed to fetch department details:', resp.message);
          this.departments = [];
        }
      },
      (error: any) => {
        console.error('Error fetching department details:', error);
      }
    );
  }

  // Back button INSIDE the form: when opened via edit icon, go to view-customer-hierarchy
  onFormBack() {
    if (this.isEditMode && this.hierarchyId != null && this.hierarchyId !== undefined) {
      this.navigateToViewCustomerHierarchy();
    } else {
      this.backToContainer();
    }
  }

  /** Navigate to view-customer-hierarchy (used when leaving edit form via Back). */
  navigateToViewCustomerHierarchy() {
    this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]);
  }

  // Back button on button-container view: don't navigate away,
  // just go back to the button-container view
  backToContainer() {
    this.showForm = false;
    this.isEditMode = false;
    this.editId = undefined;
    this.hierarchyForm.reset();
    this.items.clear();
  }

  navigateToBack() {
    // Case 1: No hierarchy record yet (new creation) → go back to member-hierarchy
    const noHierarchyId =
      this.hierarchyId === 0 || this.hierarchyId === undefined || this.hierarchyId === null;
    // Case 2: Existing hierarchy record but hierarchy array is empty → also go to member-hierarchy
    const existingButEmptyHierarchy =
      !noHierarchyId &&
      Array.isArray(this.hierarchyData) &&
      this.hierarchyData.length === 0
    if (noHierarchyId || existingButEmptyHierarchy) {
      this.router.navigate(['/member-hierarchy']);
    } else {
      // Normal case: existing hierarchy with items → go back to view-customer-hierarchy
      this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]);
    }
  }

  updateHierarchyData(obj: any) {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        hierarchy_updation: {
          "hierarchy": obj
        }
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
            this.hierarchyService.clearHierarchyData();
            // Navigate first, then show success so alert is visible on the target page
            this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]).then(() => {
              setTimeout(() => {
                this.alertService.success('Hierarchy updated successfully', this.options);
              }, 100);
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
  blockInvalidKeys(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    // if (event.key === '.' || event.key === '-' || event.key === 'e' || event.key === 'E') {
    if (['.', '-', 'e', 'E'].includes(event.key) || (event.key === '0' && input.value === '')) {
      event.preventDefault();
    }
  }

  handleEscalationPaste(event: ClipboardEvent) {
    const pastedData = event.clipboardData?.getData('text') || '';
    // Block if contains 'e', 'E', '.', '-' or starts with '0' or contains non-digits
    if (/[eE.-]/.test(pastedData) || /^0/.test(pastedData) || !/^\d+$/.test(pastedData)) {
      event.preventDefault();
    }
  }

  isRowTopLevel(itemForm: any): boolean {
    const parentIdCtrl = itemForm.get('parentId');
    if (!parentIdCtrl) {
      return true;
    }
    const val = parentIdCtrl.value;
    return val === 0 || val === null || val === undefined;
  }
}
