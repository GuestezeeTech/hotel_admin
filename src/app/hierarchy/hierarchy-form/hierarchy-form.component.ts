import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HierarchyService, HierarchyItem } from '../hierarchy.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../app.config';
// import { HierarchyService, HierarchyItem } from '../../services/hierarchy.service';

@Component({
  selector: 'app-hierarchy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  constructor(
    private formBuilder: FormBuilder,
    private hierarchyService: HierarchyService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private alertService: AlertsService,
    private authTokenService: AuthTokenService
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
      // Check if we are in edit mode
      if (navigation.extras.state['editId'] !== undefined) {
        this.editId = navigation.extras.state['editId'];
        this.isEditMode = true;
      }
    }
  }

  ngOnInit() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id != null && id != undefined && id != "") {
      this.hierarchyId = Number(id);
      this.getHierarchyById(this.hierarchyId);
    }
    if (this.parentDepartment != "") {
      this.hierarchyForm.get('parentDepartment')?.setValue(this.parentDepartment);
    }
    if (this.isEditMode && this.editId !== undefined) {
      // Load the item data and populate the form
      const item = this.hierarchyService.getHierarchyData().find(i => i.id === this.editId);
      if (item) {
        this.items.clear();
        const itemForm = this.formBuilder.group({
          designation: [item.designation, Validators.required],
          escalationTime: [item.escalationTime, [Validators.required, Validators.min(1)]],
          // department: [item.department]
          // Newly added for field disable
          department: [{ value: item.department, disabled: true }]
        });
        this.items.push(itemForm);
      }
      this.showForm = true;
    }
  }

  get items() {
    return this.hierarchyForm.get('items') as FormArray;
  }

  addItem() {
    const isParentDepartmentPresent = !!this.parentDepartment; // true if not empty
    const itemForm = this.formBuilder.group({
      designation: ['', Validators.required],
      escalationTime: ['', [Validators.required, Validators.min(1)]],
      // department: [''],

      // Newly added for field disable
      department: [{ value: this.parentDepartment, disabled: isParentDepartmentPresent }],
      isTopLevel: [false]
    });
    // console.log("department", this.parentDepartment);
    this.items.push(itemForm);
    // Newly commented this code
    // const firstItemValue = this.items.at(0).value;
    // //console.log("123", firstItemValue, this.hierarchyData);
    // let length = this.hierarchyData.length - 1;
    // //  this.hierarchyForm.controls['department'].setValue( this.hierarchyData[length].department);
    // itemForm.patchValue({
    //   department: this.hierarchyData[length].department,
    // });
  }

  showOneLevelForm() {
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
  //   //console.log("1")
  //   if (this.hierarchyForm.valid) {
  //     //console.log("1", this.items)
  //     const formData: HierarchyItem[] = this.items.value;
  //     //console.log(formData)
  //     if (this.parentDepartment != "") {
  //       formData[0].department = this.parentDepartment;
  //     }
  //     const isTopLevelChecked = this.items.at(0).value.isTopLevel;
  //     if (this.isEditMode && this.editId !== undefined) {
  //       // Update the item in service
  //       const all = this.hierarchyService.getHierarchyData();
  //       const idx = all.findIndex(i => i.id === this.editId);
  //       if (idx !== -1) {
  //         all[idx] = {
  //           ...all[idx],
  //           ...formData[0]
  //         };
  //         this.hierarchyService['hierarchyData'].next([...all]);
  //         //console.log("11", [...all]);
  //         this.updateHierarchyData([...all]);
  //       }
  //     }
  //     else {
  //       if (this.showTopLevelOption && isTopLevelChecked && this.parentId !== undefined) {
  //         //console.log(formData[0].department, " formData[0].department")
  //         // Insert as sibling right after the parent, and move all parent's children under the new item
  //         const data = this.hierarchyService.getHierarchyData();
  //         //console.log(data, "data");
  //         const parentIdx = data.findIndex(item => item.id === this.parentId);
  //         if (parentIdx !== -1) {
  //           // Find all children of the parent
  //           const children = data.filter(item => item.parentId === this.parentId);
  //           // Add new item after parent
  //           const newId = this.hierarchyService['getNextId']();
  //           //console.log(newId, "newId")
  //           //console.log('Before Top Level logic:', JSON.stringify(data, null, 2));
  //           const newItem = {
  //             ...formData[0],
  //             id: newId,
  //             parentId: this.parentId,
  //             isTopLevel: true
  //           };
  //           // Move all direct children (except the new one) to be children of the new item
  //           // Re-parent all current direct children to the new node (except the new node itself)
  //           for (let i = 0; i < data.length; i++) {
  //             if (data[i].parentId === this.parentId) {
  //               data[i].parentId = newId;
  //             }
  //           }
  //           // Insert the new child as the only direct child of the parent
  //           data.splice(parentIdx + 1, 0, newItem);
  //           //console.log('After Top Level logic:', JSON.stringify(data, null, 2));
  //           this.hierarchyService['hierarchyData'].next([...data]);
  //         }
  //       }
  //       else {
  //         this.hierarchyService.clearHierarchyData();
  //         this.hierarchyService.setHierarchyData(formData, this.isTreeForm, this.parentId);
  //         // //console.log(formData,this.isTreeForm, this.parentId,'formdata',newId);
  //         // let array = [];
  //         // array=formData;
  //         // array.push({
  //         //   "isTreeItem":this.isTreeForm,"dta":this.parentId
  //         // })
  //       }
  //       let array = [];
  //       array = this.hierarchyService.getHierarchyData()
  //       //console.log("array value ", array)
  //       this.createHierarchy(array);
  //     }
  //   }
  // }

  onSubmit() {
    if (!this.hierarchyForm.valid) return;

    const formData: HierarchyItem[] = this.items.value;
    if (this.parentDepartment) formData[0].department = this.parentDepartment;
    const isTopLevelChecked = this.items.at(0).value.isTopLevel;

    const allData = this.hierarchyService.getHierarchyData();

    if (this.isEditMode && this.editId !== undefined) {
      // 🔹 Update existing node
      const idx = allData.findIndex(i => i.id === this.editId);
      if (idx !== -1) {
        allData[idx] = { ...allData[idx], ...formData[0] };
        this.hierarchyService['hierarchyData'].next([...allData]);
        this.updateHierarchyData([...allData]);
      }
    } else {
      let newItem: HierarchyItem;

      if (this.showTopLevelOption && isTopLevelChecked && this.parentId !== undefined) {
        // 🔹 Top-level logic
        const parentIdx = allData.findIndex(item => item.id === this.parentId);
        if (parentIdx !== -1) {
          const newId = this.hierarchyService.getNextId();
          newItem = { ...formData[0], id: newId, parentId: this.parentId, isTopLevel: true };

          // Re-parent existing children under new top-level node
          allData.forEach(item => {
            if (item.parentId === this.parentId) item.parentId = newId;
          });

          // Insert new node after parent
          allData.splice(parentIdx + 1, 0, newItem);
        }
      } else {
        // 🔹 Normal node logic
        const newId = this.hierarchyService.getNextId();
        newItem = { ...formData[0], id: newId, parentId: this.parentId, isTreeItem: this.isTreeForm };
        allData.push(newItem);
      }

      // Update the BehaviorSubject
      this.hierarchyService['hierarchyData'].next([...allData]);

      // Send to backend
      this.createHierarchy([...allData]);
    }
  }

  async createHierarchy(obj: any) {
    //console.log("create obj", obj);
    if (this.hierarchyId == undefined || this.hierarchyId == 0 || this.hierarchyId == null) {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          hierarchy_creation: {
            "hierarchy": obj
          }
        }
      }
      this.hierarchyService.apiCall(requestBody, ENDPOINTS.CREATE_HIERARCHY).subscribe(
        resp => {
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.hierarchyId = resp.result.data[0].id;
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
                // `isTreeItem` and `parentId` are set by the method
              }));
              // this.hierarchyService.setHierarchyData(  this.hierarchyData, this.isTreeForm, this.parentId);
              this.hierarchyForm.reset();
              this.items.clear();
              this.addItem();
              this.hierarchyService.clearHierarchyData();
              this.router.navigate(['/view-customer-hierarchy', this.hierarchyId])
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
    else {
      delete this.getdataforupdate[0]._id;
      //console.log(this.getdataforupdate, " this.getdataforupdate")
      if (obj.length == 1) {
        this.getdataforupdate[0].hierarchy.push(obj[0]);
      }
      else {
        for (let t = 0; t < obj.length; t++) {
          this.getdataforupdate[0].hierarchy.push(obj[t]);
        }
      }
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          hierarchy_updation: this.getdataforupdate[0]
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
              this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]);
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
  }

  getHierarchyById(hierarchyId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
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
              // `isTreeItem` and `parentId` are set by the method
            }));
            // this.hierarchyService.setHierarchyData(hierarchyItems, this.isTreeForm, this.parentId);
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
    //console.log(obj, "obj")
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
    //console.log("123")
    this.hierarchyService.apiCall(requestBody, ENDPOINTS.UPDATE_HIERARCHY).subscribe(
      resp => {
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            // this.getHierarchyById(Number(this.hierarchyId))
            // .then(() => {
            this.hierarchyService.clearHierarchyData();
            this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]);
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

  //Newly added - back btn functionality
  back() {
    this.router.navigate(['/view-customer-hierarchy', this.hierarchyId]);
  }

}