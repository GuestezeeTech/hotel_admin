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
  lowerStaffIds: number[] = [];

  constructor(
    private taskManagementService: TaskManagementService,
    private router: Router,
    private localService: LocalStorageService) { }

  ngOnInit() {
    this.member_id = this.localService.get('MemberId');
    const storedIds = this.localService.get('allLowerStaffIds');
    console.log('Stored Lower Staff Ids:', storedIds);
    if (storedIds) {
      try {
        this.lowerStaffIds = JSON.parse(storedIds);  // works if stored properly
      } catch {
        // fallback: maybe it was stored as "389, 390"
        this.lowerStaffIds = storedIds.split(',').map((id: string) => Number(id.trim()));
      }
    }
    console.log('Base Staff Ids:', this.lowerStaffIds);
    this.getAllTask();
  }

  // For modal in task component
  @Output() openAssigneeModal = new EventEmitter<any>();

  onAddAssignee(order: any) {
    this.openAssigneeModal.emit(order);
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

  updatePaginatedEscalatedTasks() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.allEscalatedTasks = this.escalatedTasks.slice(startIndex, endIndex);
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
}
