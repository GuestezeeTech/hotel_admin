import { HierarchyService } from './../../hierarchy/hierarchy.service';
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
import { UserAccessService } from '../user-access.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';

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
  isFirstStaff: boolean = false;
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
    private hotelenrollmentservice: HotelEnrollmentTabviewService
  ) { }

  async ngOnInit(): Promise<void> {
    // Initialize the form with validation rules
    this.staffForm = new FormGroup({
      email: this.formBuilder.control('', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]),
      full_name: this.formBuilder.control('', [Validators.required, Validators.maxLength(30),]),
      phone_number: this.formBuilder.control('', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9]{10}$/)]),
      // employee_id: this.formBuilder.control('', [Validators.required]),
      // higher_level_hierarchy: this.formBuilder.control('', [Validators.required]),
      higher_level_hierarchy: this.formBuilder.control(''),
      // higher_level_officer: this.formBuilder.control('', [Validators.required]),
      higher_level_officer: this.formBuilder.control(''),
      hierarchy: this.formBuilder.control('', [Validators.required]),
      shift_time: this.formBuilder.control('', [Validators.required]),
      room_no: this.formBuilder.control('', [Validators.required]),
      is_staff_active: this.formBuilder.control(true),
      at_desk: this.formBuilder.control('', [Validators.required]),
      password: this.formBuilder.control('', [Validators.required, Validators.minLength(6), Validators.maxLength(30),]),
    })
    // For gettting time slots & room range from settings module
    // const slots = this.localStorageService.get('selectedSlots');
    // this.selectedSlots = slots ? JSON.parse(slots) : [];
    // console.log('Selected Slots:', this.selectedSlots);
    // const room_ranges = this.localStorageService.get('roomRange');
    // this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
    // console.log('Selected Room Range:', this.roomRanges);
    // For getting customer id
    this.hotelId = Number(this.localStorageService.get('UserId'));
    console.log('Hotel Id:', this.hotelId);
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
    // read service flags set by listing-->First staff creation
    this.isFirstStaff = this.staffService.isFirstStaff;
    this.dh = this.staffService.defaultHierarchy;
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
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  }

  // For throwing error
  get f() { return this.staffForm.controls; }

  getCustomerById(): Promise<void> {
    const memberId = this.localStorageService.get('MemberId');
    console.log('getCustomerById called with hotelId:', memberId, this.hotelId);
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            "id": this.hotelId
          }
        }
      };
      this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            const customerdata = resp.result.data[0];
            console.log('Customer Data:', customerdata);
            this.memberId = customerdata.customer_member_id;
            console.log('Member Id:', this.memberId);
            this.localStorageService.set('roomRange', JSON.stringify(customerdata?.settings?.room_range));
            this.localStorageService.set('selectedSlots', JSON.stringify(customerdata?.settings?.shift_timings));
            console.log('Room Range:', this.localStorageService.get('roomRange'));
            console.log('Selected Slots:', this.localStorageService.get('selectedSlots'));
            const slots = this.localStorageService.get('selectedSlots');
            this.selectedSlots = slots ? JSON.parse(slots) : [];
            console.log('Selected Slots:', this.selectedSlots);
            const room_ranges = this.localStorageService.get('roomRange');
            this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
            console.log('Selected Room Range:', this.roomRanges);
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
      const selectedOfficer = formValues.higher_level_officer;
      let officerDetails = null;
      if (selectedOfficer) {
        officerDetails = {
          id: selectedOfficer.id,
          name: selectedOfficer.full_name,
          phone_number: selectedOfficer.phone_number
        };
      }
      console.log('Selected Officer Details:', this.officersData.length);
      // Check phone number against existing staff
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { member_id: this.memberId } }
      };
      this.staffListingService.getAllStaves(requestBody).subscribe({
        next: (staffList: any) => {
          console.log('Existing Staff List:', staffList);
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
            employee_id: formValues.employee_id,
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
            password: formValues.password
          };
          const requestData: any = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { staff_creation: payloadData }
          };
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

  // For saving the existing staff form
  saveFormChanges() {
    console.log('Clicked');
    this.editScreen = this.enableEdit;
    // if (this.officersData.length == 0) {
    //   this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
    //   return;
    // }
    this.showalertmsg = true;
    // this.staffForm.get('room_no')?.setValue(this.selectedRooms.length ? this.selectedRooms : null);
    // this.staffForm.get('shift_time')?.setValue(this.selectedShiftTimes.length ? this.selectedShiftTimes : null);
    this.staffForm.updateValueAndValidity();
    const selectedOfficer = this.staffForm.get('higher_level_officer')?.value;
    let officerDetails = null;
    if (selectedOfficer) {
      officerDetails = {
        id: selectedOfficer.id,
        name: selectedOfficer.full_name,
        phone_number: selectedOfficer.phone_number
      };
    }
    console.log(this.staffForm.valid, 'Valid/Not')
    if (!this.staffForm.valid) {
      this.validateForm = true;
      return;
    }
    console.log('Staff Form Values:', this.staffForm.value);
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
          staff_member_id: this.staff_member_id,
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
        };
        // only include password if changed
        if (formValues.password && formValues.password !== '********') {
          payloadData.password = formValues.password;
        }
        // Add higher_level_officer only if condition true
        if (this.showHigherLevelOfficer) {
          payloadData.higher_level_officer = officerDetails;
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

  // Sets initial values for editing staff
  setInitialValues(staffId: any) {
    console.log('Staff ID:', staffId, this.memberId);
    this.staffId = staffId;
    const jsonObj = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          id: Number(staffId),
          member_id: this.memberId
        }
      }
    };
    this.loaderService.emitLoading();
    this.staffService.getStaffById(jsonObj).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp.success === 1 && resp.status_code === 200) {
          const respData = resp.result.data[0];
          const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: { find: { member_id: this.memberId } }
          };
          this.staffListingService.getAllStaves(requestBody).subscribe(
            (resp: any) => {
              if (resp?.success === 1 && resp.status_code === 200) {
                // Filter staff who report to this supervisor
                this.officersData = resp.result.data;
                console.log('Officers Data:', this.officersData);
                if (respData.higher_level_officer) {
                  this.showHigherLevelOfficer = true;
                  // Find officer in officersData by id
                  const matchedOfficer = this.officersData.find(
                    (o: any) => o.id == respData.higher_level_officer.id
                  );
                  this.staffForm.patchValue({
                    higher_level_officer: matchedOfficer || null
                  });
                  this.showInitalHigherLevelOfficer = true;
                  console.log('Higher Level Officer:', respData.higher_level_officer);
                  console.log('Matched Officer:', matchedOfficer);
                }
                else {
                  this.showHigherLevelOfficer = false;
                  this.staffForm.patchValue({
                    higher_level_officer: null
                  });
                }
              }
            })
          this.password = respData.password;
          // Patch basic info
          this.staffForm.patchValue({
            email: respData.email,
            full_name: respData.full_name,
            phone_number: respData.phone_number,
            is_staff_active: respData.is_staff_active,
            at_desk: !!respData.at_desk,
          });
          // Password handling
          if (respData.password) {
            this.staffForm.patchValue({
              password: '********'
            })
          }
          // Decides if Higher Level Officer should show
          // if (respData.higher_level_officer && respData.higher_level_officer != null) {
          //   this.showHigherLevelOfficer = true;
          //   console.log('Higher Level Officer:', respData.higher_level_officer);
          //   this.staffForm.patchValue({
          //     higher_level_officer: respData.higher_level_officer
          //   });
          // } 
          //  staff member ID
          this.staff_member_id = respData.staff_employee_number;
          // Newly changed for shift time
          // this.selectedShiftTimes = respData.shift_time?.map((t: any) => t.split(' - ')[0]) || [];
          this.selectedShiftTimes = respData.shift_time;
          console.log('Shift:', this.selectedShiftTimes);
          // selected rooms
          this.selectedRooms = respData.room_no;
          console.log('Rooms:', this.selectedRooms);
          // Set selected supervisor safely
          let selectedSupervisor = null;
          if (respData.higher_level_hierarchy) {
            selectedSupervisor = this.supervisorList?.find((s: any) =>
              s.id === respData.higher_level_hierarchy.id
            );
          }
          console.log('Selected Supervisor:', selectedSupervisor);
          this.staffForm.patchValue({ higher_level_hierarchy: selectedSupervisor || null });
          // Fetch hierarchy list for this supervisor
          if (selectedSupervisor) {
            this.getChildHierarchy(selectedSupervisor.id, respData);
          }
        } else {
          this.alertService.error('Something bad happened. Please try again!', this.alertOptions);
        }
      },
      err => {
        this.loaderService.emitComplete();
        if (err.error?.statusCode === 403) {
          this.alertService.error('Session Time Out! Please login Again', this.alertOptions);
          this.routerUrl.navigate(['/login']);
        } else {
          this.alertService.error(err.error?.message || 'Something bad happened!', this.alertOptions);
        }
      }
    );
  }

  async getChildHierarchy(supervisorId: any, respData?: any) {
    console.log('Fetching child hierarchy for supervisor ID:', supervisorId);
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { customer_id: Number(this.hotelId) } }
    };
    this.hierarchyService.getAllHierarchy(requestBody).subscribe(async (resp: any) => {
      this.loaderService.emitComplete();
      if (resp?.success === 1 && resp.status_code === 200) {
        const allHierarchies = resp.result.data.flatMap((item: any) => item.hierarchy || []);
        // Filter child hierarchies under selected supervisor
        this.supervisorChildList = allHierarchies.filter((item: any) =>
          item.parentId === supervisorId
        );
        console.log('Resp Data:', respData);
        // Patch staff hierarchy safely
        let selectedHierarchy = null;
        if (respData?.hierarchy) {
          // Viewing/editing existing staff: use respData
          selectedHierarchy = this.supervisorChildList.find(
            (child: any) => child.id === respData.hierarchy.id
          );
        } else {
          // Dropdown click: get selected hierarchy directly from form
          selectedHierarchy = this.staffForm.get('higher_level_hierarchy')?.value || null;
        }
        this.staffForm.patchValue({ hierarchy: selectedHierarchy || null });
        console.log('Selected Hierarchy:', selectedHierarchy);
        // getLowestLevelHierarchy() to check if lowest is selected**
        const lowestHierarchy = await this.getLowestLevelHierarchy();
        console.log('Lowest Hierarchy:', lowestHierarchy);
        if (!this.showInitalHigherLevelOfficer) {
          if (selectedHierarchy && lowestHierarchy && selectedHierarchy.id === lowestHierarchy.id) {
            // Lowest hierarchy selected: higher_level_officer
            this.showLowestHigherLevelOfficer = false;
            this.staffForm.patchValue({ higher_level_officer: null });
            // removes validation when hidden
            this.staffForm.get('higher_level_officer')?.clearValidators();
            this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
            // populate room dropdown directly from respData.room_no
            // if (respData?.room_no?.length > 0) {
            const room_ranges = this.localStorageService.get('roomRange');
            this.roomRanges = room_ranges ? JSON.parse(room_ranges) : [];
            console.log('Room Ranges for Lowest Hierarchy:', this.roomRanges);
            // } else {
            //   this.roomRanges = [];
            // }

          } else {
            this.showLowestHigherLevelOfficer = true;
            // make it required when shown
            this.staffForm.get('higher_level_officer')?.setValidators([Validators.required]);
            this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
            // Existing officer fetching logic
            this.getOfficerDetails(supervisorId);
          }
        }
        this.showInitalHigherLevelOfficer = false; // Reset for next use
      } else {
        this.alertService.error(resp?.message || 'Something bad happened!', this.alertOptions);
      }
    }, err => {
      this.loaderService.emitComplete();
      this.alertService.error(err?.error?.message || 'Something bad happened!', this.alertOptions);
    });
  }

  isShiftSelected(slot: any): boolean {
    return this.selectedShiftTimes.some(s => s.label === slot.label);
  }

  async getLowestLevelHierarchy(): Promise<any> {
    return new Promise((resolve) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { customer_id: Number(this.hotelId) } }
      };
      this.hierarchyLowestService.apiCall(requestBody, ENDPOINTS.GET_HIERARCHY)
        .subscribe({
          next: (resp: any) => {
            if (resp?.success && Array.isArray(resp.result?.data) && resp.result.data.length) {
              const hierarchy = resp.result.data[0].hierarchy || [];
              // pick only items without parentId
              const rootLevel = hierarchy.filter((h: any) => !h.parentId && h.parentId !== 0);
              // find the lowest (min id)
              const lowest = rootLevel.length
                ? rootLevel.reduce((min: any, h: any) => (h.id < min.id ? h : min), rootLevel[0])
                : null;
              this.defaultHierarchy = lowest;
              console.log('Lowest hierarchy found:', lowest);
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

  getOfficerDetails(supervisorId: any) {
    console.log('Fetching officers for supervisor ID:', supervisorId);
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { member_id: this.memberId } }
    };
    this.staffListingService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp.status_code === 200) {
          // Filter staff who report to this supervisor
          this.officersData = resp.result.data.filter(
            (staff: any) => staff.hierarchy?.id == supervisorId
          );
          console.log('Officers Data:', this.officersData);
          // if (this.officersData.length == 0) {
          // No officers under this supervisor
          // this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
          //   // disable save functionality
          //   this.staffForm.get('higher_level_officer')?.setValue(null);
          //   // add a form-level error so saveForm/saveFormChanges cannot pass
          //   this.staffForm.setErrors({ noOfficer: true });
          // return;
          // }
          // // Officers found
          // this.staffForm.setErrors(null);
          // // Preselect officer if any
          // let selectedOfficer = this.officersData.find(
          //   (officer: any) => officer.hierarchy.id == supervisorId
          // );
          // this.staffForm.patchValue({ higher_level_officer: selectedOfficer || null });
          // Find the selected officer from respData if available
          let selectedOfficer = null;
          if (supervisorId != undefined) {
            selectedOfficer = this.officersData.find(
              (officer: any) => officer.hierarchy.id == supervisorId
            );
            console.log('Selected Officer:', selectedOfficer);
            // Patch the form with the selected officer (or null)
            // if (selectedOfficer == null || selectedOfficer == undefined) {
            //   this.alertService.error('No officer available for this hierarchy. Cannot create staff.', this.alertOptions);
            //   this.staffForm.patchValue({ higher_level_officer: selectedOfficer || null });
            // }
            // Enable the field if there’s data
            // if (selectedOfficer) {
            //   this.staffForm.get('higher_level_officer')?.enable();
            // } else {
            // Disable if no officer is available
            // this.staffForm.get('higher_level_officer')?.disable();
            // }
          }
        }
      },
      err => {
        if (err?.error?.statusCode === 403) {
          this.routerUrl.navigate(['/login']);
        }
      }
    );
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
            console.log('Default Hierarchy:', this.dh);
            const supervisorObj = this.supervisorList?.find(
              (s: any) => s.designation === this.dh.designation && s.department === this.dh.department
            );
            console.log('Default Hierarchy Supervisor:', supervisorObj);
            this.staffForm.patchValue({
              higher_level_hierarchy: supervisorObj || null
            });
            this.staffForm.get('higher_level_hierarchy')?.disable();
            // remove officer validation for first staff
            this.staffForm.get('higher_level_officer')?.clearValidators();
            this.staffForm.get('higher_level_officer')?.updateValueAndValidity();
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
    console.log('Selected Rooms:', this.selectedRooms);
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
    console.log('Selected Shift Times:', this.selectedShiftTimes);
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

  onOfficerChange(officer: any) {
    if (officer && officer.room_no && officer.room_no.length > 0) {
      // use only officer’s room_no for new staff
      this.filteredRoomRanges = officer.room_no;
      this.roomRanges = this.filteredRoomRanges;

    } else {
      this.filteredRoomRanges = []; // no rooms if officer has none
      this.roomRanges = [];
    }
    // reset previously selected rooms
    // this.selectedRooms = [];
  }

}
