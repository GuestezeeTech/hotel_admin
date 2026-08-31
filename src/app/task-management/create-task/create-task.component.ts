import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertsComponent } from '../../shared/alerts/alerts.component';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { DepartmentListService } from '../../department-list/department-list.service';
import { ServiceDetailService } from '../../hotel-enrollment-tabview/service-details/service-details.service';
import { TaskManagementService } from '../task-management.service';
import { Observable, switchMap, tap, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';

@Component({
    selector: 'app-create-task',
    standalone: true,
    imports: [CommonModule, FormsModule, AlertsComponent],
    templateUrl: './create-task.component.html',
    styleUrl: './create-task.component.scss'
})

export class CreateTaskComponent implements OnInit {
    customerdata: any = {};
    room_no: string = '';
    roomToRangeLabelMap: { [room: string]: string } = {};
    loadingGuest: boolean = false;
    selectedGuest: any = null;   // full guest record
    guestList: any[] = [];       // list of all guests for the room
    guest_name: string = '';
    guestMessage: string = 'Enter room no to list guest';
    category: any = null;
    service_name: any = null;
    help_remarks: string = '';
    serviceQuantity: number = 0; // Quantity for service
    menuOutlets: any[] = [];
    selectedOutlet: any = null;
    loadingOutlets: boolean = false;
    fallbackOutletImage = 'https://guestezee.s3.ap-south-2.amazonaws.com/Guestezee/Brand/Re.png';
    // fallbackOutletImage = '';
    products: any[] = [];
    loadingProducts: boolean = false;
    fallbackProductImage = 'https://guestezee.s3.ap-south-2.amazonaws.com/GuestEzee/Brand/menu+4.png';
    // Flag to show modal
    isClearMenuModalOpen = false;
    pendingOutletChange: any = null;
    // Pagination
    currentPage = 1;
    pageSize = 20;
    totalPages = 0;
    paginatedProducts: any[] = [];
    productSearchText: string = '';
    filteredProducts: any[] = [];
    departments: any[] = [];
    services: any[] = [];
    defaultServices: any[] = [];
    filteredServices: any[] = [];
    // Staff assignment
    staves: any[] = [];
    selectedStaff: any = null;
    isStaffSelected: boolean = false;
    validateForm: boolean = false;
    member_id: any;
    options = {
        autoClose: true,
        keepAfterRouteChange: false
    };
    // Newly added for task allocation purpose
    selfStaffId: any;
    // Newly added for room labelling
    isRoomDropdownOpen: boolean = false;
    roomSearchText: string = '';
    allRooms: string[] = [];
    filteredRooms: string[] = [];
    // End of newly added for room labelling

    constructor(
        private router: Router,
        private alertService: AlertsService,
        private loaderService: LoaderService,
        private localService: LocalStorageService,
        private departmentService: DepartmentListService,
        private serviceDetails: ServiceDetailService,
        private taskManagementService: TaskManagementService,
        private http: HttpClient,
        private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
        private elementRef: ElementRef
    ) { }

    ngOnInit(): void {
        this.member_id = this.localService.get('MemberId');
        // console.log('Member Id:', this.member_id);
        // Newly added for task allocation purpose
        this.selfStaffId = Number(this.localService.get('UserId'));
        console.log('Self Staff Id', this.selfStaffId);

        this.getDefaultServices();
        if (this.member_id) {
            this.getDepartmentById(this.member_id);
            this.getAllServices(this.member_id);
            // Newly added for room labelling
            this.getCustomerById().then(() => {
                this.initializeRoomsFromCustomer();
            }).catch(err => {
                console.error('Failed to load customer settings', err);
            });
            // End of newly added for room labelling
        }
    }

    /** Returns the logged-in person's name for task_created_by. */
    getStaffName(): string {
        let name;
        if (!name && this.localService.get('CustomerType') === 'Staff') {
            try {
                const staffData = JSON.parse(this.localService.get('StaffData') || '{}');
                name = staffData.full_name || staffData.first_name || '';
            }
            catch {
                name = '';
            }
        }
        return name;
    }

    getDepartmentById(memberId: any) {
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
                find: {
                    member_id: memberId
                }
            }
        };
        this.departmentService.getAllDepartments(requestBody).subscribe(
            (resp: any) => {
                if (resp.success === 1 && resp.status_code === 200) {
                    // Newly added & commneted for task allocation
                    // this.departments = resp.result.data;
                    const allDepartments = resp.result.data;
                    const isStaff = this.localService.get('CustomerType') === 'Staff';
                    if (isStaff) {
                        let userData: any = this.localService.get('StaffData');
                        let userDataParse = userData ? JSON.parse(userData) : null;
                        let userDepartment: string[] = [];
                        if (userDataParse?.hierarchy && Array.isArray(userDataParse.hierarchy)) {
                            userDepartment = userDataParse.hierarchy.map((item: any) => item.department);
                        } else if (userDataParse?.hierarchy?.department) {
                            userDepartment = [userDataParse.hierarchy.department];
                        }
                        if (userDepartment.length > 0) {
                            this.departments = allDepartments.filter((dept: any) => userDepartment.includes(dept.name));
                        } else {
                            this.departments = allDepartments;
                        }
                    }
                    // Ended for task allocation puropose
                    else {
                        this.departments = allDepartments;
                    }
                    // console.log('Departments:', this.departments);
                } else {
                    this.departments = [];
                    // console.log('Departments:', this.departments);
                }
            },
            (err: any) => {
                this.departments = [];
                console.error('Error fetching departments:', err);
            }
        );
    }

    getAllServices(memberId: any) {
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
                find: {
                    member_id: memberId,

                }
            }
        };
        this.serviceDetails.getAllServices(requestBody).subscribe(
            (resp: any) => {
                if (resp.success === 1 && resp.status_code === 200) {
                    this.services = resp.result.data;
                    // console.log('Services:', this.services);
                    this.applyServiceFilter();
                } else {
                    this.services = [];
                    // console.log('Services:', this.services);
                    this.applyServiceFilter();
                }
            },
            (err: any) => {
                console.error('Error fetching services:', err);
                this.services = [];
                this.filteredServices = [];
            }
        );
    }

    getDefaultServices() {
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
                find: {
                    belongs_to: ['Help Service', 'Menu Ordering']
                }
            }
        };
        this.serviceDetails.getAllServices(requestBody).subscribe(
            (resp: any) => {
                if (resp.success === 1 && resp.status_code === 200) {
                    this.defaultServices = resp.result.data;
                    // console.log('Default Services:', this.defaultServices);
                } else {
                    this.defaultServices = [];
                    // console.log('Default Services:', this.defaultServices);
                }
                this.applyServiceFilter();
            },
            (err: any) => {
                console.error('Error fetching services:', err);
                this.defaultServices = [];
            }
        );
    }

    onCategoryChange() {
        this.applyServiceFilter();
        this.service_name = null;
    }

    applyServiceFilter() {
        // console.log('Services:', this.services);
        // console.log('Category:', this.category);
        // If no category is selected, do not list any services.
        if (!this.category) {
            this.filteredServices = [];
            this.getAllStavesByCategory();
            return;
        }
        const departmentName = this.category.name;
        // Helper: determine if a service should be excluded from listing
        const shouldExcludeService = (s: any): boolean => {
            const name = (s?.name || '').toLowerCase();
            const belongsTo = (s?.belongs_to || '').toLowerCase();
            // Do not list Checkout and Late checkout by name or belongs_to
            if (name === 'checkout' || name === 'late checkout') {
                return true;
            }
            if (belongsTo === 'checkout' || belongsTo === 'late checkout') {
                return true;
            }
            return false;
        };
        // 1. Services directly under this department (category)
        let categoryServices: any[] = [];
        if (this.services?.length) {
            categoryServices = this.services.filter(
                (s: any) =>
                    s.department === departmentName &&
                    !shouldExcludeService(s) &&
                    s?.is_active === true
            );
        }
        // 2. Default services (Menu Ordering / Help Service) mapped via department.default_services
        let departmentDefaultServices: any[] = [];
        if (this.departments?.length && this.defaultServices?.length) {
            const currentDept = this.departments.find(
                (d: any) => d.name === departmentName
            );
            if (currentDept && Array.isArray(currentDept.default_services)) {
                const allowedDefaultNames = currentDept.default_services
                    .map((n: any) => (n || '').toString().toLowerCase());
                departmentDefaultServices = this.defaultServices.filter((s: any) => {
                    if (shouldExcludeService(s)) {
                        return false;
                    }
                    const belongsTo = (s?.belongs_to || '').toLowerCase();
                    // Only allow Menu Ordering and Help Service default services
                    const isAllowedDefaultBelongsTo =
                        belongsTo === 'menu ordering' || belongsTo === 'help service';
                    if (!isAllowedDefaultBelongsTo) {
                        return false;
                    }
                    const serviceName = (s?.name || '').toLowerCase();
                    // Only include active services
                    if (s?.is_active !== true) {
                        return false;
                    }
                    return allowedDefaultNames.includes(serviceName);
                });
            }
        }
        this.filteredServices = [
            ...departmentDefaultServices,
            ...categoryServices
        ];
        // console.log('Filtered Services:', this.filteredServices);
        // also reload staff for this category
        this.getAllStavesByCategory();
    }

    onRoomNoChange() {
        this.clearGuest();
        this.guestMessage = 'Enter room no to list guest';
        this.getGuestDetailsByRoom();
    }

    getGuestDetailsByRoom() {
        if (!this.room_no) {
            this.clearGuest();
            this.guestMessage = 'Enter room no to list guest';
            return;
        }
        this.loadingGuest = true;
        this.guestMessage = '';
        this.guestList = [];
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
                find: {
                    member_id: this.member_id,
                    room_no: this.room_no
                }
            },
            payload: {}
        };
        this.taskManagementService.getGuestDetails(requestBody).subscribe(
            (resp: any) => {
                this.loadingGuest = false;
                this.clearGuest(); // always clear first
                this.guestMessage = ''; // Clear any previous message
                if (resp?.success === 1 && resp.result?.data?.length > 0) {
                    const guestRecord = resp.result.data[0];
                    // OLD CODE: const guestDetailsList = guestRecord?.Guest_detail || [];
                    // NEW CODE: Using guestDatas instead of Guest_detail
                    // Check if guestDatas exists and is a non-empty array
                    const guestDetailsList = Array.isArray(guestRecord?.guestDatas) ? guestRecord.guestDatas : [];
                    if (guestDetailsList.length > 0) {
                        // Build list of all guests for dropdown
                        this.guestList = guestDetailsList.map((guestDetails: any) => ({
                            guestRecord,
                            guestDetails
                        }));
                        // Default select the first guest
                        this.selectedGuest = this.guestList[0];
                        const firstGuest = this.guestList[0].guestDetails;
                        this.guest_name = `${firstGuest.First_Name} ${firstGuest.Last_Name || ''}`.trim();
                        this.guestMessage = ''; // Clear message when guests are found
                    } else {
                        this.guestMessage = 'No guest found for this room';
                    }
                } else {
                    this.guestMessage = 'No guest found for this room';
                }
            },
            (err: any) => {
                this.loadingGuest = false;
                console.error('Failed to fetch guest details', err);
                this.alertService.error('Failed to fetch guest details', this.options);
                this.clearGuest();
                this.guestMessage = 'No guest found for this room';
            }
        );
    }

    clearGuest() {
        this.guest_name = '';
        this.selectedGuest = null;
        // this.guestList = [];
        // Don't clear guestMessage here as it's set based on API response
    }

    /*   getAllStavesByCategory() {
          this.staves = [];
          this.selectedStaff = null;
          this.isStaffSelected = false;
          if (!this.category) {
              return;
          }
          const categoryName = this.category.name;
          // First, fetch all staff for the category
          const findObject: any = {
              is_available: true,
              at_desk: false,
              member_id: this.member_id,
              "hierarchy.department": categoryName,
          };
          const requestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              extras: {
                  find: findObject
              }
          };
          this.taskManagementService.getAllStaves(requestBody).subscribe(
              (resp: any) => {
                  if (resp?.success === 1 && resp.status_code === 200) {
                      const allStaves = resp.result.data || [];
                      // Extract all unique higher_level_officer IDs
                      const officerIds = new Set<number>();
                      allStaves.forEach((staff: any) => {
                          if (staff.higher_level_officer && Array.isArray(staff.higher_level_officer)) {
                              staff.higher_level_officer.forEach((officer: any) => {
                                  if (officer.id) {
                                      officerIds.add(officer.id);
                                  }
                              });
                          }
                      });
                      if (officerIds.size === 0) {
                          this.staves = [];
                          // console.log('No higher level officers found');
                          return;
                      }
                      // Fetch all staff (including officers) to get their at_desk values
                      const allStaffRequestBody = {
                          domain_name: DOMAIN_NAME,
                          user_id: USER_ID,
                          extras: {
                              find: {
                                  member_id: this.member_id
                              }
                          }
                      };
                      this.taskManagementService.getAllStaves(allStaffRequestBody).subscribe(
                          (allStaffResp: any) => {
                              if (allStaffResp?.success === 1 && allStaffResp.status_code === 200) {
                                  const allStaffData = allStaffResp.result.data || [];
                                  // Create a map of officer ID to officer details (for quick lookup)
                                  const officerMap = new Map<number, any>();
                                  allStaffData.forEach((staff: any) => {
                                      if (officerIds.has(staff.id)) {
                                          officerMap.set(staff.id, staff);
                                      }
                                  });
                                  // Filter staff based on condition:
                                  // Staff should be included if their higher_level_officer's department
                                  // array includes the category name AND that officer has at_desk: true
                                  this.staves = allStaves.filter((staff: any) => {
                                      if (!staff.higher_level_officer || !Array.isArray(staff.higher_level_officer)) {
                                          return false;
                                      }
                                      // Check each higher level officer
                                      return staff.higher_level_officer.some((officer: any) => {
                                          // Check if officer's department array includes the category name
                                          if (!officer.department || !Array.isArray(officer.department)) {
                                              return false;
                                          }
  
                                          const departmentMatches = officer.department.includes(categoryName);
                                          if (!departmentMatches) {
                                              return false;
                                          }
                                          // Check if officer has at_desk: true
                                          const officerDetails = officerMap.get(officer.id);
                                          if (!officerDetails) {
                                              return false;
                                          }
                                          return officerDetails.at_desk === true;
                                      });
                                  });
  
                                  // console.log('Filtered Staves (with at_desk check):', this.staves);
                              } else {
                                  this.staves = [];
                                  // console.log('Failed to fetch all staff data');
                              }
                          },
                          (err: any) => {
                              console.error('Error fetching all staff data:', err);
                              this.staves = [];
                          }
                      );
                  } else {
                      this.staves = [];
                  }
              },
              (err: any) => {
                  console.error('Error fetching staves for category:', err);
                  this.staves = [];
              }
          );
  
      } */

    //   Newly added for task allocation purpose
    // For finding desk staff based on requested task category
    getAllStavesByCategory() {
        this.staves = [];
        this.selectedStaff = null;
        this.isStaffSelected = false;
        if (!this.category) {
            return;
        }
        const categoryName = this.category.name;
        console.log('Requested category name: ', categoryName);
        const currentDeskStaffId = Number(this.localService.get('UserId'));
        console.log('Current desk staff ID: ', currentDeskStaffId);
        let userData: any = this.localService.get('StaffData');
        let userDataParse = userData ? JSON.parse(userData) : null;
        console.log('Logged in staff data: ', userDataParse);
        // Extract user departments
        let userDepartment: string[] = [];
        if (userDataParse?.hierarchy && Array.isArray(userDataParse.hierarchy)) {
            userDepartment = userDataParse.hierarchy.map((item: any) => item.department);
        } else if (userDataParse?.hierarchy?.department) {
            userDepartment = [userDataParse.hierarchy.department];
        }
        console.log('Logged in staff departments: ', userDepartment);
        const isSameDepartment = userDepartment.includes(categoryName);
        console.log('Is same department: ', isSameDepartment);
        if (isSameDepartment) {
            // Use current logged-in desk staff's ID
            this.fetchStaves(categoryName, currentDeskStaffId, currentDeskStaffId);
        } else {
            // Find the first available desk staff for that specific department
            const deskFindObject = {
                "hierarchy.department": categoryName,
                "at_desk": true,
                // "is_available": true,
                "member_id": this.member_id
            };
            const deskRequestBody = {
                domain_name: DOMAIN_NAME,
                user_id: USER_ID,
                extras: { find: deskFindObject }
            };
            this.taskManagementService.getAllStaves(deskRequestBody).subscribe((resp: any) => {
                if (resp?.success === 1 && resp.status_code === 200 && resp.result.data && resp.result.data.length > 0) {
                    const otherDepartmentDeskStaffId = resp.result.data[0].id;
                    this.fetchStaves(categoryName, currentDeskStaffId, otherDepartmentDeskStaffId);
                } else {
                    this.staves = []; // No desk staff available for that department
                }
            }, (err: any) => {
                console.error('Error fetching desk staff:', err);
                this.staves = [];
            });
        }
    }

    fetchStaves(categoryName: string, desk_id: number, higher_level_officer_id: number) {
        console.log('Category name: ', categoryName);
        console.log('Logged in staff desk ID: ', desk_id);
        console.log('Higher level officer ID: ', higher_level_officer_id);
        const findObject: any = {
            is_available: true,
            at_desk: false,
            member_id: this.member_id,
            task_allocation_purpose: true,
            "hierarchy.department": categoryName,
            "higher_level_officer.id": higher_level_officer_id
        };
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: { find: findObject }
        };
        this.taskManagementService.getAllStaves(requestBody).subscribe(
            (resp: any) => {
                if (resp?.success === 1 && resp.status_code === 200) {
                    this.staves = resp.result.data || [];
                } else {
                    this.staves = [];
                }
            },
            (err: any) => {
                console.error('Error fetching staves:', err);
                this.staves = [];
            }
        );
    }


    selectStaff(staff: any) {
        if (this.selectedStaff && this.selectedStaff.id === staff.id) {
            this.selectedStaff = null;
            this.isStaffSelected = false;
        } else {
            this.selectedStaff = staff;
            this.isStaffSelected = true;
        }
    }

    getCompleteStaffStyle(staff: any): any {
        let style: any = {};
        if (staff.is_available === true) {
            style.backgroundColor = '#D0FFC6';
            style.color = '#078338';
            style.cursor = 'pointer';
        }
        if (this.selectedStaff?.id === staff.id) {
            style.border = '2px solid #078338';
            style.fontWeight = '600';
        }
        return style;
    }

    async onServiceChange() {
        // Reset quantity when service changes
        // If service has quantity enabled, initialize to minimum quantity, otherwise 0
        if (this.service_name?.quantity === true) {
            this.serviceQuantity = this.service_name.minimum_quantity || 0;
        }
        else {
            this.serviceQuantity = 0;
        }
        if (this.service_name?.belongs_to === 'Menu Ordering') {
            await this.getCustomerById();
            this.getMenuOutlets();
        } else {
            // Reset loading states when switching away from Menu Ordering
            this.loadingOutlets = false;
            this.loadingProducts = false;
            this.selectedOutlet = null;
            this.clearSelectedMenus();
        }
        if (this.service_name?.belongs_to !== 'Help Service') {
            this.help_remarks = '';
        }
    }

    getCustomerById(): Promise<void> {
        return new Promise((resolve, reject) => {
            let requestBody = {
                domain_name: DOMAIN_NAME,
                user_id: USER_ID,
                extras: {
                    find: {
                        customer_member_id: this.member_id
                    }
                }
            };
            this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe(
                (resp: any) => {
                    this.loaderService.emitComplete();
                    if (resp) {
                        this.customerdata = resp.result.data[0]; // store customer data
                        // console.log('Customer data:', this.customerdata);
                        resolve();  // Resolve promise when data is set
                    }
                },
                (err: any) => {
                    this.loaderService.emitComplete();
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

    getMenuOutlets() {
        if (!this.customerdata?.Hotel_Code || !this.member_id) {
            console.error('Cannot fetch outlets: Hotel_Code or member_id missing');
            this.menuOutlets = [];
            this.loadingOutlets = false;
            return;
        }
        this.loadingOutlets = true;
        this.menuOutlets = [];
        const requestBody = {
            domain_name: 'https://www.guestezee.com',
            user_id: 12,
            extras: {
                find: {
                    Hotel_Code: this.customerdata.Hotel_Code
                },
                pagination: false,
                sorting: false
            }
        };
        this.taskManagementService.getAllOutlets(requestBody).subscribe(
            (resp: any) => {
                this.loadingOutlets = false;
                if (resp?.success === 1 && resp.status_code === 200) {
                    // this.menuOutlets = resp.result?.data || [];
                    this.menuOutlets = (resp.result?.data || []).map((outlet: any) => ({
                        ...outlet,
                        id: outlet.winhms_outlet_id
                    }));

                } else {
                    this.menuOutlets = [];
                }
            },
            () => {
                this.loadingOutlets = false;
                this.menuOutlets = [];
            }
        );
    }

    /* selectOutlet(outlet: any) {
        this.selectedOutlet = outlet;
        // console.log('Selected Outlet:', this.selectedOutlet);
        this.productSearchText = '';
        this.filteredProducts = [];
        this.getProductsByOutlet(outlet);
    } */

    // Updated selectOutlet
    /*  selectOutlet(outlet: any) {
         if (this.selectedOutlet?.id === outlet.id) return; // match id
         if (this.selectedOutlet && this.hasSelectedProducts()) {
             this.pendingOutletChange = outlet;
             this.isClearMenuModalOpen = true;
             return;
         }
         this.applyOutletChange(outlet);
     } */

    selectOutlet(outlet: any) {
        // Case 1: Same outlet clicked → UNSELECT
        if (this.selectedOutlet?.id === outlet.id) {
            this.clearSelectedMenus();
            this.selectedOutlet = null;
            return;
        }
        // Case 2: Switching outlet with selected menus → CONFIRM
        if (this.selectedOutlet && this.hasSelectedProducts()) {
            this.pendingOutletChange = outlet;
            this.isClearMenuModalOpen = true;
            return;
        }
        // Case 3: Normal switch
        this.applyOutletChange(outlet);
    }

    // Close modal
    closeClearMenuModal() {
        this.isClearMenuModalOpen = false;
        this.pendingOutletChange = null;
    }

    // Confirm change
    confirmChangeRestaurant() {
        if (this.pendingOutletChange) {
            this.clearSelectedMenus();
            this.applyOutletChange(this.pendingOutletChange);
            this.pendingOutletChange = null;
        }
        this.isClearMenuModalOpen = false;
    }

    // Apply outlet change logic
    applyOutletChange(outlet: any) {
        this.selectedOutlet = outlet;
        this.productSearchText = '';
        this.filteredProducts = [];
        this.getProductsByOutlet(outlet);
    }

    clearSelectedMenus() {
        this.products.forEach(p => (p.qty = 0));
        this.products = [];
        this.filteredProducts = [];
        this.paginatedProducts = [];
        this.currentPage = 1;
        this.totalPages = 0;
        this.loadingProducts = false;
    }

    getProductsByOutlet(outlet: any) {
        this.currentPage = 1;
        this.productSearchText = '';
        this.loadingProducts = true;
        this.products = [];
        this.paginatedProducts = [];
        this.filteredProducts = [];
        const requestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
                find: {
                    outlet_id: outlet.winhms_outlet_id
                }
            }
        };
        this.taskManagementService.getProductByOutlet(requestBody).subscribe(
            (resp: any) => {
                this.loadingProducts = false;
                if (resp?.success === 1 && resp.status_code === 200) {
                    this.products = resp.result.data.map((p: any) => ({
                        ...p,
                        qty: 0
                    }));
                    // console.log('Products:', this.products);
                    this.filteredProducts = [...this.products];
                    this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize);
                    this.updatePaginatedProducts();
                }
                else {
                    // console.log('No products found');
                    this.products = [];
                    this.paginatedProducts = [];
                    this.filteredProducts = [];
                }
            },
            (err: any) => {
                this.loadingProducts = false;
                console.error('Error fetching products:', err);
                this.products = [];
                this.paginatedProducts = [];
                this.filteredProducts = [];
            }
        );
    }

    increaseQty(product: any) {
        product.qty += 1;
    }

    decreaseQty(product: any) {
        if (product.qty > 0) {
            product.qty -= 1;
        }
    }

    onProductSearch() {
        // console.log('Product Search Text:', this.productSearchText);
        const search = this.productSearchText.trim().toLowerCase();
        // console.log('Searched Text:', search);
        this.filteredProducts = this.products.filter(p =>
            p.name?.toLowerCase().includes(search)
        )
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize);
        this.updatePaginatedProducts();
    }

    updatePaginatedProducts() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePaginatedProducts();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePaginatedProducts();
        }
    }

    // Returns all selected products with qty > 0
    getSelectedProducts() {
        // console.log('Selected Products:', this.products.filter(p => p.qty > 0));
        return this.products.filter(p => p.qty > 0);
    }

    // Check if there is at least one selected product
    hasSelectedProducts() {
        // console.log('Has Selected Products:', this.getSelectedProducts().length > 0);
        return this.getSelectedProducts().length > 0;
    }

    // Calculate total amount
    getTotalAmount(): number {
        if (!this.hasSelectedProducts()) return 0;
        return this.getSelectedProducts().reduce((total, p) => {
            const priceExTax = p.pricing.raw.price || 0;
            const qty = p.qty || 0;
            const taxMultiplier = 1.18; // 18% tax
            const totalWithTax = priceExTax * qty * taxMultiplier;
            // console.log('Total with Tax:', total + totalWithTax);
            return total + totalWithTax;
        }, 0);
    }

    // Subtotal without tax
    getTotalAmountExTax(): number {
        if (!this.hasSelectedProducts()) return 0;
        return this.getSelectedProducts().reduce((total, p) => {
            const priceExTax = p.pricing.raw.price || 0;
            const qty = p.qty || 0;
            // console.log('Total without Tax:', total + priceExTax * qty);
            return total + priceExTax * qty; // just price * qty, no tax
        }, 0);
    }

    // Remove a product from selection
    removeSelectedProduct(product: any) {
        product.qty = 0;
        // console.log('Removed Product:', product);
    }

    // Increase service quantity
    increaseServiceQuantity() {
        if (!this.service_name?.quantity) {
            return;
        }
        const maxQty = this.service_name.maximum_quantity;
        if (maxQty && this.serviceQuantity >= maxQty) {
            return;
        }
        this.serviceQuantity++;
    }

    // Decrease service quantity
    decreaseServiceQuantity() {
        if (!this.service_name?.quantity) {
            return;
        }
        const minQty = this.service_name.minimum_quantity || 0;
        if (this.serviceQuantity <= minQty) {
            return;
        }
        this.serviceQuantity--;
    }

    /*  saveTask() {
         this.validateForm = true;
         const isCategoryRequired =
             this.service_name &&
             !['Menu Ordering', 'Help Service'].includes(this.service_name.belongs_to);
         // Basic validation: room, category (if required), service, staff
         if (
             !this.room_no ||
             (isCategoryRequired && !this.category) ||
             !this.service_name ||
             !this.isStaffSelected ||
             !this.selectedStaff
         ) {
             return;
         }
         // Menu Ordering validation
         if (this.service_name?.belongs_to === 'Menu Ordering') {
             if (!this.selectedOutlet) {
                 this.alertService.error('Please select at least one restaurant.', this.options);
                 return;
             }
             if (!this.hasSelectedProducts()) {
                 this.alertService.error('Please select at least one menu item.', this.options);
                 return;
             }
         }
         const deskStaffId = Number(this.localService.get('UserId'));
         this.loaderService.emitLoading();
         const isDefaultService =
             this.service_name &&
             ['Menu Ordering', 'Help Service'].includes(this.service_name.belongs_to);
         const departmentName = isDefaultService
             ? 'Default'
             : this.category?.name;
         // Step 1: Create task first (without staff assignment)
         const createPayload: any = {
             room_no: this.room_no,
             room_range_label: this.roomToRangeLabelMap[this.room_no] || '',
             member_id: this.member_id,
             status: 'ASAP', // Create with ASAP status first
             staff_desk_id: deskStaffId,
             department: departmentName,
             service: {
                 category: departmentName,
                 service_id: this.service_name.id,
                 service_name: this.service_name.name,
                 service_description: this.service_name.description
             },
             actual_time_to_close_the_task: 10,
             starting_timeline: 3,
         };
         //  if Help Service - adds help_remarks 
         if (this.service_name?.belongs_to === 'Help Service') {
             createPayload.help_remarks = this.help_remarks;
         }
         // if guest is selected - adds guest details
         if (this.selectedGuest) {
             const { guestRecord, guestDetails } = this.selectedGuest;
             createPayload.guest_name =
                 `${guestDetails.First_Name} ${guestDetails.Last_Name || ''}`.trim();
             createPayload.phone_number = guestDetails.Mobile || '';
             // OLD CODE: createPayload.guest_id = guestRecord.id;
             // NEW CODE: Using guestDetails.id from guestDatas instead of guestRecord.id
             createPayload.guest_id = guestDetails.id;
             createPayload.hotel_code = guestRecord.Hotel_Code;
            createPayload.reserve_no = guestRecord.Reserve_No;
        }
        // console.log('Create Task Payload:', createPayload);
        const createRequestBody = {
             domain_name: DOMAIN_NAME,
             user_id: USER_ID,
             payload: {
                 task_creation: createPayload
             }
         };
         this.taskManagementService.createTask(createRequestBody).subscribe(
             (resp: any) => {
                 if (resp?.success === 1 && resp.status_code === 200) {
                     // Step 2: Get the created task ID and assign staff
                     const createdTaskId = resp.result?.task?.id;
                     // console.log('Created Task ID:', createdTaskId);
                     if (createdTaskId) {
                         this.assignStaffToTask(createdTaskId, deskStaffId);
                     } else {
                         this.loaderService.emitComplete();
                         this.alertService.error('Task created but could not retrieve task ID for staff assignment.', {
                             autoClose: true,
                             keepAfterRouteChange: false
                         });
                     }
                 } else {
                     this.loaderService.emitComplete();
                     this.alertService.error(resp?.message || 'Task creation failed.', {
                         autoClose: true,
                         keepAfterRouteChange: false
                     });
                 }
             },
             (err: any) => {
                 this.loaderService.emitComplete();
                 this.alertService.error(err?.error?.message || 'Something went wrong while creating task.', {
                     autoClose: true,
                     keepAfterRouteChange: false
                 });
             }
         );
     } */

    // Checks what type of service is selected and calls the appropriate function to create the task
    saveTask() {
        this.validateForm = true;
        // console.log('Service Name:', this.service_name);
        const isCategoryRequired =
            this.service_name &&
            !['Menu Ordering', 'Help Service'].includes(this.service_name.belongs_to);
        // Basic validation: room, category (if required), service, staff
        if (
            !this.room_no ||
            (isCategoryRequired && !this.category) ||
            !this.service_name ||
            !this.isStaffSelected ||
            !this.selectedStaff
        ) {
            return;
        }
        // Menu Ordering validation
        if (this.service_name?.belongs_to === 'Menu Ordering') {
            // Guest is mandatory for Menu Ordering
            if (!this.selectedGuest) {
                this.alertService.error('Please select a guest for Menu Ordering.', this.options);
                return;
            }
            if (!this.selectedOutlet) {
                this.alertService.error('Please select at least one restaurant.', this.options);
                return;
            }
            if (!this.hasSelectedProducts()) {
                this.alertService.error('Please select at least one menu item.', this.options);
                return;
            }
        }
        const deskStaffId = Number(this.localService.get('UserId'));
        this.loaderService.emitLoading();
        const isDefaultService =
            this.service_name &&
            ['Menu Ordering', 'Help Service'].includes(this.service_name.belongs_to);
        const departmentName = isDefaultService ? 'Default' : this.category?.name;
        // **Menu Ordering flow: upsert order FIRST, then task creation, then POS push, then staff assignment**
        const isMenuOrdering = this.service_name?.belongs_to === 'Menu Ordering';
        // console.log('Service belongs_to:', this.service_name?.belongs_to, 'isMenuOrdering:', isMenuOrdering);
        if (isMenuOrdering) {
            // console.log('Menu Ordering detected: Starting order upsert FIRST...');
            // Step 1: Order Upsert (MUST happen first) - using switchMap to ensure sequential execution
            this.upsertOrderForMenu().pipe(
                tap((orderResp: any) => {
                    // console.log('Step 1 - Order upsert response received:', orderResp);
                }),
                switchMap((orderResp: any) => {
                    if (orderResp?.success === 1) {
                        const orderData = orderResp.result?.data?.[0] || orderResp.result?.data || orderResp.result || orderResp;
                        // console.log('Step 1 - Order created successfully, orderData:', orderData);
                        // console.log('Step 2 - Proceeding to task creation & staff assignment...');
                        // Step 2: Task Creation + Staff assignment (only after order is created) - return observable
                        return this.createAndAssignTaskObservable(orderData, deskStaffId);
                    } else {
                        this.loaderService.emitComplete();
                        this.alertService.error(orderResp?.message || 'Order creation failed.', this.options);
                        return of(null); // Return empty observable to stop the chain
                    }
                })
            ).subscribe({
                next: (result) => {
                    if (result) {
                        // console.log('All steps completed successfully');
                    }
                },
                error: (err: any) => {
                    console.error('Error in Menu Ordering flow:', err);
                    this.loaderService.emitComplete();
                    this.alertService.error(err?.error?.message || 'Failed to complete Menu Ordering flow.', this.options);
                }
            });
            return; // CRITICAL: Stop here, task creation happens ONLY after order upsert completes
        }
        // For Normal or Help Service (no order upsert needed)
        // console.log('Non-Menu Ordering service: Creating task and assigning staff directly...');
        this.createAndAssignTaskObservable(null, deskStaffId).subscribe({
            next: () => {
                // console.log('Non-Menu Ordering flow completed successfully');
            },
            error: (err: any) => {
                console.error('Error while creating task for Non-Menu Ordering service:', err);
                this.loaderService.emitComplete();
                this.alertService.error(
                    err?.error?.message || 'Something went wrong while creating task.',
                    this.options
                );
            }
        });
    }

    // Step 1 (Menu Ordering only): Upsert the order in POS/PMS before creating the task
    upsertOrderForMenu(): Observable<any> {
        // OLD CODE: const guestId = this.selectedGuest?.guestRecord?.id || null;
        // NEW CODE: Using guestDetails.id from guestDatas instead of guestRecord.id
        const guestId = this.selectedGuest?.guestDetails?.id || null;
        const guestName = this.selectedGuest?.guestDetails
            ? `${this.selectedGuest.guestDetails.First_Name} ${this.selectedGuest.guestDetails.Last_Name || ''}`.trim()
            : '';
        const orderPayload = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: {
                order_creation: {
                    guest_id: guestId,
                    status: 'Order Confirmed',
                    status_id: '3',
                    system_label: 'Confirmed',
                    orderConfirmDate: new Date().toISOString(),
                    guest: {
                        guest_id: guestId,
                        guest_name: guestName,
                        email: this.selectedGuest?.guestDetails?.Email || '',
                        phone_number: this.selectedGuest?.guestDetails?.Mobile || '',
                        hotel_name: this.selectedGuest?.guestRecord?.Hotel_Name || '',
                        hotel_code: this.selectedGuest?.guestRecord?.Hotel_Code || '',
                        is_email_opt_in: false
                    },
                    delivery: {
                        outlet_id: this.selectedOutlet.id,
                        email: this.selectedGuest?.guestDetails?.Email || '',
                        phone_number: this.selectedGuest?.guestDetails?.Mobile || '',
                        address: this.selectedGuest?.guestRecord?.Hotel_Name || '',
                        is_email_opt_in: false
                    },
                    product_details: {
                        products: this.getSelectedProducts().map(p => ({
                            product_id: p.id,
                            product_name: p.name,
                            sku: p.sku || '',
                            quantity: p.qty,
                            image_source: p.assets[0]?.image_source || '',
                            price: parseFloat(p.pricing.raw.price.toFixed(2)),
                            price_ex_tax: parseFloat(p.pricing.raw.price.toFixed(2)),
                            discount_percentage: 0,
                            discount_amount: 0,
                            tax_percentage: 18,
                            tax_amount: parseFloat((p.pricing.raw.price * 0.18 * p.qty).toFixed(2)),  // include quantity
                            price_inc_tax: parseFloat(((p.pricing.raw.price * 1.18) * p.qty).toFixed(2)), // include quantity
                            total_amount: parseFloat(((p.pricing.raw.price * 1.18) * p.qty).toFixed(2)),  // include quantity
                            variant: {
                                variant_id: '',
                                variant_name: '',
                                options: { option_key: '', option_value: '' }
                            }
                        }))
                    },
                    order_review: {
                        order_summary: {
                            sub_total: parseFloat(this.getTotalAmountExTax().toFixed(2)),              // subtotal without GST
                            tax: parseFloat((this.getTotalAmount() - this.getTotalAmountExTax()).toFixed(2)), // GST
                            order_total_amount: parseFloat(this.getTotalAmount().toFixed(2))           // total including GST
                        }
                    },
                    payment_type: 'Bill to Room'
                }
            },
            extras: { find: { id: '' } }
        };
        // console.log('Order upsert payload:', orderPayload);
        // Use service method instead of direct HTTP call
        return this.taskManagementService.orderUpsert(orderPayload);
    }

    // Step 2 (Observable flow): Create the task and assign staff
    // - For Normal / Help Service: orderResponse will be null
    // - For Menu Ordering: orderResponse contains order data from upsertOrderForMenu
    createAndAssignTaskObservable(orderResponse: any | null, deskStaffId: number): Observable<any> {
        console.log('this.selectedStaff', this.selectedStaff)
        console.log('this.selfStaffId', this.selfStaffId)
        // console.log('createAndAssignTaskObservable called with orderResponse:', orderResponse);
        const departmentName =
            ['Menu Ordering', 'Help Service'].includes(this.service_name?.belongs_to) ? 'Default' : this.category?.name;
        const isDefaultService = ['Menu Ordering', 'Help Service'].includes(this.service_name?.belongs_to);
        const assignedDept = isDefaultService
            ? this.getAssignedDepartmentForService(this.service_name.name) // lookup department
            : null;
        // Logic explanation:
        // - For default services (Menu Ordering/Help Service): If assignedDept exists (found via getAssignedDepartmentForService),
        //   use it because it's the actual department assigned to that service. Otherwise, use 'Default'.
        // - For regular services: assignedDept will be null, so use departmentName (which is this.category?.name)
        // This ensures we send the assigned department name in both 'department' and 'service.category' keys
        // instead of using a separate 'assigned_department' key.
        const finalDepartment = assignedDept || departmentName;
        const taskCreatedByName = this.getStaffName();
        const createPayload: any = {
            room_no: this.room_no,
            room_range_label: this.roomToRangeLabelMap[this.room_no] || '',
            member_id: this.member_id,
            // Newly added for tasl allocation purpose
            // status: 'Assigned',
            status: this.selectedStaff.id == this.selfStaffId ? 'Processing' : 'Assigned',
            is_self_assigned: this.selectedStaff.id == this.selfStaffId,
            // End of newly added for task allocation purpose
            task_created_by_desk: true,
            task_created_by: taskCreatedByName,
            staff_desk_id: deskStaffId,
            service: {
                category: finalDepartment,
                service_id: this.service_name.id,
                service_name: this.service_name.name,
                service_description: this.service_name.description,
                belongs_to: this.service_name?.belongs_to,
                // time_bound_value: this.service_name?.time_bound_value ?? null,
            },
            actual_time_to_close_the_task: 0,
            starting_timeline: 3,
            department: finalDepartment,
        };
        if (this.selectedStaff) {
            createPayload.assigned_staff_id = this.selectedStaff.id;
            createPayload.assigned_staff_name = this.selectedStaff.full_name;
            createPayload.assigned_staff_employee_number = this.selectedStaff.staff_employee_number;
        }
        if (this.service_name?.belongs_to === 'Help Service') {
            createPayload.help_remarks = this.help_remarks;
        }
        // Add quantity to service object only if quantity > 0
        if (this.serviceQuantity > 0) {
            createPayload.service.quantity = this.serviceQuantity;
        }
        // Newly added for sending time_bound_value
        if (this.service_name?.time_bound_value) {
            createPayload.service.time_bound_value = this.service_name.time_bound_value;
        }
        // End of newly added for sending time_bound_value
        if (this.selectedGuest) {
            const { guestRecord, guestDetails } = this.selectedGuest;
            createPayload.guest_name =
                `${guestDetails.First_Name} ${guestDetails.Last_Name || ''}`.trim();
            createPayload.phone_number = guestDetails.Mobile || '';
            // OLD CODE: createPayload.guest_id = guestRecord.id;
            // NEW CODE: Using guestDetails.id from guestDatas instead of guestRecord.id
            createPayload.guest_id = guestDetails.id;
            createPayload.hotel_code = guestRecord.Hotel_Code;
            createPayload.reserve_no = guestRecord.Reserve_No;
        }
        // If Menu Ordering, attach PMS order summary (built from orderResponse) to the task
        if (this.service_name?.belongs_to === 'Menu Ordering' && this.selectedOutlet && this.hasSelectedProducts()) {
            // Extract order ID from various possible response structures
            const orderId = orderResponse?.id || orderResponse?.order_id || orderResponse?.orderId || null;
            const orderDate = orderResponse?.orderConfirmDate || orderResponse?.order_date || orderResponse?.created_at || new Date().toISOString();
            // console.log('Adding PMS order summary with orderId:', orderId, 'orderDate:', orderDate);
            createPayload.pms_order_summary = {
                outletid: this.selectedOutlet.id,
                orderId: orderId,
                // OLD CODE: reg_no: this.member_id,
                // NEW CODE: Using R_NO or Reg_No from guestRecord instead of member_id
                reg_no: this.selectedGuest?.guestRecord?.Reg_No || '',
                room_no: this.room_no,
                // OLD CODE: Guest_id: this.selectedGuest?.guestRecord?.id || '',
                // NEW CODE: Using guestDetails.id from guestDatas instead of guestRecord.id
                Guest_id: this.selectedGuest?.guestDetails?.id || '',
                orderDate: orderDate,
                Setl_mode_id: '1', // Bill to Room
                totalAmount: parseFloat(this.getTotalAmount().toFixed(2)),
                items: this.getSelectedProducts().map(p => ({
                    itemId: p.id,
                    itemName: p.name,
                    itemInstructions: '',
                    quantity: p.qty,
                    price: parseFloat((p.pricing.raw.price * p.qty).toFixed(2)),
                    tax: parseFloat((p.pricing.raw.price * 0.18 * p.qty).toFixed(2)),
                    disc_amt: 0,
                    disc_per: 0,
                    total: parseFloat((p.pricing.raw.price * 1.18 * p.qty).toFixed(2))
                }))
            };
        }
        const createRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { task_creation: createPayload }
        };
        // console.log('Step 2 - Creating & Assigning task with payload:', createPayload);
        // Return Observable – task is fully created & assigned in this Step itself
        return this.taskManagementService.createTask(createRequestBody).pipe(
            tap((resp: any) => {
                // console.log('Step 2 - Task creation & assignment response:', resp);
                if (resp?.success === 1 && resp.status_code === 200) {
                    // For Menu Ordering, push order to POS after task creation
                    if (
                        this.service_name?.belongs_to === 'Menu Ordering' &&
                        createPayload.pms_order_summary
                    ) {
                        this.callPosApiObservable(createPayload.pms_order_summary).subscribe({
                            next: () => {/* console.log('Step 3 - POS push successful (Observable flow)') */ },
                            error: (err) => {/* console.error('Step 3 - POS push failed (Observable flow):', err) */ }
                        });
                    }
                }
            }),
            tap((resp: any) => {
                if (resp?.success === 1 && resp.status_code === 200) {
                    this.loaderService.emitComplete();
                    this.router.navigate(['/task-management']);
                    setTimeout(() => {
                        this.alertService.success('Task created and staff assigned successfully.', this.options);
                    }, 1000);
                } else {
                    this.loaderService.emitComplete();
                    this.alertService.error(resp?.message || 'Task creation failed.', this.options);
                }
            }),
            switchMap((resp: any) => of(resp))
        );
    }

    // Helper function to get assigned department for default services
    getAssignedDepartmentForService(serviceName: string): string | null {
        for (const dept of this.departments) {
            if (dept.default_services?.includes(serviceName)) {
                return dept.name;
            }
        }
        return null;
    }

    // Step 3: POS Push - Observable version
    callPosApiObservable(orderPayload: any): Observable<any> {
        // console.log('Step 3 - Sending Payload to POS:', orderPayload);
        return this.taskManagementService.pushOrder(orderPayload).pipe(
            tap((response) => {
                if (response?.response?.success === 1 || response?.success === 1) {
                    // console.log('Step 3 - POS push successful:', response);
                } else {
                    // console.error('Step 3 - POS push failed:', response);
                }
            })
        );
    }

    cancel() {
        this.router.navigate(['/task-management']);
    }

    // Newly added for room labelling
    toggleRoomDropdown() {
        this.isRoomDropdownOpen = !this.isRoomDropdownOpen;
        if (this.isRoomDropdownOpen) {
            this.roomSearchText = '';
            this.filteredRooms = [...this.allRooms];
            // Auto focus search input
            setTimeout(() => {
                const searchBox = this.elementRef.nativeElement.querySelector('.dropdown-search-input');
                if (searchBox) {
                    searchBox.focus();
                }
            }, 0);
        }
    }

    selectRoom(room: string) {
        this.room_no = room;
        this.isRoomDropdownOpen = false;
        this.onRoomNoChange();
    }

    filterRooms() {
        const term = this.roomSearchText.trim().toLowerCase();
        this.filteredRooms = this.allRooms.filter(room =>
            String(room).toLowerCase().includes(term)
        );
    }

    @HostListener('document:click', ['$event'])
    onClickOutside(event: Event) {
        if (!this.elementRef.nativeElement.querySelector('.searchable-dropdown-wrapper')?.contains(event.target)) {
            this.isRoomDropdownOpen = false;
        }
    }

    initializeRoomsFromCustomer() {
        const roomRange = this.customerdata?.settings?.room_range;
        if (!Array.isArray(roomRange) || roomRange.length === 0) {
            this.allRooms = [];
            this.filteredRooms = [];
            return;
        }
        let roomList: string[] = [];
        this.roomToRangeLabelMap = {};

        const expandAlphaRange = (start: string, end: string): string[] => {
            const result: string[] = [];
            const toNumber = (str: string) => {
                let n = 0;
                for (let i = 0; i < str.length; i++) {
                    n = n * 26 + (str.charCodeAt(i) - 65 + 1);
                }
                return n;
            };
            const toLetters = (num: number) => {
                let s = '';
                while (num > 0) {
                    let rem = (num - 1) % 26;
                    s = String.fromCharCode(65 + rem) + s;
                    num = Math.floor((num - 1) / 26);
                }
                return s;
            };
            const startNum = toNumber(start.toUpperCase());
            const endNum = toNumber(end.toUpperCase());
            for (let i = startNum; i <= endNum; i++) {
                result.push(toLetters(i));
            }
            return result;
        };

        const labelOption = this.customerdata?.settings?.label_option;
        const customLabels = this.customerdata?.settings?.custom_labels || {};

        roomRange.forEach((r: any) => {
            const rangeLabel = r.label || '';
            let rangeString = '';
            if (r.startRoom && r.endRoom) {
                if (String(r.startRoom).trim() === String(r.endRoom).trim()) {
                    rangeString = String(r.startRoom);
                } else {
                    rangeString = `${r.startRoom}-${r.endRoom}`;
                }
            } else if (r.startRoom) {
                rangeString = String(r.startRoom);
            }

            const trimmed = String(rangeString).trim();
            if (!trimmed) return;

            let currentRangeRooms: string[] = [];
            const alphaNumericRange = trimmed.match(/^([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
            if (alphaNumericRange) {
                const start = alphaNumericRange[1];
                const end = alphaNumericRange[2];
                if (!isNaN(Number(start)) && !isNaN(Number(end))) {
                    for (let i = Number(start); i <= Number(end); i++) {
                        currentRangeRooms.push(String(i));
                    }
                }
                else if (/^\d+[A-Z]+$/i.test(start) && /^\d+[A-Z]+$/i.test(end)) {
                    const prefixMatch = start.match(/^\d+/);
                    const prefix = prefixMatch ? prefixMatch[0] : '';
                    const startSuffix = start.slice(prefix.length);
                    const endSuffix = end.slice(prefix.length);
                    currentRangeRooms.push(
                        ...expandAlphaRange(startSuffix.toUpperCase(), endSuffix.toUpperCase()).map(
                            suffix => `${prefix}${suffix}`
                        )
                    );
                }
                else if (/^[A-Z]+\d+$/i.test(start) && /^[A-Z]+\d+$/i.test(end)) {
                    const prefixMatch = start.match(/^[A-Z]+/i);
                    const prefix = prefixMatch ? prefixMatch[0] : '';
                    const startNum = parseInt(start.slice(prefix.length), 10);
                    const endNum = parseInt(end.slice(prefix.length), 10);
                    for (let i = startNum; i <= endNum; i++) {
                        currentRangeRooms.push(`${prefix}${i}`);
                    }
                }
                else if (/^[A-Z]+$/i.test(start) && /^[A-Z]+$/i.test(end)) {
                    currentRangeRooms.push(...expandAlphaRange(start.toUpperCase(), end.toUpperCase()));
                }
                else {
                    currentRangeRooms.push(trimmed);
                }
            } else {
                currentRangeRooms.push(trimmed); // single room
            }

            currentRangeRooms.forEach((roomNum: string) => {
                let finalRoom = roomNum;
                if (labelOption === 'different') {
                    const customVal = customLabels[roomNum];
                    if (customVal && customVal.trim()) {
                        finalRoom = customVal.trim();
                    }
                }
                roomList.push(finalRoom);
                this.roomToRangeLabelMap[finalRoom] = rangeLabel;
            });
        });

        this.allRooms = roomList;
        this.filteredRooms = [...this.allRooms];
    }
    // End of newly added for room labelling
}

