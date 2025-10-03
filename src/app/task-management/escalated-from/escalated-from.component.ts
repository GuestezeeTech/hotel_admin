import { Router } from '@angular/router';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { TaskManagementService } from '../task-management.service';
import { HotelListService } from '../../hotel-list/hotel-list.service';
import { FormsModule } from '@angular/forms';

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

  constructor(
    private taskManagementService: TaskManagementService,
    private localService: LocalStorageService,
    private alertsService: AlertsService,
    private router: Router,
    private hotelListService: HotelListService
  ) { }

  ngOnInit() {
    this.member_id = this.localService.get('MemberId');
    this.escalationHierarchy = this.localService.get('hierarchy');
    if (this.escalationHierarchy !== null) {
      this.escalationHierarchy = JSON.parse(this.escalationHierarchy);
      //console.log('Escalation Hierarchy:', this.escalationHierarchy);
      this.escalationTime = this.escalationHierarchy.escalationTime;
      //console.log('Escalation Time:', this.escalationTime);
    } else {
      //console.warn('Hierarchy data not found in localStorage');
    }
    this.getAllTask();
  }

  onAddAssignee(order: any) {
    this.openAssigneeModal.emit(order);
  }

  getAllTask() {
    let customerType = this.localService.get('CustomerType');
    if (customerType == 'Staff') {
      let staffData: any = this.localService.get('StaffData');
      let staffDataParse = JSON.parse(staffData);
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy);
      this.at_desk = staffDataParse?.at_desk;
    }
    const userId = Number(this.localService.get('UserId'));
    // Directly match current_escalated_id with logged-in user
    let object: any;
    if (this.at_desk) {
      object = {
        member_id: this.member_id,
        status: "Escalated"
      };
    }
    else {
      object = {
        status: "Escalated",
        member_id: this.member_id,
        current_escalated_id: userId
      }
    }
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
          console.log('Escalated Task(High Priority):', this.escalatedTasks);
          // initialize timers for all escalated tasks
          this.escalatedTasks.forEach(task => this.initializeTimer(task));
          this.allEscalatedTasks = this.escalatedTasks;
          this.totalEscalatedTasks = this.escalatedTasks.length;
          this.totalPages = Math.ceil(this.totalEscalatedTasks / this.pageSize);
          this.updatePaginatedEscalatedTasks(); // sets first page
        }
      },
      error: (err: any) => {
        console.log('Error fetching escalated tasks:', err);
      }
    });
  }

  updatePaginatedEscalatedTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allEscalatedTasks = this.escalatedTasks.slice(startIndex, endIndex);
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
    const escalationDurationInSeconds = this.escalationHierarchy?.escalationTime * 60;

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

    // updateTime(); // Initial call
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

  navigateToTimeline(taskId: any) {
    this.router.navigate(['/timeline', taskId]);
  }

  refreshData() {
    this.getAllTask();
  }



}
