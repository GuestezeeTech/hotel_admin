import { Router } from '@angular/router';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { TaskManagementService } from '../task-management.service';
import { HotelListService } from '../../hotel-list/hotel-list.service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { shouldFilterByCategory } from '../task-category.util';

@Component({
  selector: 'app-escalated-from',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './escalated-from.component.html',
  styleUrl: './escalated-from.component.scss'
})

export class EscalatedFromComponent {
  // For modal in task component
  @Output() openAssigneeModal = new EventEmitter<any>();
  escalatedTasks: any[] = [];
  escalationTime: any;
  escalationHierarchy: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  // Newly added - parentId
  at_desk: any;
  // Newly added for finc
  member_id: any;
  labelRoomArray: any[] = [];
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalEscalatedTasks: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  allEscalatedTasks: any[] = [];
  hotelId: any;
  memberId: any;
  customerType: any;
  // Newly added for checkout
  // assigningTask: any;
  // selectedStaff: any = {};
  staffId: any;
  // assignedStaff: any = {};
  // Newly added for checkout
  taskUpdateModal: boolean = false;
  assigningTask: any;
  selectedStaff: any = {};
  isStaffSelected !: boolean;
  isModalOpen = false;
  selectedService: string = '';  //For service 
  selectedRoom: string = ''; //For room no 
  serviceStaves: any;
  staves: any;
  selfStaffId: any;
  assignedStaff: any = {};
  isApproveModalOpen = false;
  isViewDetailsModalOpen = false;
  enteredAmount: number | null = null;
  isApproveEnabled = false;
  selectedTask: any = null;
  isLateCheckoutModalOpen = false;
  showAmountInput = false;
  amountError: string | null = null; // track error
  private errorTimeout: any;
  // Newly added - Menu
  isMenuModalOpen: boolean = false;
  selectedMenuItems: any[] = [];
  selectedTotalAmount: number = 0;
  selectedMenuRoom: string = '';
  // Newly added - Help Service
  isHelpServiceModalOpen: boolean = false;
  selectedHelpServiceTask: any = null;
  searchRoomNo: string = '';
  userDepartment: string[] = [];
  // Newly added for loader
  isLoading: boolean = false;
  // Newly added for cancellation update
  private intervalId: any;

  constructor(
    private taskManagementService: TaskManagementService,
    private localService: LocalStorageService,
    private alertsService: AlertsService,
    private router: Router,
    private hotelListService: HotelListService
  ) { }

  async ngOnInit() {
    this.customerType = this.localService.get('CustomerType');
    // console.log('Hotel Id:', this.hotelId);
    // this.member_id = this.localService.get('MemberId');
    // Newly added & commented for combined - started
    // this.escalationHierarchy = this.localService.get('hierarchy');
    // if (this.escalationHierarchy !== null) {
    //   this.escalationHierarchy = JSON.parse(this.escalationHierarchy);
    //   //console.log('Escalation Hierarchy:', this.escalationHierarchy);
    //   this.escalationTime = this.escalationHierarchy.escalationTime;
    //   //console.log('Escalation Time:', this.escalationTime);
    // } else {
    //   //console.warn('Hierarchy data not found in localStorage');
    // }
    const hierarchyString = this.localService.get('hierarchy');
    // console.log('Hierarchy String(Escalated From):', hierarchyString);
    if (hierarchyString) {
      this.escalationHierarchy = JSON.parse(hierarchyString);
      // console.log('Escalation Hierarchy(Escalated From):', this.escalationHierarchy);
    } else {
      this.escalationHierarchy = [];
    }
    // Ended
    // Newly added for getting member id for customer type
    // this.hotelId = Number(this.localService.get('UserId'));
    this.memberId = this.localService.get('MemberId');
    // console.log('Member ID from escalated from component:', this.memberId);
    if (this.customerType == 'Customer') {
      // await this.getCustomerMemberId(this.hotelId);
      this.member_id = this.memberId;
      if (this.memberId !== undefined && this.memberId !== null && this.memberId !== '' && this.memberId !== 'undefined' && this.memberId !== 'null') {
        await this.getCustomerMemberId(this.memberId);
      }
      // End of newly added for getting member id for customer type
    }
    else {
      this.member_id = this.localService.get('MemberId');
    }
    this.getAllTask();
    this.staffId = Number(this.localService.get('UserId'));
    // console.log('Staff id', this.staffId);
    let userData: any = this.localService.get('StaffData');
    let userDataParse = JSON.parse(userData);
    // console.log('User Data:', userDataParse);
    // Newly added & commented for combined- started
    // this.userDepartment = userDataParse?.hierarchy?.department;
    this.userDepartment = userDataParse?.hierarchy.map((item: any) => item.department);
    // console.log('User Department(Priority):', this.userDepartment);
    // Ended
    this.selfStaffId = Number(this.localService.get('UserId'));
    // console.log('Staff id', this.selfStaffId);
    // Newly added for refresh update
    this.intervalId = setInterval(() => {
      this.getAllTask();
    }, 10000);
  }

  // Helper function to normalize escalated_from_id or escalated_to_id (can be array or single value)
  private normalizeEscalationId(value: any): number[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((id: any) => Number(id)).filter((id: any) => !isNaN(id));
    }
    const numValue = Number(value);
    return isNaN(numValue) ? [] : [numValue];
  }

  // Newly added for cancellation update
  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  onAddAssignee(order: any) {
    this.openAssigneeModal.emit(order);
  }

  // getCustomerMemberId(hotelId: any): Promise<any> {
  getCustomerMemberId(memberId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            //  id: hotelId 
            "customer_member_id": memberId
          }
        }
      };
      this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
        next: (res: any) => {
          if (res && res.result.data.length > 0) {
            const customer = res.result.data[0];
            // console.log('Customer Data:', customer);
            // this.member_id = customer.customer_member_id;
            resolve(this.memberId); // resolves with memberId
          } else {
            reject('No customer found');
          }
        },
        error: (err: any) => {
          reject(err); // handle API error
        }
      });
    });
  }

  /*   getAllTask() {
      let customerType = this.localService.get('CustomerType');
      let department;
      if (customerType == 'Staff') {
        let staffData: any = this.localService.get('StaffData');
        let staffDataParse = JSON.parse(staffData);
        let hierarchy: any = this.localService.get('hierarchy');
        let hierarchyParse = JSON.parse(hierarchy);
        this.at_desk = staffDataParse?.at_desk;
        // department = hierarchyParse?.department;
        department = hierarchyParse.map((item: any) => item.department);
        // console.log('Department(Priority):', department);
      }
      const userId = Number(this.localService.get('UserId'));
      // Directly match current_escalated_id with logged-in user
      let object: any;
      if (this.at_desk) {
        object = {
          member_id: this.member_id,
          status: "Escalated",
          // "service.category": department
          // at_desk: hierarchyParse?.at_desk,
          // department: hierarchyParse?.department
        };
      }
      else {
        object = {
          status: "Escalated",
          member_id: this.member_id,
          current_escalated_id: userId,
          // "service.category": department
        }
      }
      // Newly commented while checkout / late checkout
      // if (department && (department !== 'Select' || department !== '')) {
        // object['service.category'] = department
      // }
      // Ended
      // if (department && department === 'Select') {
      //   object["service.category"] = 'Select';
      // }
      // API call → service.category
      const categoryObj = { ...object, 'service.category': department };
      this.callEscalatedTaskApi(categoryObj);
      // API call → assigned_department
      const assignedObj = { ...object, 'assigned_department': department };
      this.callEscalatedTaskApi(assignedObj);
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: object,
          pagination: false,
          sorting: true,
          sortingDetails: {
            id: -1
          }
        }
      };
      this.taskManagementService.getAllTask(requestBody).subscribe({
        next: (response) => {
          if (response?.success) {
            if (!this.at_desk) {
              // Get only tasks where current_escalated_id = logged-in user
              this.escalatedTasks = (response?.result?.data || []).filter((task: any) =>
                task.current_escalated_id === userId
              ).map((task: any) => {
                // Find last escalation entry from timeline
                const lastEscalation = [...(task.time_line || [])]
                  .reverse()
                  .find((t: any) => t.status === "Escalated");
                return {
                  ...task,
                  escalated_from_id: lastEscalation?.escalated_from_id || null,
                  escalated_from_name: lastEscalation?.escalated_from_name || null,
                  escalated_time: lastEscalation?.time
                };
              });
            }
            else {
              // Get only tasks where current_escalated_id = logged-in user
              this.escalatedTasks = (response?.result?.data || []).map((task: any) => {
                // Find last escalation entry from timeline
                const lastEscalation = [...(task.time_line || [])]
                  .reverse()
                  .find((t: any) => t.status === "Escalated");
                return {
                  ...task,
                  escalated_from_id: lastEscalation?.escalated_from_id || null,
                  escalated_from_name: lastEscalation?.escalated_from_name || null,
                  escalated_time: lastEscalation?.time
                };
              });
            }
            // console.log('Escalated Task(Priority):', this.escalatedTasks);
            // initialize timers for all escalated tasks
            this.escalatedTasks.forEach(task => this.initializeTimer(task));
            this.allEscalatedTasks = this.escalatedTasks;
            this.totalEscalatedTasks = this.escalatedTasks.length;
            this.totalPages = Math.ceil(this.totalEscalatedTasks / this.pageSize);
            this.updatePaginatedEscalatedTasks(); // sets first page
          }
        },
        error: (err: any) => {
          // console.log('Error fetching escalated tasks:', err);
        }
      });
    } */

  getAllTask() {
    this.escalatedTasks = []; // reset first

    const customerType = this.localService.get('CustomerType');
    const userId = Number(this.localService.get('UserId'));
    let department: any[] = [];

    if (customerType === 'Staff') {
      const staffData = JSON.parse(this.localService.get('StaffData') || '{}');
      const hierarchy = JSON.parse(this.localService.get('hierarchy') || '[]');

      this.at_desk = staffData?.at_desk;
      department = hierarchy.map((item: any) => item.department);
    }

    const baseObject: any = {
      status: 'Escalated',
      member_id: this.member_id
    };

    if (!this.at_desk) {
      baseObject.current_escalated_id = userId;
    }
    //  Call 1 → service.category (category-based listing ONLY, when not Default)
    const findObject = shouldFilterByCategory(department)
      ? { ...baseObject, 'service.category': department }
      : { ...baseObject };

    this.callEscalatedTaskApi(findObject);
    //Previously, we also fetched by assigned_department.
    // this.callEscalatedTaskApi({
    //   ...baseObject,
    //   assigned_department: department
    // });
  }

  callEscalatedTaskApi(findObj: any) {
    this.isLoading = true;
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: findObj,
        pagination: false,
        sorting: true,
        sortingDetails: {
          id: -1
        }
      }
    };

    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response: any) => {
        if (!response?.success) return;

        const userId = Number(this.localService.get('UserId'));
        const data = response?.result?.data || [];

        const mappedTasks = data
          .filter((task: any) =>
            this.at_desk || task.current_escalated_id === userId
          )
          .map((task: any) => {
            const lastEscalation = [...(task.time_line || [])]
              .reverse()
              .find((t: any) => t.status === 'Escalated');
            // Newly added for escalation time
            // Newly added - Check if logged-in staff's department is "Default"
            // If "Default", skip department matching and directly use escalation time
            const isDefaultDept = Array.isArray(this.userDepartment)
              ? this.userDepartment.includes('Default')
              : this.userDepartment === 'Default';

            let escalationTime = 0;

            if (isDefaultDept) {
              // If department is "Default", directly use escalation time from hierarchy
              // Use the escalation time from "Default" department hierarchy item, or first one if not found
              const defaultHierarchy = this.escalationHierarchy?.find(
                (h: any) => h.department?.toLowerCase() === 'default'
              ) || this.escalationHierarchy?.[0];
              escalationTime = defaultHierarchy ? defaultHierarchy.escalationTime : 0;
            } else {
              // Old code - Find escalationTime based on department
              // const departmentToMatch = task.service?.category;
              // const matchedHierarchy = this.escalationHierarchy?.find(
              //   (h: any) =>
              //     h.department?.toLowerCase() ===
              //     departmentToMatch?.toLowerCase()
              // );
              // const escalationTime = matchedHierarchy
              //   ? matchedHierarchy.escalationTime
              //   : 0;

              // Find escalationTime based on department
              const departmentToMatch = task.service?.category;
              const matchedHierarchy = this.escalationHierarchy?.find(
                (h: any) =>
                  h.department?.toLowerCase() ===
                  departmentToMatch?.toLowerCase()
              );
              escalationTime = matchedHierarchy
                ? matchedHierarchy.escalationTime
                : 0;
            }
            // Ended
            // Handle escalated_from_id as array or single value
            const escalatedFromId = lastEscalation?.escalated_from_id;
            // Normalize to array for consistent handling (but keep original structure)
            const normalizedEscalatedFromId = this.normalizeEscalationId(escalatedFromId);
            // Store as original (array or single) but also provide normalized version if needed
            return {
              ...task,
              escalated_from_id: escalatedFromId || null, // Keep original format (array or single)
              escalated_from_name: lastEscalation?.escalated_from_name || null,
              escalated_time: lastEscalation?.time,
              // Newly added for escalation time
              escalationTime,
              // Optional: add normalized version for easier access if needed
              // normalized_escalated_from_id: normalizedEscalatedFromId
            };
          });

        // Merge results (avoid duplicates by task id)
        this.escalatedTasks = [
          ...this.escalatedTasks,
          ...mappedTasks.filter(
            (t: any) => !this.escalatedTasks.some(e => e.id === t.id)
          )
        ];

        // Ensure newest "escalated from" tasks first
        this.sortEscalatedFromTasksByMostRecent();

        // Init timers
        this.escalatedTasks.forEach(task => this.initializeTimer(task));

        // Pagination
        this.allEscalatedTasks = this.escalatedTasks;
        this.totalEscalatedTasks = this.escalatedTasks.length;
        this.totalPages = Math.ceil(this.totalEscalatedTasks / this.pageSize);
        this.updatePaginatedEscalatedTasks();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error fetching escalated tasks:', err);
        this.isLoading = false;
      }
    });
  }

  // updatePaginatedEscalatedTasks() {
  //   const startIndex = (this.currentPage - 1) * this.pageSize;
  //   const endIndex = startIndex + this.pageSize;
  //   this.allEscalatedTasks = this.escalatedTasks.slice(startIndex, endIndex);
  // }

  updatePaginatedEscalatedTasks() {
    const searchTerm = (this.searchRoomNo || '').trim().toLowerCase();
    const filtered = searchTerm
      ? this.escalatedTasks.filter((task: any) =>
        // task.room_no?.toString().toLowerCase().includes(searchTerm)
        task.room_no?.toString().toLowerCase().startsWith(searchTerm) ||
        (task.guest_name || task.task_created_by)?.toString().toLowerCase().startsWith(searchTerm)
      )
      : this.escalatedTasks;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allEscalatedTasks = filtered.slice(startIndex, endIndex);
  }


  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedEscalatedTasks();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedEscalatedTasks();
    }
  }

  // getAllTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   let object;
  //   if (customerType == 'Staff') {
  //     let staffData: any = this.localService.get('StaffData');
  //     // //console.log('Staff Data:', staffData);
  //     let staffDataParse = JSON.parse(staffData);
  //     let staffRoomNo = staffDataParse.room_no;
  //     // //console.log('Staff Room No:', staffRoomNo)
  //     let hierarchy: any = this.localService.get('hierarchy');
  //     let hierarchyParse = JSON.parse(hierarchy)
  //     let sequence = hierarchyParse?.sequence;
  //     // //console.log('Hierarchy Sequence:', sequence);
  //     let department = hierarchyParse?.department;
  //     // //console.log('Hierarchy Department:', department);
  //     // Newly added - parentId
  //     this.at_desk = staffDataParse?.at_desk;
  //     if (hierarchy.department == '') {
  //       object = {
  //         "status": "Escalated",
  //         // "sequence": sequence,
  //         "staff_id": Number(this.localService.get('UserId')),
  //         "member_id": this.member_id
  //       };
  //     }
  //     // what staff? -- higher level staffs but having department
  //     else if (staffRoomNo.length > 0) {
  //       object = {
  //         "status": "Escalated",
  //         "service.category": department,
  //         // "sequence": sequence,
  //         "room_no": staffRoomNo,
  //         // "staff_id": Number(this.localService.get('UserId')),
  //         "member_id": this.member_id
  //       };
  //     } else {
  //       object = {
  //         "status": "Escalated",
  //         "service.category": department,
  //         // "sequence": sequence,
  //         // "staff_id": Number(this.localService.get('UserId')),
  //         "member_id": this.member_id
  //       }
  //     }
  //   }
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": {
  //         "status": "Escalated",
  //         "staff_id": Number(this.localService.get('UserId'))
  //       },
  //       "pagination": true,
  //       "paginationDetails": {
  //         "limit": 0,
  //         "pageSize": 1
  //       },
  //       "sorting": true,
  //       "sortingDetails": {
  //         "id": -1
  //       }
  //     }
  //   }
  //   this.taskManagementService.getAllTask(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         this.escalatedTasks = response.result.data.map((task: any) => ({
  //           ...task,
  //           remainingSeconds: undefined
  //         }));

  //         this.escalatedTasks.forEach(task => this.initializeTimer(task));
  //         //console.log('Escalated Tasks:', this.escalatedTasks);
  //       } else {
  //         //console.error('No roles found:', response?.message);
  //       }
  //     },
  //     error: (err: any) => {
  //       //console.error('API Error:', err);
  //     }
  //   });
  // }

  // Escalated Tasks API
  // getAllTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   let memberId = this.localService.get('MemberId');
  //   if (customerType === 'Customer') {
  //     // Customer → hit task api directly
  //     // this.callEscalatedTaskApi({ status: "Escalated" });
  //     this.getAllTask();
  //   } else {
  //     // Staff → fetch customer data first to resolve room ranges
  //     this.getCustomerDataForEscalated(memberId);
  //   }
  // }

  // Fetches customer data to get room ranges
  // getCustomerDataForEscalated(memberId: any) {
  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: { customer_member_id: memberId }
  //     }
  //   };
  //   this.hotelListService.getSignupAllCustomers(requestBody).subscribe((res: any) => {
  //     if (res && res.result.data.length > 0) {
  //       const customer = res.result.data[0];
  //       console.log("Customer Data:", customer);
  //       if (customer && customer.settings?.room_range) {
  //         // Map staff labels to actual room ranges
  //         this.mapStaffRooms(customer.settings.room_range);
  //         // Now prepare and call escalated task API
  //         // this.prepareAndCallEscalatedTaskApi();
  //         this.getAllTask();
  //       }
  //     }
  //   });
  // }

  // Gets room no based on label of staff from customer(hotel) settings
  // mapStaffRooms(roomRange: any[]) {
  //   let staffData: any = this.localService.get('StaffData');
  //   let staffDataParse = JSON.parse(staffData);
  //   let staffRoomNo = staffDataParse.room_no; // [{ label: "Floor 1" }, { label: "Floor 3" }]
  //   console.log('Staff Room No:', staffRoomNo);
  //   let finalRoomArray: string[] = [];
  //   staffRoomNo.forEach((staff: any) => {
  //     const matched = roomRange.find(r => r.label === staff.label);
  //     if (matched) {
  //       finalRoomArray.push(`${matched.startRoom}-${matched.endRoom}`);
  //     }
  //   });
  //   console.log('Final Room Array:', finalRoomArray); // ["1-100", "201-300"]
  //   this.labelRoomArray = finalRoomArray;
  // }

  // Prepare object for Escalated task API
  // prepareAndCallEscalatedTaskApi() {
  //   let hierarchy: any = this.localService.get("hierarchy");
  //   let hierarchyParse = JSON.parse(hierarchy);
  //   let department = hierarchyParse?.department;
  //   let staffData: any = this.localService.get("StaffData");
  //   let staffDataParse = JSON.parse(staffData);
  //   this.at_desk = staffDataParse?.at_desk;
  //   this.member_id = staffDataParse?.member_id;
  //   let object: any = { status: "Escalated" };
  //   if (this.at_desk) {
  //     // Staff at desk → only department + rooms
  //     object = {
  //       status: "Escalated",
  //       "service.category": department,
  //       room_no: this.labelRoomArray,
  //       member_id: this.member_id
  //     };
  //   } else {
  //     if (this.labelRoomArray.length > 0) {
  //       // Staff with mapped rooms
  //       object = {
  //         status: "Escalated",
  //         "service.category": department,
  //         room_no: this.labelRoomArray,
  //         staff_id: Number(this.localService.get("UserId")),
  //         member_id: this.member_id
  //       };
  //     } else {
  //       // Staff without rooms
  //       object = {
  //         status: "Escalated",
  //         "service.category": department,
  //         staff_id: Number(this.localService.get("UserId")),
  //         member_id: this.member_id
  //       };
  //     }
  //   }
  //   console.log("Escalated Object:", object);
  //   this.callEscalatedTaskApi(object);
  // }

  // Final call for Escalated Task API
  // callEscalatedTaskApi(findObject: any) {
  //   let requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: {
  //       find: findObject,
  //       pagination: true,
  //       paginationDetails: {
  //         limit: 0,
  //         pageSize: 1
  //       },
  //       sorting: true,
  //       sortingDetails: {
  //         id: -1
  //       }
  //     }
  //   };
  //   this.taskManagementService.getAllTask(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         this.escalatedTasks = response.result.data.map((task: any) => ({
  //           ...task,
  //           remainingSeconds: undefined
  //         }));
  //         this.escalatedTasks.forEach(task => this.initializeTimer(task));
  //         console.log("Escalated Tasks:", this.escalatedTasks);
  //       }
  //     },
  //     error: (err: any) => {
  //       console.error("Escalated Task API Error:", err);
  //     }
  //   });
  // }

  initializeTimer(task: any): void {
    //console.log('Initializing timer for task:', task);
    const orderDateTime = new Date(`${task.order_date}T${task.escalated_time}`);
    const escalationDurationInSeconds = task.escalationTime * 60;

    let interval: any; //  Declare interval before using it

    const updateTime = () => {
      const now = new Date();
      const secondsSinceOrderTime = Math.floor((now.getTime() - orderDateTime.getTime()) / 1000);
      const remainingSeconds = escalationDurationInSeconds - secondsSinceOrderTime;

      if (remainingSeconds >= 0) {
        task.remainingSeconds = this.formatTime(remainingSeconds);
      } else {
        task.remainingSeconds = '00:00';
        // Newly commented for update
        // this.updateEscalatedTaskStatusFromNonDesk(task);
        clearInterval(interval);
      }
    };

    updateTime(); // Initial call to set the time immediately
    interval = setInterval(updateTime, 1000);
  }

  formatInitialTime(minutes: number): string {
    const mins = Math.floor(minutes);
    const secs = 0;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatTime(seconds: number): string {
    // const totalSeconds = Math.floor(seconds * 60);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  isBlinking(task: any): boolean {
    if (typeof task.remainingSeconds === 'string' && /^\d{2}:\d{2}$/.test(task.remainingSeconds)) {
      const [minutes, seconds] = task.remainingSeconds.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      return totalSeconds <= 30;
    }
    return false;
  }

  updateEscalatedTaskStatusFromNonDesk(task: any): void {
    const { remainingSeconds, ...taskWithoutRemaining } = task;
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          status: "Escalated",
          task_id: task.id,
          // at_desk: task.at_desk,
          // "sequence": task.sequence,
          // "logged_in_user_id": Number(this.localService.get('UserId'))
        }
      },
      extras: {
        find: {
          id: task.id
        }
      }
    };
    //console.log("Final payload for task update:", requestBody);
    this.taskManagementService.updateTaskStatus(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp?.status_code === 200) {
          this.alertsService.success('Task status updated to Escalated.', this.options);
        } else {
          this.alertsService.error(resp?.message || 'Update failed', this.options);
        }
      },
      (err: any) => {
        this.alertsService.error(err?.error?.message || 'Something went wrong!', this.options);
      }
    );
  }

  updateStatus(task: any, event: Event) {
    let deskStaffId = Number(this.localService.get('UserId'));
    const target = event.target as HTMLSelectElement;
    const status = target.value;
    const staffDataString = this.localService.get('StaffData');
    const staffData = staffDataString ? JSON.parse(staffDataString) : null;
    // console.log('staffData:', staffData);
    if (!status) return;
    // Newly added for late checkout
    // Generate current timestamp in ISO format with microseconds
    const now = new Date();
    const completed_time = now.toISOString().replace('Z', ''); // Removes trailing 'Z' for desired format
    // Newly added for sending time_bound_value
    const servicePayload: any = {};
    if (task.service?.belongs_to != null) servicePayload.belongs_to = task.service.belongs_to;
    if (task.service?.category != null) servicePayload.category = task.service.category;
    if (task.service?.quantity != null) servicePayload.quantity = task.service.quantity;
    if (task.service?.service_description != null) servicePayload.service_description = task.service.service_description;
    if (task.service?.service_id != null) servicePayload.service_id = task.service.service_id;
    if (task.service?.service_name != null) servicePayload.service_name = task.service.service_name;
    if (task.service?.time_bound_value != null) servicePayload.time_bound_value = task.service.time_bound_value;
    // End of newly added for sending time_bound_value
    const req = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          guest_id: task.guest_id,
          staff_desk_id: deskStaffId,
          checkout_status: status,
          assigned_staff_id: staffData.staff_id,
          assigned_staff_name: staffData.full_name,
          asigned_staff_employee_number: staffData.staff_employee_number,
          status: 'Completed',
          completed_time: completed_time,
          department: task.service.category,
          // Newly added for sending time_bound_value
          // service: servicePayload
          // End of newly added for sending time_bound_value
        }
      },
      extras: {
        find: {
          id: task.id,
          member_id: this.member_id
        }
      }
    };
    // console.log('Final request:', req);
    this.taskManagementService.updateTaskStatus(req).subscribe({
      next: (res) => {
        // console.log('Status updated successfully:', res);
        task.checkout_status = status;
        // this.refreshData();
      },
      error: (err) => {
        console.error('Error updating status:', err);
      }
    });
  }

  navigateToTimeline(taskId: any) {
    this.router.navigate(['/timeline', taskId]);
  }

  refreshData() {
    this.getAllTask();
  }

  refresh() {
    this.getAllTask();
  }

  // async selfAssign(task: any) {
  //   try {
  //     const requestBody = {
  //       domain_name: DOMAIN_NAME,
  //       user_id: USER_ID,
  //       extras: {
  //         find: { id: task.id },
  //         pagination: false,
  //         sorting: true,
  //         sortingDetails: { id: -1 }
  //       }
  //     };
  //     // Convert observable to promise
  //     const response: any = await firstValueFrom(this.taskManagementService.getAllTask(requestBody));
  //     if (response?.success && response.result.data?.length) {
  //       this.assigningTask = response.result.data[0];
  //       console.log('Assigning Task:', this.assigningTask);
  //       // Await getStaffById() since it already returns a Promise
  //       await this.getStaffById(this.staffId);
  //       // Continue logic after staff is fetched
  //       this.updateStaffDetailsInTask(this.assigningTask);
  //       this.refreshData();
  //       this.selectedStaff = {}; // reset
  //     } else {
  //       console.warn('No task found for given ID');
  //     }
  //   } catch (err) {
  //     console.error('Error fetching task details:', err);
  //     this.alertsService.error('Something went wrong while assigning the task.', this.options);
  //   }
  // }

  getStaffById(staffId: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            member_id: this.member_id,
            id: staffId
          }
        }
      };
      this.taskManagementService.getAllStaves(requestBody).subscribe(
        (resp: any) => {
          if (resp?.success === 1 && resp.status_code === 200) {
            this.assignedStaff = resp.result.data[0];
            // console.log('Staff:', this.assignedStaff);
            resolve(this.assignedStaff); // resolve with data
          } else {
            const message = resp?.message || 'Something bad happened. Please try again!';
            this.alertsService.error(message, this.options);
            reject(message); // reject with error message
          }
        },
        (err: any) => {
          const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
          this.alertsService.error(errorMsg, this.options);
          if (err?.error?.statusCode === 403) {
            this.router.navigate(['/login'], { skipLocationChange: false });
          }
          reject(errorMsg); // reject on error
        }
      );
    });
  }

  // updateStaffDetailsInTask(task: any) {
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: {
  //       update_task: {
  //         "status": "Assigned",
  //         "assigned_staff_id": this.assignedStaff.id,
  //         "assigned_staff_name": this.assignedStaff.full_name,
  //         "assigned_staff_employee_number": this.assignedStaff.staff_employee_number
  //       }
  //     },
  //     extras: {
  //       find: {
  //         id: task.id
  //       }
  //     }
  //   };
  //   //console.log("Final payload for task update:", requestBody);
  //   this.taskManagementService.updateTaskStatus(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp?.success === 1 && resp?.status_code === 200) {
  //         this.alertsService.success('Task status updated with staff details.', this.options);
  //         try {
  //           this.refreshData();
  //         } catch (error) {
  //           console.error('Error refreshing components:', error);
  //         }

  //       } else {
  //         this.alertsService.error(resp?.message || 'Update failed', this.options);
  //       }
  //     },
  //     (err: any) => {
  //       this.alertsService.error(err?.error?.message || 'Something went wrong!', this.options);
  //     }
  //   );
  // }

  // Newly added - Menu
  viewMenu(task: any) {
    if (task && task.pms_order_summary?.items) {
      this.selectedMenuItems = task.pms_order_summary.items;
      this.selectedTotalAmount = task.pms_order_summary.totalAmount;
      this.selectedMenuRoom = task.room_no;
      this.isMenuModalOpen = true;
    } else {
      console.warn('No menu items found for this task.');
      this.selectedMenuItems = [];
      this.selectedTotalAmount = 0;
      this.selectedMenuRoom = task.room_no || 'N/A';
      this.isMenuModalOpen = true;
    }
  }

  closeMenuModal() {
    this.isMenuModalOpen = false;
    this.selectedMenuItems = [];
    this.selectedTotalAmount = 0;
    this.selectedMenuRoom = '';
  }

  // Newly added - self assign
  // Get avaiable and total staves count
  getAssignableCount(): number {
    const staffList = this.serviceStaves[this.selectedService];
    if (!staffList) return 0;
    return staffList.filter((s: any) => s.status === 'assigned' || s.status === 'available').length;
  }

  getTotalStaffCount(): number {
    const staffList = this.serviceStaves[this.selectedService];
    return staffList ? staffList.length : 0;
  }

  getCompleteStaffStyle(staff: any): any {
    let style: any = {};
    if (staff.is_available === true) {
      style.backgroundColor = '#D0FFC6';
      style.color = '#078338';
      style.cursor = 'pointer';
    }
    // Applies border if this staff is selected
    if (this.selectedStaff?.id === staff.id) {
      style.border = '2px solid #078338';
      style.fontWeight = '600';
    }
    return style;
  }

  selectStaff(staff: any) {
    if (this.selectedStaff && this.selectedStaff.id === staff.id) {
      // If same staff clicked again → unselect
      this.selectedStaff = {};
      this.isStaffSelected = false;
      // console.log('Staff unselected');
    } else {
      // Otherwise select new staff
      this.selectedStaff = staff;
      this.isStaffSelected = true;
      // console.log('Selected Staff:', this.selectedStaff);
    }
  }

  openModal(task: any) {
    this.isModalOpen = true;
    // console.log('Task:', task);
    this.assigningTask = task;
    this.selectedRoom = task.room_no;
    this.getAllStaves(this.assigningTask);
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedStaff = {};
    this.isStaffSelected = false;
  }

  // getAllStaves(task: any): void {
  //   let object = {
  //     "hierarchy.department": task.service.category,
  //     "is_available": true,
  //     "at_desk": false,
  //     "higher_level_officer.id": Number(this.localService.get('UserId')),
  //     "member_id": this.member_id,
  //     // "room_no": this.labelRoomArray
  //   };
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     "extras": {
  //       "find": object
  //     }
  //   };
  //   this.taskManagementService.getAllStaves(requestBody).subscribe(
  //     (resp: any) => {
  //       if (resp?.success === 1 && resp.status_code === 200) {
  //         const allStaves = resp.result.data;
  //         // Collect all higher_level_officer ids
  //         const higherLevelIds = allStaves
  //           .map((staff: any) => staff.higher_level_officer?.id)
  //           .filter((id: any) => id !== null && id !== undefined);
  //         console.log('Higher Level Officer IDs:', higherLevelIds);
  //         // Filter by higherLevel + room_no.label
  //         this.staves = allStaves.filter((staff: any) => {
  //           // exclude if already a higher_level_officer
  //           if (higherLevelIds.includes(staff.id)) {
  //             return false;
  //           }
  //           // if no room_no array, skip
  //           if (!staff.room_no || staff.room_no.length === 0) {
  //             return false;
  //           }
  //           // extract staff room labels
  //           const staffLabels = staff.room_no.map((r: any) => r.label);
  //           // check if any staff label exists in labelRoomArray
  //           return staffLabels.some((label: string) => this.labelRoomArray.includes(label));
  //         });
  //         console.log('Filtered Staves:', this.staves);
  //         this.isModalOpen = true;
  //       } else {
  //         const message = resp?.message || 'Something bad happened. Please try again!';
  //         this.alertService.error(message, this.options);
  //       }
  //     },
  //     (err: any) => {
  //       const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
  //       this.alertService.error(errorMsg, this.options);
  //       if (err?.error?.statusCode === 403) {
  //         this.router.navigate(['/login'], { skipLocationChange: false });
  //       }
  //     }
  //   );
  // }

  getAllStaves(task: any): void {
    const currentUserId = Number(this.localService.get('UserId'));
    let object: any = {
      // "hierarchy.department": task.service.category,
      "is_available": true,
      // "at_desk": false,
      "member_id": this.member_id,
    };
    // Newly added & commented - started
    // if (this.userDepartment === 'Select') {
    // if (this.userDepartment.includes('Select')) {
    // object['hierarchy.department'] = 'Select'
    // }
    // Ended
    // else {
    object['hierarchy.department'] = task.service.category
    // }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": { "find": object }
    };
    this.taskManagementService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp.status_code === 200) {
          const allStaves = resp.result.data;
          // console.log('All Staves:', allStaves);
          // Newly added & commented - started
          // Keep only staff where either higher_level_officer.id OR id matches current user
          // const userRelatedStaves = allStaves.filter((staff: any) =>
          //   staff.higher_level_officer?.id === currentUserId || staff.id === currentUserId
          // );
          const userRelatedStaves = allStaves.filter((staff: any) => {
            const higherOfficers = Array.isArray(staff.higher_level_officer)
              ? staff.higher_level_officer
              : [];
            // Check if the current user is a higher-level officer for this staff
            const isHigherOfficer = higherOfficers.some(
              (officer: any) => officer?.id === currentUserId
            );
            return isHigherOfficer || staff.id === currentUserId;
          });
          // Ended
          this.staves = userRelatedStaves;
          // Continue with your existing filtering
          // const higherLevelIds = userRelatedStaves
          //   .map((staff: any) => staff.higher_level_officer?.id)
          //   .filter((id: any) => id !== null && id !== undefined);
          // this.staves = userRelatedStaves.filter((staff: any) => {
          //   if (higherLevelIds.includes(staff.id)) return false;
          //   if (!staff.room_no?.length) return false;
          //   const staffLabels = staff.room_no.map((r: any) => r.label);
          //   return staffLabels.some((label: string) => this.labelRoomArray.includes(label));
          // });
          // this.getTotalStaffCount();
          // console.log('Filtered Staves:', this.staves);
          this.isModalOpen = true;
        } else {
          this.alertsService.error(resp?.message || 'Something bad happened. Please try again!', this.options);
        }
      },
      (err: any) => {
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertsService.error(errorMsg, this.options);
        if (err?.error?.statusCode === 403) this.router.navigate(['/login']);
      }
    );
  }

  selfAssign() {
    // check if task already has an assignee
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { id: this.assigningTask.id }, // fetch only this task
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success && response.result.data?.length) {
          // update with fresh task details
          this.assigningTask = response.result.data[0];
          // console.log('Assigning Task:', this.assigningTask);
          // assign if staff selected - if not assigned
          if (this.isStaffSelected) {
            this.updateStaffDetailsInTask(this.assigningTask);
          }
          this.closeModal();
          this.selectedStaff = {}; // reset
        }
      },
      error: (err) => {
        console.error('Error fetching task details:', err);
      }
    });
  }

  closeTaskUpdatedModal() {
    this.taskUpdateModal = false;
  }

  async updateStaffDetailsInTask(task: any): Promise<void> {
    let deskStaffId = Number(this.localService.get('UserId'));
    // Newly added for sending time_bound_value
    const servicePayload: any = {};
    if (task.service?.belongs_to != null) servicePayload.belongs_to = task.service.belongs_to;
    if (task.service?.category != null) servicePayload.category = task.service.category;
    if (task.service?.quantity != null) servicePayload.quantity = task.service.quantity;
    if (task.service?.service_description != null) servicePayload.service_description = task.service.service_description;
    if (task.service?.service_id != null) servicePayload.service_id = task.service.service_id;
    if (task.service?.service_name != null) servicePayload.service_name = task.service.service_name;
    if (task.service?.time_bound_value != null) servicePayload.time_bound_value = task.service.time_bound_value;
    // End of newly added for sending time_bound_value
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          "guest_id": task.guest_id,
          "staff_desk_id": deskStaffId,
          "status": "Assigned",
          "assigned_staff_id": this.selectedStaff.id,
          "assigned_staff_name": this.selectedStaff.full_name,
          "assigned_staff_employee_number": this.selectedStaff.staff_employee_number,
          "department": task.service.category,
          // Newly added for sending time_bound_value
          // service: servicePayload
          // End of newly added for sending time_bound_value
        }
      },
      extras: {
        find: {
          id: task.id
        }
      }
    };
    //console.log("Final payload for task update:", requestBody);
    this.taskManagementService.updateTaskStatus(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp?.status_code === 200) {
          this.alertsService.success('Task status updated with staff details.', this.options);
          this.closeModal();
          this.refreshData();
        } else {
          this.alertsService.error(resp?.message || 'Update failed', this.options);
        }
      },
      (err: any) => {
        this.alertsService.error(err?.error?.message || 'Something went wrong!', this.options);
      }
    );
  }

  // Handles selection from dropdown (Approved / Rejected)
  // onLateCheckoutSelect(task: any, event: Event) {
  //   const target = event.target as HTMLSelectElement;
  //   const status = target.value;
  //   if (status === 'Approved') {
  //     // Open amount entry modal
  //     this.openApproveModal(task);
  //   } else if (status === 'Rejected') {
  //     // Directly reject
  //     this.updateStatusAfterApproval(task, status, 0);
  //   }
  // }

  // When Approve is confirmed from modal
  // confirmApprove() {
  //   if (!this.enteredAmount || this.enteredAmount <= 0) return;
  //   this.isApproveModalOpen = false;
  //   // Call API to update task with amount
  //   this.updateStatusAfterApproval(this.selectedTask, 'Approved', this.enteredAmount);
  // }

  // Actual backend update call
  // updateStatusAfterApproval(task: any, status: string, amount: number) {
  //   const staffDataString = this.localService.get('StaffData');
  //   const staffData = staffDataString ? JSON.parse(staffDataString) : null;
  //   // Current time for completed_time
  //   const now = new Date();
  //   const completed_time = now.toISOString().replace('Z', '');
  //   const req = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: {
  //       update_task: {
  //         checkout_status: status,
  //         assigned_staff_id: staffData?.staff_id,
  //         assigned_staff_name: staffData?.full_name,
  //         assigned_staff_employee_number: staffData?.staff_employee_number,
  //         status: 'Completed',
  //         completed_time: completed_time,
  //         checkout_amount: amount || null, // Only include amount if Approved
  //       }
  //     },
  //     extras: {
  //       find: {
  //         id: task.id,
  //         member_id: this.member_id
  //       }
  //     }
  //   };
  //   console.log('Final Approve/Reject Request:', req);
  //   this.taskManagementService.updateTaskStatus(req).subscribe({
  //     next: (res) => {
  //       console.log('Checkout status updated successfully:', res);
  //       task.checkout_status = status;
  //       task.checkout_amount = amount;
  //       this.refreshData();
  //     },
  //     error: (err) => {
  //       console.error('Error updating checkout status:', err);
  //     }
  //   });
  // }

  // Open View Details modal
  // openViewDetailsModal(task: any) {
  //   this.selectedTask = task;
  //   this.isViewDetailsModalOpen = true;
  // }

  // Close View Details modal
  // closeViewDetailsModal() {
  //   this.isViewDetailsModalOpen = false;
  // }

  // Open Approve modal
  // openApproveModal(task: any) {
  //   this.selectedTask = task;
  //   this.enteredAmount = null;
  //   this.isApproveEnabled = false;
  //   this.isApproveModalOpen = true;
  // }

  // Close Approve modal
  // closeApproveModal() {
  //   this.isApproveModalOpen = false;
  // }

  // Prevent typing invalid characters like '-', '+', 'e', etc.
  // preventInvalidInput(event: KeyboardEvent) {
  //   const invalidChars = ['-', '+', 'e', 'E'];
  //   if (invalidChars.includes(event.key)) {
  //     event.preventDefault();
  //   }
  // }

  // onAmountInputChange(event: any) {
  //   let value = Number(event.target.value);
  //    // Prevent negative or 0 values 
  //    if (isNaN(value) || value < 1) {
  //     this.enteredAmount = 1;
  //     } 
  //    else { 
  //     this.enteredAmount = value; 
  //   } // Enable Approve button only if valid
  //    this.isApproveEnabled = this.enteredAmount >= 1; }

  // Open Late Checkout Modal
  openLateCheckoutModal(task: any) {
    this.selectedTask = task;
    this.enteredAmount = null;
    this.isApproveEnabled = false;
    this.isLateCheckoutModalOpen = true;
    this.showAmountInput = true; // show input only for Approved
  }

  // Close Modal
  closeLateCheckoutModal() {
    this.isLateCheckoutModalOpen = false;
  }

  // Confirm Approval or Rejection
  // Approve or Reject
  confirmLateCheckout(status: 'Price Updated' | 'Rejected') {
    if (status === 'Price Updated') {
      // Mandatory amount for Approve
      if (!this.enteredAmount || this.enteredAmount < 1) {
        this.amountError = 'Amount must be 1 or greater';
        return;
      }
      this.updateLateCheckoutTask(this.selectedTask, status, this.enteredAmount);
    } else if (status === 'Rejected') {
      // No amount needed for Reject
      this.updateLateCheckoutTask(this.selectedTask, status, null);
    }

    this.closeLateCheckoutModal();
  }

  // API call to update task
  updateLateCheckoutTask(task: any, status: string, amount: number | null) {
    let deskStaffId = Number(this.localService.get('UserId'));
    const staffDataString = this.localService.get('StaffData');
    const staffData = staffDataString ? JSON.parse(staffDataString) : null;
    const now = new Date();
    const completed_time = now.toISOString().replace('Z', '');
    // Newly added for sending time_bound_value
    const servicePayload: any = {};
    if (task.service?.belongs_to != null) servicePayload.belongs_to = task.service.belongs_to;
    if (task.service?.category != null) servicePayload.category = task.service.category;
    if (task.service?.quantity != null) servicePayload.quantity = task.service.quantity;
    if (task.service?.service_description != null) servicePayload.service_description = task.service.service_description;
    if (task.service?.service_id != null) servicePayload.service_id = task.service.service_id;
    if (task.service?.service_name != null) servicePayload.service_name = task.service.service_name;
    if (task.service?.time_bound_value != null) servicePayload.time_bound_value = task.service.time_bound_value;
    // End of newly added for sending time_bound_value
    const updateTaskPayload: any = {
      guest_id: task.guest_id,
      staff_desk_id: deskStaffId,
      checkout_status: status,
      assigned_staff_id: staffData?.staff_id,
      assigned_staff_name: staffData?.full_name,
      assigned_staff_employee_number: staffData?.staff_employee_number,
      status: 'Completed',
      completed_time: completed_time,
      department: task.service.category,
      //  Newly added for sending time_bound_value
      // service: servicePayload
      // End of newly added for sending time_bound_value
    };
    // Add late_checkout_amount only if status is Approved
    if (status === 'Price Updated') {
      updateTaskPayload.late_checkout_amount = amount;
    }
    const req = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: updateTaskPayload
      },
      extras: {
        find: {
          id: task.id,
          member_id: this.member_id
        }
      }
    };
    this.taskManagementService.updateTaskStatus(req).subscribe({
      next: (res) => {
        task.checkout_status = status;
        task.late_checkout_amount = amount;
        this.refreshData();
      },
      error: (err) => console.error('Error updating late checkout:', err)
    });
  }

  // Prevent typing invalid characters
  preventInvalidKeys(event: KeyboardEvent) {
    const invalidKeys = ['-', '+', 'e', 'E', '.', ','];
    if (invalidKeys.includes(event.key)) event.preventDefault();
  }

  // Validate input value
  // Validate input value when typing
  onAmountInputChange(event: any) {
    const valueStr = event.target.value;
    let value = Number(valueStr);
    if (valueStr && !isNaN(value) && value >= 1) {
      this.enteredAmount = Math.floor(value);
      this.isApproveEnabled = true;
      this.clearAmountError(); // clear any previous error immediately
    } else {
      this.enteredAmount = null;
      this.isApproveEnabled = false;
      this.showAmountError('Amount must be 1 or greater');
    }
  }

  // Show error with 2-second auto-clear
  private showAmountError(msg: string) {
    this.amountError = msg;
    // Clear previous timeout if any
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    // Remove error after 2 seconds
    this.errorTimeout = setTimeout(() => {
      this.amountError = null;
      this.errorTimeout = null;
    }, 2000);
  }

  //clear error immediately (on valid input)
  private clearAmountError() {
    this.amountError = null;
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
  }

  // Newly added - Help Service
  openHelpServiceModal(task: any) {
    this.selectedHelpServiceTask = task;
    this.isHelpServiceModalOpen = true;
  }

  closeHelpServiceModal() {
    this.isHelpServiceModalOpen = false;
    this.selectedHelpServiceTask = null;
  }

  filterByValue(term: string) {
    this.searchRoomNo = term.trim().toLowerCase();
    // console.log('Room Search Term in tab:', this.searchRoomNo);
    if (!term || term.trim() === '') {
      // Reset to show all tasks
      this.allEscalatedTasks = this.escalatedTasks.slice(
        (this.currentPage - 1) * this.pageSize,
        this.currentPage * this.pageSize
      );
      // console.log('Filtered tasks without term:', this.allEscalatedTasks);
    } else {
      const searchTerm = term.trim().toLowerCase();
      const filtered = this.escalatedTasks.filter((task: any) => {
        // console.log('Room Number in task:', task.room_no);
        // return task.room_no?.toString().toLowerCase().includes(searchTerm);
        const roomValue = task.room_no?.toString().trim().toLowerCase();
        const guestValue = (task.guest_name || task.task_created_by)?.toString().trim().toLowerCase();
        const roomMatch = roomValue?.startsWith(searchTerm);
        const guestMatch = guestValue?.startsWith(searchTerm);
        return roomMatch || guestMatch;
      });
      // console.log('Filtered tasks with term:', filtered)
      this.allEscalatedTasks = filtered.slice(
        (this.currentPage - 1) * this.pageSize,
        this.currentPage * this.pageSize
      );
      this.totalEscalatedTasks = filtered.length;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
    }
  }

  // Newest "escalated from" tasks first (based on order_date + escalated_time)
  private sortEscalatedFromTasksByMostRecent() {
    if (!Array.isArray(this.escalatedTasks)) return;
    this.escalatedTasks.sort((a: any, b: any) => {
      const aTime = new Date(`${a?.order_date || ''} ${a?.escalated_time || ''}`).getTime();
      const bTime = new Date(`${b?.order_date || ''} ${b?.escalated_time || ''}`).getTime();
      return bTime - aTime;
    });
  }

}
