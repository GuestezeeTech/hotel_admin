import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { ENDPOINTS } from '../../app.config';
import { ProfileService } from '../../profile/profile.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
// import { FirestoreService } from '../task-management.service';
import { FirestoreListenerService } from '../../firestore-listener.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { TaskManagementService } from '../task-management.service';
import { FormsModule } from '@angular/forms';
import { HotelListService } from '../../hotel-list/hotel-list.service';

@Component({
  selector: 'app-asap-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asap-cart.component.html',
  styleUrls: ['./asap-cart.component.scss']
})

export class AsapCartComponent implements OnInit, OnDestroy {
  @Output() openAssigneeModal = new EventEmitter<any>();
  @Output() escalatedCountChanged = new EventEmitter<number>();
  private intervalId: any;
  hotelId: any;
  tasks: any[] = [];
  allTasks: any[] = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isApiModal: boolean = false;
  isLessDuration: boolean = false;
  // orders = [
  //   {
  //     name: 'Ethan Hunt',
  //     roomNo: '201',
  //     service: 'Room Cleaning',
  //     department: 'Housekeeping',
  //     orderTime: '09:00 AM',
  //     escalateTime: '5 sec',
  //     countingUp: false,
  //     action: 'Add Assignee',
  //     isAssigned: true
  //   },
  //   {
  //     name: 'Emily Rose',
  //     roomNo: '305',
  //     service: 'Laundry',
  //     department: 'Laundry',
  //     orderTime: '09:15 AM',
  //     escalateTime: '1 min',
  //     countingUp: false,
  //     action: 'Add Assignee',
  //     isAssigned: true
  //   },
  //   {
  //     name: 'Daniel Craig',
  //     roomNo: '408',
  //     service: 'Food Delivery',
  //     department: 'Kitchen',
  //     orderTime: '09:25 AM',
  //     escalateTime: '2 mins',
  //     countingUp: false,
  //     action: 'Add Assignee',
  //     isAssigned: true
  //   },
  //   {
  //     name: 'Sophia Turner',
  //     roomNo: '512',
  //     service: 'Mini Bar Restock',
  //     department: 'Housekeeping',
  //     orderTime: '09:30 AM',
  //     escalateTime: '9 secs',
  //     countingUp: false,
  //     action: 'Add Assignee',
  //     isAssigned: true
  //   }
  // ];
  escalateSecondsMap: Map<string, number> = new Map();
  adminUserData: any = {};
  // Newly added
  escalationTime: any;
  escalationHierarchy: any;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalTasks: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  // escalatedCount: number = 0;
  private escalatedCount = 0;
  // Newly added - parentId
  at_desk: any;
  deskStaff: any[] = [];
  member_id: any;
  deskStavesIds: number[] = []; // Store desk staff IDs
  // Newly added for getting room number based on label
  labelRoomArray: string[] = [];
  customerType: any;

  constructor(
    private router: Router,
    private authService: AuthTokenService,
    private profileService: ProfileService,
    private alertService: AlertsService,
    private firestoreListenerService: FirestoreListenerService,
    private localService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private hotelListService: HotelListService
    // private firestoreService: FirestoreService
  ) { }

  private escalatedTaskIds = new Set<number>();

  ngOnInit() {
    this.hotelId = Number(this.localService.get('UserId'));
    // this.firestoreListenerService.listenToHitServiceChange();
    // this.firestoreListenerService.hitServiceChanged$.subscribe((changed) => {
    //   if (changed) {
    //     this.isApiModal = true;
    // alert("HitService has been updated to true for authority ID 1!");
    // this.firestoreListenerService.resetHitServiceChangeFlag();
    //   }
    // });
    // Escalation timer setup
    // this.intervalId = setInterval(() => {
    //   this.orders.forEach(order => {
    //     let currentSeconds = this.escalateSecondsMap.get(order.name) || 0;

    //     if (currentSeconds > 0 && !order.countingUp) {
    //       currentSeconds--;
    //     } else if (currentSeconds === 0 && !order.countingUp) {
    //       order.countingUp = true;
    //       this.getUserDetails(this.authService.getUserId(), order.name);
    //     } else {
    //       currentSeconds++;
    //     }

    //     this.escalateSecondsMap.set(order.name, currentSeconds);
    //   });
    // }, 1000);

    // Newly added
    // To load inital all tasks
    this.getAllAsapTask();
    // Escalation timer for tasks(from hierarchy)
    this.escalationHierarchy = this.localService.get('hierarchy');
    if (this.escalationHierarchy !== null) {
      this.escalationHierarchy = JSON.parse(this.escalationHierarchy);
      //console.log('Escalation Hierarchy:', this.escalationHierarchy);
      this.escalationTime = this.escalationHierarchy.escalationTime;
      console.log('Escalation Time:', this.escalationTime);
      //console.log('Escalation Time:', this.escalationTime);
    } else {
      //console.warn('Hierarchy data not found in localStorage');
    }
    this.member_id = this.localService.get('MemberId');
    console.log('Member id in asap:', this.member_id);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  refresh() {
    this.getAllAsapTask();
  }

  closeExitModal() {
    this.isApiModal = false;
  }

  // Newly commented for getting room number based on label
  // getAllAsapTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   let object;
  //   if (customerType == 'Customer') {
  //     object = { "status": "ASAP" };
  //   }
  //   else {
  //     let staffData: any = this.localService.get('StaffData');
  //     let staffDataParse = JSON.parse(staffData);
  //     let staffRoomNo = staffDataParse.room_no;
  //     let hierarchy: any = this.localService.get('hierarchy');
  //     let hierarchyParse = JSON.parse(hierarchy)
  //     // let sequence = hierarchyParse?.sequence;
  //     // //console.log('Hierarchy Sequence:', sequence);
  //     let department = hierarchyParse?.department;
  //     //console.log('Hierarchy Department:', department);
  //     // Newly added - parentId
  //     this.at_desk = staffDataParse.at_desk;
  //     this.member_id = staffDataParse.member_id;
  //     console.log('User Data:', this.at_desk);
  //     if (hierarchy.department == '') {
  //       object = {
  //         "status": "ASAP",
  //         // "sequence": sequence
  //       };
  //     }
  //     // else if (sequence == 2) {
  //     // Newly added - parentId
  //     else if (this.at_desk) {
  //       object = {
  //         "status": "ASAP",
  //         "service.category": department,
  //         "room_no": staffRoomNo
  //       };
  //     }
  //     else {
  //       // what staff? -- higher level staffs but having department
  //       if (staffRoomNo.length > 0) {
  //         object = {
  //           "status": "ASAP",
  //           "service.category": department,
  //           // Newly commented - parentId
  //           // "sequence": sequence,
  //           "room_no": staffRoomNo,
  //           "staff_id": Number(this.localService.get('UserId'))
  //         };
  //       } else {
  //         object = {
  //           "status": "ASAP",
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
  //         this.tasks = response.result.data.map((task: any) => ({
  //           ...task,
  //           remainingSeconds: undefined
  //         }));
  //         this.tasks.forEach(task => this.initializeTimer(task));
  //         this.totalTasks = this.tasks.length;
  //         //console.log('Total  Tasks:', this.totalTasks);
  //         this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
  //         //console.log('Total Pages:', this.totalPages);
  //         this.updatePaginatedTasks(); // Sets first page
  //         // this.allTasks = response.result.data.map((task: any) => ({
  //         //   ...task,
  //         //   remainingSeconds: undefined
  //         // }));
  //         // this.allTasks.forEach(task => this.initializeTimer(task));
  //         // this.allTasks = response.result.data; //For pagination
  //       } else {
  //         //console.error('No tasks found:', response?.message);
  //       }
  //     },
  //     error: (err) => {
  //       //console.error('API Error:', err);
  //     }
  //   });
  // }

  // Newly added for getting room number based on label
  // Hits task api
  getAllAsapTask() {
    console.log('Called getAllAsapTask');
    this.customerType = this.localService.get('CustomerType');
    let memberId = this.localService.get('MemberId');
    if (this.customerType == 'Customer') {
      this.callTaskApi({
        status: ['ASAP', "Assigned"],
        member_id: memberId
      });
    } else {
      // staff → fetch customer and rooms first
      this.getCustomerData(memberId); // This will later call `callTaskApi`
    }
  }

  // Gets customer data based on member id
  getCustomerData(memberId: any) {
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
          // Now rooms are ready → hit task API
          this.prepareAndCallTaskApi();
        }
      }
    });
  }

  // Gets room no based on label of staff from customer(hotel) settings
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
  prepareAndCallTaskApi() {
    let hierarchy: any = this.localService.get('hierarchy');
    let hierarchyParse = JSON.parse(hierarchy);
    let department = hierarchyParse?.department;
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    this.at_desk = staffDataParse.at_desk;
    this.member_id = staffDataParse.member_id;
    let object: any = { status: ["ASAP", "Assigned"] };
    if (this.at_desk) {
      object = {
        status: ["ASAP", "Assigned"],
        "service.category": department,
        room_no: this.labelRoomArray,
        member_id: this.member_id
      };
    }
    // else {
    //   if (this.labelRoomArray.length > 0 ) {
    //     object = {
    //       status: "ASAP",
    //       "service.category": department,
    //       room_no: this.labelRoomArray,
    //       staff_id: Number(this.localService.get('UserId')),
    //       member_id: this.member_id
    //     };
    //   } else {
    //     object = {
    //       status: "ASAP",
    //       "service.category": department,
    //       staff_id: Number(this.localService.get('UserId')),
    //       member_id: this.member_id
    //     };
    //   }
    // }
    console.log('Object:', object);
    this.callTaskApi(object);
  }

  // Final call for api
  callTaskApi(findObject: any) {
    console.log('Find Object:', findObject);
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
          // this.tasks = response.result.data.map((task: any) => ({
          //   ...task,
          //   remainingSeconds: undefined
          // }));
          // Filter only tasks not having scheduled_date & scheduled_time
          this.tasks = (response.result.data || [])
            .filter((task: any) => !task.scheduled_date && !task.scheduled_time)
            .map((task: any) => ({
              ...task,
              remainingSeconds: undefined
            }));
          this.tasks.forEach(task => this.initializeTimer(task));
          this.totalTasks = this.tasks.length;
          this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
          this.updatePaginatedTasks();
        }
      },
      error: (err) => {
        console.error('Task API Error:', err);
      }
    });
  }

  updatePaginatedTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allTasks = this.tasks.slice(startIndex, endIndex);
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

  refreshData() {
    this.getAllAsapTask();
  }

  // initializeTimer(task: any) {
  //   const initialTime = task.actual_time_to_close_the_task * 60;
  //   //console.log('Initial Time in Seconds:', initialTime);
  //   const totalTimeMs = this.formatInitialTime(task.actual_time_to_close_the_task);
  //   //console.log('Total Time in Minutes Seconds:', totalTimeMs);
  //   const escalationTimeInSeconds = this.escalationHierarchy?.escalationTime * 60;
  //   //console.log('Escalation Time in Seconds:', escalationTimeInSeconds);
  //   const escalationThreshold = this.formatInitialTime(this.escalationTime);
  //   //console.log('Escalation Threshold in Minutes Seconds:', escalationThreshold);
  //   let remainingMs = escalationTimeInSeconds - 1;
  //   let time = remainingMs - escalationTimeInSeconds;
  //   //console.log('Time in Seconds:', time);
  //   const updateTime = () => {
  //     const remainingSeconds = remainingMs; // in seconds
  //     //console.log('Remaining in Minutes Seconds:', task.remainingSeconds);
  //     task.remainingSeconds = this.formatTime(remainingSeconds);
  //     //console.log('Remaining  in  Seconds:', remainingSeconds);
  //     remainingMs--;
  //     if (
  //       remainingMs == 0
  //     ) {
  //       // this.updateTaskStatus(task);
  //       alert('Task Escalated');
  //     }
  //   };
  //   updateTime(); // Initial call to set the time immediately
  //   setInterval(updateTime, 1000); // Updates every second
  // }

  initializeTimer(task: any): void {
    //console.log('Initializing timer for task:', task);
    const orderDateTime = new Date(`${task.order_date}T${task.order_time}`);
    const escalationDurationInSeconds = this.escalationTime * 60;
    // const escalationTime = this.escalationHierarchy?.escalationTime || 0;
    // const escalationDurationInSeconds = Math.floor(escalationTime * 60);
    let interval: any; //  Declare interval before using it
    const updateTime = () => {
      //  STOP TIMER IF ASSIGNED
      if (task.assigned_staff_id) {
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
        // this.updateEscalatedTaskStatusFromDesk(task);
        if (!this.escalatedTaskIds.has(task.id) && task.status !== 'Escalated') {
          this.escalatedTaskIds.add(task.id); // mark as escalated locally
          // Newly commented for update
          // this.updateEscalatedTaskStatusFromDesk(task);
        }
        clearInterval(interval);
      }
    };

    // updateTime(); // Initial call
    interval = setInterval(updateTime, 1000);
  }

  isBlinking(task: any): boolean {
    if (typeof task.remainingSeconds === 'string' && /^\d{2}:\d{2}$/.test(task.remainingSeconds)) {
      const [minutes, seconds] = task.remainingSeconds.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      return totalSeconds <= 30;
    }
    return false;
  }

  formatInitialTime(minutes: number): string {
    const mins = Math.floor(minutes);
    const secs = 0;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // formatTime(seconds: number | undefined): string {
  //   if (seconds == undefined) return '--:--'; // show placeholder if not initialized
  //   const mins = Math.floor(seconds / 60);
  //   const secs = seconds % 60;
  //   return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  // }

  formatTime(seconds: number): string {
    // const totalSeconds = Math.floor(seconds * 60);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateEscalatedTaskStatusFromDesk(task: any): void {
    const { remainingSeconds, ...taskWithoutRemaining } = task;
    if (task.status === 'Escalated') {
      return;
    }
    // console.log('Task to be escalated:', task);
    // Newly added - parentId
    const department = task?.service?.category;
    const roomNo = task?.room_no;
    const task_id = task.id;
    // this.getDeskDepartment(roomNo, department);
    // const updatedTask = {
    //   ...taskWithoutRemaining,
    //   status: 'Escalated'
    // };
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
          "task_id": task_id,
          "status": "Escalated"
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
          this.alertService.success('Task status updated to Escalated.', this.options);
          task.status = 'Escalated';
          this.escalatedCount += 1;
          this.escalatedCountChanged.emit(this.escalatedCount);
          this.localService.set('escalatedCount', this.escalatedCount.toString());
          // this.refreshData();
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
  // getDeskDepartment(roomNo: any, department: any) {
  //   const staffFindObject = {
  //     "hierarchy.department": department,
  //     "at_desk": true,
  //     "member_id": this.member_id,
  //     "room_no": roomNo
  //   };
  //   const staffRequestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     extras: { find: staffFindObject }
  //   };
  //   this.taskManagementService.getAllStaves(staffRequestBody).subscribe(
  //     (resp: any) => {
  //       if (resp?.success === 1 && resp?.status_code === 200) {
  //         this.deskStaff = resp.result.data;
  //         //store only ids
  //         this.deskStavesIds = this.deskStaff.map((staff: any) => staff.id);
  //         console.log('Desk Staff:', this.deskStaff);
  //       } else {
  //         this.deskStaff = [];
  //       }
  //     },
  //     () => {
  //       this.deskStaff = [];
  //     }
  //   );
  // }

  getEscalateStyles(order: any) {
    const seconds = this.escalateSecondsMap.get(order.name) || 0;
    if (order.countingUp) {
      return 'escalation';
    } else if (seconds < 30) {
      return 'blink-orange';
    } else {
      return 'not-escalated';
    }
  }

  getUserDetails(userId: number, guestName: string) {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: this.hotelId } }
    };

    this.profileService.postApiCall(payload, ENDPOINTS.GET_LOGIN_CUSTOMER).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        this.adminUserData = resp.result.data[0];
        // alert(`Hi ${guestName}, your request has been escalated to ${this.adminUserData.first_name}`);
      } else {
        //console.warn('Failed to fetch updated profile data.');
      }
    });
  }

  onAddAssignee(order: any) {
    this.openAssigneeModal.emit(order);
  }

  navigateToTimeline(taskId: any) {
    this.router.navigate(['/timeline', taskId]);
  }
}
