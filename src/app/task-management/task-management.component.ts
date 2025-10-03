import { HotelListService } from './../hotel-list/hotel-list.service';
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
import { StaffEscalatedComponent } from './staff-escalation/staff-escalation.component';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [AlertsComponent, CommonModule, AsapCartComponent, ProcessingComponent, DeliveredComponent, EscalatedComponent, StaffEscalatedComponent, ScheduledComponent, EscalatedFromComponent, TimelineComponent],
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
  // Newly added - Escalation
  @ViewChild('escalated') escalatedComponent: any;
  @ViewChild('staffEscalated') staffEscalatedComponent: any;

  // Tab contents
  tabs = ['ASAP', 'Priority', 'Schedule', 'Processing', 'My Escalation', 'Staff Escalation', 'Delivered'];
  selectedTab = this.tabs[0]; // Default tab
  // For all task
  tasks: any = [];
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
  // Newly added - parentId
  at_desk: any;
  taskUpdateModal: boolean = false;
  // Newly added for find
  member_id: any;
  labelRoomArray: any[] = [];
  escalatedCount: number = 0;
  staffEscalatedCount: number = 0;
  priorityEscalatedCount: number = 0;
  customerType: any;

  constructor(
    private alertService: AlertsService,
    private taskManagementService: TaskManagementService,
    private staffListingService: StaffListingService,
    private loaderService: LoaderService,
    private localService: LocalStorageService,
    private router: Router,
    private hotelListService: HotelListService) { }

  ngOnInit() {
    this.customerType = this.localService.get('CustomerType');
    if (this.customerType == 'Staff') {
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy)
      console.log('Hierarchy:', hierarchyParse);
      // this.sequence = hierarchyParse?.sequence;
      // if (this.sequence > 2) {
      //   this.selectedTab = this.tabs[1];
      // }
      //console.log('seqeunce of staff:', this.sequence);
      // Newly added - parentId
      let userData: any = this.localService.get('StaffData');
      let userDataParse = JSON.parse(userData);
      console.log('User Data:', userDataParse);
      this.at_desk = userDataParse?.at_desk;
      if (!this.at_desk) {
        this.selectedTab = this.tabs[1];
      }
      console.log('Desk value of staff:', this.at_desk);
    }
    else {
      this.selectedTab = this.tabs[0];
    }
    //console.log('customerType of staff:', customerType);
    // To initially load all task data's
    this.member_id = this.localService.get('MemberId');
    this.getCustomerData(this.member_id);
    // Assume you already have roomRange from API or constant
    // this.getAllEscalatedTask();
    const savedCount = this.localService.get('escalatedCount');
    this.escalatedCount = savedCount ? +savedCount : 0;
    const savedStaffCount = this.localService.get('staffEscalatedCount');
    this.staffEscalatedCount = savedStaffCount ? +savedStaffCount : 0;
    const savedPriorityCount = this.localService.get('priorityEscalatedCount');
    this.priorityEscalatedCount = savedPriorityCount ? +savedPriorityCount : 0;
    console.log('Escalated Count on init:', this.escalatedCount, this.staffEscalatedCount, this.priorityEscalatedCount);
    console.log('Task:', this.at_desk)
  }

  // For tab sleection
  selectTab(tab: string) {
    this.selectedTab = tab;
    console.log('Selected Tab:', this.selectedTab);
    if (tab === 'My Escalation') {
      this.escalatedCount = 0;
      console.log('Escalated Count:', this.escalatedCount);
      this.localService.set('escalatedCount', this.escalatedCount.toString());
    }
    if (tab === 'Staff Escalation') {
      this.staffEscalatedCount = 0;
      console.log('Staff escalated Count:', this.staffEscalatedCount);
      this.localService.set('staffEscalatedCount', this.staffEscalatedCount.toString());
    }
    if (tab === 'Priority') {
      this.priorityEscalatedCount = 0;
      console.log('Priority escalated Count:', this.priorityEscalatedCount);
      this.localService.set('priorityEscalatedCount', this.priorityEscalatedCount.toString());
    }
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  shouldDisplayTab(tab: string): boolean {
    if (this.localService.get('CustomerType') == 'Staff') {
      if (tab === 'ASAP') {
        // return this.sequence == 2;
        // Newly added - parentId
        return this.at_desk; // Shows ASAP tab only if at_desk is true
      }
      if (tab === 'Schedule') {
        // return this.sequence == 2;
        // Newly added - parentId
        return this.at_desk; // Shows ASAP tab only if at_desk is true
      }
      // For reassigning
      // if (tab === 'Staff Escalation' && this.at_desk == false) {
      //   return true;
      // }
      // if (tab === 'Staff Escalation' && this.at_desk == true) {
      //   return false;
      // }
      if (tab === 'Priority' && (this.at_desk == false || this.at_desk == true)) {
        return true;
      }
    }
    else {
      if (tab === 'Priority') {
        return this.localService.get('CustomerType') != 'Customer';
      }
      if (tab === 'My Escalation') {
        return this.localService.get('CustomerType') != 'Customer';
      }
    }
    return true; // default: show all other tabs
  }

  refreshTabData() {
    switch (this.selectedTab) {
      case 'ASAP':
        this.asapCartComponent?.refreshData();
        break;
      case 'Priority':
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
      // Newly added - Escalation
      case 'My Escalation':
        this.escalatedComponent?.refreshData();
        break;
      case 'Staff Escalation':
        this.staffEscalatedComponent?.refreshData();
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
    this.isStaffSelected = false;
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

  // selectStaff(staff: any) {
  //   this.selectedStaff = staff;
  //   console.log('Selected Staff:', this.selectedStaff);
  //   this.isStaffSelected = true;
  //   console.log('Is staff selected:', this.isStaffSelected)
  // }

  selectStaff(staff: any) {
    if (this.selectedStaff && this.selectedStaff.id === staff.id) {
      // If same staff clicked again → unselect
      this.selectedStaff = {};
      this.isStaffSelected = false;
      console.log('Staff unselected');
    } else {
      // Otherwise select new staff
      this.selectedStaff = staff;
      this.isStaffSelected = true;
      console.log('Selected Staff:', this.selectedStaff);
    }
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

  // getAllStaves(task: any): void {
  //   let object = {
  //     "hierarchy.department": task.service.category,
  //     "is_available": true,
  //     // "hierarchy.sequence": 1,
  //     // Newly added - parentId
  //     "at_desk": false,
  //     "higher_level_officer.id": Number(this.localService.get('UserId')),
  //     "member_id": this.member_id,
  //     // Newly added for find
  //     // "room_no": this.labelRoomArray
  //   }
  //   const requestBody = {
  //     domain_name: DOMAIN_NAME,
  //     user_id: USER_ID,
  //     "extras": {
  //       "find": object
  //     }
  //   };
  //   this.taskManagementService.getAllStaves(requestBody).subscribe(
  //     (resp: any) => {
  //       this.loaderService.emitComplete();
  //       if (resp?.success === 1 && resp.status_code === 200) {
  //         // Newly commented - parentId
  //         // this.staves = resp.result.data;
  //         //console.log("Staves based on department:", this.staves);
  //         // Newly added - parentId
  //         const allStaves = resp.result.data;
  //         // Collects all higher_level_officer ids
  //         const higherLevelIds = allStaves
  //           .map((staff: any) => staff.higher_level_officer?.id)
  //           .filter((id: any) => id !== null && id !== undefined);
  //         console.log('Higher Level Officer IDs:', higherLevelIds);
  //         // Filters staves whose id is not in higherLevelIds
  //         this.staves = allStaves.filter((staff: any) => !higherLevelIds.includes(staff.id));
  //         console.log('Filtered Staves:', this.staves);
  //         this.isModalOpen = true;
  //       } else {
  //         const message = resp?.message || 'Something bad happened. Please try again!';
  //         this.alertService.error(message, this.options);
  //       }
  //     },
  //     (err: any) => {
  //       this.loaderService.emitComplete();
  //       const errorMsg = err?.error?.message || 'Something bad happened. Please try again!';
  //       this.alertService.error(errorMsg, this.options);
  //       if (err?.error?.statusCode === 403) {
  //         this.router.navigate(['/login'], { skipLocationChange: false });
  //       }
  //     }
  //   );
  // }

  getAllStaves(task: any): void {
    let object = {
      "hierarchy.department": task.service.category,
      "is_available": true,
      "at_desk": false,
      "higher_level_officer.id": Number(this.localService.get('UserId')),
      "member_id": this.member_id,
      // "room_no": this.labelRoomArray
    };
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
          const allStaves = resp.result.data;
          // Collect all higher_level_officer ids
          const higherLevelIds = allStaves
            .map((staff: any) => staff.higher_level_officer?.id)
            .filter((id: any) => id !== null && id !== undefined);
          console.log('Higher Level Officer IDs:', higherLevelIds);
          // Filter by higherLevel + room_no.label
          this.staves = allStaves.filter((staff: any) => {
            // exclude if already a higher_level_officer
            if (higherLevelIds.includes(staff.id)) {
              return false;
            }
            // if no room_no array, skip
            if (!staff.room_no || staff.room_no.length === 0) {
              return false;
            }
            // extract staff room labels
            const staffLabels = staff.room_no.map((r: any) => r.label);
            // check if any staff label exists in labelRoomArray
            return staffLabels.some((label: string) => this.labelRoomArray.includes(label));
          });
          console.log('Filtered Staves:', this.staves);
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
    // check if task already has an assignee
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { id: this.assigningTask.id }, // fetch only this task
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success && response.result.data?.length) {
          // update with fresh task details
          this.assigningTask = response.result.data[0];
          console.log('Assigning Task:', this.assigningTask);
          // checks if already assigned - newly adding status key check for reassigning
          if (
            this.assigningTask.assigned_staff_id &&
            this.assigningTask.assigned_staff_name &&
            this.assigningTask.assigned_staff_employee_number && this.assigningTask.status !== 'Escalated'
          ) {
            // this.taskUpdatedModal();
            this.closeModal();
            this.taskUpdateModal = true;
            if (this.asapCartComponent && typeof this.asapCartComponent.refresh === 'function') {
              console.log('Refreshing asap component(update)');
              this.asapCartComponent.refresh();
            }
            return;
          }
          // assign if staff selected - if not assigned
          if (this.isStaffSelected) {
            this.updateStaffDetailsInTask(this.assigningTask);
          }
          this.closeModal();
          this.selectedStaff = {}; // reset
        }
      },
      error: (err) => {
        console.error('Error fetching task details:', err);
      }
    });
  }

  closeTaskUpdatedModal() {
    this.taskUpdateModal = false;
  }

  updateStaffDetailsInTask(task: any): void {
    //console.log('Selected staff id:', this.selectedStaff.id)
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          "status": "Assigned",
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
              console.log('Refreshing asap component');
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
      //console.log('Hierarchy Sequence:', sequence);
      // Newly added - parentId
      this.at_desk = staffDataParse?.at_desk;
    }
    let object;
    // Newly added - parentId
    // if (this.sequence > 2) {
    if (!this.at_desk) {
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

  updateEscalatedCount(count: number): void {
    this.escalatedCount = count;
  }

  // Newly added
  // Gets customer data based on member id
  getCustomerData(memberId: any) {
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
        }
      }
    });
  }

  mapStaffRooms(roomRange: any[]) {
    let staffData: any = this.localService.get('StaffData');
    let staffDataParse = JSON.parse(staffData);
    let staffRoomNo = staffDataParse.room_no; // [{ label: "Floor 1" }, { label: "Floor 3" }]
    console.log('Staff Room No:', staffRoomNo);
    // Just collect labels (no startRoom-endRoom mapping)
    let finalRoomArray: string[] = staffRoomNo.map((staff: any) => staff.label);
    console.log('Final Room Array (Labels only):', finalRoomArray); // ["Floor 1", "Floor 3"]
    this.labelRoomArray = finalRoomArray;
  }


}


