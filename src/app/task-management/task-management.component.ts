import { LocalStorageService } from './../auth-services/local-storage.service';
import { LoaderService } from './../shared/loader/loader.service';
import { DOMAIN_NAME, USER_ID } from './../app.config';
import { Component, Output, EventEmitter } from '@angular/core';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { AlertsService } from '../shared/alerts/alerts.service';
import { CommonModule } from '@angular/common';
import { AsapCartComponent } from './asap-cart/asap-cart.component';
import { ProcessingComponent } from "./processing/processing.component";
import { DeliveredComponent } from './delivered/delivered.component';
import { EscalatedComponent } from './escalated/escalated.component';
import { ScheduledComponent } from './scheduled/scheduled.component';
import { EscalatedFromComponent } from './escalated-from/escalated-from.component';
import { TimelineComponent } from './timeline/timeline.component';
import { TaskManagementService } from './task-management.service';
import { OnInit } from '@angular/core';
import { StaffListingService } from '../user-access/staff-listing/staff-listing.service';
import { Router } from '@angular/router';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [AlertsComponent, CommonModule, AsapCartComponent, ProcessingComponent, DeliveredComponent, EscalatedComponent, ScheduledComponent, EscalatedFromComponent, TimelineComponent],
  templateUrl: './task-management.component.html',
  styleUrl: './task-management.component.scss'
})

export class TaskManagementComponent implements OnInit {
  @ViewChild(AsapCartComponent) asapCartComponent!: AsapCartComponent;
  @ViewChild(ScheduledComponent) scheduledcomponent!: ScheduledComponent;
  @Output() taskUpdated: EventEmitter<void> = new EventEmitter<void>();
  // Tab refresh
  @ViewChild('asapCart') asapcartComponent: any;
  @ViewChild('highPriority') highPriorityComponent: any;
  @ViewChild('processing') processingComponent: any;
  @ViewChild('scheduled') scheduledComponent: any;
  @ViewChild('delivered') deliveredComponent: any;

  // Tab contents
  tabs = ['ASAP Cart', 'High Priority', 'Schedule', 'Processing', 'Escalated', 'Delivered'];
  selectedTab = this.tabs[0]; // Default tab
  // For all task
  tasks: any = [];
  // For tab sleection
  selectTab(tab: string) {
    this.selectedTab = tab;
  }
  // For showing filter
  showFilterDropdown: boolean = false;
  // Orders data
  orders = [
    {
      name: 'John Doe',
      roomNo: '101',
      service: 'Pet Service',
      department: 'Pet Service',
      orderTime: '08:30 AM',
      escalateTime: '15secs',
      action: 'Add Assignee',
      isAssigned: true,
    },
    {
      name: 'Emily Smith',
      roomNo: '202',
      service: 'Bath Soap',
      department: 'House Keeping',
      orderTime: '07:45 AM',
      escalateTime: '15secs',
      action: 'Add Assignee',
      isAssigned: true,
    },
    {
      name: 'Michael Brown',
      roomNo: '303',
      service: 'Nail Polish',
      department: 'House Keeping',
      orderTime: '09:20 AM',
      escalateTime: '15secs',
      action: 'Add Assignee',
      isAssigned: true,
    },
    {
      name: 'Sarah Johnson',
      roomNo: '104',
      service: 'Talcum Powder',
      department: 'House Keeping',
      orderTime: '06:30 AM',
      escalateTime: '15secs',
      action: 'Add Assignee',
      isAssigned: true,
    },
    {
      name: 'David Lee',
      roomNo: '305',
      service: 'Mobile Charger',
      department: 'Electronic',
      orderTime: '10:10 AM',
      escalateTime: '15secs',
      action: 'Add Assignee',
      isAssigned: true,
    }
  ];
  // Selected order
  selectedOrder: any = null;
  // Service staves
  serviceStaves: any = {
    'Pet Service': [
      { name: 'Vivek', status: 'available' },
      { name: 'Vijay', status: 'assigned' },
      { name: 'Aswin', status: 'unavailable' },
      { name: 'Ramesh', status: 'available' },
      { name: 'Suresh', status: 'assigned' },
      { name: 'Dinesh', status: 'unavailable' }
    ],
    'Bath Soap': [
      { name: 'Diwakar', status: 'available' },
      { name: 'Aravind', status: 'unavailable' },
      { name: 'Ajay', status: 'assigned' },
      { name: 'Naveen', status: 'available' },
      { name: 'Lokesh', status: 'assigned' },
      { name: 'Jeeva', status: 'unavailable' }
    ],
    'Nail Polish': [
      { name: 'Priya', status: 'assigned' },
      { name: 'Meena', status: 'available' },
      { name: 'Kavya', status: 'unavailable' },
      { name: 'Divya', status: 'available' },
      { name: 'Aishwarya', status: 'assigned' },
      { name: 'Sneha', status: 'unavailable' }
    ],
    'Talcum Powder': [
      { name: 'Ravi', status: 'unavailable' },
      { name: 'Sathish', status: 'available' },
      { name: 'Manoj', status: 'assigned' },
      { name: 'Hari', status: 'available' },
      { name: 'Surya', status: 'assigned' },
      { name: 'Prakash', status: 'unavailable' }
    ],
    'Mobile Charger': [
      { name: 'Rahul', status: 'available' },
      { name: 'Kiran', status: 'assigned' },
      { name: 'Vinoth', status: 'unavailable' },
      { name: 'Arjun', status: 'available' },
      { name: 'Yogesh', status: 'assigned' },
      { name: 'Deepak', status: 'unavailable' }
    ]
  };
  // For staff modal
  isModalOpen = false;
  selectedService: string = '';  //For service 
  selectedRoom: string = ''; //For room no 
  // For storing assigned orders & staves
  assignedOrders: any[] = [];
  // For assigning staff 
  selectedStaff: any = {};
  staves: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  isSelected: any;
  isStaffSelected !: boolean;
  task: any;
  sequence: any;
  // Escalated 
  escalatedTasks: any[] = [];
  escalatedTaskLength: any;
  isEscalatedModal: boolean = false;
  assigningTask: any;

  constructor(
    private alertService: AlertsService,
    private taskManagementService: TaskManagementService,
    private staffListingService: StaffListingService,
    private loaderService: LoaderService,
    private localService: LocalStorageService,
    private router: Router) { }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  ngOnInit() {
    let customerType = this.localService.get('CustomerType');
    if (customerType == 'Staff') {
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy)
      this.sequence = hierarchyParse?.sequence;
      if (this.sequence > 2) {
        this.selectedTab = this.tabs[1];
      }
      //console.log('seqeunce of staff:', this.sequence);
    } else {
      this.selectedTab = this.tabs[0];
    }
    //console.log('customerType of staff:', customerType);
    // To initially load all task data's
    this.getAllEscalatedTask();
  }

  shouldDisplayTab(tab: string): boolean {
    if (this.localService.get('CustomerType') == 'Staff') {
      if (tab === 'High Priority') {
        return this.sequence > 2;
      }
      if (tab === 'ASAP Cart') {
        return this.sequence == 2;
      }
    } else {
      if (tab === 'High Priority') {
        return false;
      }
    }
    return true; // default: show all other tabs
  }

  refreshTabData() {
    switch (this.selectedTab) {
      case 'ASAP Cart':
        this.asapCartComponent?.refreshData();
        break;
      case 'High Priority':
        this.highPriorityComponent?.refreshData();
        break;
      case 'Processing':
        this.processingComponent?.refreshData();
        break;
      case 'Schedule':
        this.scheduledComponent?.refreshData();
        break;
      case 'Delivered':
        this.deliveredComponent?.refreshData();
        break;
      case 'Escalated':
        this.getAllEscalatedTask();  // Already in this component
        break;
    }
  }

  openModal(task: any) {
    console.log('Task:', task);
    this.assigningTask = task;
    this.selectedRoom = task.room_no;
    this.getAllStaves(this.assigningTask);
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedStaff = {};
  }

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
    this.selectedStaff = staff;
    //console.log('Selected Staff:', this.selectedStaff);
    this.isStaffSelected = true;
    //console.log('Is staff selected:', this.isStaffSelected)
  }

  // Staff status button style
  // getCompleteStaffStyle(staff: any): any {
  //   let style: any = {};
  //   // if (staff.status === 'assigned') {
  //   //   style.backgroundColor = '#FFF7D1';
  //   //   style.color = '#B99900'; 
  //   //   style.cursor = 'not-allowed';
  //   // }
  //   // else if (staff.status === 'unavailable') {
  //   //   style.backgroundColor = '#FFC6C7';
  //   //   style.color = '#E70909';
  //   //   style.cursor = 'not-allowed';
  //   // }
  //   if (staff.is_available === true) {
  //     style.backgroundColor = '#D0FFC6';
  //     style.color = '#078338';
  //     style.cursor = 'pointer';
  //   }
  //   // Adds border if selected
  //   // if ( === staff.name) {
  //   //   style.border = '2px solid #078338';
  //   //   style.fontWeight = 600;
  //   // }
  //   return style;
  // }


  getAllStaves(task: any): void {
    let object = {
      "hierarchy.department": task.service.category,
      "is_available": true,
      "hierarchy.sequence": 1,
      "higher_level_officer.id": Number(this.localService.get('UserId'))
    }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": object
      }
    };
    this.taskManagementService.getAllStaves(requestBody).subscribe(
      (resp: any) => {
        this.loaderService.emitComplete();
        if (resp?.success === 1 && resp.status_code === 200) {
          this.staves = resp.result.data;
          //console.log("Staves based on department:", this.staves);
          this.isModalOpen = true;
        } else {
          const message = resp?.message || 'Something bad happened. Please try again!';
          this.alertService.error(message, this.options);
        }
      },
      (err: any) => {
        this.loaderService.emitComplete();
        const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
        this.alertService.error(errorMsg, this.options);
        if (err?.error?.statusCode === 403) {
          this.router.navigate(['/login'], { skipLocationChange: false });
        }
      }
    );
  }

  assignDuty() {
    if (this.isStaffSelected) {
      this.updateStaffDetailsInTask(this.assigningTask);
    }
    this.closeModal();
    this.selectedStaff = {}; // reset selection
  }

  updateStaffDetailsInTask(task: any): void {
    //console.log('Selected staff id:', this.selectedStaff.id)
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
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
          // this.scheduledcomponent.refresh();
          // this.asapCartComponent.refresh();
          // Refresh both components
          try {
            if (this.scheduledcomponent && typeof this.scheduledcomponent.refresh === 'function') {
              console.log('Refreshing scheduled component');
              this.scheduledcomponent.refresh();
            }
            if (this.asapCartComponent && typeof this.asapCartComponent.refresh === 'function') {
              this.asapCartComponent.refresh();
            }
          } catch (error) {
            console.error('Error refreshing components:', error);
          }

        } else {
          this.alertService.error(resp?.message || 'Update failed', this.options);
        }
      },
      (err: any) => {
        this.alertService.error(err?.error?.message || 'Something went wrong!', this.options);
      }
    );
  }

  getAllEscalatedTask() {
    let customerType = this.localService.get('CustomerType');
    if (customerType == 'Staff') {
      let staffData: any = this.localService.get('StaffData');
      let staffDataParse = JSON.parse(staffData);
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy)
      this.sequence = hierarchyParse?.sequence;
      // //console.log('Hierarchy Sequence:', sequence);
    }
    let object;
    if (this.sequence > 2) {
      object = {
        "status": "Escalated",
        "escalted_from_id": Number(this.localService.get('UserId'))
      }
    }
    else {
      object = {
        "status": "Escalated"
      }
    }
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": object,
        "pagination": true,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 1
        },
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    }
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.escalatedTasks = response?.result?.data || [];
          //console.log('Escalated Tasks:', this.escalatedTasks);
          this.escalatedTaskLength = response?.result?.data.length;
          //console.log('Escalated Tasks Length:', this.escalatedTaskLength);
          if (this.escalatedTaskLength > 0) {
            this.isEscalatedModal = true;
          }
        } else {
          //console.error('No roles found:', response?.message);
        }
      },
      error: (err: any) => {
        //console.error('API Error:', err);
      }
    });
  }



}
