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
  // Newly added for loader
  isLoading: boolean = false;

  @Output() escalatedCountChanged = new EventEmitter<number>();

  constructor(
    private taskManagementService: TaskManagementService,
    private router: Router,
    private localService: LocalStorageService,
    private hotellistService: HotelListService) { }

  async ngOnInit() {
    this.customerType = this.localService.get('CustomerType');
    // Newly added for getting member id for customer type
    // this.hotelId = Number(this.localService.get('UserId'));
    // console.log('Hotel Id:', this.hotelId);
    this.memberId = this.localService.get('MemberId');
    // console.log('Member ID from escalated component:', this.memberId);
    // this.member_id = this.localService.get('MemberId');
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
    this.getAllTask();
  }

  // Helper function to normalize escalated_from_id or escalated_to_id (can be array or single value)
  private normalizeEscalationId(value: any): number[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((id: any) => Number(id)).filter((id: any) => !isNaN(id));
    }
    const numValue = Number(value);
    return isNaN(numValue) ? [] : [numValue];
  }

  // Helper function to check if userId is in escalated_from_id (handles both array and single value)
  private isUserIdInEscalatedFrom(escalatedFromId: any, userId: number): boolean {
    // console.log("Escalated From Id's(My Escalation):", escalatedFromId);
    const normalizedIds = this.normalizeEscalationId(escalatedFromId);
    // console.log('Normalized Escalated From Id(My Escalation):', normalizedIds);
    return normalizedIds.includes(userId);
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
      this.hotellistService.getSignupAllCustomers(requestBody).subscribe({
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
    this.isLoading = true;
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
          // console.log('Escalated Tasks(Before):', this.escalatedTasks);
          this.escalatedTasks = (response?.result?.data || [])
            .map((task: any) => {
              // Get all matches, not just first
              // Updated to handle escalated_from_id as array or single value
              const matches = (task?.time_line || []).filter(
                (tl: any) => tl.status === "Escalated" && this.isUserIdInEscalatedFrom(tl.escalated_from_id, userId)
              );
              // If no matches → return null
              if (!matches.length) return null;
              // Only pick the last matching escalation (most recent) to avoid duplicate entries for the same task
              const match = matches[matches.length - 1];
              // Handle escalated_to_id (can be array or single value)
              const escalatedToId = match.escalated_to_id;
              // Normalize to array for consistent handling
              const normalizedEscalatedToId = this.normalizeEscalationId(escalatedToId);
              return {
                ...task,
                escalated_to_name: match.escalated_to_name,
                escalated_to_id: normalizedEscalatedToId, // Always stored as array for consistent handling
                escalated_time: match.time // Keep escalated_time populated for correct sorting
              };
            })
            .filter((t: any) => t !== null);
          // console.log("Escalated Tasks:", this.escalatedTasks);
          // Ensure newest escalated tasks appear first
          this.sortEscalatedTasksByMostRecent();
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
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('API Error:', err);
        this.isLoading = false;
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
        (task.guest_name || task.task_created_by)?.toString().toLowerCase().startsWith(searchTerm)
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
    console.log('Help service modal:', task);
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
        const guestValue = (task.guest_name || task.task_created_by)?.toString().trim().toLowerCase();
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

  // Newest escalated tasks first (based on order_date + escalated_time)
  private sortEscalatedTasksByMostRecent() {
    if (!Array.isArray(this.escalatedTasks)) return;
    this.escalatedTasks.sort((a: any, b: any) => {
      const aTime = new Date(`${a?.order_date || ''} ${a?.escalated_time || ''}`).getTime();
      const bTime = new Date(`${b?.order_date || ''} ${b?.escalated_time || ''}`).getTime();
      return bTime - aTime;
    });
  }

  getStatusStyles(status: string): { [key: string]: string } {
    switch (status) {
      case 'ASAP':
        return { color: '#0056b3', 'background-color': '#e1f0ff' };
      case 'Assigned':
        return { color: '#856404', 'background-color': '#fff3cd' };
      case 'Processing':
        return { color: '#30A75F', 'background-color': '#c2f2cd' };
      case 'Delivered':
        return { color: '#155724', 'background-color': '#d4edda' };
      case 'Cancelled':
      case 'Rejected':
        return { color: '#721c24', 'background-color': '#f8d7da' };
      case 'Escalated':
        return { color: '#E70909', 'background-color': '#f2d9d9' };
      default:
        return { color: '#545460', 'background-color': '#eaeaea' };
    }
  }

}

