import { HotelListService } from './../../hotel-list/hotel-list.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { TaskManagementService } from './../task-management.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-delivered',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivered.component.html',
  styleUrl: './delivered.component.scss'
})

export class DeliveredComponent {
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
  deliveredTasks: any;
  allDeliveredTasks: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalDeliveredTasks: number = 0; // Total number of roles
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
    this.hotelId = Number(this.localService.get('UserId'));
    console.log('Hotel Id:', this.hotelId);
    if (this.customerType == 'Customer') {
      await this.getCustomerMemberId(this.hotelId);
    }
    else {
      this.member_id = this.localService.get('MemberId');
    }
    this.getAllDeliveredTask();
    // Escalation timer for tasks(from hierarchy)
    this.escalationHierarchy = this.localService.get('hierarchy');
    if (this.escalationHierarchy !== null) {
      this.escalationHierarchy = JSON.parse(this.escalationHierarchy);
      //console.log('Escalation Hierarchy:', this.escalationHierarchy);
      this.escalationTime = this.escalationHierarchy.escalationTime;
      //console.log('Escalation Time:', this.escalationTime);
    } else {
      //console.warn('Hierarchy data not found in localStorage');
    }
  }

  // getAllDeliveredTask() {
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
  //         this.deliveredTasks = response.result.data;
  //         //console.log('Delivered Tasks:', this.deliveredTasks)
  //         this.allDeliveredTasks = response.result.data; //For pagination
  //         this.totalDeliveredTasks = this.deliveredTasks.length;
  //         //console.log('Total  Tasks:', this.totalDeliveredTasks);
  //         this.totalPages = Math.ceil(this.totalDeliveredTasks / this.pageSize);
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
  getAllDeliveredTask() {
    this.customerType = this.localService.get('CustomerType');
    let memberId = this.member_id;
    if (this.customerType === 'Customer') {
      this.callDeliveredTaskApi({
        status: 'Delivered',
        member_id: memberId
      });
    } else {
      // staff → fetch customer and rooms first
      this.getCustomerDataForDelivered(memberId);
    }
  }

  // Gets customer data based on member id
  getCustomerDataForDelivered(memberId: any) {
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
          // Now rooms ready → call Delivered API
          this.prepareAndCallDeliveredTaskApi();
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
  prepareAndCallDeliveredTaskApi() {
    let hierarchy: any = this.localService.get('hierarchy');
    let hierarchyParse = JSON.parse(hierarchy);
    let department = hierarchyParse?.department;
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    this.at_desk = staffDataParse?.at_desk;
    let object: any = { status: "Delivered" };
    // Newly added for delivered 
    let baseStaffIds: number[] = [];
    const storedIds = this.localService.get('baseStaffIds');
    console.log('Stored Base Staff Ids:', storedIds);
    if (storedIds) {
      try {
        baseStaffIds = JSON.parse(storedIds);  // works if stored properly
      } catch {
        // fallback: maybe it was stored as "389, 390"
        baseStaffIds = storedIds.split(',').map((id: string) => Number(id.trim()));
      }
    }
    console.log('Base Staff Ids:', baseStaffIds);
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
        status: "Delivered",
        room_no: this.labelRoomArray,
        member_id: this.member_id,
        assigned_staff_id: baseStaffIds
        // "service.category": department,
      };
    } else {
      if (this.labelRoomArray.length > 0) {
        object = {
          status: "Delivered",
          room_no: this.labelRoomArray,
          member_id: this.member_id,
          assigned_staff_id: baseStaffIds
          // "service.category": department,
          // staff_id: Number(this.localService.get('UserId')),
        };
      } else {
        object = {
          status: "Delivered",
          member_id: this.member_id,
          assigned_staff_id: baseStaffIds
          // "service.category": department,
          // staff_id: Number(this.localService.get('UserId')),
        };
      }
    }
    // this.callDeliveredTaskApi(object);
    // If FO department, add the desk staff ID dynamically
    if (department === "FO" || department === 'Select') {
      this.getFoDeskStaff(department).subscribe({
        next: (deskStaffId: number | null) => {
          if (deskStaffId) {
            baseStaffIds.push(deskStaffId);
            object.assigned_staff_id = [...new Set(baseStaffIds)]; // avoid duplicates
          }
          this.callDeliveredTaskApi(object);
        },
        error: () => {
          // fallback even if FO desk fetch fails
          this.callDeliveredTaskApi(object);
        }
      });
    } else {
      this.callDeliveredTaskApi(object);
    }
  }

  getFoDeskStaff(department: string): Observable<number | null> {
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
            const deskStaff = resp.result.data[0];
            observer.next(deskStaff.id);
          } else {
            observer.next(null);
          }
          observer.complete();
        },
        error: (err) => {
          console.error("Error fetching FO desk staff:", err);
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  // Final call for api
  // callDeliveredTaskApi(findObject: any) {
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
  //         this.deliveredTasks = response.result.data;
  //         this.allDeliveredTasks = response.result.data; // For pagination
  //         this.totalDeliveredTasks = this.deliveredTasks.length;
  //         this.totalPages = Math.ceil(this.totalDeliveredTasks / this.pageSize);
  //         this.updatePaginatedDeliveredTasks(); // Sets first page
  //       }
  //     },
  //     error: (err) => {
  //       console.error('Delivered API Error:', err);
  //     }
  //   });
  // }

  callDeliveredTaskApi(findObject: any) {
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
            this.allDeliveredTasks = [];
            this.deliveredTasks = [];
            this.totalDeliveredTasks = 0;
            this.totalPages = 0;
            return;
          }
          let updatedTasks: any[] = [];
          let completedCount = 0;
          tasks.forEach((task: any) => {
            console.log('Id:', task.id);
            const ratingRequestBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              extras: {
                find: {
                  task_id: task.id,
                  member_id: this.member_id
                },
                pagination: false,
                sorting: true,
                sortingDetails: { id: -1 }
              }
            };
            this.taskManagementService.getAllRatings(ratingRequestBody).subscribe({
              next: (ratingResponse) => {
                if (ratingResponse?.success && ratingResponse.result.data.length > 0) {
                  task.rating = ratingResponse.result.data[0].rating;
                } else {
                  task.rating = 0; // default if no rating
                }
                updatedTasks.push(task);
                completedCount++;
                // Once all rating calls are finished
                if (completedCount === tasks.length) {
                  this.allDeliveredTasks = updatedTasks;
                  this.deliveredTasks = [...updatedTasks];
                  this.totalDeliveredTasks = this.deliveredTasks.length;
                  this.totalPages = Math.ceil(this.totalDeliveredTasks / this.pageSize);
                  this.updatePaginatedDeliveredTasks();
                }
              },
              error: (err) => {
                console.error("Delivered Ratings API Error:", err);
                task.rating = 0;
                updatedTasks.push(task);
                completedCount++;
                if (completedCount === tasks.length) {
                  this.allDeliveredTasks = updatedTasks;
                  this.deliveredTasks = [...updatedTasks];
                  this.totalDeliveredTasks = this.deliveredTasks.length;
                  this.totalPages = Math.ceil(this.totalDeliveredTasks / this.pageSize);
                  this.updatePaginatedDeliveredTasks();
                }
              }
            });
          });
        }
      },
      error: (err) => {
        console.error("Delivered API Error:", err);
      }
    });
  }

  // updatePaginatedDeliveredTasks() {
  //   const startIndex = (this.currentPage - 1) * this.pageSize;
  //   const endIndex = startIndex + this.pageSize;
  //   this.allDeliveredTasks = this.deliveredTasks.slice(startIndex, endIndex);
  // }

  updatePaginatedDeliveredTasks() {
    const searchTerm = (this.searchRoomNo || '').trim().toLowerCase();
    const filtered = searchTerm
      ? this.deliveredTasks.filter((task: any) =>
        task.room_no?.toString().toLowerCase().includes(searchTerm)
      )
      : this.deliveredTasks;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allDeliveredTasks = filtered.slice(startIndex, endIndex);
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
    this.getAllDeliveredTask();
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
          console.log('Invoice Data:', this.invoice);
        } else {
          this.invoice = null;
          this.isInvoiceModalOpen = false;
          console.log('No invoice found');
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

  filterByRoomNumber(term: string) {
    this.searchRoomNo = term.trim().toLowerCase();
    if (!term || term.trim() === '') {
      // Reset to full escalated task list with pagination
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.allDeliveredTasks = this.deliveredTasks.slice(startIndex, endIndex);
      this.totalDeliveredTasks = this.deliveredTasks.length;
      this.totalPages = Math.ceil(this.totalDeliveredTasks / this.pageSize);
    } else {
      const searchTerm = term.trim().toLowerCase();
      const filtered = this.deliveredTasks.filter((task: any) => {
        console.log('Room Number in task:', task.room_no);
        return task.room_no?.toString().toLowerCase().includes(searchTerm);
      }
      );
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.allDeliveredTasks = filtered.slice(startIndex, endIndex);
      this.totalDeliveredTasks = filtered.length;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
    }
  }

}
