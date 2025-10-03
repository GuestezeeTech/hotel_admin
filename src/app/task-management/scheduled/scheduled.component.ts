import { HotelListService } from './../../hotel-list/hotel-list.service';
import { TaskManagementService } from './../task-management.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-scheduled',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scheduled.component.html',
  styleUrl: './scheduled.component.scss'
})

export class ScheduledComponent {
  // For modal in task component
  @Output() openAssigneeModal = new EventEmitter<any>();
  scheduledTasks: any = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  escalationTime: any;
  escalationHierarchy: any;
  // scheduledOrders = [
  //   {
  //     name: 'Lucas Gray',
  //     roomNo: '101',
  //     service: 'Room Cleaning',
  //     department: 'Housekeeping',
  //     orderTime: '07:00 AM',
  //     escalateTime: '08:00 AM',
  //     isAssigned: true,
  //     assignee: 'David Miller',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Ella Watson',
  //     roomNo: '204',
  //     service: 'Laundry',
  //     department: 'Housekeeping',
  //     orderTime: '07:15 AM',
  //     escalateTime: '08:15 AM',
  //     isAssigned: false,
  //     assignee: '',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Noah Lee',
  //     roomNo: '309',
  //     service: 'Food Delivery',
  //     department: 'F&B',
  //     orderTime: '07:30 AM',
  //     escalateTime: '08:30 AM',
  //     isAssigned: true,
  //     assignee: 'Priya Singh',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Ava Patel',
  //     roomNo: '410',
  //     service: 'Towel Replacement',
  //     department: 'Housekeeping',
  //     orderTime: '07:45 AM',
  //     escalateTime: '08:45 AM',
  //     isAssigned: false,
  //     assignee: '',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Ethan Sharma',
  //     roomNo: '512',
  //     service: 'Room Cleaning',
  //     department: 'Housekeeping',
  //     orderTime: '08:00 AM',
  //     escalateTime: '09:00 AM',
  //     isAssigned: true,
  //     assignee: 'Sarah Johnson',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Mia Wilson',
  //     roomNo: '618',
  //     service: 'Mini Bar Restock',
  //     department: 'F&B',
  //     orderTime: '08:15 AM',
  //     escalateTime: '09:15 AM',
  //     isAssigned: false,
  //     assignee: '',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Liam Turner',
  //     roomNo: '722',
  //     service: 'Food Delivery',
  //     department: 'F&B',
  //     orderTime: '08:30 AM',
  //     escalateTime: '09:30 AM',
  //     isAssigned: true,
  //     assignee: 'Ravi Kumar',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Charlotte Adams',
  //     roomNo: '825',
  //     service: 'Laundry',
  //     department: 'Housekeeping',
  //     orderTime: '08:45 AM',
  //     escalateTime: '09:45 AM',
  //     isAssigned: false,
  //     assignee: '',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'William Cox',
  //     roomNo: '930',
  //     service: 'Towel Replacement',
  //     department: 'Housekeeping',
  //     orderTime: '09:00 AM',
  //     escalateTime: '10:00 AM',
  //     isAssigned: true,
  //     assignee: 'Anjali Verma',
  //     action: 'Add Assignee'
  //   },
  //   {
  //     name: 'Amelia Hughes',
  //     roomNo: '1033',
  //     service: 'Room Cleaning',
  //     department: 'Housekeeping',
  //     orderTime: '09:15 AM',
  //     escalateTime: '10:15 AM',
  //     isAssigned: false,
  //     assignee: '',
  //     action: 'Add Assignee'
  //   }
  // ];
  // Newly added - parentId
  at_desk: any;
  deskStaff: any[] = [];
  member_id: any;
  deskStavesIds: number[] = []; // Store desk staff IDs
  // Newly added for getting room number based on label
  labelRoomArray: string[] = [];
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalTasks: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  allTasks: any[] = [];
  customerType: any;

  constructor(
    private router: Router,
    private localService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private alertService: AlertsService,
    private hotelListService: HotelListService) { }

  ngOnInit() {
    this.member_id = this.localService.get('MemberId');
    // To load inital all tasks
    this.getAllScheduledTask();
    // Escalation timer for tasks(from hierarchy)
    this.escalationHierarchy = this.localService.get('hierarchy');
    if (this.escalationHierarchy !== null) {
      this.escalationHierarchy = JSON.parse(this.escalationHierarchy);
      console.log('Escalation Hierarchy:', this.escalationHierarchy);
      this.escalationTime = this.escalationHierarchy.escalationTime;
      console.log('Escalation Time:', this.escalationTime);
    } else {
      console.warn('Hierarchy data not found in localStorage');
    }
  }

  // getAllScheduledTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   let object;
  //   if (customerType == 'Customer') {
  //     object = { "status": "Scheduled" };
  //   }
  //   else {
  //     let staffData: any = this.localService.get('StaffData');
  //     // console.log('Staff Data:', staffData);
  //     let staffDataParse = JSON.parse(staffData);
  //     let staffRoomNo = staffDataParse.room_no;
  //     // console.log('Staff Room No:', staffRoomNo)
  //     let hierarchy: any = this.localService.get('hierarchy');
  //     let hierarchyParse = JSON.parse(hierarchy)
  //     let sequence = hierarchyParse?.sequence;
  //     // console.log('Hierarchy Sequence:', sequence);
  //     let department = hierarchyParse?.department;
  //     // console.log('Hierarchy Department:', department);
  //     // Newly added - parentId
  //     this.at_desk = staffDataParse.at_desk;
  //     this.member_id = staffDataParse.member_id;
  //     if (hierarchy.department == '') {
  //       object = {
  //         "status": "Scheduled",
  //         // "sequence": sequence
  //       };
  //     }
  //     // else if (sequence == 2) {
  //     // Newly added - parentId
  //     else if (this.at_desk) {
  //       object = {
  //         "status": "Scheduled",
  //         "service.category": department,
  //         "room_no": staffRoomNo
  //       };
  //     }
  //     else {
  //       // what staff? -- higher level staffs but having department
  //       if (staffRoomNo.length > 0) {
  //         object = {
  //           "status": "Scheduled",
  //           "service.category": department,
  //           // Newly commented - parentId
  //           // "sequence": sequence,
  //           "room_no": staffRoomNo,
  //           "staff_id": Number(this.localService.get('UserId'))
  //         };
  //       } else {
  //         object = {
  //           "status": "Scheduled",
  //           "service.category": department,
  //           // Newly commented - parentId
  //           // "sequence": sequence,
  //           "staff_id": Number(this.localService.get('UserId'))
  //         }
  //       }

  //     }
  //   }
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": object,
  //       "pagination": false,
  //       "sorting": true,
  //       "sortingDetails": {
  //         "id": -1
  //       }
  //     }
  //   }
  //   this.taskManagementService.getAllTask(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         this.scheduledTasks = response.result.data.map((task: any) => ({
  //           ...task,
  //           remainingSeconds: undefined
  //         }));
  //         // this.allTasks = response.result.data.map((task: any) => ({
  //         //   ...task,
  //         //   remainingSeconds: undefined
  //         // }));
  //         // this.allTasks.forEach(task => this.initializeTimer(task));
  //         this.scheduledTasks.forEach((task: any) => this.initializeTimer(task));
  //       } else {
  //         console.error('No tasks found:', response?.message);
  //       }
  //     },
  //     error: (err) => {
  //       console.error('API Error:', err);
  //     }
  //   });
  // }

  getAllScheduledTask() {
    this.customerType = this.localService.get('CustomerType');
    let memberId = this.localService.get('MemberId');
    if (this.customerType === 'Customer') {
      this.callScheduledTaskApi({
        status: ['Scheduled', "Assigned", "Acknowledged"],
        member_id: memberId
      });
    } else {
      // staff → fetch customer and rooms first
      this.getCustomerDataForScheduled(memberId);
    }
  }

  // Gets customer data based on member id
  getCustomerDataForScheduled(memberId: any) {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": { "customer_member_id": memberId }
      }
    };
    this.hotelListService.getSignupAllCustomers(requestBody).subscribe((res: any) => {
      if (res && res.result.data.length > 0) {
        const customer = res.result.data[0];
        console.log('Customer Data:', customer);
        if (customer && customer.settings?.room_range) {
          this.mapStaffRooms(customer.settings.room_range);
          // Now rooms ready → call Scheduled API
          this.prepareAndCallScheduledTaskApi();
        }
      }
    });
  }

  // Uses same mapper (shared for all statuses)
  mapStaffRooms(roomRange: any[]) {
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    let staffRoomNo = staffDataParse.room_no; // [{ label: "Floor 1" }, { label: "Floor 3" }]
    console.log('Staff Room No:', staffRoomNo);
    let finalRoomArray: string[] = [];
    staffRoomNo.forEach((staff: any) => {
      const matched = roomRange.find(r => r.label === staff.label);
      if (matched) {
        finalRoomArray.push(`${matched.startRoom}-${matched.endRoom}`);
      }
    });
    console.log('Final Room Array:', finalRoomArray); // ["1-100", "201-300"]
    this.labelRoomArray = finalRoomArray;
  }

  // Prepares object and hits task api
  prepareAndCallScheduledTaskApi() {
    let hierarchy: any = this.localService.get('hierarchy');
    let hierarchyParse = JSON.parse(hierarchy);
    let department = hierarchyParse?.department;
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    this.at_desk = staffDataParse?.at_desk;
    let object: any = { status: ['Scheduled', "Assigned", "Acknowledged"] };
    if (this.at_desk) {
      object = {
        status: ['Scheduled', "Assigned", "Acknowledged"],
        "service.category": department,
        room_no: this.labelRoomArray,
        member_id: this.member_id
      };
    } else {
      if (this.labelRoomArray.length > 0) {
        object = {
          status: ['Scheduled', "Assigned", "Acknowledged"],
          "service.category": department,
          room_no: this.labelRoomArray,
          staff_id: Number(this.localService.get('UserId')),
          member_id: this.member_id
        };
      } else {
        object = {
          status: ['Scheduled', "Assigned", "Acknowledged"],
          "service.category": department,
          staff_id: Number(this.localService.get('UserId')),
          member_id: this.member_id
        };
      }
    }
    this.callScheduledTaskApi(object);
  }

  // Final call for api
  callScheduledTaskApi(findObject: any) {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": findObject,
        "pagination": false,
        "sorting": true,
        "sortingDetails": { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          // this.scheduledTasks = response.result.data.map((task: any) => ({
          //   ...task,
          //   remainingSeconds: undefined
          // }));
          // Filter only tasks having scheduled_date & scheduled_time
          this.scheduledTasks = (response.result.data || [])
            .filter((task: any) => task.scheduled_date && task.scheduled_time)
            .map((task: any) => ({
              ...task,
              remainingSeconds: undefined
            }));
          this.scheduledTasks.forEach((task: any) => this.initializeTimer(task));
          this.totalTasks = this.scheduledTasks.length;
          this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
          this.updatePaginatedTasks();
        } else {
          console.error('No Scheduled tasks found:', response?.message);
        }
      },
      error: (err) => {
        console.error('Scheduled API Error:', err);
      }
    });
  }

  updatePaginatedTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allTasks = this.scheduledTasks.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedTasks();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedTasks();
    }
  }

  initializeTimer(task: any): void {
    const [hours, minutes, seconds] = this.formatScheduledTime(task.scheduled_time).split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0, 0);
    // Subtracts 10 minutes
    date.setMinutes(date.getMinutes() - 10);
    // Format back to HH:mm:ss
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMinutes = date.getMinutes().toString().padStart(2, '0');
    const newSeconds = date.getSeconds().toString().padStart(2, '0');
    console.log('Formatted Scheduled Time:', `${newHours}:${newMinutes}:${newSeconds}`);

    console.log('Initializing timer for task:', task);
    const orderDateTime = new Date(`${task.order_date}T${task.order_time}`);
    const escalationDurationInSeconds = this.escalationHierarchy?.escalationTime * 60;
    // const escalationTime = this.escalationHierarchy?.escalationTime || 0;
    // const escalationDurationInSeconds = Math.floor(escalationTime * 60);
    let interval: any; //  Declaring interval before using it
    const updateTime = () => {
      // Current time
      const currentTime = new Date();
      //  STOP TIMER IF ASSIGNED
      if (task.assigned_staff_id) {
        // Condition to call the update
        // if (currentTime >= date) {
        //   this.updateToAsap(task);
        // }
        clearInterval(interval);
        task.remainingSeconds = 'Assigned';
        return;
      }
      const now = new Date();
      const secondsSinceOrderTime = Math.floor((now.getTime() - orderDateTime.getTime()) / 1000);
      const remainingSeconds = escalationDurationInSeconds - secondsSinceOrderTime;
      if (remainingSeconds >= 0) {
        task.remainingSeconds = this.formatTime(remainingSeconds);
      } else {
        task.remainingSeconds = '00:00';
        // Newly commented for update
        // this.updateEscalatedTaskStatusFromDesk(task);
        clearInterval(interval);
      }
    };
    // updateTime(); // Initial call
    interval = setInterval(updateTime, 1000);
  }

  updateToAsap(task: any): void {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          status: "ASAP",
          at_desk: task.at_desk,
          // sequence: 1,
          logged_in_user_id: Number(this.localService.get('UserId'))
        }
      },
      extras: {
        find: { id: task.id }
      }
    };
    this.taskManagementService.updateTaskStatus(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp?.status_code === 200) {
          this.alertService.success('Task moved to ASAP tab.', this.options);
          this.refreshData();
        } else {
          this.alertService.error(resp?.message || 'Update failed', this.options);
        }
      },
      (err: any) => {
        this.alertService.error(err?.error?.message || 'Something went wrong!', this.options);
      }
    );
  }

  formatTime(seconds: number): string {
    // const totalSeconds = Math.floor(seconds * 60);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatScheduledTime(time: string): string {
    if (!time) return '00:00:00'; // fallback for null/undefined/empty
    const timeParts = time.split(':');
    const hours = timeParts[0].padStart(2, '0');
    const minutes = (timeParts[1] || '00').padStart(2, '0');
    const seconds = (timeParts[2] || '00').padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  updateEscalatedTaskStatusFromDesk(task: any): void {
    // const { remainingSeconds, ...taskWithoutRemaining } = task;
    // const updatedTask = {
    //   ...taskWithoutRemaining,
    //   status: 'Escalated'
    // };
    // Newly added - parentId
    const department = task?.service?.category;
    const roomNo = task?.room_no;
    this.getDeskDepartment(roomNo, department);
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          // status: "Escalated",
          // at_desk: task.at_desk,
          // Newly added - parentId
          // "sequence": 1,
          // "staff_id": this.deskStavesIds,
          // "logged_in_user_id": Number(this.localService.get('UserId'))
          // Newly added - parentId
          "hierarchy.department": department,
          "at_desk": true,
          "member_id": this.member_id,
          "room_no": roomNo,
          "status": "Escalated",
          "task_id": task.id
        }
      },
      extras: {
        find: {
          id: task.id
        }
      }
    };
    console.log("Final payload for task update:", requestBody);
    this.taskManagementService.updateTaskStatus(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp?.status_code === 200) {
          this.alertService.success('Task status updated to Escalated.', this.options);
          this.refreshData();
        } else {
          this.alertService.error(resp?.message || 'Update failed', this.options);
        }
      },
      (err: any) => {
        this.alertService.error(err?.error?.message || 'Something went wrong!', this.options);
      }
    );
  }

  // Newly added - parentId
  getDeskDepartment(roomNo: any, department: any) {
    const staffFindObject = {
      "hierarchy.department": department,
      "at_desk": true,
      "member_id": this.member_id,
      "room_no": roomNo
    };
    const staffRequestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: staffFindObject }
    };
    this.taskManagementService.getAllStaves(staffRequestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp?.status_code === 200) {
          this.deskStaff = resp.result.data;
          //store only ids
          this.deskStavesIds = this.deskStaff.map((staff: any) => staff.id);
          console.log('Desk Staff:', this.deskStaff);
        } else {
          this.deskStaff = [];
        }
      },
      () => {
        this.deskStaff = [];
      }
    );
  }


  refreshData() {
    this.getAllScheduledTask();
  }

  onAddAssignee(order: any) {
    this.openAssigneeModal.emit(order);
  }

  isBlinking(task: any): boolean {
    if (typeof task.remainingSeconds === 'string' && /^\d{2}:\d{2}$/.test(task.remainingSeconds)) {
      const [minutes, seconds] = task.remainingSeconds.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      return totalSeconds <= 30;
    }
    return false;
  }

  refresh() {
    this.getAllScheduledTask();
  }

  navigateToTimeline(taskId: any) {
    this.router.navigate(['/timeline', taskId]);
  }
}
