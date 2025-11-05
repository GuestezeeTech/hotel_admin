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
import { firstValueFrom } from 'rxjs';

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
  // Newly added for memberId
  memberId: any;
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
  filteredTasks: any[] = [];
  searchRoomNo: string = '';
  userDepartment: string = '';

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

  async ngOnInit() {
    this.customerType = this.localService.get('CustomerType');
    console.log('CustomerType:', this.customerType);
    this.hotelId = Number(this.localService.get('UserId'));
    console.log('Hotel Id:', this.hotelId);
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
    if (this.customerType == 'Customer') {
      await this.getCustomerMemberId(this.hotelId);
    }
    else {
      this.member_id = this.localService.get('MemberId');
    }
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
    this.member_id = this.member_id;
    console.log('Member id in asap:', this.member_id);
    this.selfStaffId = Number(this.localService.get('UserId'));
    console.log('Staff id', this.selfStaffId);
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
  getCustomerMemberId(hotelId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { id: hotelId }
        }
      };
      this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
        next: (res: any) => {
          if (res && res.result.data.length > 0) {
            const customer = res.result.data[0];
            console.log('Customer Data:', customer);
            this.member_id = customer.customer_member_id;
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

  // Hits task api
  getAllAsapTask() {
    console.log('Called getAllAsapTask');
    this.customerType = this.localService.get('CustomerType');
    console.log('Customer Type:', this.customerType);
    let memberId = this.member_id;
    console.log('Member Id:', memberId);
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
    // Convert labelRoomArray into a final room list
    // Newly added 
    // this.labelRoomArray = ['1-100'];
    let roomList: string[] = [];
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
    this.labelRoomArray.forEach((room: any) => {
      const value = String(room).trim();
      const alphaNumericRange = value.match(/^([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
      if (alphaNumericRange) {
        const start = alphaNumericRange[1];
        const end = alphaNumericRange[2];
        // Numeric range: "1-100"
        if (!isNaN(Number(start)) && !isNaN(Number(end))) {
          for (let i = Number(start); i <= Number(end); i++) {
            roomList.push(String(i));
          }
        }
        // Numeric prefix + single-letter suffix: "1A-1Z"
        else if (/^\d+[A-Z]+$/i.test(start) && /^\d+[A-Z]+$/i.test(end)) {
          const prefix = start.match(/^\d+/)![0];
          const startSuffix = start.slice(prefix.length);
          const endSuffix = end.slice(prefix.length);
          roomList.push(
            ...expandAlphaRange(startSuffix.toUpperCase(), endSuffix.toUpperCase()).map(
              suffix => `${prefix}${suffix}`
            )
          );
        }
        // Letter prefix + numeric suffix: "A1-A5"
        else if (/^[A-Z]+\d+$/i.test(start) && /^[A-Z]+\d+$/i.test(end)) {
          const prefix = start.match(/^[A-Z]+/i)![0];
          const startNum = parseInt(start.slice(prefix.length));
          const endNum = parseInt(end.slice(prefix.length));
          for (let i = startNum; i <= endNum; i++) {
            roomList.push(`${prefix}${i}`);
          }
        }
        // Pure alphabetic range: "AA-AZ"
        else if (/^[A-Z]+$/i.test(start) && /^[A-Z]+$/i.test(end)) {
          roomList.push(...expandAlphaRange(start.toUpperCase(), end.toUpperCase()));
        }
        // Fallback: treat as single string
        else {
          roomList.push(value);
        }
      } else {
        roomList.push(value); // single room
      }
    });
    this.labelRoomArray = roomList;
    console.log('Room Number:', this.labelRoomArray);
    // Ended
    if (this.at_desk) {
      object = {
        status: ["ASAP", "Assigned"],
        // "service.category": department,
        room_no: this.labelRoomArray,
        member_id: this.member_id
      };
    }
    if (department && department !== 'Select') {
      object["service.category"] = department;
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
          this.filteredTasks = [...this.tasks];
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

  // updatePaginatedTasks() {
  //   const startIndex = (this.currentPage - 1) * this.pageSize;
  //   const endIndex = startIndex + this.pageSize;
  //   // this.allTasks = this.tasks.slice(startIndex, endIndex);
  //   this.allTasks = this.filteredTasks.slice(startIndex, endIndex);
  // }

  updatePaginatedTasks() {
    const searchTerm = (this.searchRoomNo || '').trim().toLowerCase();
    const filtered = searchTerm
      ? this.tasks.filter((task: any) =>
        task.room_no?.toString().toLowerCase().includes(searchTerm)
      )
      : this.tasks;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allTasks = filtered.slice(startIndex, endIndex);
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
      //escalated_time=localescalatedtime-(assigned_time-devicelocaltime)
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

  // updateEscalatedTaskStatusFromDesk(task: any): void {
  //   const { remainingSeconds, ...taskWithoutRemaining } = task;
  //   if (task.status === 'Escalated') {
  //     return;
  //   }
  //   // console.log('Task to be escalated:', task);
  //   // Newly added - parentId
  //   const department = task?.service?.category;
  //   const roomNo = task?.room_no;
  //   const task_id = task.id;
  //   // this.getDeskDepartment(roomNo, department);
  //   // const updatedTask = {
  //   //   ...taskWithoutRemaining,
  //   //   status: 'Escalated'
  //   // };
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     payload: {
  //       update_task: {
  //         // status: "Escalated",
  //         // at_desk: task.at_desk,
  //         // Newly added - parentId
  //         // "sequence": 1,
  //         // "staff_id": this.deskStavesIds,
  //         // "logged_in_user_id": Number(this.localService.get('UserId'))
  //         // Newly added - parentId
  //         "hierarchy.department": department,
  //         "at_desk": true,
  //         "member_id": this.member_id,
  //         "room_no": roomNo,
  //         "task_id": task_id,
  //         "status": "Escalated"
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
  //         this.alertService.success('Task status updated to Escalated.', this.options);
  //         task.status = 'Escalated';
  //         this.escalatedCount += 1;
  //         this.escalatedCountChanged.emit(this.escalatedCount);
  //         this.localService.set('escalatedCount', this.escalatedCount.toString());
  //         // this.refreshData();
  //       } else {
  //         this.alertService.error(resp?.message || 'Update failed', this.options);
  //       }
  //     },
  //     (err: any) => {
  //       this.alertService.error(err?.error?.message || 'Something went wrong!', this.options);
  //     }
  //   );
  // }

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
  //     this.alertService.error('Something went wrong while assigning the task.', this.options);
  //   }
  // }

  // getStaffById(staffId: any): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     const requestBody = {
  //       domain_name: DOMAIN_NAME,
  //       user_id: USER_ID,
  //       extras: {
  //         find: {
  //           member_id: this.member_id,
  //           id: staffId
  //         }
  //       }
  //     };
  //     this.taskManagementService.getAllStaves(requestBody).subscribe(
  //       (resp: any) => {
  //         if (resp?.success === 1 && resp.status_code === 200) {
  //           this.assignedStaff = resp.result.data[0];
  //           console.log('Staff:', this.assignedStaff);
  //           resolve(this.assignedStaff); // resolve with data
  //         } else {
  //           const message = resp?.message || 'Something bad happened. Please try again!';
  //           this.alertService.error(message, this.options);
  //           reject(message); // reject with error message
  //         }
  //       },
  //       (err: any) => {
  //         const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
  //         this.alertService.error(errorMsg, this.options);
  //         if (err?.error?.statusCode === 403) {
  //           this.router.navigate(['/login'], { skipLocationChange: false });
  //         }
  //         reject(errorMsg); // reject on error
  //       }
  //     );
  //   });
  // }

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
  //         this.alertService.success('Task status updated with staff details.', this.options);
  //         try {
  //           this.refreshData();
  //         } catch (error) {
  //           console.error('Error refreshing components:', error);
  //         }

  //       } else {
  //         this.alertService.error(resp?.message || 'Update failed', this.options);
  //       }
  //     },
  //     (err: any) => {
  //       this.alertService.error(err?.error?.message || 'Something went wrong!', this.options);
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

  // Newly added - self assign - checkout
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
      console.log('Staff unselected');
    } else {
      // Otherwise select new staff
      this.selectedStaff = staff;
      this.isStaffSelected = true;
      console.log('Selected Staff:', this.selectedStaff);
    }
  }

  openModal(task: any) {
    this.isModalOpen = true;
    console.log('Task:', task);
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
    console.log('Current User ID:', currentUserId);
    let object: any = {
      // "hierarchy.department": task.service.category,
      "is_available": true,
      // "at_desk": false,
      "member_id": this.member_id,
    };
    if (this.userDepartment === 'Select') {
      object['hierarchy.department'] = 'Select'
    }
    else {
      object['hierarchy.department'] = task.service.category
    }
    console.log('Object:', object);
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": { "find": object }
    };
    this.taskManagementService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp.status_code === 200) {
          const allStaves = resp.result.data;
          console.log('All Staves:', allStaves);
          // Keep only staff where either higher_level_officer.id OR id matches current user
          const userRelatedStaves = allStaves.filter((staff: any) =>
            staff.higher_level_officer?.id === currentUserId || staff.id === currentUserId
          );
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
          console.log('Filtered Staves:', this.staves);
          this.isModalOpen = true;
        } else {
          this.alertService.error(resp?.message || 'Something bad happened. Please try again!', this.options);
        }
      },
      (err: any) => {
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertService.error(errorMsg, this.options);
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
          console.log('Assigning Task:', this.assigningTask);
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
          "assigned_staff_employee_number": this.selectedStaff.staff_employee_number
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
          this.alertService.success('Task status updated with staff details.', this.options);
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

  // Newly added for late checkout
  updateStatus(task: any, event: Event) {
    let deskStaffId = Number(this.localService.get('UserId'))
    const target = event.target as HTMLSelectElement;
    const status = target.value;
    const staffDataString = this.localService.get('StaffData');
    const staffData = staffDataString ? JSON.parse(staffDataString) : null;
    console.log('staffData:', staffData);
    if (!status) return;
    // Newly added for late checkout
    // Generate current timestamp in ISO format with microseconds
    const now = new Date();
    const completed_time = now.toISOString().replace('Z', ''); // Removes trailing 'Z' for desired format
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
          completed_time: completed_time
        }
      },
      extras: {
        find: {
          id: task.id,
          member_id: this.member_id
        }
      }
    };
    console.log('Final request:', req);
    this.taskManagementService.updateTaskStatus(req).subscribe({
      next: (res) => {
        console.log('Status updated successfully:', res);
        task.checkout_status = status;
        this.refreshData();
      },
      error: (err) => {
        console.error('Error updating status:', err);
      }
    });
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

  // // When Approve is confirmed from modal
  // confirmApprove() {
  //   if (!this.enteredAmount || this.enteredAmount <= 0) return;
  //   this.isApproveModalOpen = false;
  //   // Call API to update task with amount
  //   this.updateStatusAfterApproval(this.selectedTask, 'Approved', this.enteredAmount);
  // }

  // // Actual backend update call
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

  // // Open View Details modal
  // openViewDetailsModal(task: any) {
  //   this.selectedTask = task;
  //   this.isViewDetailsModalOpen = true;
  // }

  // // Close View Details modal
  // closeViewDetailsModal() {
  //   this.isViewDetailsModalOpen = false;
  // }

  // // Open Approve modal
  // openApproveModal(task: any) {
  //   this.selectedTask = task;
  //   this.enteredAmount = null;
  //   this.isApproveEnabled = false;
  //   this.isApproveModalOpen = true;
  // }

  // // Close Approve modal
  // closeApproveModal() {
  //   this.isApproveModalOpen = false;
  // }

  // // Prevent typing invalid characters like '-', '+', 'e', etc.
  // preventInvalidInput(event: KeyboardEvent) {
  //   const invalidChars = ['-', '+', 'e', 'E'];
  //   if (invalidChars.includes(event.key)) {
  //     event.preventDefault();
  //   }
  // }

  // // Validate input and ensure minimum 1
  // onAmountInputChange(event: any) {
  //   let value = Number(event.target.value);
  //   if (isNaN(value) || value < 1) {
  //     this.enteredAmount = 1;
  //   } else {
  //     this.enteredAmount = value;
  //   }
  //   this.isApproveEnabled = this.enteredAmount >= 1;
  // }

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
    const updateTaskPayload: any = {
      guest_id: task.guest_id,
      staff_desk_id: deskStaffId,
      checkout_status: status,
      assigned_staff_id: staffData?.staff_id,
      assigned_staff_name: staffData?.full_name,
      assigned_staff_employee_number: staffData?.staff_employee_number,
      status: 'Completed',
      completed_time: completed_time
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

  filterByRoomNumber(term: string) {
    this.searchRoomNo = term.trim().toLowerCase();
    const searchTerm = term.trim().toLowerCase();
    if (!searchTerm) {
      // Reset to show all tasks
      this.filteredTasks = [...this.tasks];
    } else {
      // Filter by room number
      this.filteredTasks = this.tasks.filter((task: any) => {
        console.log('Room Number in task:', task.room_no);
        return task.room_no?.toString().toLowerCase().includes(searchTerm);
      });
    }

    // Reset pagination
    this.currentPage = 1;
    this.totalTasks = this.filteredTasks.length;
    this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
    this.updatePaginatedTasks();
  }


}
