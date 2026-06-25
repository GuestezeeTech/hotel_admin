import { HierarchyService } from './../../hierarchy/hierarchy.service';
import { StaffListingService } from './../staff-listing/staff-listing.service';
import { HierarchyDetailService } from './../../hotel-enrollment-tabview/hierarchy-details/hierarchy-details.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { LoaderService } from './../../shared/loader/loader.service';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffService } from './staff.service';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { ENDPOINTS } from './../../app.config';
import { UserAccessService } from '../user-access.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { HostListener } from '@angular/core';

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
  // For room no
  roomDropdownOpen = false;
  // roomRanges: string[] = ['101-150', '151-200', '201-250', '251-300'];
  roomRanges: any[] = []
  selectedRooms: any[] = [];
  //  For shift time
  selectedSlots: any = [];
  selectedShiftTimes: any[] = [];
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
  isFirstStaff: any = false;
  dh: any;
  password: any;
  // For showing higher level officer
  showHigherLevelOfficer: boolean = true; // While viewing
  defaultHierarchy: any;
  showLowestHigherLevelOfficer: boolean = true; // While creating / editing (selects lower)
  showInitalHigherLevelOfficer!: boolean; // While creating (selects higher)
  filteredRoomRanges: any[] = []; // rooms allowed for current officer
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  memberId: any;
  memberIdDisplay: any;
  hierarchyDropdownOpen: boolean = false;
  selectedHierarchies: any[] = [];
  officerDropdownOpen: boolean = false;
  selectedOfficers: any[] = [];
  selectedStaffHierarchies: any[] = [];
  staffHierarchyDropdownOpen: boolean = false;
  hierarchyOptions: any;
  // View-only mode (when opened from eye icon)
  isViewMode: boolean = false;
  showPassword: boolean = false;
  isPageLoading: boolean = false; //newly added for loader


  constructor(
    private formBuilder: FormBuilder,
    private routerUrl: Router,
    private localStorageService: LocalStorageService,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private staffService: StaffService,
    private router: ActivatedRoute,
    private hierarchyService: HierarchyDetailService,
    private staffListingService: StaffListingService,
    private hierarchyLowestService: HierarchyService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private eRef: ElementRef,
    private cdRef: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    // read service flags set by listing-->First staff creation
    // this.isFirstStaff = this.staffService.isFirstStaff;
    // Newld added & commented - for higher level hierarchy
    // this.isFirstStaff = JSON.parse(this.localStorageService.get('isFirstStaff') || 'false');
    this.isFirstStaff = this.localStorageService.get('isFirstStaff') === 'true';
    // Ended
    // console.log('Is first staff while creating:', this.isFirstStaff);
    // this.dh = this.staffService.defaultHierarchy;
    if (this.isFirstStaff) {
      this.dh = await this.staffService.getDefaultHierarchyForFirstStaff();
      // console.log('Default hierarchy while creating:', this.dh);
    }
    // Initialize the form with validation rules
    this.staffForm = new FormGroup({
      email: this.formBuilder.control('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9%+]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/)]),
      full_name: this.formBuilder.control('', [Validators.required, Validators.maxLength(30), Validators.minLength(3)]),
      phone_number: this.formBuilder.control('', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9]{10}$/)]),
      // employee_id: this.formBuilder.control('', [Validators.required]),
      // higher_level_hierarchy: this.formBuilder.control('', [Validators.required]),
      // higher_level_officer: this.formBuilder.control(null),
      // hierarchy: this.formBuilder.control('', [Validators.required]),
      higher_level_hierarchy: this.formBuilder.control([], [Validators.required]),
      higher_level_officer: this.formBuilder.control([], []), // optional initially
      hierarchy: this.formBuilder.control([], [Validators.required]),
      shift_time: this.formBuilder.control('', [Validators.required]),
      room_no: this.formBuilder.control('', [Validators.required]),
      is_staff_active: this.formBuilder.control(true),
      at_desk: this.formBuilder.control('', [Validators.required]),
      password: this.formBuilder.control('', [Validators.required, Validators.minLength(6), Validators.maxLength(30),]),
      //  Newly commented because no need of fo desk 
      // front_office_desk: this.formBuilder.control(false)
      // End of newly commented code
    })
    // Apply conditional validator for higher_level_officer
    this.updateHigherLevelOfficerValidator();
    // For gettting time slots & room range from settings module
    // const slots = this.localStorageService.get('selectedSlots');
    // this.selectedSlots = slots ? JSON.parse(slots) : [];
    // console.log('Selected Slots:', this.selectedSlots);
    // const room_ranges = this.localStorageService.get('roomRange');
    // this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
    // console.log('Selected Room Range:', this.roomRanges);
    // For getting customer id
    this.hotelId = Number(this.localStorageService.get('UserId'));
    // console.log('Hotel Id:', this.hotelId);
    // this.getCustomerById();
    this.createdByName = this.localStorageService.get('Name')
    this.getCustomerHierarchy();
    // For member id
    //console.log('Member Id:', this.localStorageService.get('MemberId'));
    // For getting id from router
    // if (this.router.snapshot.params['id'] !== undefined) {
    //   this.staffId = this.router.snapshot.params['id'];
    //   this.setInitialValues(this.staffId);
    //   this.enableEdit = true;
    // } else {
    //   this.editScreen = false;
    //   // For gettting customer name
    //   this.createdById = Number(this.localStorageService.get('UserId'));
    // }
    // this.editScreen = this.enableEdit;

    // Detect if opened in view-only mode
    const navState = window.history.state as any;
    this.isViewMode = navState?.mode === 'view';
// Newly added for loading
    const isEditOrView = this.router.snapshot.params['id'] !== undefined;
    if (isEditOrView) {
      this.isPageLoading = true;
    }

    try {
      // Wait for customer data to be fetched
      await this.getCustomerById();
      // Only after getting customer info, handle edit/add logic
      if (this.router.snapshot.params['id'] !== undefined) {
        this.staffId = this.router.snapshot.params['id'];
        this.setInitialValues(this.staffId); // <-- call only after getCustomerById
        this.enableEdit = true;
      } else {
        this.editScreen = false;
        this.createdById = Number(this.localStorageService.get('UserId'));
        this.isPageLoading = false; // Ensure it's false for creation and newly added for loading
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      this.isPageLoading = false;// newly added for loading
    }

    // If in view mode, disable the entire form so nothing can be edited
    if (this.isViewMode) {
      this.staffForm.disable({ emitEvent: false });
    }
  }

  // For throwing error
  get f() { return this.staffForm.controls; }

  updateHigherLevelOfficerValidator() {
    const officerControl = this.staffForm.get('higher_level_officer');
    if (!this.isFirstStaff && this.showHigherLevelOfficer && this.showLowestHigherLevelOfficer) {
      officerControl?.setValidators([Validators.required]);
    } else {
      officerControl?.clearValidators();
    }
    officerControl?.updateValueAndValidity();
  }

  getCustomerById(): Promise<void> {
    const memberId = this.localStorageService.get('MemberId');
    // console.log('getCustomerById called with hotelId:', memberId, this.hotelId);
    this.loaderService.emitLoading(); // newly added for loading
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // "id": this.hotelId
            // Newly added for getting member id for customer type
            "customer_member_id": this.localStorageService.get('MemberId')
          }
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            const customerdata = resp.result.data[0];
            // console.log('Customer Data:', customerdata);
            this.memberId = customerdata.customer_member_id;
            // console.log('Member Id:', this.memberId);
            this.localStorageService.set('roomRange', JSON.stringify(customerdata?.settings?.room_range));
            this.localStorageService.set('selectedSlots', JSON.stringify(customerdata?.settings?.shift_timings));
            // console.log('Room Range:', this.localStorageService.get('roomRange'));
            // console.log('Selected Slots:', this.localStorageService.get('selectedSlots'));
            const slots = this.localStorageService.get('selectedSlots');
            this.selectedSlots = slots ? JSON.parse(slots) : [];
            // console.log('Selected Slots:', this.selectedSlots);
            const room_ranges = this.localStorageService.get('roomRange');
            this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
            // console.log('Selected Room Range:', this.roomRanges);
            // Newly added for placeholder member id
            const memberIdForDisplay = this.memberId.substring(1) + 'XXX';
            this.memberIdDisplay = memberIdForDisplay;
            // console.log('Member Id Display:', this.memberIdDisplay);
            resolve();
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            this.alertService.error('Session Time Out! Please login Again', this.options);
            this.routerUrl.navigate([`/login`], { skipLocationChange: false });
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

  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.charCode;
    // block if not a digit
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return;
    }
    // block if already 10 digits entered
    const input = event.target as HTMLInputElement;
    if (input.value.length >= 10) {
      event.preventDefault();
    }
  }

  // For saving the new staff form
  // saveForm() {
  //   this.alertService.clear();
  //   // if (this.officersData.length == 0) {
  //   //   this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
  //   //   return;
  //   // }
  //   this.showalertmsg = true;
  //   if (this.staffForm.valid) {
  //     this.validateForm = false;
  //     this.loaderService.emitLoading();
  //     const formValues = this.staffForm.getRawValue();
  //     const selectedOfficer = formValues.higher_level_officer;
  //     let officerDetails = null;
  //     if (selectedOfficer) {
  //       officerDetails = {
  //         id: selectedOfficer.id,
  //         name: selectedOfficer.full_name,
  //         phone_number: selectedOfficer.phone_number
  //       };
  //     }
  //     // console.log('Selected Officer Details:', this.officersData.length);
  //     // Newly added for is_available
  //     // Determine is_available based on hierarchy structure
  //     let isAvailable = false;
  //     const selectedHierarchy = formValues.hierarchy; // from form selection
  //     if (selectedHierarchy && this.customerHierarchy?.hierarchy?.length > 0) {
  //       const lowerHierarchy = this.customerHierarchy.hierarchy.find(
  //         (item: any) => item.parentId === selectedHierarchy.id
  //       );
  //       isAvailable = !!lowerHierarchy; // true if any lower hierarchy exists
  //     }
  //     // Check phone number against existing staff
  //     const requestBody = {
  //       domain_name: DOMAIN_NAME,
  //       user_id: USER_ID,
  //       extras: { find: { member_id: this.memberId } }
  //     };
  //     this.staffListingService.getAllStaves(requestBody).subscribe({
  //       next: (staffList: any) => {
  //         // console.log('Existing Staff List:', staffList);
  //         const phoneExists = staffList.result.data.find((staff: any) => staff.phone_number === formValues.phone_number);
  //         if (phoneExists) {
  //           this.loaderService.emitComplete();
  //           this.alertService.error('Phone number is already linked with another staff.', this.alertOptions);
  //           return;
  //         }
  //         // Proceed with payload if phone is unique
  //         const payloadData = {
  //           email: formValues.email,
  //           full_name: formValues.full_name,
  //           phone_number: formValues.phone_number,
  //           employee_id: formValues.employee_id,
  //           higher_level_hierarchy: formValues.higher_level_hierarchy,
  //           hierarchy: formValues.hierarchy,
  //           at_desk: formValues.at_desk,
  //           // Newly changed for shift time
  //           // shift_time: this.selectedShiftTimes,
  //           shift_time: this.selectedShiftTimes.map(st => ({ label: st.label })),
  //           // room_no: this.selectedRooms,
  //           room_no: this.selectedRooms.map(st => ({ label: st.label })),
  //           created_by_id: this.createdById,
  //           created_by_name: this.createdByName,
  //           is_staff_active: formValues.is_staff_active,
  //           member_id: this.memberId,
  //           higher_level_officer: officerDetails,
  //           password: formValues.password,
  //           is_available: isAvailable
  //         };
  //         const requestData: any = {
  //           domain_name: DOMAIN_NAME,
  //           user_id: USER_ID,
  //           payload: { staff_creation: payloadData }
  //         };
  //         // console.log('Payload Data:', requestData);
  //         this.staffService.addStaff(requestData).subscribe({
  //           next: (resp) => {
  //             this.loaderService.emitComplete();
  //             if (resp && resp.success === 1 && resp.status_code === 200) {
  //               this.staffService.clearAdminFormEvent();
  //               this.alertService.success(resp.message, this.alertOptions);
  //               setTimeout(() =>
  //                 this.routerUrl.navigate(['/staff-list'], {
  //                   state: { result: resp.message },
  //                   relativeTo: this.router,
  //                   skipLocationChange: false
  //                 }), 1000);
  //             } else if (resp.message) {
  //               this.alertService.error(resp.message, this.alertOptions);
  //             } else {
  //               this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //             }
  //           },
  //           error: (err) => {
  //             this.loaderService.emitComplete();
  //             if (err.error.statusCode === 403) {
  //               this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
  //               this.routerUrl.navigate([`/login`], { skipLocationChange: false });
  //             } else if (err.error.message) {
  //               this.alertService.error(err.error.message, this.alertOptions);
  //             } else {
  //               this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //             }
  //           }
  //         });
  //       },
  //       error: (err: any) => {
  //         this.loaderService.emitComplete();
  //         this.alertService.error('Failed to fetch existing staff. Please try again!', this.alertOptions);
  //       }
  //     });
  //   } else {
  //     this.validateForm = true;
  //   }
  // }

  // For saving the existing staff form
  // saveFormChanges() {
  //   this.editScreen = this.enableEdit;
  //   // if (this.officersData.length == 0) {
  //   //   this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
  //   //   return;
  //   // }
  //   this.showalertmsg = true;
  //   // this.staffForm.get('room_no')?.setValue(this.selectedRooms.length ? this.selectedRooms : null);
  //   // this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes.length ? this.selectedShiftTimes : null);
  //   // this.staffForm.updateValueAndValidity();
  //   // Sync custom dropdowns with form controls
  //   this.staffForm.get('shift_time')?.setValue(
  //     this.selectedShiftTimes.length ? this.selectedShiftTimes.map(st => ({ label: st.label })) : null
  //   );
  //   this.staffForm.get('room_no')?.setValue(
  //     this.selectedRooms.length ? this.selectedRooms.map(r => ({ label: r.label })) : null
  //   );
  //   this.staffForm.updateValueAndValidity();
  //   // Update dynamic validator for higher_level_officer
  //   this.updateHigherLevelOfficerValidator();
  //   const selectedOfficer = this.staffForm.get('higher_level_officer')?.value;
  //   let officerDetails = null;
  //   if (selectedOfficer) {
  //     officerDetails = {
  //       id: selectedOfficer.id,
  //       name: selectedOfficer.full_name,
  //       phone_number: selectedOfficer.phone_number
  //     };
  //   }
  //   console.log(this.staffForm.valid, 'Valid/Not')
  //   if (!this.staffForm.valid) {
  //     this.validateForm = true;
  //     return;
  //   }
  //   console.log('Staff Form Values:', this.staffForm.value);
  //   this.loaderService.emitLoading();
  //   this.validateForm = false;
  //   const formValues = this.staffForm.getRawValue();
  //   // Build request to fetch staff list
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { member_id: this.memberId } }
  //   };
  //   this.staffListingService.getAllStaves(requestBody).subscribe({
  //     next: (staffList: any) => {
  //       const phoneExists = staffList.result.data.find(
  //         (staff: any) =>
  //           staff.phone_number === formValues.phone_number &&
  //           staff.id !== Number(this.staffId) // exclude current staff from duplicate check
  //       );
  //       if (phoneExists) {
  //         this.loaderService.emitComplete();
  //         this.alertService.error('Phone number is already linked with another staff.', this.alertOptions);
  //         return;
  //       }
  //       // Build payload only if phone validation passed
  //       const payloadData: any = {
  //         email: formValues.email,
  //         full_name: formValues.full_name,
  //         phone_number: formValues.phone_number,
  //         staff_member_id: this.staff_member_id,
  //         higher_level_hierarchy: formValues.higher_level_hierarchy,
  //         at_desk: formValues.at_desk,
  //         hierarchy: formValues.hierarchy,
  //         // Newly changed for shift time
  //         // shift_time: this.selectedShiftTimes.length ? this.selectedShiftTimes : null,
  //         shift_time: this.selectedShiftTimes.length ? this.selectedShiftTimes.map(st => ({ label: st.label })) : null,
  //         // room_no: this.selectedRooms.length ? this.selectedRooms : null,
  //         room_no: this.selectedRooms.length ? this.selectedRooms.map(st => ({ label: st.label })) : null,
  //         is_staff_active: formValues.is_staff_active,
  //         created_by_id: this.createdById,
  //         created_by_name: this.createdByName,
  //         password: this.password,
  //         // higher_level_officer: officerDetails
  //       };
  //       // only include password if changed
  //       if (formValues.password && formValues.password !== '********') {
  //         payloadData.password = formValues.password;
  //       }
  //       // Add higher_level_officer only if condition true
  //       // if (this.showHigherLevelOfficer) {
  //       //   payloadData.higher_level_officer = officerDetails;
  //       // }
  //       // Include higher_level_officer only if visible and selected
  //       if (!this.isFirstStaff && this.showHigherLevelOfficer && this.showLowestHigherLevelOfficer && officerDetails) {
  //         payloadData.higher_level_officer = officerDetails;
  //       }
  //       const formatJson = {
  //         domain_name: DOMAIN_NAME,
  //         user_id: USER_ID,
  //         payload: { staff_updation: payloadData },
  //         extras: { find: { id: Number(this.staffId) } }
  //       };
  //       // Proceed with updateStaff API
  //       this.staffService.updateStaff(formatJson).subscribe({
  //         next: (resp: any) => {
  //           this.loaderService.emitComplete();
  //           if (resp && resp.success === 1 && resp.status_code === 200) {
  //             this.alertService.success(resp.message, this.alertOptions);
  //             setTimeout(() =>
  //               this.routerUrl.navigate(['/staff-list'], {
  //                 state: { result: resp.message },
  //                 relativeTo: this.router,
  //                 skipLocationChange: false
  //               }), 1000);
  //           } else if (resp.message) {
  //             this.alertService.error(resp.message, this.alertOptions);
  //           } else {
  //             this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //           }
  //         },
  //         error: (err: any) => {
  //           this.loaderService.emitComplete();
  //           if (err.error?.statusCode === 403) {
  //             this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
  //             this.routerUrl.navigate([`/login`], { skipLocationChange: false });
  //           } else if (err.error?.message) {
  //             this.alertService.error(err.error.message, this.alertOptions);
  //           } else {
  //             this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //           }
  //         }
  //       });
  //     },
  //     error: (err: any) => {
  //       this.loaderService.emitComplete();
  //       this.alertService.error('Failed to fetch existing staff. Please try again!', this.alertOptions);
  //     }
  //   });
  // }

  // Sets initial values for editing staff
  // setInitialValues(staffId: any) {
  //   console.log('Staff ID:', staffId, this.memberId);
  //   this.staffId = staffId;
  //   const jsonObj = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: {
  //         id: Number(staffId),
  //         member_id: this.memberId
  //       }
  //     }
  //   };
  //   this.loaderService.emitLoading();
  //   this.staffService.getStaffById(jsonObj).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp.success === 1 && resp.status_code === 200) {
  //         const respData = resp.result.data[0];
  //         const requestBody = {
  //           domain_name: DOMAIN_NAME,
  //           user_id: USER_ID,
  //           extras: { find: { member_id: this.memberId } }
  //         };
  //         this.staffListingService.getAllStaves(requestBody).subscribe(
  //           (resp: any) => {
  //             if (resp?.success === 1 && resp.status_code === 200) {
  //               // Filter staff who report to this supervisor
  //               this.officersData = resp.result.data;
  //               // console.log('Officers Data:', this.officersData);
  //               if (respData.higher_level_officer) {
  //                 this.showHigherLevelOfficer = true;
  //                 // Find officer in officersData by id
  //                 const matchedOfficer = this.officersData.find(
  //                   (o: any) => o.id == respData.higher_level_officer.id
  //                 );
  //                 this.staffForm.patchValue({
  //                   higher_level_officer: matchedOfficer || null
  //                 });
  //                 this.showInitalHigherLevelOfficer = true;
  //                 // console.log('Higher Level Officer:', respData.higher_level_officer);
  //                 // console.log('Matched Officer:', matchedOfficer);
  //               }
  //               else {
  //                 this.showHigherLevelOfficer = false;
  //                 this.staffForm.patchValue({
  //                   higher_level_officer: null
  //                 });
  //               }
  //               // Update the validator dynamically
  //               this.updateHigherLevelOfficerValidator();
  //             }
  //           })
  //         this.password = respData.password;
  //         // Patch basic info
  //         this.staffForm.patchValue({
  //           email: respData.email,
  //           full_name: respData.full_name,
  //           phone_number: respData.phone_number,
  //           is_staff_active: respData.is_staff_active,
  //           at_desk: !!respData.at_desk,
  //         });
  //         // Password handling
  //         if (respData.password) {
  //           this.staffForm.patchValue({
  //             password: '********'
  //           })
  //         }
  //         // Decides if Higher Level Officer should show
  //         // if (respData.higher_level_officer && respData.higher_level_officer != null) {
  //         //   this.showHigherLevelOfficer = true;
  //         //   console.log('Higher Level Officer:', respData.higher_level_officer);
  //         //   this.staffForm.patchValue({
  //         //     higher_level_officer: respData.higher_level_officer
  //         //   });
  //         // } 
  //         //  staff member ID
  //         this.staff_member_id = respData.staff_employee_number;
  //         // Newly changed for shift time
  //         // this.selectedShiftTimes = respData.shift_time?.map((t: any) => t.split(' - ')[0]) || [];
  //         this.selectedShiftTimes = respData.shift_time;
  //         // console.log('Shift:', this.selectedShiftTimes);
  //         // selected rooms
  //         this.selectedRooms = respData.room_no;
  //         // console.log('Rooms:', this.selectedRooms);
  //         // Set selected supervisor safely
  //         let selectedSupervisor = null;
  //         if (respData.higher_level_hierarchy) {
  //           selectedSupervisor = this.supervisorList?.find((s: any) =>
  //             s.id === respData.higher_level_hierarchy.id
  //           );
  //         }
  //         // console.log('Selected Supervisor:', selectedSupervisor);
  //         this.staffForm.patchValue({ higher_level_hierarchy: selectedSupervisor || null });
  //         // Fetch hierarchy list for this supervisor
  //         if (selectedSupervisor) {
  //           this.getChildHierarchy(selectedSupervisor.id, respData);
  //         }
  //       } else {
  //         this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //       }
  //     },
  //     err => {
  //       this.loaderService.emitComplete();
  //       if (err.error?.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
  //         this.routerUrl.navigate(['/login']);
  //       } else {
  //         this.alertService.error(err.error?.message || 'Something bad happened!', this.alertOptions);
  //       }
  //     }
  //   );
  // }

  // async getChildHierarchy(supervisorId: any, respData?: any) {
  //   console.log('Fetching child hierarchy for supervisor ID:', supervisorId);
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { customer_id: Number(this.hotelId) } }
  //   };
  //   this.hierarchyService.getAllHierarchy(requestBody).subscribe(async (resp: any) => {
  //     this.loaderService.emitComplete();
  //     if (resp?.success === 1 && resp.status_code === 200) {
  //       const allHierarchies = resp.result.data.flatMap((item: any) => item.hierarchy || []);
  //       // Filter child hierarchies under selected supervisor
  //       this.supervisorChildList = allHierarchies.filter((item: any) =>
  //         item.parentId === supervisorId
  //       );
  //       // console.log('Resp Data:', respData);
  //       // Patch staff hierarchy safely
  //       let selectedHierarchy = null;
  //       if (respData?.hierarchy) {
  //         // Viewing/editing existing staff: use respData
  //         selectedHierarchy = this.supervisorChildList.find(
  //           (child: any) => child.id === respData.hierarchy.id
  //         );
  //       } else {
  //         // Dropdown click: get selected hierarchy directly from form
  //         selectedHierarchy = this.staffForm.get('higher_level_hierarchy')?.value || null;
  //       }
  //       this.staffForm.patchValue({ hierarchy: selectedHierarchy || null });
  //       // console.log('Selected Hierarchy:', selectedHierarchy);
  //       // getLowestLevelHierarchy() to check if lowest is selected**
  //       const lowestHierarchy = await this.getLowestLevelHierarchy();
  //       // console.log('Lowest Hierarchy:', lowestHierarchy);
  //       if (!this.showInitalHigherLevelOfficer) {
  //         if (selectedHierarchy && lowestHierarchy && selectedHierarchy.id === lowestHierarchy.id) {
  //           // Lowest hierarchy selected: higher_level_officer
  //           this.showLowestHigherLevelOfficer = false;
  //           this.staffForm.patchValue({ higher_level_officer: null });
  //           // removes validation when hidden
  //           this.staffForm.get('higher_level_officer')?.clearValidators();
  //           this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
  //           // populate room dropdown directly from respData.room_no
  //           // if (respData?.room_no?.length > 0) {
  //           const room_ranges = this.localStorageService.get('roomRange');
  //           this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
  //           // console.log('Room Ranges for Lowest Hierarchy:', this.roomRanges);
  //           // } else {
  //           //   this.roomRanges = [];
  //           // }

  //         } else {
  //           this.showLowestHigherLevelOfficer = true;
  //           // make it required when shown
  //           this.staffForm.get('higher_level_officer')?.setValidators([Validators.required]);
  //           this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
  //           // Existing officer fetching logic
  //           this.getOfficerDetails(supervisorId);
  //         }
  //       }
  //       this.showInitalHigherLevelOfficer = false; // Reset for next use
  //     } else {
  //       this.alertService.error(resp?.message || 'Something bad happened!', this.alertOptions);
  //     }
  //   }, err => {
  //     this.loaderService.emitComplete();
  //     this.alertService.error(err?.error?.message || 'Something bad happened!', this.alertOptions);
  //   });
  // }

  isShiftSelected(slot: any): boolean {
    return this.selectedShiftTimes.some(s => s.label === slot.label);
  }

  // async getLowestLevelHierarchy(): Promise<any> {
  //   return new Promise((resolve) => {
  //     const requestBody = {
  //       domain_name: DOMAIN_NAME,
  //       user_id: USER_ID,
  //       extras: { find: { customer_id: Number(this.hotelId) } }
  //     };
  //     this.hierarchyLowestService.apiCall(requestBody, ENDPOINTS.GET_HIERARCHY)
  //       .subscribe({
  //         next: (resp: any) => {
  //           if (resp?.success && Array.isArray(resp.result?.data) && resp.result.data.length) {
  //             const hierarchy = resp.result.data[0].hierarchy || [];
  //             // pick only items without parentId
  //             const rootLevel = hierarchy.filter((h: any) => !h.parentId && h.parentId !== 0);
  //             // find the lowest (min id)
  //             const lowest = rootLevel.length
  //               ? rootLevel.reduce((min: any, h: any) => (h.id < min.id ? h : min), rootLevel[0])
  //               : null;
  //             this.defaultHierarchy = lowest;
  //             // console.log('Lowest hierarchy found:', lowest);
  //             resolve(lowest);
  //           } else {
  //             this.defaultHierarchy = null;
  //             resolve(null);
  //           }
  //         },
  //         error: () => {
  //           this.defaultHierarchy = null;
  //           resolve(null);
  //         }
  //       });
  //   });
  // }

  // getOfficerDetails(supervisorId: any) {
  //   console.log('Fetching officers for supervisor ID:', supervisorId);
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { member_id: this.memberId } }
  //   };
  //   this.staffListingService.getAllStaves(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp?.success === 1 && resp.status_code === 200) {
  //         // Filter staff who report to this supervisor
  //         this.officersData = resp.result.data.filter(
  //           (staff: any) => staff.hierarchy?.id == supervisorId
  //         );
  //         // console.log('Officers Data:', this.officersData);
  //         // if (this.officersData.length == 0) {
  //         // No officers under this supervisor
  //         // this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
  //         //   // disable save functionality
  //         //   this.staffForm.get('higher_level_officer')?.setValue(null);
  //         //   // add a form-level error so saveForm/saveFormChanges cannot pass
  //         //   this.staffForm.setErrors({ noOfficer: true });
  //         // return;
  //         // }
  //         // // Officers found
  //         // this.staffForm.setErrors(null);
  //         // // Preselect officer if any
  //         // let selectedOfficer = this.officersData.find(
  //         //   (officer: any) => officer.hierarchy.id == supervisorId
  //         // );
  //         // this.staffForm.patchValue({ higher_level_officer: selectedOfficer || null });
  //         // Find the selected officer from respData if available
  //         let selectedOfficer = null;
  //         if (supervisorId != undefined) {
  //           selectedOfficer = this.officersData.find(
  //             (officer: any) => officer.hierarchy.id == supervisorId
  //           );
  //           // console.log('Selected Officer:', selectedOfficer);
  //           // Patch the form with the selected officer (or null)
  //           // if (selectedOfficer == null || selectedOfficer == undefined) {
  //           //   this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
  //           //   this.staffForm.patchValue({ higher_level_officer: selectedOfficer || null });
  //           // }
  //           // Enable the field if there’s data
  //           // if (selectedOfficer) {
  //           //   this.staffForm.get('higher_level_officer')?.enable();
  //           // } else {
  //           // Disable if no officer is available
  //           // this.staffForm.get('higher_level_officer')?.disable();
  //           // }
  //         }
  //       }
  //     },
  //     err => {
  //       if (err?.error?.statusCode === 403) {
  //         this.routerUrl.navigate(['/login']);
  //       }
  //     }
  //   );
  // }

  // For getting higher level hierarchies
  // getCustomerHierarchy(): void {
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
  //         this.customerHierarchy = resp.result.data[0];
  //         //console.log("Fetched customer hierarchy:", this.customerHierarchy);
  //         this.customerHierarchydata = resp.result.data[0];
  //         this.hierarchyParentIds = [
  //           ...new Set(
  //             this.customerHierarchydata?.hierarchy
  //               .map((item: any) => item.parentId)
  //               .filter((id: any) => id != null)
  //           )
  //         ];
  //         //console.log('Hierarchy parent ids:', this.hierarchyParentIds)
  //         this.supervisorList = this.customerHierarchydata?.hierarchy.filter(
  //           (item: any) =>
  //             this.hierarchyParentIds.includes(item.id)
  //         );
  //         //console.log('Supervisor List:', this.supervisorList);
  //         // If first staff, prefill hierarchy
  //         if (this.isFirstStaff && this.dh) {
  //           // console.log('Default Hierarchy Level Hierarchy:', this.dh);
  //           const supervisorObj = this.supervisorList?.find(
  //             (s: any) => s.designation === this.dh.designation && s.department === this.dh.department
  //           );
  //           // console.log('Default Hierarchy Level Hierarchy:', supervisorObj);
  //           this.staffForm.patchValue({
  //             higher_level_hierarchy: supervisorObj || null
  //           });
  //           this.staffForm.get('higher_level_hierarchy')?.disable();
  //           // remove officer validation for first staff
  //           this.staffForm.get('higher_level_officer')?.clearValidators();
  //           this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
  //         }
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

  // showNoOfficerModal() {
  // this.matchedStaff = false;
  // setTimeout(() => {
  // this.alertService.error('No officer found for the selected hierarchy.', this.alertOptions);
  // },200);
  // }

  openExitModal() {
    // In view mode just go back without confirmation
    if (this.isViewMode) {
      this.routerUrl.navigate(['/staff-list']);
      return;
    }
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
  // onRoomSelect(room: string, event: Event): void {
  //   const isChecked = (event.target as HTMLInputElement).checked;
  //   if (isChecked) {
  //     this.selectedRooms.push(room);
  //   } else {
  //     this.selectedRooms = this.selectedRooms.filter(r => r !== room);
  //   }
  //   this.staffForm.get('room_no')?.setValue(this.selectedRooms.length > 0 ? this.selectedRooms : null);
  //   this.staffForm.get('room_no')?.updateValueAndValidity();
  // }

  onRoomSelect(room: any, event: any): void {
    if (event.target.checked) {
      this.selectedRooms.push(room);
    } else {
      this.selectedRooms = this.selectedRooms.filter(r => r.id !== room.id);
    }
    // console.log('Selected Rooms:', this.selectedRooms);
    this.staffForm.get('room_no')?.setValue(this.selectedRooms.length > 0 ? this.selectedRooms : null);
    this.staffForm.get('room_no')?.updateValueAndValidity();
  }

  // onShiftSelect(slot: any, event: any): void {
  //   if (event.target.checked) {
  //     if (!this.selectedShiftTimes.includes(slot.start + "-" + slot.end)) {
  //       this.selectedShiftTimes.push(slot.start + "-" + slot.end);
  //     }
  //   } else {
  //     this.selectedShiftTimes = this.selectedShiftTimes.filter(time => time !== slot.start + "-" + slot.end);
  //   }
  //   //console.log('Selected Shift Times:', this.selectedShiftTimes);
  //   this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes);
  //   this.staffForm.get('shift_time')?.updateValueAndValidity();
  // }

  onShiftSelect(slot: any, event: any): void {
    if (event.target.checked) {
      // push the whole object if not already present
      if (!this.selectedShiftTimes.some((s: any) => s.label == slot.label)) {
        this.selectedShiftTimes.push(slot);
      }
    } else {
      // remove the whole object by label
      this.selectedShiftTimes = this.selectedShiftTimes.filter(
        (s: any) => s.label !== slot.label
      );
    }
    // console.log('Selected Shift Times:', this.selectedShiftTimes);
    this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes);
    this.staffForm.get('shift_time')?.updateValueAndValidity();
  }

  getSelectedShiftLabels(): string {
    return this.selectedShiftTimes
      .slice(0, 2)
      .map((st: any) => st.label)
      .join(', ');
  }

  getSelectedRoomLabels(): string {
    return this.selectedRooms.slice(0, 2).map(r => r.label).join(', ');
  }

  isRoomSelected(room: any): boolean {
    return this.selectedRooms.some(r => r.label === room.label);
  }

  // onOfficerChange(officer: any) {
  //   if (officer && officer.room_no && officer.room_no.length > 0) {
  //     // use only officer’s room_no for new staff
  //     this.filteredRoomRanges = officer.room_no;
  //     this.roomRanges = this.filteredRoomRanges;

  //   } else {
  //     this.filteredRoomRanges = []; // no rooms if officer has none
  //     this.roomRanges = [];
  //   }
  //   // reset previously selected rooms
  //   // this.selectedRooms = [];
  // }

  // Newly added for multiple selection
  // Display selected labels
  getSelectedHierarchyLabels(): string {
    const labels = this.selectedHierarchies
      .slice(0, 1)
      .map((h: any) => `${h.designation}-${h.department}`);
    return labels.join(', ');
  }

  // Check if hierarchy already selected
  isHierarchySelected(hierarchy: any): boolean {
    return this.selectedHierarchies.some((h: any) => h.id === hierarchy.id);
  }

  // Handle checkbox selection
  // onHierarchySelect(hierarchy: any, event: any) {
  //   if (event.target.checked) {
  //     // Add if not already selected
  //     if (!this.isHierarchySelected(hierarchy)) {
  //       this.selectedHierarchies.push(hierarchy);
  //     }
  //   } else {
  //     // Remove if unchecked
  //     this.selectedHierarchies = this.selectedHierarchies.filter((h: any) => h.id !== hierarchy.id);
  //   }
  //   // Update reactive form value
  //   this.staffForm.patchValue({ higher_level_hierarchy: this.selectedHierarchies });
  //   console.log('Selected Higher level hierarchies:', this.selectedHierarchies);
  //   // this.getChildHierarchy(this.selectedHierarchies);
  //   const selectedIds = this.selectedHierarchies.map((h: any) => h.id);
  //   this.getChildHierarchy(selectedIds);
  // }

  // Handle checkbox selection for Higher Level Hierarchy
  // onHierarchySelect(hierarchy: any, event: any) {
  //   console.log('Calling')
  //   const isChecked = event.target.checked;
  //   if (isChecked) {
  //     // Add if not already selected
  //     if (!this.isHierarchySelected(hierarchy)) {
  //       this.selectedHierarchies.push(hierarchy);
  //     }
  //   } else {
  //     // Remove if unchecked
  //     this.selectedHierarchies = this.selectedHierarchies.filter(
  //       (h: any) => h.id !== hierarchy.id
  //     );
  //   }
  //   // Update the form
  //   this.staffForm.patchValue({
  //     higher_level_hierarchy: this.selectedHierarchies,
  //   });
  //   console.log('Selected Higher Level Hierarchies:', this.selectedHierarchies);
  //   const selectedIds = this.selectedHierarchies.map((h: any) => h.id);
  //   // When no hierarchy is selected — clear dependent data
  //   if (selectedIds.length === 0) {
  //     this.supervisorChildList = [];
  //     this.officersData = [];
  //     this.staffForm.patchValue({
  //       hierarchy: [],
  //       higher_level_officer: [],
  //     });
  //     return;
  //   }
  //   // Fetch child hierarchy and officer details again after add/remove
  //   this.getChildHierarchy(selectedIds);
  // }
  onHierarchySelect(hierarchy: any, event: any) {
    // console.log('Calling');
    const isChecked = event.target.checked;
    if (isChecked) {
      //  Add if not already selected
      if (!this.isHierarchySelected(hierarchy)) {
        this.selectedHierarchies.push(hierarchy);
      }
    } else {
      // Remove if unchecked
      this.selectedHierarchies = this.selectedHierarchies.filter(
        (h: any) => h.id !== hierarchy.id
      );
    };
    // Update form control value
    this.staffForm.patchValue({
      higher_level_hierarchy: this.selectedHierarchies,
    });
    // console.log('Selected Higher Level Hierarchies:', this.selectedHierarchies);
    const selectedIds = this.selectedHierarchies.map((h: any) => h.id);
    if (selectedIds.length === 0) {
      // Clear dependent data
      this.supervisorChildList = [];
      this.officersData = [];
      this.staffForm.patchValue({
        hierarchy: [],
        higher_level_officer: [],
      });
      // Still call child hierarchy fetch to reset related state properly
      this.getChildHierarchy([]);
      this.cdRef.detectChanges();
    } else {
      // Fetch next-level hierarchies and officer details
      this.getChildHierarchy(selectedIds);
    }
  }

  // async getChildHierarchy(supervisorIds: any[], respData?: any) {
  //   console.log('Fetching child hierarchy for supervisor IDs:', supervisorIds);
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { customer_id: Number(this.hotelId) } },
  //   };
  //   this.hierarchyService.getAllHierarchy(requestBody).subscribe(
  //     async (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp?.success === 1 && resp.status_code === 200) {
  //         const allHierarchies = resp.result.data.flatMap(
  //           (item: any) => item.hierarchy || []
  //         );
  //         // Get children for selected supervisors
  //         this.supervisorChildList = allHierarchies.filter((item: any) =>
  //           supervisorIds.includes(item.parentId) ||
  //           supervisorIds.includes(item.parent_id)
  //         );
  //         // console.log(
  //           'Child hierarchies for selected higher level hierarchies:',
  //           this.supervisorChildList
  //         );
  //         // Now check for lowest hierarchy
  //         const lowestHierarchy = await this.getLowestLevelHierarchy();
  //         const includesLowestHierarchy = this.selectedHierarchies.some(
  //           (h: any) => h.id === lowestHierarchy?.id
  //         );
  //         // Get Officer Details based on new selection
  //         if (includesLowestHierarchy) {
  //           // Lowest hierarchy → skip officer validation
  //           this.showLowestHigherLevelOfficer = false;
  //           this.staffForm.patchValue({ higher_level_officer: null });
  //           this.staffForm.get('higher_level_officer')?.clearValidators();
  //           this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
  //         } else {
  //           this.showLowestHigherLevelOfficer = true;
  //           this.staffForm
  //             .get('higher_level_officer')
  //             ?.setValidators([Validators.required]);
  //           this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
  //           // Fetch officers for current hierarchy IDs
  //           this.getOfficerDetails(supervisorIds);
  //         }
  //         // Update hierarchy control
  //         this.staffForm.patchValue({
  //           hierarchy: this.supervisorChildList || [],
  //         });
  //       } else {
  //         this.alertService.error(
  //           resp?.message || 'Something went wrong while fetching hierarchy!',
  //           this.alertOptions
  //         );
  //       }
  //     },
  //     (err) => {
  //       this.loaderService.emitComplete();
  //       this.alertService.error(
  //         err?.error?.message || 'Network error while fetching hierarchy!',
  //         this.alertOptions
  //       );
  //     }
  //   );
  // }

  // getOfficerDetails(supervisorIds: any[]) {
  //   console.log('Fetching officers for higher level hierarchy IDs:', supervisorIds);
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { member_id: this.memberId } },
  //   };
  //   this.staffListingService.getAllStaves(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp?.success === 1 && resp.status_code === 200) {
  //         const allStaff = resp.result.data || [];
  //         const officersForSelected: any[] = [];
  //         const missingHierarchies: any[] = [];
  //         // find officers under each selected hierarchy
  //         supervisorIds.forEach((id: number) => {
  //           const officers = allStaff.filter((staff: any) =>
  //             staff.hierarchy?.some((h: any) => h.id === id)
  //           );
  //           if (officers.length > 0) {
  //             officersForSelected.push(...officers);
  //           } else {
  //             const missingHierarchy = this.selectedHierarchies.find((h: any) => h.id === id);
  //             if (missingHierarchy) missingHierarchies.push(missingHierarchy);
  //           }
  //         });
  //         this.officersData = officersForSelected;
  //         // console.log('Officers found:', this.officersData);
  //         // console.log('Missing hierarchies:', missingHierarchies);
  //         // check if lowest hierarchy included
  //         const lowest = this.defaultHierarchy;
  //         const includesLowest = this.selectedHierarchies.some(
  //           (h: any) => h.id === lowest?.id
  //         );
  //         const control = this.staffForm.get('higher_level_officer');
  //         // clear previous errors
  //         control?.setErrors(null);
  //         if (!includesLowest && missingHierarchies.length > 0) {
  //           let errorMessage = '';
  //           if (missingHierarchies.length === 1) {
  //             const h = missingHierarchies[0];
  //             errorMessage = `No staff found under ${h.designation}. Please create staff first.`;
  //           } else {
  //             const list = missingHierarchies
  //               .map((h: any) => `${h.designation}`)
  //               .join(', ');
  //             errorMessage = `No staff found under the following hierarchies: ${list}. Please create staff first.`;
  //           }
  //           // set custom error
  //           control?.setErrors({ noStaff: true, message: errorMessage });
  //           control?.markAsTouched();
  //         } else {
  //           // clear error if staff available
  //           control?.setErrors(null);
  //         }
  //       }
  //     },
  //     (err) => {
  //       if (err?.error?.statusCode === 403) {
  //         this.routerUrl.navigate(['/login']);
  //       }
  //     }
  //   );
  // }

  getOfficerDetails(supervisorIds: any[]) {
    // console.log('Calling 1')
    // console.log('Fetching officers for higher level hierarchy IDs:', supervisorIds);
    this.loaderService.emitLoading(); //newly added for loading
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { member_id: this.memberId } },
    };
    this.staffListingService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete(); //newly added for loading
        if (resp?.success === 1 && resp.status_code === 200) {
          const allStaff = resp.result.data || [];
          const officersForSelected: any[] = [];
          const missingHierarchies: any[] = [];
          // find officers under each selected hierarchy
          supervisorIds.forEach((id: number) => {
            const officers = allStaff.filter(
              (staff: any) =>
                Array.isArray(staff.hierarchy) &&
                staff.hierarchy.some((h: any) => h.id === id)
            );
            if (officers.length > 0) {
              officersForSelected.push(...officers);
            } else {
              const missingHierarchy = this.selectedHierarchies?.find((h: any) => h.id === id);
              if (missingHierarchy) missingHierarchies.push(missingHierarchy);
            }
          });
          // Remove duplicate staff entries (by ID)
          const uniqueOfficersMap = new Map();
          officersForSelected.forEach((staff: any) => {
            // console.log('staff:', staff.id);
            if (!uniqueOfficersMap.has(staff.id)) {
              uniqueOfficersMap.set(staff.id, staff);
            }
          });
          this.officersData = Array.from(uniqueOfficersMap.values());
          // console.log('Officers found:', this.officersData);
          // console.log('Missing hierarchies:', missingHierarchies);
          // Remove any selected officer not in new officer list
          const allowedIds = new Set(this.officersData.map((o: any) => o.id));
          const newSelectedOfficers = (this.selectedOfficers || []).filter((officer: any) =>
            allowedIds.has(officer.id)
          );
          // Reassign array reference so Angular detects change (important when empty)
          this.selectedOfficers = [...newSelectedOfficers];
          // Update the form control value (ensure it clears visually)
          const control = this.staffForm.get('higher_level_officer');
          // console.log('Selected Officer:', this.selectedOfficers)
          if (control) {
            control.setValue(this.selectedOfficers.length > 0 ? [...this.selectedOfficers] : []);
            control.updateValueAndValidity();
          }
          // Handle missing hierarchy staff error logic
          const lowest = this.defaultHierarchy;
          const includesLowest = this.selectedHierarchies?.some((h: any) => h.id === lowest?.id);
          control?.setErrors(null);
          if (!includesLowest && missingHierarchies.length > 0) {
            let errorMessage = '';
            if (missingHierarchies.length === 1) {
              const h = missingHierarchies[0];
              errorMessage = `No staff found under ${h.designation}. Please create staff first.`;
            } else {
              const list = missingHierarchies.map((h: any) => h.designation).join(', ');
              errorMessage = `No staff found under the following hierarchies: ${list}. Please create staff first.`;
            }
            control?.setErrors({ noStaff: true, message: errorMessage });
          }
          // Force view refresh — fixes last officer not disappearing visually
          setTimeout(() => {
            this.cdRef.detectChanges();
          });
        }
      },
      (err) => {
        this.loaderService.emitComplete(); //newly added for loading
        console.error('Error fetching officers:', err);
        if (err?.error?.statusCode === 403) {
          this.routerUrl.navigate(['/login']);
        }
      }
    );
  }

  // async getChildHierarchy(supervisorIds: any[], respData?: any) {
  //   console.log('Fetching child hierarchy for supervisor IDs:', supervisorIds);
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { customer_id: Number(this.hotelId) } }
  //   };
  //   this.hierarchyService.getAllHierarchy(requestBody).subscribe(async (resp: any) => {
  //     this.loaderService.emitComplete();
  //     if (resp?.success === 1 && resp.status_code === 200) {
  //       const allHierarchies = resp.result.data.flatMap((item: any) => item.hierarchy || []);
  //       // All possible child hierarchies for selected supervisors
  //       this.supervisorChildList = allHierarchies.filter((item: any) =>
  //         supervisorIds.includes(item.parentId)
  //       );
  //       // console.log('Child hierarchies for selected higher level hierarchies:', this.supervisorChildList);
  //       // Find the lowest hierarchy (default one)
  //       const lowestHierarchy = await this.getLowestLevelHierarchy();
  //       // If creating a staff and selected hierarchy includes the lowest one — hide officer field
  //       const includesLowestHierarchy = this.selectedHierarchies.some(
  //         (h: any) => h.id === lowestHierarchy?.id
  //       );
  //       if (includesLowestHierarchy) {
  //         // console.log('Selected hierarchy includes lowest level → hiding officer field');
  //         // Hide officer field and clear validators
  //         this.showLowestHigherLevelOfficer = false;
  //         this.staffForm.patchValue({ higher_level_officer: null });
  //         this.staffForm.get('higher_level_officer')?.clearValidators();
  //         this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
  //         // Load room list for lowest hierarchy
  //         const room_ranges = this.localStorageService.get('roomRange');
  //         this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
  //         // console.log('Room Ranges for Lowest Hierarchy:', this.roomRanges);
  //       } else {
  //         // Show and validate officer field
  //         this.showLowestHigherLevelOfficer = true;
  //         this.staffForm.get('higher_level_officer')?.setValidators([Validators.required]);
  //         this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
  //         // Fetch officers for *all* selected supervisors
  //         this.getOfficerDetails(supervisorIds);
  //       }
  //       // Update hierarchy field in form
  //       this.staffForm.patchValue({
  //         hierarchy: this.selectedHierarchies.length ? this.selectedHierarchies : null
  //       });
  //     } else {
  //       this.alertService.error(resp?.message || 'Something bad happened!', this.alertOptions);
  //     }
  //   }, err => {
  //     this.loaderService.emitComplete();
  //     this.alertService.error(err?.error?.message || 'Something bad happened!', this.alertOptions);
  //   });
  // }

  async getChildHierarchy(supervisorIds: any[], respData?: any) {
    // console.log('Fetching child hierarchy for supervisor IDs:', supervisorIds);
    this.loaderService.emitLoading(); //newly added for loading
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find:
        {
          // Newly added for getting member id for customer type
          // customer_id: Number(this.hotelId)
          "member_id": this.localStorageService.get('MemberId')
        }
      }
    };
    this.hierarchyService.getAllHierarchy(requestBody).subscribe(async (resp: any) => {
      this.loaderService.emitComplete();
      if (resp?.success === 1 && resp.status_code === 200) {
        const allHierarchies = resp.result.data.flatMap((item: any) => item.hierarchy || []);
        // children for selected supervisors
        this.supervisorChildList = allHierarchies.filter((item: any) =>
          supervisorIds.includes(item.parentId) || supervisorIds.includes(item.parent_id) // cover different prop names
        );
        // console.log('Child hierarchies for selected higher level hierarchies:', this.supervisorChildList);
        // If respData (editing), preselect staff child hierarchies from respData.hierarchy
        if (respData?.hierarchy) {
          // respData.hierarchy may be array or object: normalize to array of ids
          const respHierarchyArr = Array.isArray(respData?.hierarchy) ? respData?.hierarchy : [respData?.hierarchy];
          // Map each incoming child to matching object in supervisorChildList by id/_id or designation+department
          this.selectedStaffHierarchies = respHierarchyArr.map((h: any) => {
            const incomingId = (h.id ?? h._id ?? '').toString();
            let matched = this.supervisorChildList.find((c: any) =>
              (c.id ?? c._id ?? '').toString() === incomingId
            );
            if (!matched && h.designation) {
              matched = this.supervisorChildList.find((c: any) =>
                (c.designation ?? '').toString().toLowerCase() === (h.designation ?? '').toString().toLowerCase() &&
                (c.department ?? '').toString().toLowerCase() === (h.department ?? '').toString().toLowerCase()
              );
            }
            return matched || h;
          });
          // Patch selected children and form control
          this.staffForm.patchValue({ hierarchy: this.selectedStaffHierarchies.length ? this.selectedStaffHierarchies : null });
          // console.log('Preselected staff child hierarchies:', this.selectedStaffHierarchies);
        } else {
          // normal flow (user selecting from dropdown) - keep empty until user picks
          this.selectedStaffHierarchies = [];
          this.staffForm.patchValue({ hierarchy: [] });
        }
        // determine lowest-hierarchy logic (same as before)
        const lowestHierarchy = await this.getLowestLevelHierarchy();
        const includesLowestHierarchy = this.selectedHierarchies.some(
          (h: any) => h.id === lowestHierarchy?.id
        );
        if (includesLowestHierarchy) {
          this.showLowestHigherLevelOfficer = false;
          this.staffForm.patchValue({ higher_level_officer: [] });
          this.staffForm.get('higher_level_officer')?.clearValidators();
          this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
          const room_ranges = this.localStorageService.get('roomRange');
          this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
        } else {
          this.showLowestHigherLevelOfficer = true;
          this.staffForm.get('higher_level_officer')?.setValidators([Validators.required]);
          this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
          this.getOfficerDetails(supervisorIds);
        }
        // finally update hierarchy control if it wasn't set above
        if (!respData?.hierarchy) {
          this.staffForm.patchValue({
            hierarchy: this.selectedStaffHierarchies.length ? this.selectedStaffHierarchies : null
          });
        }
      } else {
        this.alertService.error(resp?.message || 'Something bad happened!', this.alertOptions);
      }
    }, err => {
      this.loaderService.emitComplete();
      this.alertService.error(err?.error?.message || 'Something bad happened!', this.alertOptions);
    });
  }

  async getLowestLevelHierarchy(): Promise<any> {
    return new Promise((resolve) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // Newly added for getting member id for customer type
            // customer_id: Number(this.hotelId) 
            "member_id": this.localStorageService.get('MemberId')
          }
        }
      };
      this.hierarchyLowestService.apiCall(requestBody, ENDPOINTS.GET_HIERARCHY)
        .subscribe({
          next: (resp: any) => {
            if (resp?.success && Array.isArray(resp.result?.data) && resp.result.data.length) {
              const hierarchy = resp.result.data[0].hierarchy || [];
              // Find hierarchies without a parentId (top-level)
              const rootLevel = hierarchy.filter((h: any) => !h.parentId && h.parentId !== 0);
              // Pick the one with smallest ID as lowest
              const lowest = rootLevel.length
                ? rootLevel.reduce((min: any, h: any) => (h.id < min.id ? h : min), rootLevel[0])
                : null;
              this.defaultHierarchy = lowest;
              // console.log('Lowest hierarchy found in hierarchy:', lowest);
              resolve(lowest);
            } else {
              this.defaultHierarchy = null;
              resolve(null);
            }
          },
          error: () => {
            this.defaultHierarchy = null;
            resolve(null);
          }
        });
    });
  }

  // getOfficerDetails(supervisorIds: any[]) {
  //   console.log('Fetching officers for higher level hierarchy IDs:', supervisorIds);
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: { member_id: this.memberId } }
  //   };
  //   this.staffListingService.getAllStaves(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp?.success === 1 && resp.status_code === 200) {
  //         // Filter officers belonging to any of the selected hierarchies
  //         // console.log('All Officers:', resp.result.data);
  //         const allOfficers = resp.result.data.filter((staff: any) =>
  //           staff.hierarchy?.some((h: any) => supervisorIds.includes(h.id))
  //         );
  //         this.officersData = allOfficers;
  //         // console.log('Officers details selected hierarchies:', this.officersData);
  //         // Optionally preselect first officer if needed
  //         const selectedOfficer = this.officersData.length ? this.officersData[0] : null;
  //         this.staffForm.patchValue({ higher_level_officer: selectedOfficer || null });
  //       }
  //     },
  //     (err) => {
  //       if (err?.error?.statusCode === 403) {
  //         this.routerUrl.navigate(['/login']);
  //       }
  //     }
  //   );
  // }

  // Display labels (first two)
  getSelectedOfficerLabels(): string {
    const labels = this.selectedOfficers
      .slice(0, 1)
      .map((o: any) => `${o.full_name}-${o.phone_number}`);
    return labels.join(', ');
  }

  isOfficerSelected(officer: any): boolean {
    return this.selectedOfficers.some((o: any) => o.id === officer.id);
  }

  // Toggle selection
  onOfficerToggle(officer: any, event: any) {
    if (event.target.checked) {
      // Add new officer
      if (!this.isOfficerSelected(officer)) {
        this.selectedOfficers.push(officer);
      }
    } else {
      // Remove when unchecked
      this.selectedOfficers = this.selectedOfficers.filter(
        (o: any) => o.member_id !== officer.member_id
      );
    }
    // console.log('Selected higher level officers:', this.selectedOfficers);
    // Combine all officers’ room ranges
    let combinedRooms: any[] = [];
    this.selectedOfficers.forEach((officer) => {
      if (officer.room_no && officer.room_no.length > 0) {
        combinedRooms.push(...officer.room_no);
      }
    });
    // Update UI and form
    // this.filteredRoomRanges = combinedRooms;
    // this.roomRanges = combinedRooms;
    //  Remove duplicates
    const uniqueRooms = [...new Set(combinedRooms.map(room => JSON.stringify(room)))].map(str => JSON.parse(str));
    this.filteredRoomRanges = uniqueRooms;
    this.roomRanges = uniqueRooms;
    this.staffForm.patchValue({ higher_level_officer: this.selectedOfficers });
  }

  // Labels for Staff Hierarchy
  // getSelectedStaffHierarchyLabels(): string {
  //   const labels = this.selectedStaffHierarchies
  //     .slice(0, 1)
  //     .map((h: any) => `${h.designation}-${h.department}`);
  //   return labels.join(', ');
  // }

  getSelectedStaffHierarchyLabels(): string {
    const labels = (this.selectedStaffHierarchies || [])
      .slice(0, 1)
      .map((h: any) => `${h.designation}-${h.department}`);
    return labels.join(', ');
  }

  // Check if already selected
  // isStaffHierarchySelected(hierarchy: any): boolean {
  //   return this.selectedStaffHierarchies.some((h: any) => h.id === hierarchy.id);
  // }

  isStaffHierarchySelected(hierarchy: any): boolean {
    if (!this.selectedStaffHierarchies || !this.selectedStaffHierarchies.length) return false;
    const hid = (hierarchy.id ?? hierarchy._id ?? '').toString();
    return this.selectedStaffHierarchies.some((s: any) => (s.id ?? s._id ?? '').toString() === hid);
  }


  // Checkbox toggle handler
  onStaffHierarchyToggle(hierarchy: any, event: any) {
    if (event.target.checked) {
      if (!this.isStaffHierarchySelected(hierarchy)) {
        this.selectedStaffHierarchies.push(hierarchy);
      }
    } else {
      this.selectedStaffHierarchies = this.selectedStaffHierarchies.filter(
        (h: any) => h.id !== hierarchy.id
      );
    }
    // Patch reactive form
    this.staffForm.patchValue({ hierarchy: this.selectedStaffHierarchies });
    // console.log('Selected Staff Hierarchies:', this.selectedStaffHierarchies);
  }

  saveForm() {
    this.alertService.clear();
    // if (this.officersData.length == 0) {
    //   this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
    //   return;
    // }
    this.showalertmsg = true;
    if (this.staffForm.valid) {
      this.validateForm = false;
      this.loaderService.emitLoading();
      const formValues = this.staffForm.getRawValue();
      // const selectedOfficer = formValues.higher_level_officer;
      let officerDetails: any[] = [];
      if (formValues.higher_level_officer && formValues.higher_level_officer.length) {
        officerDetails = formValues.higher_level_officer.map((officer: any) => ({
          id: officer.id,
          name: officer.full_name,
          phone_number: officer.phone_number,
          department: officer.hierarchy?.map((h: any) => h.department) || []
        }));
      }
      // console.log('Selected Officer Details:', officerDetails);
      // console.log('Selected Officer Details:', this.officersData.length);
      // Newly added for is_available
      // Determine is_available based on hierarchy structure
      let isAvailable = false;
      const selectedHierarchy = formValues.hierarchy; // from form selection
      // Newly added & commented for combine - started 
      // if (selectedHierarchy && this.customerHierarchy?.hierarchy?.length > 0) {
      //   const lowerHierarchy = this.customerHierarchy.hierarchy.find(
      //     (item: any) => item.parentId === selectedHierarchy.id
      //   );
      //   isAvailable = !!lowerHierarchy; // true if any lower hierarchy exists
      // }
      if (Array.isArray(selectedHierarchy) && this.customerHierarchy?.hierarchy?.length > 0) {
        // Find if *any* of the selected hierarchies has a lower hierarchy
        const lowerHierarchy = this.customerHierarchy.hierarchy.find((item: any) =>
          selectedHierarchy.some((selected: any) => item.parentId === selected.id)
        );
        isAvailable = !!lowerHierarchy; // true if at least one lower hierarchy exists
      }
      // Ended
      // Check phone number against existing staff
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { member_id: this.memberId } }
      };
      this.staffListingService.getAllStaves(requestBody).subscribe({
        next: (staffList: any) => {
          // console.log('Existing Staff List:', staffList);
          const phoneExists = staffList.result.data.find((staff: any) => staff.phone_number === formValues.phone_number);
          if (phoneExists) {
            this.loaderService.emitComplete();
            this.alertService.error('Phone number is already linked with another staff.', this.alertOptions);
            return;
          }
          // Proceed with payload if phone is unique
          const payloadData = {
            email: formValues.email,
            full_name: formValues.full_name,
            phone_number: formValues.phone_number,
            // employee_id: formValues.employee_id,
            higher_level_hierarchy: formValues.higher_level_hierarchy,
            hierarchy: formValues.hierarchy,
            at_desk: formValues.at_desk,
            // Newly changed for shift time
            // shift_time: this.selectedShiftTimes,
            shift_time: this.selectedShiftTimes.map(st => ({ label: st.label })),
            // room_no: this.selectedRooms,
            room_no: this.selectedRooms.map(st => ({ label: st.label })),
            created_by_id: this.createdById,
            created_by_name: this.createdByName,
            is_staff_active: formValues.is_staff_active,
            member_id: this.memberId,
            higher_level_officer: officerDetails,
            password: formValues.password,
            // Newly commnted for is_available because while logging in the staff will be available while logging out it will be unavailable
            // is_available: isAvailable,
            // Ended
            //  Newly commented because no need of fo desk 
            // front_office_desk: formValues.front_office_desk
            // End of newly commented code
          };
          const requestData: any = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { staff_creation: payloadData }
          };
          // console.log('Payload Data(while staff creation):', requestData);
          this.staffService.addStaff(requestData).subscribe({
            next: (resp) => {
              this.loaderService.emitComplete();
              if (resp && resp.success === 1 && resp.status_code === 200) {
                this.staffService.clearAdminFormEvent();
                this.alertService.success(resp.message, this.alertOptions);
                setTimeout(() =>
                  this.routerUrl.navigate(['/staff-list'], {
                    state: { result: resp.message },
                    relativeTo: this.router,
                    skipLocationChange: false
                  }), 1000);
              } else if (resp.message) {
                this.alertService.error(resp.message, this.alertOptions);
              } else {
                this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
              }
            },
            error: (err) => {
              this.loaderService.emitComplete();
              if (err.error.statusCode === 403) {
                this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
                this.routerUrl.navigate([`/login`], { skipLocationChange: false });
              } else if (err.error.message) {
                this.alertService.error(err.error.message, this.alertOptions);
              } else {
                this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
              }
            }
          });
        },
        error: (err: any) => {
          this.loaderService.emitComplete();
          this.alertService.error('Failed to fetch existing staff. Please try again!', this.alertOptions);
        }
      });
    } else {
      this.validateForm = true;
    }
  }

  saveFormChanges() {
    this.editScreen = this.enableEdit;
    // if (this.officersData.length == 0) {
    //   this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
    //   return;
    // }
    this.showalertmsg = true;
    // this.staffForm.get('room_no')?.setValue(this.selectedRooms.length ? this.selectedRooms : null);
    // this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes.length ? this.selectedShiftTimes : null);
    // this.staffForm.updateValueAndValidity();
    // Sync custom dropdowns with form controls
    this.staffForm.get('shift_time')?.setValue(
      this.selectedShiftTimes.length ? this.selectedShiftTimes.map(st => ({ label: st.label })) : null
    );
    this.staffForm.get('room_no')?.setValue(
      this.selectedRooms.length ? this.selectedRooms.map(r => ({ label: r.label })) : null
    );
    this.staffForm.updateValueAndValidity();
    // Update dynamic validator for higher_level_officer
    this.updateHigherLevelOfficerValidator();
    const selectedOfficers = this.staffForm.get('higher_level_officer')?.value || [];
    let officerDetails: any[] = [];
    if (selectedOfficers.length > 0) {
      officerDetails = selectedOfficers.map((officer: any) => ({
        id: officer.id,
        name: officer.full_name,
        phone_number: officer.phone_number,
        department: officer.hierarchy?.map((h: any) => h.department) || []
      }));
    }
    // console.log(this.staffForm.valid, 'Valid/Not')
    if (!this.staffForm.valid) {
      this.validateForm = true;
      return;
    }
    // console.log('Staff Form Values:', this.staffForm.value);
    this.loaderService.emitLoading();
    this.validateForm = false;
    const formValues = this.staffForm.getRawValue();
    // Build request to fetch staff list
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { member_id: this.memberId } }
    };
    this.staffListingService.getAllStaves(requestBody).subscribe({
      next: (staffList: any) => {
        const phoneExists = staffList.result.data.find(
          (staff: any) =>
            staff.phone_number === formValues.phone_number &&
            staff.id !== Number(this.staffId) // exclude current staff from duplicate check
        );
        if (phoneExists) {
          this.loaderService.emitComplete();
          this.alertService.error('Phone number is already linked with another staff.', this.alertOptions);
          return;
        }
        // Build payload only if phone validation passed
        const payloadData: any = {
          email: formValues.email,
          full_name: formValues.full_name,
          phone_number: formValues.phone_number,
          staff_employee_number: this.staff_member_id,
          higher_level_hierarchy: formValues.higher_level_hierarchy,
          at_desk: formValues.at_desk,
          hierarchy: formValues.hierarchy,
          // Newly changed for shift time
          // shift_time: this.selectedShiftTimes.length ? this.selectedShiftTimes : null,
          shift_time: this.selectedShiftTimes.length ? this.selectedShiftTimes.map(st => ({ label: st.label })) : null,
          // room_no: this.selectedRooms.length ? this.selectedRooms : null,
          room_no: this.selectedRooms.length ? this.selectedRooms.map(st => ({ label: st.label })) : null,
          is_staff_active: formValues.is_staff_active,
          created_by_id: this.createdById,
          created_by_name: this.createdByName,
          password: this.password,
          // higher_level_officer: officerDetails
          //  Newly commented because no need of fo desk 
          // front_office_desk: formValues.front_office_desk
          // End of newly commented code
        };
        // only include password if changed
        if (formValues.password && formValues.password !== '********') {
          payloadData.password = formValues.password;
        }
        // Add higher_level_officer only if condition true
        // if (this.showHigherLevelOfficer) {
        //   payloadData.higher_level_officer = officerDetails;
        // }
        // Include higher_level_officer only if visible and selected
        if (!this.isFirstStaff && this.showHigherLevelOfficer && this.showLowestHigherLevelOfficer && officerDetails.length) {
          payloadData.higher_level_officer = officerDetails; // array now
        }
        const formatJson = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          payload: { staff_updation: payloadData },
          extras: { find: { id: Number(this.staffId) } }
        };
        // Proceed with updateStaff API
        this.staffService.updateStaff(formatJson).subscribe({
          next: (resp: any) => {
            this.loaderService.emitComplete();
            if (resp && resp.success === 1 && resp.status_code === 200) {
              this.alertService.success(resp.message, this.alertOptions);
              setTimeout(() =>
                this.routerUrl.navigate(['/staff-list'], {
                  state: { result: resp.message },
                  relativeTo: this.router,
                  skipLocationChange: false
                }), 1000);
            } else if (resp.message) {
              this.alertService.error(resp.message, this.alertOptions);
            } else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          },
          error: (err: any) => {
            this.loaderService.emitComplete();
            if (err.error?.statusCode === 403) {
              this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
              this.routerUrl.navigate([`/login`], { skipLocationChange: false });
            } else if (err.error?.message) {
              this.alertService.error(err.error.message, this.alertOptions);
            } else {
              this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
            }
          }
        });
      },
      error: (err: any) => {
        this.loaderService.emitComplete();
        this.alertService.error('Failed to fetch existing staff. Please try again!', this.alertOptions);
      }
    });
  }

  // setInitialValues(staffId: any) {
  //   console.log('Staff ID:', staffId, this.memberId);
  //   this.staffId = staffId;
  //   const jsonObj = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: {
  //         id: Number(staffId),
  //         member_id: this.memberId
  //       }
  //     }
  //   };
  //   this.loaderService.emitLoading();
  //   this.staffService.getStaffById(jsonObj).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp.success === 1 && resp.status_code === 200) {
  //         const respData = resp.result.data[0];
  //         // Patch basic info
  //         this.staffForm.patchValue({
  //           email: respData.email,
  //           full_name: respData.full_name,
  //           phone_number: respData.phone_number,
  //           is_staff_active: respData.is_staff_active,
  //           at_desk: !!respData.at_desk,
  //         });
  //         // Password handling
  //         if (respData.password) {
  //           this.password = respData.password;
  //           this.staffForm.patchValue({ password: '********' });
  //         }
  //         // Shift times and rooms
  //         this.selectedShiftTimes = respData.shift_time || [];
  //         this.staffForm.get('shift_time')?.setValue(
  //           this.selectedShiftTimes.length ? this.selectedShiftTimes.map(st => ({ label: st.label })) : null
  //         );
  //         this.selectedRooms = respData.room_no || [];
  //         this.staffForm.get('room_no')?.setValue(
  //           this.selectedRooms.length ? this.selectedRooms.map(r => ({ label: r.label })) : null
  //         );
  //         // Staff member ID
  //         this.staff_member_id = respData.staff_employee_number;
  //         // fetch all staff to populate officersData
  //         const requestBody = {
  //           domain_name: DOMAIN_NAME,
  //           user_id: USER_ID,
  //           extras: { find: { member_id: this.memberId } }
  //         };
  //         this.staffListingService.getAllStaves(requestBody).subscribe(
  //           (staffResp: any) => {
  //             if (staffResp?.success === 1 && staffResp.status_code === 200) {
  //               this.officersData = staffResp.result.data || [];

  //               // --- Higher Level Officers (multi-select) ---
  //               if (respData.higher_level_officer && Array.isArray(respData.higher_level_officer)) {
  //                 this.showHigherLevelOfficer = true;
  //                 this.selectedOfficers = respData.higher_level_officer.map((officer: any) => {
  //                   const matched = this.officersData.find((o: any) => o.id === officer.id);
  //                   return matched || officer;
  //                 });
  //                 this.staffForm.patchValue({ higher_level_officer: this.selectedOfficers });
  //                 this.showInitalHigherLevelOfficer = true;
  //               } else {
  //                 this.showHigherLevelOfficer = false;
  //                 this.selectedOfficers = [];
  //                 this.staffForm.patchValue({ higher_level_officer: [] });
  //               }
  //               // Update officer validator
  //               this.updateHigherLevelOfficerValidator();
  //             }
  //           },
  //           (err) => {
  //             console.error('Error fetching all staff for officers:', err);
  //           }
  //         );
  //         // --- Higher Level Hierarchy (multi-select) ---
  //         if (respData.higher_level_hierarchy && Array.isArray(respData.higher_level_hierarchy)) {
  //           this.selectedHierarchies = respData.higher_level_hierarchy.map((h: any) =>
  //             this.supervisorList?.find((s: any) => s.id === h.id) || h
  //           );
  //           this.staffForm.patchValue({ higher_level_hierarchy: this.selectedHierarchies });
  //           // Fetch child hierarchy for all selected supervisors
  //           const selectedIds = this.selectedHierarchies.map((h: any) => h.id);
  //           this.getChildHierarchy(selectedIds, respData);
  //         } else {
  //           this.selectedHierarchies = [];
  //           this.staffForm.patchValue({ higher_level_hierarchy: [] });
  //         }
  //       } else {
  //         this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
  //       }
  //     },
  //     (err) => {
  //       this.loaderService.emitComplete();
  //       if (err.error?.statusCode === 403) {
  //         this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
  //         this.routerUrl.navigate(['/login']);
  //       } else {
  //         this.alertService.error(err.error?.message || 'Something bad happened!', this.alertOptions);
  //       }
  //     }
  //   );
  // }

  setInitialValues(staffId: any) {
    // console.log('Staff ID:', staffId, this.memberId);
    this.staffId = staffId;
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { id: Number(staffId), member_id: this.memberId }
      }
    };
    this.loaderService.emitLoading();
    this.staffService.getStaffById(jsonObj).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        this.isPageLoading = false; //newly added for loading
        if (resp.success === 1 && resp.status_code === 200) {
          const respData = resp.result.data[0];
          // Patch basic info
          this.staffForm.patchValue({
            email: respData?.email,
            full_name: respData?.full_name,
            phone_number: respData?.phone_number,
            is_staff_active: respData?.is_staff_active,
            at_desk: !!respData?.at_desk,
            //  Newly commented because no need of fo desk 
            // front_office_desk: respData?.front_office_desk
            // End of newly commented code
          });
          // Password handling
          if (respData?.password) {
            this.password = respData?.password;
            this.staffForm.patchValue({ password: '********' });
          }
          // Shift times and rooms
          this.selectedShiftTimes = respData?.shift_time || [];
          this.staffForm.get('shift_time')?.setValue(
            this.selectedShiftTimes.length ? this.selectedShiftTimes.map(st => ({ label: st.label })) : null
          );
          this.selectedRooms = respData?.room_no || [];
          this.staffForm.get('room_no')?.setValue(
            this.selectedRooms.length ? this.selectedRooms.map(r => ({ label: r.label })) : null
          );
          // Staff member ID
          this.staff_member_id = respData?.staff_employee_number;
          // fetch all staff to populate officersData
          const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: { find: { member_id: this.memberId } }
          };
          this.staffListingService.getAllStaves(requestBody).subscribe(
            (staffResp: any) => {
              if (staffResp?.success === 1 && staffResp.status_code === 200) {
                this.officersData = staffResp.result.data || [];
                // --- Higher Level Officers (multi-select) ---
                if (respData?.higher_level_officer && Array.isArray(respData?.higher_level_officer)) {
                  this.showHigherLevelOfficer = true;
                  this.selectedOfficers = respData?.higher_level_officer.map((officer: any) => {
                    const matched = this.officersData.find((o: any) => (o.id ?? o._id) === (officer.id ?? officer._id));
                    return matched || officer;
                  });
                  this.staffForm.patchValue({ higher_level_officer: this.selectedOfficers });
                  this.showInitalHigherLevelOfficer = true;
                } else {
                  this.showHigherLevelOfficer = false;
                  this.selectedOfficers = [];
                  this.staffForm.patchValue({ higher_level_officer: [] });
                }
                this.updateHigherLevelOfficerValidator();
              }
            },
            (err) => {
              console.error('Error fetching all staff for officers:', err);
            }
          );
          // --- Higher Level Hierarchy (multi-select) ---
          if (respData?.higher_level_hierarchy && Array.isArray(respData?.higher_level_hierarchy)) {
            // Map parent/supervisor selection by id/_id (defensive)
            this.selectedHierarchies = respData?.higher_level_hierarchy.map((h: any) =>
              this.supervisorList?.find((s: any) =>
                (s.id ?? s._id ?? '').toString() === (h.id ?? h._id ?? '').toString()
              ) || h
            );
            // Patch the control (keep enabled per your requirement)
            this.staffForm.patchValue({ higher_level_hierarchy: this.selectedHierarchies });
            this.staffForm.get('higher_level_hierarchy')?.enable({ emitEvent: false });
            // Fetch child hierarchy for all selected supervisors and pass respData
            const selectedIds = this.selectedHierarchies.map((h: any) => (h.id ?? h._id));
            this.getChildHierarchy(selectedIds, respData);
          } else {
            this.selectedHierarchies = [];
            this.staffForm.patchValue({ higher_level_hierarchy: [] });
          }
        } else {
          this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
        }
      },
      (err) => {
        this.loaderService.emitComplete();
        this.isPageLoading = false; // newly added for loading
        if (err.error?.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
          this.routerUrl.navigate(['/login']);
        } else {
          this.alertService.error(err.error?.message || 'Something bad happened!', this.alertOptions);
        }
      }
    );
  }

  getCustomerHierarchy(): void {
    this.loaderService.emitLoading(); //newly added for loading
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": {
          // Newly added for getting member id for customer type
          // "customer_id": Number(this.hotelId)
          "member_id": this.localStorageService.get('MemberId')
        }
      }
    };
    this.hierarchyService.getAllHierarchy(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          this.customerHierarchy = resp.result.data[0];
          // console.log("Fetched customer hierarchy(in staff creation):", this.customerHierarchy);
          this.customerHierarchydata = resp.result.data[0];
          this.hierarchyParentIds = [
            ...new Set(
              this.customerHierarchydata?.hierarchy
                .map((item: any) => item.parentId)
                .filter((id: any) => id != null)
            )
          ];
          //console.log('Hierarchy parent ids:', this.hierarchyParentIds)
          this.supervisorList = this.customerHierarchydata?.hierarchy.filter(
            (item: any) =>
              this.hierarchyParentIds.includes(item.id)
          );
          //console.log('Supervisor List:', this.supervisorList);
          // If first staff, prefill hierarchy
          if (this.isFirstStaff && this.dh) {
            // console.log('Default Hierarchy Level Hierarchy:', this.dh);
            const supervisorObj = this.supervisorList?.find(
              (s: any) => s.designation === this.dh.designation && s.department === this.dh.department
            );
            // console.log('Default Hierarchy Level Hierarchy:', supervisorObj);
            // Newly added & commented for combined - started
            // this.staffForm.patchValue({
            //   higher_level_hierarchy: supervisorObj || null
            // });
            this.selectedHierarchies = supervisorObj ? [supervisorObj] : [];
            this.staffForm.patchValue({
              higher_level_hierarchy: this.selectedHierarchies
            });
            // Ended
            this.staffForm.get('higher_level_hierarchy')?.disable();
            // remove officer validation for first staff
            this.staffForm.get('higher_level_officer')?.clearValidators();
            this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
            // Newly added & commented for combine - started
            // Prepare child hierarchy for template but do NOT select by default
            this.supervisorChildList = this.customerHierarchy.hierarchy.filter(
              (item: any) => this.selectedHierarchies.some(parent => parent.id === item.parentId)
            );
            this.selectedStaffHierarchies = []; //  children remain unselected
            this.staffForm.patchValue({ hierarchy: [] }); // form control empty initially
            // console.log('Child hierarchies (unselected by default):', this.supervisorChildList);
            // Ended
          }
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

  // Close dropdowns when clicking anywhere outside
  // @HostListener('document:mousedown', ['$event'])
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.closeAllDropdowns();
  }

  toggleDropdown(event: MouseEvent, dropdownName: string) {
    event.stopPropagation(); // prevent document click from firing immediately
    // Use type assertion to avoid TS error
    const prop = `${dropdownName}DropdownOpen` as keyof this;
    const isAlreadyOpen = (this[prop] as boolean);
    // Close all dropdowns
    this.closeAllDropdowns();
    // Toggle only if it was previously closed
    if (!isAlreadyOpen) {
      (this[prop] as boolean) = true;
    }
  }

  closeAllDropdowns() {
    this.hierarchyDropdownOpen = false;
    this.staffHierarchyDropdownOpen = false;
    this.officerDropdownOpen = false;
    this.roomDropdownOpen = false;
    this.shiftDropdownOpen = false;
  }

  clearError(controlName: string) {
    this.validateForm = false; // or
    // optionally mark control as pristine to hide errors
    this.staffForm.get(controlName)?.markAsPristine();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }



}
