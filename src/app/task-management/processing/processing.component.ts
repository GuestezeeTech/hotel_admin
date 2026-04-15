import { Router } from '@angular/router';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TaskManagementService } from '../task-management.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { FormsModule } from '@angular/forms';
import { HotelListService } from '../../hotel-list/hotel-list.service';
import { ServiceDetailService } from '../../hotel-enrollment-tabview/service-details/service-details.service';

@Component({
  selector: 'app-processing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing.component.html',
  styleUrl: './processing.component.scss'
})

export class ProcessingComponent {
  // Processed orders data
  // processedOrders = [
  //   {
  //     name: 'Ava Green',
  //     roomNo: '101',
  //     service: 'Room Cleaning',
  //     orderTime: '10:00 AM',
  //     deliveredTime: '10:30 AM',
  //     assignedStaff: 'Elena'
  //   },
  //   {
  //     name: 'Liam Smith',
  //     roomNo: '202',
  //     service: 'Laundry',
  //     orderTime: '10:15 AM',
  //     deliveredTime: '10:45 AM',
  //     assignedStaff: 'Nathan'
  //   },
  //   {
  //     name: 'Isabella Brown',
  //     roomNo: '303',
  //     service: 'Food Delivery',
  //     orderTime: '10:40 AM',
  //     deliveredTime: '11:00 AM',
  //     assignedStaff: 'Sophia'
  //   },
  //   {
  //     name: 'Noah Wilson',
  //     roomNo: '404',
  //     service: 'Mini Bar Restock',
  //     orderTime: '11:00 AM',
  //     deliveredTime: '11:25 AM',
  //     assignedStaff: 'Lucas'
  //   },
  //   {
  //     name: 'Mia Taylor',
  //     roomNo: '505',
  //     service: 'Towel Replacement',
  //     orderTime: '11:20 AM',
  //     deliveredTime: '11:50 AM',
  //     assignedStaff: 'Grace'
  //   },
  //   {
  //     name: 'Oliver Johnson',
  //     roomNo: '606',
  //     service: 'Laundry',
  //     orderTime: '11:45 AM',
  //     deliveredTime: '12:10 PM',
  //     assignedStaff: 'Ethan'
  //   },
  //   {
  //     name: 'Emma Davis',
  //     roomNo: '707',
  //     service: 'Food Delivery',
  //     orderTime: '12:00 PM',
  //     deliveredTime: '12:30 PM',
  //     assignedStaff: 'Chloe'
  //   },
  //   {
  //     name: 'Jackson Lee',
  //     roomNo: '808',
  //     service: 'Room Cleaning',
  //     orderTime: '12:20 PM',
  //     deliveredTime: '12:50 PM',
  //     assignedStaff: 'Aiden'
  //   },
  //   {
  //     name: 'Amelia White',
  //     roomNo: '909',
  //     service: 'Laundry',
  //     orderTime: '12:40 PM',
  //     deliveredTime: '01:00 PM',
  //     assignedStaff: 'Zoe'
  //   },
  //   {
  //     name: 'Lucas Martin',
  //     roomNo: '1001',
  //     service: 'Food Delivery',
  //     orderTime: '01:00 PM',
  //     deliveredTime: '01:20 PM',
  //     assignedStaff: 'Lily'
  //   }
  // ];
  processedTasks: any = [];
  allProcessedTasks: any = [];
  escalationTime: any;
  escalationHierarchy: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  staff: any;
  assignedStaffId: any;
  expectedTime: any;
  expectedTimesMap: { [taskId: string]: string } = {};
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalTasks: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  // Newly added - parentId
  at_desk: any;
  member_id: any;
  // Newly added for getting room number based on label
  labelRoomArray: string[] = [];
  customerType: any;
  hotelId: any;
  memberId: any;
  // Newly added - Menu
  isMenuModalOpen: boolean = false;
  selectedMenuItems: any[] = [];
  selectedTotalAmount: number = 0;
  selectedMenuRoom: string = '';
  // Newly added - Help Service
  isHelpServiceModalOpen: boolean = false;
  selectedHelpServiceTask: any = null;
  searchRoomNo: string = '';
  // Newly added for cancellation update
  private intervalId: any;
  // Newly added for services list
  allServices: any[] = [];
  // Newly added for loader
  isLoading: boolean = false;

  constructor(
    private taskManagementService: TaskManagementService,
    private localService: LocalStorageService,
    private alertsService: AlertsService,
    private router: Router,
    private loaderService: LoaderService,
    private hotelListService: HotelListService,
    private serviceDetailService: ServiceDetailService) { }

  async ngOnInit() {
    this.customerType = this.localService.get('CustomerType');
    // console.log('Hotel Id:', this.hotelId);
    // this.member_id = this.localService.get('MemberId');
    // Newly added
    // To load inital all tasks
    // Newly added for getting member id for customer type
    // this.hotelId = Number(this.localService.get('UserId'));
    // this.memberId = this.localService.get('MemberId');
    // console.log('Member ID from processing component:', this.memberId);
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
    // Fetch all services for time_bound_value lookup (await to ensure services are loaded)
    await this.getAllServices();
    this.getAllProcessedTask();
    // Newly added & commented for combined - started
    // Escalation timer for tasks(from hierarchy)
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
    if (hierarchyString) {
      this.escalationHierarchy = JSON.parse(hierarchyString);
      // console.log('Escalation Hierarchy(Processing):', this.escalationHierarchy);
    } else {
      this.escalationHierarchy = [];
    }
    // Ended
    // Newly added for cancellation update
    this.intervalId = setInterval(() => {
      this.getAllProcessedTask();
    }, 10000);
  }

  // Newly added for cancellation update
  ngOnDestroy() {
    clearInterval(this.intervalId);
  }


  // getAllProcessedTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   let object;
  //   if (customerType == 'Customer') {
  //     object = { "status": "Processing" };
  //   }
  //   else {
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
  //     this.at_desk = staffDataParse.at_desk;
  //     this.member_id = staffDataParse.member_id;
  //     if (hierarchy.department == '') {
  //       object = {
  //         "status": "Processing",
  //         // "sequence": sequence
  //       };
  //     }
  //     // else if (sequence == 2) {
  //     // Newly added - parentId
  //     else if (this.at_desk) {
  //       object = {
  //         "status": "Processing",
  //         "service.category": department,
  //         "room_no": staffRoomNo
  //       };
  //     }
  //     else {
  //       // what staff? -- higher level staffs but having department
  //       if (staffRoomNo.length > 0) {
  //         object = {
  //           "status": "Processing",
  //           "service.category": department,
  //           // Newly commented - parentId
  //           // "sequence": sequence,
  //           "room_no": staffRoomNo,
  //           "staff_id": Number(this.localService.get('UserId'))
  //         };
  //       } else {
  //         object = {
  //           "status": "Processing",
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
  //         this.processedTasks = response.result.data;
  //         //console.log('Processed Tasks:', this.processedTasks);
  //         this.allProcessedTasks = response.result.data; //For pagination
  //         this.totalTasks = this.allProcessedTasks.length;
  //         //console.log('Total Processed Tasks:', this.totalTasks);
  //         this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
  //         //console.log('Total Pages:', this.totalPages);
  //         this.updatePaginatedProcessedTasks(); // Sets first page
  //         // Call getAllStaves for each processed task using assigned_staff_id
  //         this.processedTasks.forEach((task: any) => {
  //           const staffId = task.assigned_staff_id;
  //           if (staffId) {
  //             this.getAllStaves(staffId, task);
  //           }
  //         });
  //       } else {
  //         //console.error('No tasks found:', response?.message);
  //       }
  //     },
  //     error: (err) => {
  //       //console.error('API Error:', err);
  //     }
  //   });
  // }

  // getAllProcessedTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   let object: any;

  //   if (customerType == 'Customer') {
  //     object = { "status": "Processing" };
  //   } else {
  //     let staffData: any = this.localService.get('StaffData');
  //     let staffDataParse = JSON.parse(staffData);
  //     let staffRoomNo = staffDataParse.room_no;   // Example: [{label:"Floor 1"}, {label:"Floor 3"}]

  //     let hierarchy: any = this.localService.get('hierarchy');
  //     let hierarchyParse = JSON.parse(hierarchy);
  //     let sequence = hierarchyParse?.sequence;
  //     let department = hierarchyParse?.department;

  //     this.at_desk = staffDataParse.at_desk;
  //     this.member_id = staffDataParse.member_id;

  //     // ✅ Map staff room labels → actual room ranges from customer settings
  //     let finalRoomArray: string[] = [];
  //     let customerData: any = this.localService.get('CustomerData');
  //     if (customerData) {
  //       let customerParse = JSON.parse(customerData);
  //       let roomRange = customerParse?.settings?.room_range;

  //       if (roomRange && staffRoomNo?.length) {
  //         staffRoomNo.forEach((staff: any) => {
  //           const matched = roomRange.find((r: any) => r.label === staff.label);
  //           if (matched) {
  //             finalRoomArray.push(`${matched.startRoom}-${matched.endRoom}`);
  //           }
  //         });
  //       }
  //     }

  //     if (hierarchy.department == '') {
  //       object = {
  //         "status": "Processing"
  //       };
  //     } else if (this.at_desk) {
  //       object = {
  //         "status": "Processing",
  //         "service.category": department,
  //         "room_no": finalRoomArray   // ✅ Use mapped ranges
  //       };
  //     } else {
  //       if (finalRoomArray.length > 0) {
  //         object = {
  //           "status": "Processing",
  //           "service.category": department,
  //           "room_no": finalRoomArray,   // ✅ Use mapped ranges
  //           "staff_id": Number(this.localService.get('UserId'))
  //         };
  //       } else {
  //         object = {
  //           "status": "Processing",
  //           "service.category": department,
  //           "staff_id": Number(this.localService.get('UserId'))
  //         };
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
  //   };

  //   this.taskManagementService.getAllTask(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         this.processedTasks = response.result.data;
  //         this.allProcessedTasks = response.result.data;
  //         this.totalTasks = this.allProcessedTasks.length;
  //         this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
  //         this.updatePaginatedProcessedTasks();

  //         this.processedTasks.forEach((task: any) => {
  //           const staffId = task.assigned_staff_id;
  //           if (staffId) {
  //             this.getAllStaves(staffId, task);
  //           }
  //         });
  //       }
  //     },
  //     error: (err) => {
  //       //console.error('API Error:', err);
  //     }
  //   });
  // }

  // getCustomerMemberId(hotelId: any): Promise<any> {
  getCustomerMemberId(memberId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            // id: hotelId 
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

  getAllProcessedTask() {
    this.customerType = this.localService.get('CustomerType');
    let memberId = this.member_id;
    if (this.customerType === 'Customer') {
      this.callProcessedTaskApi({
        status: 'Processing',
        member_id: memberId
      });
    } else {
      // staff → fetch customer and rooms first
      this.getCustomerDataForProcessed(memberId);
    }
  }

  // Gets customer data based on member id
  getCustomerDataForProcessed(memberId: any) {
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
        // console.log('Customer Data:', customer);
        if (customer && customer.settings?.room_range) {
          this.mapStaffRooms(customer.settings.room_range);
          // Now rooms ready → call Processed API
          this.prepareAndCallProcessedTaskApi();
        }
      }
    });
  }

  // Uses same mapper 
  mapStaffRooms(roomRange: any[]) {
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    let staffRoomNo = staffDataParse.room_no;
    // console.log('Staff Room No:', staffRoomNo);
    let finalRoomArray: string[] = [];
    staffRoomNo.forEach((staff: any) => {
      const matched = roomRange.find(r => r.label === staff.label);
      if (matched) {
        finalRoomArray.push(`${matched.startRoom}-${matched.endRoom}`);
      }
    });
    // console.log('Final Room Array:', finalRoomArray);
    this.labelRoomArray = finalRoomArray;
  }

  // Prepares object and hits task api
  /*  prepareAndCallProcessedTaskApi() {
     // let hierarchy: any = this.localService.get('hierarchy');
     // let hierarchyParse = JSON.parse(hierarchy);
     // let department = hierarchyParse?.department;
     let staffData: any = this.localService.get('StaffData');
     let staffDataParse = JSON.parse(staffData);
     this.at_desk = staffDataParse?.at_desk;
     let object: any = { status: "Processing" };
     // Newly added for processing
     let baseStaffIds: number[] = [];
     const storedIds = this.localService.get('baseStaffIds');
     // console.log('Stored Base Staff Ids:', storedIds);
     if (storedIds) {
       try {
         baseStaffIds = JSON.parse(storedIds);  // works if stored properly
       } catch {
         // fallback: maybe it was stored as "389, 390"
         baseStaffIds = storedIds.split(',').map((id: string) => Number(id.trim()));
       }
     }
     // Newly added for initiate checkout 
     const deskStaffId = Number(this.localService.get('UserId'));
     // If at_desk is true, also push deskStaffId (avoid duplicates)
     if (this.at_desk && !baseStaffIds.includes(deskStaffId)) {
       baseStaffIds.push(deskStaffId);
     }
     // Ended
     // console.log('Base Staff Ids:', baseStaffIds);
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
     // console.log('Room Number:', this.labelRoomArray);
     // Ended
     if (this.customerType === 'Staff') {
       if (this.at_desk) {
         object = {
           status: "Processing",
           room_no: this.labelRoomArray,
           member_id: this.member_id,
           assigned_staff_id: baseStaffIds
           // "service.category": department,
         };
       } else {
         if (this.labelRoomArray.length > 0) {
           object = {
             status: "Processing",
             room_no: this.labelRoomArray,
             member_id: this.member_id,
             assigned_staff_ids: baseStaffIds
             // "service.category": department,
             // staff_id: Number(this.localService.get('UserId')),
           };
         } else {
           object = {
             status: "Processing",
             member_id: this.member_id,
             assigned_staff_ids: baseStaffIds
             // "service.category": department,
             // staff_id: Number(this.localService.get('UserId')),
           };
         }
       }
     }
     else {
       object = {
         status: "Processing",
         member_id: this.member_id
       }
     }
     this.callProcessedTaskApi(object);
   } */

  prepareAndCallProcessedTaskApi() {
    const staffData: any = this.localService.get('StaffData');
    const staffDataParse = JSON.parse(staffData || '{}');
    this.at_desk = staffDataParse?.at_desk;
    let object: any = { status: "Processing" };
    let baseStaffIds: number[] = [];
    const storedIds = this.localService.get('baseStaffIds');
    // console.log('Stored Base Staff Ids:', storedIds);
    if (storedIds) {
      try {
        baseStaffIds = JSON.parse(storedIds);
      } catch {
        baseStaffIds = String(storedIds).split(',').map((id: string) => Number(id.trim()));
      }
    }
    // If at_desk is true, add the logged-in staff ID from StaffData (not UserId)
    if (this.at_desk && staffDataParse?.staff_id) {
      const currentStaffId = Number(staffDataParse.staff_id);
      if (!baseStaffIds.includes(currentStaffId)) {
        baseStaffIds.push(currentStaffId);
      }
    }
    // Newly commented because no need of fo desk 
    /*  let frontOfficeStaffIds: number[] = [];
     const storedFo = this.localService.get('frontOfficeStaffIds');
     // console.log('Stored FO Staff Ids:', storedFo);
     if (storedFo) {
       try {
         frontOfficeStaffIds = JSON.parse(storedFo);
       } catch {
         frontOfficeStaffIds = String(storedFo).split(',').map((id: string) => Number(id.trim()));
       }
     }
     baseStaffIds.push(...frontOfficeStaffIds); */
    //  End of newly commented code
    baseStaffIds = baseStaffIds.filter(id => !!id);
    baseStaffIds = [...new Set(baseStaffIds)];
    // Get at_desk staff IDs based on hierarchy
    this.getAtDeskStaffIds().then((atDeskStaffIds: number[]) => {
      baseStaffIds.push(...atDeskStaffIds);
      baseStaffIds = baseStaffIds.filter(id => !!id);
      baseStaffIds = [...new Set(baseStaffIds)];
      // console.log('Final Staff IDs after merging FO and at_desk:', baseStaffIds);
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
            const rem = (num - 1) % 26;
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
      (this.labelRoomArray || []).forEach((room: any) => {
        const value = String(room).trim();
        const alphaNumericRange = value.match(/^([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
        if (alphaNumericRange) {
          const start = alphaNumericRange[1];
          const end = alphaNumericRange[2];
          if (!isNaN(Number(start)) && !isNaN(Number(end))) {
            for (let i = Number(start); i <= Number(end); i++) roomList.push(String(i));
          }
          else if (/^\d+[A-Z]+$/i.test(start) && /^\d+[A-Z]+$/i.test(end)) {
            const prefix = start.match(/^\d+/)![0];
            const startSuffix = start.slice(prefix.length);
            const endSuffix = end.slice(prefix.length);

            roomList.push(
              ...expandAlphaRange(startSuffix.toUpperCase(), endSuffix.toUpperCase())
                .map(suf => `${prefix}${suf}`)
            );
          }
          else if (/^[A-Z]+\d+$/i.test(start) && /^[A-Z]+\d+$/i.test(end)) {
            const prefix = start.match(/^[A-Z]+/i)![0];
            const sNum = parseInt(start.slice(prefix.length));
            const eNum = parseInt(end.slice(prefix.length));

            for (let i = sNum; i <= eNum; i++) roomList.push(`${prefix}${i}`);
          }
          else if (/^[A-Z]+$/i.test(start) && /^[A-Z]+$/i.test(end)) {
            roomList.push(...expandAlphaRange(start.toUpperCase(), end.toUpperCase()));
          }
          else {
            roomList.push(value);
          }
        } else {
          roomList.push(value);
        }
      });
      this.labelRoomArray = roomList;
      // console.log('Room Number:', this.labelRoomArray);
      if (this.customerType === 'Staff') {
        object = {
          status: "Processing",
          member_id: this.member_id,
          assigned_staff_id: baseStaffIds
        };
        if (this.labelRoomArray.length > 0) {
          object.room_no = this.labelRoomArray;
        }
      } else {
        object = {
          status: "Processing",
          member_id: this.member_id
        };
      }
      // console.log("FINAL PROCESSING OBJECT:", object);
      this.callProcessedTaskApi(object);
    });
  }

  // Get all at_desk staff IDs based on hierarchy (similar to baseStaffIds)
  getAtDeskStaffIds(): Promise<number[]> {
    return new Promise((resolve) => {
      if (this.customerType !== 'Staff') {
        resolve([]);
        return;
      }
      const hierarchy: any = this.localService.get('hierarchy');
      const hierarchyParse = JSON.parse(hierarchy || '[]');
      const department = hierarchyParse?.map((item: any) => item.department);
      const staffData: any = this.localService.get('StaffData');
      const staffDataParse = JSON.parse(staffData || '{}');
      const staffId = Number(staffDataParse?.staff_id);
      const memberId = this.member_id;

      if (!staffId || !memberId) {
        resolve([]);
        return;
      }

      const find: any = (Array.isArray(department) ? !department.includes('Default') : department !== 'Default' && !!department)
        ? { member_id: memberId, 'hierarchy.department': department }
        : { member_id: memberId };

      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: find
        }
      };

      this.taskManagementService.getAllStaves(requestBody).subscribe(
        (resp: any) => {
          if (resp?.success === 1 && resp.status_code === 200) {
            const allStaff = resp.result.data;
            const atDeskStaffIds: number[] = [];

            // First, check if the logged-in staff themselves are at_desk
            const loggedInStaff = allStaff.find((s: any) => s.id === staffId);
            if (loggedInStaff && loggedInStaff.at_desk === true) {
              atDeskStaffIds.push(loggedInStaff.id);
            }

            // Recursive helper to traverse hierarchy
            const traverse = (currentId: number) => {
              const children = allStaff.filter((s: any) =>
                Array.isArray(s.higher_level_officer) &&
                s.higher_level_officer.some((officer: any) => officer?.id === currentId)
              );

              // Check each child for at_desk
              children.forEach((child: any) => {
                // Check if child itself is at_desk
                if (child.at_desk === true && !atDeskStaffIds.includes(child.id)) {
                  atDeskStaffIds.push(child.id);
                }
                // Continue traversing to find all descendants
                traverse(child.id);
              });
            };

            // Start from logged-in staffId to traverse all children
            traverse(staffId);
            resolve(atDeskStaffIds);
          } else {
            resolve([]);
          }
        },
        (err: any) => {
          console.error('Error fetching at_desk staff IDs:', err);
          resolve([]);
        }
      );
    });
  }

  // Final call for api
  callProcessedTaskApi(findObject: any) {
    this.isLoading = true;
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
          this.processedTasks = response.result.data || [];
          // Ensure newest processing tasks appear first
          this.sortProcessedTasksByMostRecent();
          this.allProcessedTasks = [...this.processedTasks]; // For pagination
          // console.log('Processed Tasks:', this.processedTasks);
          this.totalTasks = this.allProcessedTasks.length;
          this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
          this.updatePaginatedProcessedTasks(); // Sets first page
          // Attach staff details
          this.processedTasks.forEach((task: any) => {
            if (task.assigned_staff_id) {
              this.getAllStaves(task.assigned_staff_id, task);
            }
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Processed API Error:', err);
        this.isLoading = false;
      }
    });
  }

  // updatePaginatedProcessedTasks() {
  //   const startIndex = (this.currentPage - 1) * this.pageSize;
  //   const endIndex = startIndex + this.pageSize;
  //   this.allProcessedTasks = this.processedTasks.slice(startIndex, endIndex);
  // }

  updatePaginatedProcessedTasks() {
    const searchTerm = (this.searchRoomNo || '').trim().toLowerCase();
    const filtered = searchTerm
      ? this.processedTasks.filter((task: any) =>
        // task.room_no?.toString().toLowerCase().includes(searchTerm)
        task.room_no?.toString().toLowerCase().startsWith(searchTerm) ||
        (task.guest_name || task.task_created_by)?.toString().toLowerCase().startsWith(searchTerm)
      )
      : this.processedTasks;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allProcessedTasks = filtered.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedProcessedTasks();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedProcessedTasks();
    }
  }

  refreshData() {
    this.getAllProcessedTask();
  }

  getAllStaves(assignedStaffId: any, task: any): void {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": {
          "id": assignedStaffId
        }
      }
    };
    this.taskManagementService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          const staff = resp.result.data[0];
          // Newly added - Calculate expected time using time_bound_value from services
          if (task?.order_time && task?.service?.service_name) {
            // Find the matching service by service_name
            const matchedService = this.allServices.find(
              (service: any) => service.name?.toLowerCase() === task.service.service_name?.toLowerCase()
            );

            // Get time_bound_value from matched service
            const timeBoundValue = matchedService?.time_bound_value;

            // Check if time_bound_value exists, is a valid number, and is greater than 0
            if (timeBoundValue !== undefined && timeBoundValue !== null && !isNaN(Number(timeBoundValue)) && Number(timeBoundValue) > 0) {
              // Step 1: Create a Date for today using the time string
              const today = new Date();
              const [hours, minutes, seconds] = task.order_time.split(':').map(Number);
              const orderDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
              // Step 2: Add time_bound_value (in minutes)
              const expectedDate = new Date(orderDate.getTime() + Number(timeBoundValue) * 60000);
              // Step 3: Format expected time
              const expectedHours = String(expectedDate.getHours()).padStart(2, '0');
              const expectedMinutes = String(expectedDate.getMinutes()).padStart(2, '0');
              const expectedSeconds = String(expectedDate.getSeconds()).padStart(2, '0');
              const expectedTime = `${expectedHours}:${expectedMinutes}:${expectedSeconds}`;
              // Step 4: Store the result
              this.expectedTimesMap[task.id] = expectedTime;
            } else {
              // If no time_bound_value or value is 0, set to '-'
              this.expectedTimesMap[task.id] = '-';
            }
          } else {
            // If no order_time or service_name, set to '-'
            this.expectedTimesMap[task.id] = '-';
          }
        } else {
          const message = resp?.message || 'Something bad happened. Please try again!';
          this.alertsService.error(message, this.options);
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertsService.error(errorMsg, this.options);
        if (err?.error?.statusCode === 403) {
          this.router.navigate(['/login'], { skipLocationChange: false });
        }
      }
    );
  }

  navigateToTimeline(taskId: any) {
    this.router.navigate(['/timeline', taskId]);
  }

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
    if (!term || term.trim() === '') {
      // Reset to all processed tasks with pagination
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.allProcessedTasks = this.processedTasks.slice(startIndex, endIndex);
      this.totalTasks = this.processedTasks.length;
      this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
    } else {
      const searchTerm = term.trim().toLowerCase();
      const filtered = this.processedTasks.filter((task: any) => {
        // console.log('Room Number in task:', task.room_no);
        // return task.room_no?.toString().toLowerCase().includes(searchTerm);
        const roomValue = task.room_no?.toString().trim().toLowerCase();
        const guestValue = (task.guest_name || task.task_created_by)?.toString().trim().toLowerCase();
        const roomMatch = roomValue?.startsWith(searchTerm);
        const guestMatch = guestValue?.startsWith(searchTerm);
        return roomMatch || guestMatch;
      }
      );
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.allProcessedTasks = filtered.slice(startIndex, endIndex);
      this.totalTasks = filtered.length;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
    }
  }

  // Newest processing tasks first (based on order_date + order_time)
  private sortProcessedTasksByMostRecent() {
    if (!Array.isArray(this.processedTasks)) return;
    this.processedTasks.sort((a: any, b: any) => {
      const aTime = new Date(`${a?.order_date || ''} ${a?.order_time || ''}`).getTime();
      const bTime = new Date(`${b?.order_date || ''} ${b?.order_time || ''}`).getTime();
      return bTime - aTime;
    });
  }

  // Fetch all services for time_bound_value lookup
  getAllServices(): Promise<void> {
    return new Promise((resolve) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            member_id: this.member_id
          }
        }
      };
      this.serviceDetailService.getAllServices(requestBody).subscribe(
        (resp: any) => {
          if (resp?.success === 1 && resp?.status_code === 200) {
            this.allServices = resp.result.data || [];
            // console.log('All Services loaded:', this.allServices);
          } else {
            this.allServices = [];
          }
          resolve();
        },
        (err: any) => {
          console.error('Error fetching services:', err);
          this.allServices = [];
          resolve();
        }
      );
    });
  }


}
