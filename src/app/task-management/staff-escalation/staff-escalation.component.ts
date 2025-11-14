import { HotelListService } from './../../hotel-list/hotel-list.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskManagementService } from '../task-management.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-staff-escalation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-escalation.component.html',
  styleUrl: './staff-escalation.component.scss'
})

export class StaffEscalatedComponent {
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
  lowerStaffIds: number[] = [];
  hotelId: any;
  memberId: any;
  customerType: any
  // Newly added - Menu
  isMenuModalOpen: boolean = false;
  selectedMenuItems: any[] = [];
  selectedTotalAmount: number = 0;
  selectedMenuRoom: string = '';
  // Newly added - Help Service
  isHelpServiceModalOpen: boolean = false;
  selectedHelpServiceTask: any = null;
  searchRoomNo: string = '';

  constructor(
    private taskManagementService: TaskManagementService,
    private router: Router,
    private localService: LocalStorageService,
    private hotelListService: HotelListService) { }

  async ngOnInit() {
    this.customerType = this.localService.get('CustomerType');
    this.hotelId = Number(this.localService.get('UserId'));
    console.log('Hotel Id:', this.hotelId);
    // this.member_id = this.localService.get('MemberId');
    const storedIds = this.localService.get('allLowerStaffIds');
    console.log('Stored Lower Staff Ids(Staff escalation):', storedIds);
    if (storedIds) {
      try {
        this.lowerStaffIds = JSON.parse(storedIds);  // works if stored properly
      } catch {
        // fallback: maybe it was stored as "389, 390"
        this.lowerStaffIds = storedIds.split(',').map((id: string) => Number(id.trim()));
      }
    }
    console.log('Base Staff Ids:', this.lowerStaffIds);
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

  getAllTask() {
    let customerType = this.localService.get('CustomerType');
    if (customerType == 'Staff') {
      let staffData: any = this.localService.get('StaffData');
      let staffDataParse = JSON.parse(staffData);
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy);
      this.sequence = hierarchyParse?.sequence;
      this.at_desk = staffDataParse?.at_desk;
    }
    const userId = Number(this.localService.get('UserId'));
    // Directly match current_escalated_id with logged-in user
    let object: any = {
      member_id: this.member_id
    };
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: object,
        pagination: false,
        sorting: true,
        sortingDetails: {
          id: -1
        }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.escalatedTasks = (response?.result?.data || [])
            .reduce((acc: any[], task: any) => {
              let matchedEscalations: any[] = [];
              if (customerType == 'Staff') {
                matchedEscalations = (task.time_line || []).filter((t: any) =>
                  t.status === "Escalated" &&
                  this.lowerStaffIds.includes(Number(t.escalated_from_id))
                );
              } else {
                matchedEscalations = (task.time_line || []).filter((t: any) =>
                  t.status === "Escalated"
                );
              }
              console.log("Matched Escalations:", matchedEscalations);
              // Push each matched escalation separately - loop from last index
              for (let i = matchedEscalations.length - 1; i >= 0; i--) {
                const esc = matchedEscalations[i];
                acc.push({
                  ...task,
                  escalated_from_id: esc.escalated_from_id,
                  escalated_from_name: esc.escalated_from_name,
                  escalated_to_name: esc.escalated_to_name,
                  escalated_time: esc.time
                });
              }
              return acc;
            }, []);
          this.allEscalatedTasks = this.escalatedTasks;
          console.log('Escalated Tasks for Staff Escalation Component:', this.allEscalatedTasks);
          this.totalEscalatedTasks = this.escalatedTasks.length;
          this.totalPages = Math.ceil(this.totalEscalatedTasks / this.pageSize);
          this.updatePaginatedEscalatedTasks(); // sets first page
        }
      },
      error: (err: any) => {
        console.log('Error fetching escalated tasks:', err);
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
