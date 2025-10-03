import { HotelListService } from './../../hotel-list/hotel-list.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { TaskManagementService } from './../task-management.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

  constructor(
    private localService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private alertsService: AlertsService,
    private router: Router,
    private hotelListService: HotelListService) { }

  ngOnInit(): void {
    this.member_id = this.localService.get('MemberId');
    // Newly added
    // To load inital all tasks
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
  // Hits task api
  getAllDeliveredTask() {
    this.customerType = this.localService.get('CustomerType');
    let memberId = this.localService.get('MemberId');
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
    this.callDeliveredTaskApi(object);
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


  updatePaginatedDeliveredTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allDeliveredTasks = this.deliveredTasks.slice(startIndex, endIndex);
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
}
