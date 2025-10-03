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

  constructor(
    private taskManagementService: TaskManagementService,
    private localService: LocalStorageService,
    private alertsService: AlertsService,
    private router: Router,
    private loaderService: LoaderService,
    private hotelListService: HotelListService) { }

  ngOnInit() {
    this.member_id = this.localService.get('MemberId');
    // Newly added
    // To load inital all tasks
    this.getAllProcessedTask();
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

  getAllProcessedTask() {
    this.customerType = this.localService.get('CustomerType');
    let memberId = this.localService.get('MemberId');
    if (this.customerType === 'Customer') {
      this.callProcessedTaskApi({ 
        status: 'Processing',
        member_id: memberId});
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
        console.log('Customer Data:', customer);
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
    console.log('Staff Room No:', staffRoomNo);
    let finalRoomArray: string[] = [];
    staffRoomNo.forEach((staff: any) => {
      const matched = roomRange.find(r => r.label === staff.label);
      if (matched) {
        finalRoomArray.push(`${matched.startRoom}-${matched.endRoom}`);
      }
    });
    console.log('Final Room Array:', finalRoomArray);
    this.labelRoomArray = finalRoomArray;
  }

  // Prepares object and hits task api
  prepareAndCallProcessedTaskApi() {
    let hierarchy: any = this.localService.get('hierarchy');
    let hierarchyParse = JSON.parse(hierarchy);
    let department = hierarchyParse?.department;
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    this.at_desk = staffDataParse?.at_desk;
    let object: any = { status: "Processing" };
    // Newly added for processing
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
  }

  // Final call for api
  callProcessedTaskApi(findObject: any) {
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
          this.processedTasks = response.result.data;
          this.allProcessedTasks = response.result.data; // For pagination
          console.log('Processed Tasks:', this.processedTasks);
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
      },
      error: (err) => {
        console.error('Processed API Error:', err);
      }
    });
  }

  updatePaginatedProcessedTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allProcessedTasks = this.processedTasks.slice(startIndex, endIndex);
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
          const escalationMinutes = staff?.hierarchy?.escalationTime || 0;
          //console.log('Escalation Minutes:', escalationMinutes);
          //console.log('Service Time:', task.order_time);
          if (task?.order_time) {
            const escalationMinutes = Number(staff?.hierarchy?.escalationTime || 0);
            if (!isNaN(escalationMinutes)) {
              // Step 1: Create a Date for today using the time string
              const today = new Date();
              const [hours, minutes, seconds] = task.order_time.split(':').map(Number);
              const orderDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
              // Step 2: Add escalation time
              const expectedDate = new Date(orderDate.getTime() + escalationMinutes * 60000);
              // Step 3: Format expected time
              const expectedHours = String(expectedDate.getHours()).padStart(2, '0');
              const expectedMinutes = String(expectedDate.getMinutes()).padStart(2, '0');
              const expectedSeconds = String(expectedDate.getSeconds()).padStart(2, '0');
              const expectedTime = `${expectedHours}:${expectedMinutes}:${expectedSeconds}`;
              // Step 4: Store the result
              this.expectedTimesMap[task.id] = expectedTime;
            }
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
}
