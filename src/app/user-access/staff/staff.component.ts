import { StaffListingService } from './../staff-listing/staff-listing.service';
import { HierarchyDetailService } from './../../hotel-enrollment-tabview/hierarchy-details/hierarchy-details.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { LoaderService } from './../../shared/loader/loader.service';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffService } from './staff.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { ENDPOINTS } from './../../app.config';


@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, AlertsComponent, ReactiveFormsModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss'
})

export class StaffComponent implements OnInit {
  staffForm !: FormGroup;
  showalertmsg: boolean = false;
  validateForm: boolean = false;
  hotelId: any;
  alertOptions = {
    autoClose: true,
    keepAfterRouteChange: true
  };
  name: any;
  // For modal
  isExitModalOpen: boolean = false;
  // Department data's 
  departmentList = [
    "Sales",
    "Marketing",
    "IT",
    "Finance",
    "HR",
    "Operations",
    "Customer Service",
    "Research and Development",
    "Procurement",
    "Logistics"
  ];
  // Supervisor data's
  supervisorList: any;
  // supervisorList = [
  //   "John Smith",
  //   "Jane Doe",
  //   "Michael Brown",
  //   "Emily Chen",
  //   "David Lee",
  //   "Sarah Taylor",
  //   "Kevin White",
  //   "Rebecca Hall",
  //   "James Davis",
  //   "Lisa Nguyen"
  // ];
  // For room no
  roomDropdownOpen = false;
  roomRanges: string[] = ['101-150', '151-200', '201-250', '251-300'];
  selectedRooms: string[] = [];
  //  For shift time
  selectedSlots: { start: string; end: string }[] = [];
  selectedShiftTimes: string[] = [];
  shiftDropdownOpen = false;
  // Hierarchy
  customerHierarchy: any;
  customerHierarchydata: any;
  hierarchyParentIds: any;
  supervisorChildList: any;
  staffId: any;
  editScreen: boolean = false;
  enableEdit = false;
  // Created
  createdById: any;
  createdByName: any;
  officer: any;
  officersData: any = [];
  staff: any = [];
  matchedStaff: boolean = false;
  staff_member_id: any;

  constructor(
    private formBuilder: FormBuilder,
    private routerUrl: Router,
    private localStorageService: LocalStorageService,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private staffService: StaffService,
    private router: ActivatedRoute,
    private hierarchyService: HierarchyDetailService,
    private staffListingService: StaffListingService
  ) { }

  ngOnInit(): void {
    // Initialize the form with validation rules
    this.staffForm = new FormGroup({
      email: this.formBuilder.control('', [Validators.required, Validators.email]),
      full_name: this.formBuilder.control('', [Validators.required, Validators.maxLength(30),]),
      phone_number: this.formBuilder.control('', [Validators.required, Validators.maxLength(10), Validators.pattern("^((\\+91-?)|0)?[6-9][0-9]{9}$")]),
      // employee_id: this.formBuilder.control('', [Validators.required]),
      higher_level_hierarchy: this.formBuilder.control('', [Validators.required]),
      higher_level_officer: this.formBuilder.control('', [Validators.required]),
      hierarchy: this.formBuilder.control('', [Validators.required]),
      shift_time: this.formBuilder.control('', [Validators.required]),
      room_no: this.formBuilder.control('', [Validators.required]),
      is_staff_active: this.formBuilder.control(true),
      at_desk: this.formBuilder.control('', [Validators.required]),
    })
    // For gettting time slots from settings module
    const slots = this.localStorageService.get('selectedSlots');
    this.selectedSlots = slots ? JSON.parse(slots) : [];
    //console.log('Selected Slots:', this.selectedSlots);
    // For getting customer id
    this.hotelId = Number(this.localStorageService.get('UserId'));
    this.createdByName = this.localStorageService.get('Name')
    this.getCustomerHierarchy();
    // For member id
    //console.log('Member Id:', this.localStorageService.get('MemberId'));
    // For getting id from router
    if (this.router.snapshot.params['id'] !== undefined) {
      this.staffId = this.router.snapshot.params['id'];
      this.setInitialValues(this.staffId);
      this.enableEdit = true;
    } else {
      this.editScreen = false;
      // For gettting customer name
      this.createdById = Number(this.localStorageService.get('UserId'));
    }
    // this.editScreen = this.enableEdit;
  }

  // For setting existing values
  // setInitialValues(staffId: any) {
  //   this.staffId = staffId;
  //   let jsonObj = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": {
  //         "id": Number(staffId)
  //       }
  //     }
  //   }
  //   this.loaderService.emitLoading();
  //   this.staffService.getStaffById(jsonObj).subscribe((resp: any) => {
  //     if (resp.success === 1 && resp.status_code === 200) {
  //       let respData = resp.result.data[0];
  //       //console.log('Staff data:', respData)
  //       this.staffForm.patchValue({
  //         email: respData.email,
  //         full_name: respData.full_name,
  //         phone_number: respData.phone_number,
  //         higher_level_hierarchy: respData.higher_level_hierarchy.designation + '-' + respData.higher_level_hierarchy.department,
  //         hierarchy: respData.hierarchy.designation + '-' + respData.hierarchy.department,
  //         room_no: respData.room_no,
  //         shift_time: respData.shift_time,
  //         created_by: respData.created_by,
  //         is_staff_active: respData.is_staff_active,
  //       })
  //     }
  //     else {
  //       this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //     }
  //   },
  //     err => {
  //       if (err.error.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.alertOptions)
  //         this.routerUrl.navigate([`/login`], { skipLocationChange: false });
  //       }

  //       else if (err.error.message) {
  //         this.alertService.error(err.error.message, this.alertOptions)
  //       }
  //       else {
  //         this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //       }
  //     })

  // }

  // For throwing error
  get f() { return this.staffForm.controls; }

  // For saving the new staff form
  saveForm() {
    this.alertService.clear();
    this.showalertmsg = true;
    //console.log('Valid form:', this.staffForm.valid)
    // if (!this.matchedStaff) {
    //   this.alertService.error('No officer found for the selected hierarchy.', this.alertOptions);
    // }
    if (this.staffForm.valid) {
      this.validateForm = false;
      this.loaderService.emitLoading();
      const selectedOfficer = this.staffForm.get('higher_level_officer')?.value;
      let officerDetails;
      if (selectedOfficer) {
        officerDetails = {
          id: selectedOfficer.id,
          name: selectedOfficer.full_name,
          phone_number: selectedOfficer.phone_number
        };
        //console.log('Selected Officer:', officerDetails);
      }
      var payloadData = {
        email: this.staffForm.value.email,
        full_name: this.staffForm.value.full_name,
        phone_number: this.staffForm.value.phone_number,
        employee_id: this.staffForm.value.employee_id,
        higher_level_hierarchy: this.staffForm.value.higher_level_hierarchy,
        hierarchy: this.staffForm.value.hierarchy,
        at_desk: this.staffForm.value.at_desk,
        room_no: this.selectedRooms,
        shift_time: this.selectedShiftTimes,
        created_by_id: this.createdById,
        created_by_name: this.createdByName,
        is_staff_active: this.staffForm.value.is_staff_active,
        member_id: this.localStorageService.get('MemberId'),
        //member_id: 'STN0001',
        higher_level_officer: officerDetails
      }
      let requestData: any = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: {
          staff_creation: payloadData
        }
      }
      //console.log('Payload:', payloadData)
      this.staffService.addStaff(requestData).subscribe(resp => {
        this.loaderService.emitComplete();
        if (resp) {
          if (resp.success === 1 && resp.status_code === 200) {
            this.staffService.clearAdminFormEvent();
            //console.log('Staff creation response:', resp);
            this.alertService.success(resp.message, this.alertOptions);
            setTimeout(() => this.routerUrl.navigate(['/staff-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
          }
          else if (resp.success === 0) {
            if (resp.message) {
              this.alertService.error(resp.message, this.alertOptions);
            }
          }
          else if (resp.message && resp.status_code !== 200) {
            this.alertService.error(resp.message, this.alertOptions);
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
          }
        }
        else {
          this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
        }
      },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.alertOptions)
            this.routerUrl.navigate([`/login`], { skipLocationChange: false });
          }
          else if (err.error.message) {
            this.alertService.error(err.error.message, this.alertOptions)
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
          }
        })
    }
    else {
      this.validateForm = true;
    }
  }

  // For saving the existing staff form
  saveFormChanges() {
    //this.alertService.clear();
    this.editScreen = this.enableEdit;
    this.showalertmsg = true;
    this.staffForm.get('room_no')?.setValue(this.selectedRooms.length ? this.selectedRooms : null);
    this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes.length ? this.selectedShiftTimes : null);
    this.staffForm.updateValueAndValidity();
    //console.log(this.staffForm, "this.usersForm.valid")
    //console.log(this.staffForm.valid, "this.usersForm.valid", this.staffForm.errors);
    Object.keys(this.staffForm.controls).forEach(field => {
      const control = this.staffForm.get(field);
      //console.log(`Field: ${field}, Valid: ${control?.valid}, Errors:`, control?.errors);
    });
    if (this.staffForm.valid) {
      this.loaderService.emitLoading();
      this.validateForm = false;
      var payloadData = {
        email: this.staffForm.value.email,
        full_name: this.staffForm.value.full_name,
        phone_number: this.staffForm.value.phone_number,
        staff_member_id: this.staff_member_id,
        higher_level_hierarchy: this.staffForm.value.higher_level_hierarchy,
        at_desk: this.staffForm.value.at_desk,
        hierarchy: this.staffForm.value.hierarchy,
        room_no: this.selectedRooms.length ? this.selectedRooms : null,
        shift_time: this.selectedShiftTimes.length ? this.selectedShiftTimes : null,
        is_staff_active: this.staffForm.value.is_staff_active,
        created_by_id: this.createdById,
        created_by_name: this.createdByName,
      }
      //UPDATE CALL
      if (this.editScreen) {
        //console.log('Edit1:', this.editScreen)
        let formatJson = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          payload: {
            staff_updation: payloadData
          },
          extras: {
            find: {
              id: Number(this.staffId)
            }
          }
        }
        this.staffService.updateStaff(formatJson).subscribe((resp: any) => {
          this.loaderService.emitComplete();
          if (resp) {
            if (resp.success === 1 && resp.status_code === 200) {
              this.alertService.success(resp.message, this.alertOptions);
              setTimeout(() => this.routerUrl.navigate(['/staff-list'], { state: { result: resp.message }, relativeTo: this.router, skipLocationChange: false }), 1000)
            }
            else if (resp.success === 0) {
              if (resp.message) {
                this.alertService.error(resp.message, this.alertOptions);
              }
            }
            else if (resp.message && resp.status_code !== 200) {
              this.alertService.error(resp.message, this.alertOptions);
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          }
          else {
            this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
          }
        },
          (err: any) => {
            this.loaderService.emitComplete();
            if (err.error.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.alertOptions)
              this.routerUrl.navigate([`/login`], { skipLocationChange: false });
            }
            else if (err.error.message) {

              this.alertService.error(err.error.message, this.alertOptions)
            }
            else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          })
      }
    }
    else {
      this.validateForm = true;
    }
  }

  setInitialValues(staffId: any) {
    this.staffId = staffId;
    let jsonObj = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "id": Number(staffId)
        }
      }
    }
    this.loaderService.emitLoading();
    this.staffService.getStaffById(jsonObj).subscribe((resp: any) => {
      if (resp.success === 1 && resp.status_code === 200) {
        let respData = resp.result.data[0];
        //console.log('Staff data:', respData);
        // Set selected checkboxes
        this.selectedRooms = respData.room_no || [];
        this.selectedShiftTimes = respData.shift_time?.map((t: any) => t.split(' - ')[0]) || [];
        const selectedSupervisor = this.supervisorList.find((s: any) =>
          s.designation === respData.higher_level_hierarchy.designation &&
          s.department === respData.higher_level_hierarchy.department
        );
        // Created by id
        this.createdById = respData.created_by_id;
        // Officer data
        // Member id
        this.staff_member_id = respData.staff_employee_number;
        this.staffForm.patchValue({
          email: respData.email,
          full_name: respData.full_name,
          phone_number: respData.phone_number,
          higher_level_hierarchy: selectedSupervisor,
          is_staff_active: respData.is_staff_active,
        });
        // Hierarchy value
        if (selectedSupervisor) {
          this.supervisorChildList = this.customerHierarchydata.hierarchy.filter(
            (item: any) => item.parentId === selectedSupervisor.id
          );
          const selectedHierarchy = this.supervisorChildList.find((child: any) =>
            child.designation === respData.hierarchy?.designation &&
            child.department === respData.hierarchy?.department
          );
          this.staffForm.patchValue({
            hierarchy: selectedHierarchy,
            // higher_level_officer: respData.higher_level_officer.name + '-' + respData.higher_level_officer.phone_number,
          });

        }
      } else {
        this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
      }
    }, err => {
      if (err.error.statusCode === 403) {
        this.alertService.error('Session Time Out! Please login Again', this.alertOptions)
        this.routerUrl.navigate([`/login`], { skipLocationChange: false });
      } else if (err.error.message) {
        this.alertService.error(err.error.message, this.alertOptions)
      } else {
        this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
      }
    });
  }

  // For getting higher level hierarchies
  getCustomerHierarchy(): void {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": {
          "customer_id": Number(this.hotelId)
        }
      }
    };
    this.hierarchyService.getAllHierarchy(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          this.customerHierarchy = resp.result.data[0];
          //console.log("Fetched customer hierarchy:", this.customerHierarchy);
          this.customerHierarchydata = resp.result.data[0];
          this.hierarchyParentIds = [
            ...new Set(
              this.customerHierarchydata.hierarchy
                .map((item: any) => item.parentId)
                .filter((id: any) => id != null)
            )
          ];
          //console.log('Hierarchy parent ids:', this.hierarchyParentIds)
          this.supervisorList = this.customerHierarchydata.hierarchy.filter(
            (item: any) =>
              this.hierarchyParentIds.includes(item.id)
          );
          //console.log('Supervisor List:', this.supervisorList);
        } else {
          const message = resp?.message || 'Something bad happened. Please try again!';
          this.alertService.error(message, this.alertOptions);
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertService.error(errorMsg, this.alertOptions);
        if (err?.error?.statusCode === 403) {
          this.routerUrl.navigate(['/login'], { skipLocationChange: false });
        }
      }
    );
  }

  // For getting child level hierarchies
  // getChildHierarchy(selectedId: any) {
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     "extras": {
  //       "find": {
  //         "customer_id": Number(this.hotelId)
  //       }
  //     }
  //   };
  //   this.hierarchyService.getAllHierarchy(requestBody).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp?.success === 1 && resp.status_code === 200) {
  //         // this.customerHierarchy = resp.result.data[0];
  //         this.customerHierarchydata = resp.result.data[0];
  //         //console.log("Fetched customer hierarchy:", this.customerHierarchydata);
  //         this.supervisorChildList = this.customerHierarchydata.hierarchy.filter(
  //           (item: any) =>
  //             selectedId == item.parentId
  //         );
  //         //console.log('Supervisor Child List:', this.supervisorChildList);
  //         //console.log('Selected Hierarchy ID:', selectedId);
  //         this.getOfficerDetails(selectedId);
  //       } else {
  //         const message = resp?.message || 'Something bad happened. Please try again!';
  //         this.alertService.error(message, this.alertOptions);
  //       }
  //     },
  //     (err: any) => {
  //       this.loaderService.emitComplete();
  //       const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
  //       this.alertService.error(errorMsg, this.alertOptions);
  //       if (err?.error?.statusCode === 403) {
  //         this.routerUrl.navigate(['/login'], { skipLocationChange: false });
  //       }
  //     }
  //   );
  // }

  onDeskChange() {
    const selectedHierarchyId = this.staffForm.get('higher_level_hierarchy')?.value?.id;
    if (selectedHierarchyId) {
      this.getChildHierarchy(selectedHierarchyId);
    }
  }

  getChildHierarchy(selectedId: any) {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_id: Number(this.hotelId)
        }
      }
    };
    this.hierarchyService.getAllHierarchy(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          this.customerHierarchydata = resp.result.data;
          //console.log("Fetched customer hierarchy:", this.customerHierarchydata);
          const deskValue = this.staffForm.get('at_desk')?.value;
          // Collect and flatten all hierarchy entries from the array
          let allHierarchies = this.customerHierarchydata.flatMap((item: any) => item.hierarchy || []);
          // Filter based on desk value
          if (deskValue === 'true') {
            this.supervisorChildList = allHierarchies.filter(
              (item: any) => selectedId === item.parentId && item.sequence == 2
            );
          } else {
            this.supervisorChildList = allHierarchies.filter(
              (item: any) => selectedId === item.parentId
            );
          }
          //console.log('Supervisor Child List:', this.supervisorChildList);
          this.getOfficerDetails(selectedId);
        } else {
          const message = resp?.message || 'Something bad happened. Please try again!';
          this.alertService.error(message, this.alertOptions);
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertService.error(errorMsg, this.alertOptions);
        if (err?.error?.statusCode === 403) {
          this.routerUrl.navigate(['/login'], { skipLocationChange: false });
        }
      }
    );
  }

  getOfficerDetails(selectedId: any): void {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: this.localStorageService.get('MemberId')
        }
      }
    }
    this.staffListingService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          const staffList = resp.result.data;
          //console.log('Selected Parent Hierarchy ID:', selectedId);
          //console.log('Staff List:', staffList);
          const matchedStaff = staffList.filter((staff: any) => staff.hierarchy?.id === selectedId);
          this.officersData = matchedStaff;
          //console.log('Matched Staff:', matchedStaff);
          //console.log('Officers Data:', this.officersData);
          if (matchedStaff.length == 0) {
            // this.showNoOfficerModal();
            //   this.officer = {
            //     id: matchedStaff.id,
            //     name: matchedStaff.full_name,
            //     phone_number: matchedStaff.phone_number
            //   };
            //   this.matchedStaff = true;
            //   //console.log('Matched Officer:', this.officer);
          }
          // else {
          //   this.officer = {};
          //   this.showNoOfficerModal(); // Triggers modal if no matching staff
          // }
        }
        else {
          const message = resp?.message || 'Something bad happened. Please try again!';
          this.alertService.error(message, this.alertOptions);
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        // this.alertService.error(errorMsg, this.alertOptions);
        if (err?.error?.statusCode === 403) {
          this.routerUrl.navigate(['/login'], { skipLocationChange: false });
        }
      }
    );
  }

  showNoOfficerModal() {
    this.matchedStaff = false;
    // setTimeout(() => {
    this.alertService.error('No officer found for the selected hierarchy.', this.alertOptions);
    // },200);
  }

  openExitModal() {
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
  }

  navigateToStaff() {
    this.isExitModalOpen = false;
    this.routerUrl.navigate(['/staff-list']);
  }

  // For storing room no's in an array
  onRoomSelect(room: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedRooms.push(room);
    } else {
      this.selectedRooms = this.selectedRooms.filter(r => r !== room);
    }
    this.staffForm.get('room_no')?.setValue(this.selectedRooms.length > 0 ? this.selectedRooms : null);
    this.staffForm.get('room_no')?.updateValueAndValidity();
  }

  // For storing shift times in an array
  // onShiftSelect(slot: any, event: Event): void {
  //   const isChecked = (event.target as HTMLInputElement).checked;
  //   if (isChecked) {
  //     // Convert shift time object to string like "09:00 AM - 06:00 PM"
  //     const shiftTimeString = `${slot.start} - ${slot.end}`;
  //     if (!this.selectedShiftTimes.includes(shiftTimeString)) {
  //       this.selectedShiftTimes.push(shiftTimeString);
  //     }
  //   } else {
  //     const shiftTimeString = `${slot.start} - ${slot.end}`;
  //     this.selectedShiftTimes = this.selectedShiftTimes.filter(s => s !== shiftTimeString);
  //   }
  //   this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes.length > 0 ? this.selectedShiftTimes : null);
  //   this.staffForm.get('shift_time')?.updateValueAndValidity();
  // }

  onShiftSelect(slot: any, event: any): void {
    if (event.target.checked) {
      if (!this.selectedShiftTimes.includes(slot.start + "-" + slot.end)) {
        this.selectedShiftTimes.push(slot.start + "-" + slot.end);
      }
    } else {
      this.selectedShiftTimes = this.selectedShiftTimes.filter(time => time !== slot.start + "-" + slot.end);
    }
    //console.log('Selected Shift Times:', this.selectedShiftTimes);
    this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes);
    this.staffForm.get('shift_time')?.updateValueAndValidity();
  }

}
