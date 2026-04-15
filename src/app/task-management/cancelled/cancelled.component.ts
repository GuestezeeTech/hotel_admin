import { HotelListService } from '../../hotel-list/hotel-list.service';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { TaskManagementService } from '../task-management.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { shouldFilterByCategory } from '../task-category.util';

@Component({
  selector: 'app-cancelled',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancelled.component.html',
  styleUrl: './cancelled.component.scss'
})

export class CancelledComponent {
  // Delivered orders data
  // deliveredOrders = [
  //   {
  //     name: 'John Doe',
  //     roomNo: '101',
  //     service: 'Room Cleaning',
  //     orderTime: '10:30 AM',
  //     deliveredTime: '10:40 AM',
  //     assignedStaff: 'Alice',
  //     rating: 5
  //   },
  //   {
  //     name: 'Emily Smith',
  //     roomNo: '203',
  //     service: 'Laundry',
  //     orderTime: '11:15 AM',
  //     deliveredTime: '11:25 AM',
  //     assignedStaff: 'Bob',
  //     rating: 4
  //   },
  //   {
  //     name: 'Michael Johnson',
  //     roomNo: '305',
  //     service: 'Food Delivery',
  //     orderTime: '12:00 PM',
  //     deliveredTime: '12:10 PM',
  //     assignedStaff: 'Charlie',
  //     rating: 3
  //   },
  //   {
  //     name: 'Sarah Williams',
  //     roomNo: '110',
  //     service: 'Towel Replacement',
  //     orderTime: '09:45 AM',
  //     deliveredTime: '09:55 AM',
  //     assignedStaff: 'Diana',
  //     rating: 4
  //   },
  //   {
  //     name: 'David Brown',
  //     roomNo: '409',
  //     service: 'Room Cleaning',
  //     orderTime: '01:10 PM',
  //     deliveredTime: '01:25 PM',
  //     assignedStaff: 'Ethan',
  //     rating: 2
  //   },
  //   {
  //     name: 'Laura Garcia',
  //     roomNo: '512',
  //     service: 'Mini Bar Restock',
  //     orderTime: '02:30 PM',
  //     deliveredTime: '02:40 PM',
  //     assignedStaff: 'Fiona',
  //     rating: 3
  //   },
  //   {
  //     name: 'James Martinez',
  //     roomNo: '603',
  //     service: 'Food Delivery',
  //     orderTime: '03:00 PM',
  //     deliveredTime: '03:10 PM',
  //     assignedStaff: 'George',
  //     rating: 1
  //   },
  //   {
  //     name: 'Olivia Davis',
  //     roomNo: '707',
  //     service: 'Laundry',
  //     orderTime: '04:25 PM',
  //     deliveredTime: '04:35 PM',
  //     assignedStaff: 'Hannah',
  //     rating: 5
  //   },
  //   {
  //     name: 'William Wilson',
  //     roomNo: '808',
  //     service: 'Towel Replacement',
  //     orderTime: '05:15 PM',
  //     deliveredTime: '05:25 PM',
  //     assignedStaff: 'Ian',
  //     rating: 4
  //   },
  //   {
  //     name: 'Sophia Taylor',
  //     roomNo: '909',
  //     service: 'Room Cleaning',
  //     orderTime: '06:05 PM',
  //     deliveredTime: '06:15 PM',
  //     assignedStaff: 'Julia',
  //     rating: 3
  //   }
  // ];
  escalationTime: any;
  escalationHierarchy: any;
  cancelledTasks: any;
  allCancelledTasks: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalCancelledTasks: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  // Newly added - parentId
  at_desk: any;
  // Newly added for getting room number based on label
  labelRoomArray: string[] = [];
  // Newly added for find
  member_id: any;
  customerType: any;
  hotelId: any;
  memberId: any;
  // Newly added - Menu
  isMenuModalOpen: boolean = false;
  selectedMenuItems: any[] = [];
  selectedTotalAmount: number = 0;
  selectedMenuRoom: string = '';
  // Newly added - invoice
  invoice: any;
  isInvoiceModalOpen: boolean = false;
  // Newly added - Help Service
  isHelpServiceModalOpen: boolean = false;
  selectedHelpServiceTask: any = null;
  searchRoomNo: string = '';
  // Newly added for loader
  isLoading: boolean = false;

  constructor(
    private localService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private alertsService: AlertsService,
    private router: Router,
    private hotelListService: HotelListService) { }

  async ngOnInit() {
    // this.member_id = this.localService.get('MemberId');
    // Newly added
    // To load inital all tasks
    this.customerType = this.localService.get('CustomerType');
    // Newly added for getting member id for customer type
    // this.hotelId = Number(this.localService.get('UserId'));
    this.memberId = this.localService.get('MemberId');
    // console.log('Member ID from cancelled component:', this.memberId);
    // console.log('Hotel Id:', this.hotelId);
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
    this.getAllCancelledTask();
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
      // console.log('Escalation Hierarchy(Cancelled):', this.escalationHierarchy);
    } else {
      this.escalationHierarchy = [];
    }
    // Ended
  }

  // getAllCancelledTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   let object;
  //   if (customerType == 'Customer') {
  //     object = { "status": "Delivered" };
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
  //     this.at_desk = staffDataParse?.at_desk;
  //     if (hierarchy.department == '') {
  //       object = {
  //         "status": "Delivered",
  //         // "sequence": sequence
  //       };
  //     }
  //     // Newly added - parentId
  //     // else if (sequence == 2) {
  //     else if (this.at_desk) {
  //       object = {
  //         "status": "Delivered",
  //         "service.category": department,
  //         "room_no": staffRoomNo
  //       };
  //     }
  //     else {

  //       // what staff? -- higher level staffs but having department
  //       if (staffRoomNo.length > 0) {
  //         object = {
  //           "status": "Delivered",
  //           "service.category": department,
  //           // "sequence": sequence,
  //           "room_no": staffRoomNo,
  //           "staff_id": Number(this.localService.get('UserId'))
  //         };
  //       } else {
  //         object = {
  //           "status": "Delivered",
  //           "service.category": department,
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
  //         this.cancelledTasks = response.result.data;
  //         //console.log('Delivered Tasks:', this.cancelledTasks)
  //         this.allDeliveredTasks = response.result.data; //For pagination
  //         this.totalCancelledTasks = this.cancelledTasks.length;
  //         //console.log('Total  Tasks:', this.totalCancelledTasks);
  //         this.totalPages = Math.ceil(this.totalCancelledTasks / this.pageSize);
  //         //console.log('Total Pages:', this.totalPages);
  //         this.updatePaginatedDeliveredTasks(); // Sets first page
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

  // Hits task api
  getAllCancelledTask() {
    this.customerType = this.localService.get('CustomerType');
    let memberId = this.member_id;
    if (this.customerType === 'Customer') {
      this.callCancelledTaskApi({
        status: 'Cancelled',
        member_id: memberId
      });
    } else {
      // staff → fetch customer and rooms first
      this.getCustomerDataForCancelled(memberId);
    }
  }

  // Gets customer data based on member id
  getCustomerDataForCancelled(memberId: any) {
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
          // Now rooms ready → call Delivered API
          this.prepareAndCallCancelledTaskApi();
        }
      }
    });
  }

  // Gets room no based on label of staff from customer(hotel) settings
  mapStaffRooms(roomRange: any[]) {
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    let staffRoomNo = staffDataParse.room_no; // [{ label: "Floor 1" }, { label: "Floor 3" }]
    // console.log('Staff Room No:', staffRoomNo);
    let finalRoomArray: string[] = [];
    staffRoomNo.forEach((staff: any) => {
      const matched = roomRange.find(r => r.label === staff.label);
      if (matched) {
        finalRoomArray.push(`${matched.startRoom}-${matched.endRoom}`);
      }
    });
    // console.log('Final Room Array:', finalRoomArray); // ["1-100", "201-300"]
    this.labelRoomArray = finalRoomArray;
  }

  // Prepares object and hits task api
  /*   prepareAndCallCancelledTaskApi() {
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy);
      // Newly added & commented for combine - started
      // let department = hierarchyParse?.department;
      let department = hierarchyParse?.map((item: any) => item.department);
      // console.log('Staff department(Cancelled):', department);
      // Ended
      let staffData: any = this.localService.get('StaffData');
      let staffDataParse = JSON.parse(staffData);
      this.at_desk = staffDataParse?.at_desk;
      let object: any = { status: "Delivered" };
      // Newly added for delivered 
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
      if (this.at_desk) {
        object = {
          status: "Cancelled",
          room_no: this.labelRoomArray,
          member_id: this.member_id,
          // assigned_staff_id: baseStaffIds
          // "service.category": department,
        };
      } else {
        if (this.labelRoomArray.length > 0) {
          object = {
            status: "Cancelled",
            room_no: this.labelRoomArray,
            member_id: this.member_id,
            // assigned_staff_id: baseStaffIds
            // "service.category": department,
            // staff_id: Number(this.localService.get('UserId')),
          };
        } else {
          object = {
            status: "Cancelled",
            member_id: this.member_id,
            // assigned_staff_id: baseStaffIds
            // "service.category": department,
            // staff_id: Number(this.localService.get('UserId')),
          };
        }
      }
      // this.callCancelledTaskApi(object);
      // Newly added & commented for combine - started
      //  If FO department, add the desk staff ID dynamically
      // if (department === "FO" || department === 'Select') {
      //   this.getFoDeskStaff(department).subscribe({
      //     next: (deskStaffId: number | null) => {
      //       if (deskStaffId) {
      //         baseStaffIds.push(deskStaffId);
      //         // object.assigned_staff_id = [...new Set(baseStaffIds)]; // avoid duplicates
      //       }
      //       this.callCancelledTaskApi(object);
      //     },
      //     error: () => {
      //       // fallback even if FO desk fetch fails
      //       this.callCancelledTaskApi(object);
      //     }
      //   });
      // } 
      // Newly added for department - started
      if (department && (department !== 'Select' || department !== '')) {
        object["service.category"] = department;
      }
      // if (department && department === 'Select') {
      //   object["service.category"] = 'Select';
      // }
      // Ended
      if (Array.isArray(department) && (department.includes('FO') || department.includes('Select'))) {
        // If 'FO' or 'Select' exists in the array
        this.getFoDeskStaff(department).subscribe({
          next: (deskStaffIds: number[]) => {
            if (deskStaffIds) {
              // baseStaffIds.push(deskStaffId);
              // object.assigned_staff_id = [...new Set(baseStaffIds)]; // avoid duplicates
              baseStaffIds.push(...deskStaffIds);
              baseStaffIds = [...new Set(baseStaffIds)];
            }
            this.callCancelledTaskApi(object);
          },
          error: () => {
            // fallback even if FO desk fetch fails
            this.callCancelledTaskApi(object);
          }
        });
      }
      // Ended
      else {
        this.callCancelledTaskApi(object);
      }
    } */

  prepareAndCallCancelledTaskApi() {
    let hierarchy: any = this.localService.get('hierarchy');
    let hierarchyParse = JSON.parse(hierarchy);
    let department = hierarchyParse?.map((item: any) => item.department);
    // console.log('Staff department(Cancelled):', department);

    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    this.at_desk = staffDataParse?.at_desk;
    let object: any = { status: "Delivered" };
    // load baseStaffIds
    let baseStaffIds: number[] = [];
    const storedIds = this.localService.get('baseStaffIds');
    // console.log('Stored Base Staff Ids:', storedIds);
    if (storedIds) {
      try {
        baseStaffIds = JSON.parse(storedIds);
      } catch {
        baseStaffIds = storedIds.split(',').map((id: string) => Number(id.trim()));
      }
    }
    // console.log('Base Staff Ids (before FO merge):', baseStaffIds);
    // load frontOfficeStaffIds and merge
    // Newly commented because no need of fo desk
    /* let frontOfficeStaffIds: number[] = [];
    const storedFo = this.localService.get('frontOfficeStaffIds');
    // console.log('Stored Front Office Staff Ids:', storedFo);
    if (storedFo) {
      try {
        frontOfficeStaffIds = JSON.parse(storedFo);
      } catch {
        frontOfficeStaffIds = storedFo.split(',').map((id: string) => Number(id.trim()));
      }
      baseStaffIds.push(...frontOfficeStaffIds);
    }  */
    //  End of newly commented code
    // console.log('Front Office Staff Ids (loaded):', frontOfficeStaffIds);
    // Merge and dedupe
    baseStaffIds = baseStaffIds.filter(id => !!id); // remove falsy if any
    baseStaffIds = [...new Set(baseStaffIds)];
    // console.log('Final baseStaffIds (after FO merge & dedupe):', baseStaffIds);
    // Convert labelRoomArray into a final room list (existing logic)
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
        if (!isNaN(Number(start)) && !isNaN(Number(end))) {
          for (let i = Number(start); i <= Number(end); i++) {
            roomList.push(String(i));
          }
        } else if (/^\d+[A-Z]+$/i.test(start) && /^\d+[A-Z]+$/i.test(end)) {
          const prefix = start.match(/^\d+/)![0];
          const startSuffix = start.slice(prefix.length);
          const endSuffix = end.slice(prefix.length);
          roomList.push(
            ...expandAlphaRange(startSuffix.toUpperCase(), endSuffix.toUpperCase()).map(
              suffix => `${prefix}${suffix}`
            )
          );
        } else if (/^[A-Z]+\d+$/i.test(start) && /^[A-Z]+\d+$/i.test(end)) {
          const prefix = start.match(/^[A-Z]+/i)![0];
          const startNum = parseInt(start.slice(prefix.length));
          const endNum = parseInt(end.slice(prefix.length));
          for (let i = startNum; i <= endNum; i++) {
            roomList.push(`${prefix}${i}`);
          }
        } else if (/^[A-Z]+$/i.test(start) && /^[A-Z]+$/i.test(end)) {
          roomList.push(...expandAlphaRange(start.toUpperCase(), end.toUpperCase()));
        } else {
          roomList.push(value);
        }
      } else {
        roomList.push(value);
      }
    });
    this.labelRoomArray = roomList;
    // console.log('Room Number:', this.labelRoomArray);
    // Build object depending on at_desk and room selection
    if (this.at_desk) {
      object = {
        status: "Cancelled",
        room_no: this.labelRoomArray,
        member_id: this.member_id
      };
    } else {
      if (this.labelRoomArray.length > 0) {
        object = {
          status: "Cancelled",
          room_no: this.labelRoomArray,
          member_id: this.member_id
        };
      } else {
        object = {
          status: "Cancelled",
          member_id: this.member_id
        };
      }
    }
    // Attach assigned_staff_id if we have any final baseStaffIds
    // if (baseStaffIds.length > 0) {
    //   object.assigned_staff_id = baseStaffIds;
    // }
    // ended
    // Reset arrays before making API calls
    this.cancelledTasks = [];
    this.allCancelledTasks = [];
    // API call → service.category (category-based listing ONLY, when not Default)
    const findObject = shouldFilterByCategory(department)
      ? { ...object, 'service.category': department }
      : { ...object };
    this.callCancelledTaskApi(findObject);
    // Previously we also fetched by assigned_department. For your requirement
    // we no longer list tasks based on assigned_department, so this is commented.
    //
    // const assignedObj = { ...object, 'assigned_department': department };
    // this.callCancelledTaskApi(assignedObj);
  }

  getFoDeskStaff(department: string[]): Observable<number[]> {
    return new Observable((observer) => {
      const findObject = {
        "hierarchy.department": department,
        "at_desk": true,
        "member_id": this.member_id,
        // "higher_level_officer.id": ,
        // "room_no": this.labelRoomArray,
      };
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: findObject }
      };

      this.taskManagementService.getAllStaves(requestBody).subscribe({
        next: (resp: any) => {
          if (resp?.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
            // Newly added & commented for combine - started
            // const deskStaff = resp.result.data[0];
            // observer.next(deskStaff.id);
            const deskStaffIds = resp.result.data.map((staff: any) => staff.id);
            // console.log('Desk staff id(s) (Cancelled):', deskStaffIds)
            observer.next(deskStaffIds);
            // Ended
          } else {
            observer.next([]);
          }
          observer.complete();
        },
        error: (err) => {
          console.error("Error fetching FO desk staff:", err);
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  // Final call for api
  // callCancelledTaskApi(findObject: any) {
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": findObject,
  //       "pagination": false,
  //       "sorting": true,
  //       "sortingDetails": { id: -1 }
  //     }
  //   };
  //   this.taskManagementService.getAllTask(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         this.cancelledTasks = response.result.data;
  //         this.allDeliveredTasks = response.result.data; // For pagination
  //         this.totalCancelledTasks = this.cancelledTasks.length;
  //         this.totalPages = Math.ceil(this.totalCancelledTasks / this.pageSize);
  //         this.updatePaginatedDeliveredTasks(); // Sets first page
  //       }
  //     },
  //     error: (err) => {
  //       console.error('Delivered API Error:', err);
  //     }
  //   });
  // }

  callCancelledTaskApi(findObject: any) {
    this.isLoading = true;
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: findObject,
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          const tasks = response.result.data || [];
          if (tasks.length === 0) {
            // Don't reset if this is just one of the two API calls
            this.isLoading = false;
            return;
          }
          // Merge and deduplicate by task id
          const taskMap = new Map<number, any>();
          // Add existing tasks to map
          if (this.cancelledTasks && this.cancelledTasks.length > 0) {
            this.cancelledTasks.forEach((task: any) => taskMap.set(task.id, task));
          }
          // Add new tasks (will overwrite duplicates by id)
          tasks.forEach((task: any) => taskMap.set(task.id, task));
          // Convert map back to array
          this.cancelledTasks = Array.from(taskMap.values());
          // Ensure newest cancelled tasks appear first
          this.sortCancelledTasksByMostRecent();
          this.allCancelledTasks = [...this.cancelledTasks];
          this.totalCancelledTasks = this.cancelledTasks.length;
          this.totalPages = Math.ceil(this.totalCancelledTasks / this.pageSize);
          this.updatePaginatedDeliveredTasks();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Cancelled API Error:", err);
        this.isLoading = false;
      }
    });
  }

  // updatePaginatedDeliveredTasks() {
  //   const startIndex = (this.currentPage - 1) * this.pageSize;
  //   const endIndex = startIndex + this.pageSize;
  //   this.allCancelledTasks = this.cancelledTasks.slice(startIndex, endIndex);
  // }

  updatePaginatedDeliveredTasks() {
    const searchTerm = (this.searchRoomNo || '').trim().toLowerCase();
    const filtered = searchTerm
      ? this.cancelledTasks.filter((task: any) =>
        // task.room_no?.toString().toLowerCase().includes(searchTerm)
        task.room_no?.toString().toLowerCase().startsWith(searchTerm) ||
        (task.guest_name || task.task_created_by)?.toString().toLowerCase().startsWith(searchTerm)
      )
      : this.cancelledTasks;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allCancelledTasks = filtered.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedDeliveredTasks();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedDeliveredTasks();
    }
  }

  // Ratings function
  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  refreshData() {
    this.getAllCancelledTask();
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

  viewInvoice(task: any) {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          "invoiceDetails.Reserve_No": task.Reserve_No
        }
      }
    };
    this.taskManagementService.getCheckOut(requestBody).subscribe({
      next: (res: any) => {
        if (res && res.result.data.length > 0) {
          this.invoice = res.result.data[0];
          this.isInvoiceModalOpen = true;
          // console.log('Invoice Data:', this.invoice);
        } else {
          this.invoice = null;
          this.isInvoiceModalOpen = false;
          // console.log('No invoice found');
        }
      },
      error: (err: any) => {
        console.error('Invoice API Error:', err);
        this.isInvoiceModalOpen = false;
      }
    });
  }

  closeInvoiceModal() {
    this.isInvoiceModalOpen = false;
  }

  getInvoiceTotal(): number {
    if (this.invoice?.invoiceDetails?.Bill_Amt) {
      return Number(this.invoice.invoiceDetails.Bill_Amt);
    }
    if (this.invoice?.invoiceDetails?.items?.length) {
      return this.invoice.invoiceDetails.items.reduce(
        (sum: number, item: any) => sum + (parseFloat(item.totalAmount) || 0),
        0
      );
    }
    return 0;
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
      // Reset to full escalated task list with pagination
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.allCancelledTasks = this.cancelledTasks.slice(startIndex, endIndex);
      this.totalCancelledTasks = this.cancelledTasks.length;
      this.totalPages = Math.ceil(this.totalCancelledTasks / this.pageSize);
    } else {
      const searchTerm = term.trim().toLowerCase();
      const filtered = this.cancelledTasks.filter((task: any) => {
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
      this.allCancelledTasks = filtered.slice(startIndex, endIndex);
      this.totalCancelledTasks = filtered.length;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
    }
  }

  // Newest cancelled tasks first (based on order_date + order_time)
  private sortCancelledTasksByMostRecent() {
    if (!Array.isArray(this.cancelledTasks)) return;
    this.cancelledTasks.sort((a: any, b: any) => {
      const aTime = new Date(`${a?.order_date || ''} ${a?.order_time || ''}`).getTime();
      const bTime = new Date(`${b?.order_date || ''} ${b?.order_time || ''}`).getTime();
      return bTime - aTime;
    });
  }

}
