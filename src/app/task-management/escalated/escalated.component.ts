import { LocalStorageService } from './../../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskManagementService } from '../task-management.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HotelListService } from '../../hotel-list/hotel-list.service';

@Component({
  selector: 'app-escalated',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './escalated.component.html',
  styleUrl: './escalated.component.scss'
})

export class EscalatedComponent {
  // escalatedOrders = [
  //   {
  //     name: 'Sophia Blake',
  //     roomNo: '120',
  //     service: 'Room Cleaning',
  //     orderTime: '08:00 AM',
  //     assignedStaff: 'Liam'
  //   },
  //   {
  //     name: 'Jackson Miller',
  //     roomNo: '305',
  //     service: 'Food Delivery',
  //     orderTime: '08:10 AM',
  //     assignedStaff: 'Emma'
  //   },
  //   {
  //     name: 'Grace Parker',
  //     roomNo: '412',
  //     service: 'Laundry',
  //     orderTime: '08:25 AM',
  //     assignedStaff: 'Noah'
  //   },
  //   {
  //     name: 'Mason Rivera',
  //     roomNo: '510',
  //     service: 'Towel Replacement',
  //     orderTime: '08:40 AM',
  //     assignedStaff: 'Ava'
  //   },
  //   {
  //     name: 'Ella Bennett',
  //     roomNo: '621',
  //     service: 'Mini Bar Restock',
  //     orderTime: '08:50 AM',
  //     assignedStaff: 'Oliver'
  //   },
  //   {
  //     name: 'Lucas Hayes',
  //     roomNo: '708',
  //     service: 'Room Cleaning',
  //     orderTime: '09:00 AM',
  //     assignedStaff: 'Mia'
  //   },
  //   {
  //     name: 'Harper Scott',
  //     roomNo: '803',
  //     service: 'Food Delivery',
  //     orderTime: '09:15 AM',
  //     assignedStaff: 'Ethan'
  //   },
  //   {
  //     name: 'Benjamin Reed',
  //     roomNo: '914',
  //     service: 'Laundry',
  //     orderTime: '09:25 AM',
  //     assignedStaff: 'Isabella'
  //   },
  //   {
  //     name: 'Lily Walker',
  //     roomNo: '1005',
  //     service: 'Mini Bar Restock',
  //     orderTime: '09:30 AM',
  //     assignedStaff: 'James'
  //   },
  //   {
  //     name: 'Alexander Brooks',
  //     roomNo: '1112',
  //     service: 'Towel Replacement',
  //     orderTime: '09:45 AM',
  //     assignedStaff: 'Zoe'
  //   }
  // ];
  escalatedTasks: any[] = [];
  allEscalatedTasks: any[] = [];
  sequence: any;
  currentPage: number = 1;
  pageSize: number = 10; // Show 10 roles per page
  totalEscalatedTasks: number = 0; // Total number of roles
  totalPages: number = 0; // Total number of pages
  //  Newly added - parentId
  at_desk: any;
  // Newly added for find
  member_id: any;
  previousTaskIds: number[] = [];
  hotelId: any;
  memberId: any;
  customerType: any;
  // Newly added - Menu
  isMenuModalOpen: boolean = false;
  selectedMenuItems: any[] = [];
  selectedTotalAmount: number = 0;
  selectedMenuRoom: string = '';
  // Newly added - Help Service
  isHelpServiceModalOpen: boolean = false;
  selectedHelpServiceTask: any = null;
  searchRoomNo: string = '';

  @Output() escalatedCountChanged = new EventEmitter<number>();

  constructor(
    private taskManagementService: TaskManagementService,
    private router: Router,
    private localService: LocalStorageService,
    private hotellistService: HotelListService) { }

  async ngOnInit() {
    this.customerType = this.localService.get('CustomerType');
    this.hotelId = Number(this.localService.get('UserId'));
    console.log('Hotel Id:', this.hotelId);
    // this.member_id = this.localService.get('MemberId');
    if (this.customerType == 'Customer') {
      await this.getCustomerMemberId(this.hotelId);
    }
    else {
      this.member_id = this.localService.get('MemberId');
    }
    this.getAllTask();
  }

  // For modal in task component
  @Output() openAssigneeModal = new EventEmitter<any>();

  onAddAssignee(order: any) {
    this.openAssigneeModal.emit(order);
  }

  // getAllTask() {
  //   let customerType = this.localService.get('CustomerType');
  //   if (customerType == 'Staff') {
  //     let staffData: any = this.localService.get('StaffData');
  //     let staffDataParse = JSON.parse(staffData);
  //     let hierarchy: any = this.localService.get('hierarchy');
  //     let hierarchyParse = JSON.parse(hierarchy)
  //     this.sequence = hierarchyParse?.sequence;
  //     // //console.log('Hierarchy Sequence:', sequence);
  //     this.at_desk = staffDataParse?.at_desk;
  //   }
  //   let object;
  //   // Newly added - parentId
  //   // if (this.sequence > 2) {
  //   if (!this.at_desk) {
  //     object = {
  //       "status": "Escalated",
  //       "escalated_from_id": Number(this.localService.get('UserId')),
  //       "member_id": this.member_id
  //     }
  //   } else {
  //     object = {
  //       "status": "Escalated",
  //       "member_id": this.member_id
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
  //         this.escalatedTasks = response?.result?.data || [];
  //         //console.log('Escalated Tasks:', this.escalatedTasks);
  //         this.allEscalatedTasks = response.result.data; //For pagination
  //         this.totalEscalatedTasks = this.escalatedTasks.length;
  //         //console.log('Total Escalated Tasks:', this.totalEscalatedTasks);
  //         this.totalPages = Math.ceil(this.totalEscalatedTasks / this.pageSize);
  //         //console.log('Total Pages:', this.totalPages);
  //         this.updatePaginatedEscalatedTasks(); // Sets first page
  //       } else {
  //         //console.error('No roles found:', response?.message);
  //       }
  //     },
  //     error: (err: any) => {
  //       //console.error('API Error:', err);
  //     }
  //   });
  // }

  getCustomerMemberId(hotelId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { id: hotelId }
        }
      };
      this.hotellistService.getSignupAllCustomers(requestBody).subscribe({
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

  getAllTask() {
    let customerType = this.localService.get('CustomerType');
    if (customerType == 'Staff') {
      let staffData: any = this.localService.get('StaffData');
      let staffDataParse = JSON.parse(staffData);
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy)
      this.sequence = hierarchyParse?.sequence;
      this.at_desk = staffDataParse?.at_desk;
    }
    let object: any = {
      "member_id": this.member_id
    };
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": object,
        "pagination": false,
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          const userId = Number(this.localService.get('UserId'));
          // Filter and also attach escalated_to_name
          // this.escalatedTasks = (response?.result?.data || [])
          //   .map((task: any) => {
          //     // Find the matching escalation where logged-in user escalated
          //     const match = task?.time_line?.find(
          //       (tl: any) => tl.status === "Escalated" && tl.escalated_from_id === userId
          //     );
          //     if (match) {
          //       return {
          //         ...task,
          //         escalated_to_name: match.escalated_to_name, // store to_name
          //         escalated_to_id: match.escalated_to_id
          //       };
          //     }
          //     return null;
          //   })
          //   .filter((t: any) => t !== null);
          console.log('Escalated Tasks(Before):', this.escalatedTasks);
          this.escalatedTasks = (response?.result?.data || [])
            .flatMap((task: any) => {
              // Get all matches, not just first
              const matches = (task?.time_line || []).filter(
                (tl: any) => tl.status === "Escalated" && tl.escalated_from_id === userId
              );
              console.log("Matches:", matches);
              // If no matches → return empty array (nothing added for this task)
              if (!matches.length) return [];
              // For each escalation, return a separate enriched task object
              return matches.map((match: any) => ({
                ...task,
                escalated_to_name: match.escalated_to_name,
                escalated_to_id: match.escalated_to_id
              }));
            });
          console.log("Escalated Tasks:", this.escalatedTasks);
          // Determine new tasks for badge increment
          const newTasks = this.escalatedTasks.filter(task => !this.previousTaskIds.includes(task.id));
          this.previousTaskIds = this.escalatedTasks.map(t => t.id); // update tracker

          // Emit new tasks count to parent
          if (newTasks.length > 0) {
            this.escalatedCountChanged.emit(newTasks.length);
          }
          this.allEscalatedTasks = this.escalatedTasks; // For pagination
          this.totalEscalatedTasks = this.escalatedTasks.length;
          this.totalPages = Math.ceil(this.totalEscalatedTasks / this.pageSize);
          this.updatePaginatedEscalatedTasks();
        }
      },
      error: (err: any) => {
        console.error('API Error:', err);
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
        task.guest_name?.toString().toLowerCase().startsWith(searchTerm)
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

  refreshData() {
    this.getAllTask();
  }

  navigateToTimeline(taskId: any) {
    //console.log('Function called with taskId:', taskId);
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
      // Reset to full escalated task list with pagination
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.allEscalatedTasks = this.escalatedTasks.slice(startIndex, endIndex);
      this.totalEscalatedTasks = this.escalatedTasks.length;
      this.totalPages = Math.ceil(this.totalEscalatedTasks / this.pageSize);
    } else {
      const searchTerm = term.trim().toLowerCase();
      const filtered = this.escalatedTasks.filter((task: any) => {
        // console.log('Room Number in task:', task.room_no);
        // return task.room_no?.toString().toLowerCase().includes(searchTerm);
        const roomValue = task.room_no?.toString().trim().toLowerCase();
        const guestValue = task.guest_name?.toString().trim().toLowerCase();
        const roomMatch = roomValue?.startsWith(searchTerm);
        const guestMatch = guestValue?.startsWith(searchTerm);
        return roomMatch || guestMatch;
      }
      );
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.allEscalatedTasks = filtered.slice(startIndex, endIndex);
      this.totalEscalatedTasks = filtered.length;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
    }
  }

}
