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
// Newly added - Staff delivered
import { StaffDeliveredComponent } from './staff-delivered/staff-delivered.component';
import { CancelledComponent } from './cancelled/cancelled.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [AlertsComponent, CommonModule, AsapCartComponent, ProcessingComponent, DeliveredComponent, EscalatedComponent, StaffEscalatedComponent, ScheduledComponent, EscalatedFromComponent, TimelineComponent, StaffDeliveredComponent, CancelledComponent, FormsModule],
  templateUrl: './task-management.component.html',
  styleUrl: './task-management.component.scss'
})

export class TaskManagementComponent implements OnInit {
  @ViewChild(AsapCartComponent) asapCartComponent!: AsapCartComponent;
  @ViewChild(ScheduledComponent) scheduledcomponent!: ScheduledComponent;
  @ViewChild(EscalatedFromComponent) highpriorityComponent!: EscalatedFromComponent;
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
  // Newly added - Staff delivered
  @ViewChild('staff_delivered') staffDeliveredComponent: any;
  @ViewChild('cancelled') cancelledComponent: any;

  // Tab contents
  // Newly added for task allocation purpose
  // tabs = ['ASAP', 'Priority', 'Schedule', 'Processing', 'My Escalation', 'Staff Escalation', 'Staff Delivered', 'Delivered', 'Cancelled'];
  tabs = ['ASAP', 'Priority', 'Processing', 'My Escalation', 'Staff Escalation', 'Staff Delivered', 'Delivered', 'Cancelled'];
  // Ended for task allocation purpose
  selectedTab = this.tabs[0]; // Default tab
  // For all task
  tasks: any = [];
  // For showing filter
  showFilterDropdown: boolean = false;
  pushKot: boolean = false;
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
  // Newly added for room filter
  roomSearchTerm: string = '';
  userDepartment: string[] = [];
  // Newly added for task allocation purpose
  selfStaffId: any;

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
      // console.log('Hierarchy:', hierarchyParse);
      // this.sequence = hierarchyParse?.sequence;
      // if (this.sequence > 2) {
      //   this.selectedTab = this.tabs[1];
      // }
      //console.log('seqeunce of staff:', this.sequence);
      // Newly added - parentId
      let userData: any = this.localService.get('StaffData');
      let userDataParse = JSON.parse(userData);
      // console.log('User Data:', userDataParse);
      this.at_desk = userDataParse?.at_desk;
      // console.log('Desk value of staff:', this.at_desk);
      // Newly added & commented for combined- started
      // this.userDepartment = userDataParse?.hierarchy?.department;
      this.userDepartment = userDataParse?.hierarchy.map((item: any) => item.department);
      // console.log('User Department(Task Management):', this.userDepartment);
      // Ended
      if (!this.at_desk) {
        // console.log('Not at desk - selecting Staff Escalation tab');
        this.selectedTab = this.tabs[1];
      }
      // console.log('Desk value of staff:', this.at_desk);
    }
    else {
      this.selectedTab = this.tabs[0];
    }
    //console.log('customerType of staff:', customerType);
    // To initially load all task data's
    this.member_id = this.localService.get('MemberId');
    // Newly added for task allocation purpose
    this.selfStaffId = Number(this.localService.get('UserId'));
    this.getCustomerData(this.member_id);
    // Assume you already have roomRange from API or constant
    // this.getAllEscalatedTask();
    const savedCount = this.localService.get('escalatedCount');
    this.escalatedCount = savedCount ? +savedCount : 0;
    const savedStaffCount = this.localService.get('staffEscalatedCount');
    this.staffEscalatedCount = savedStaffCount ? +savedStaffCount : 0;
    const savedPriorityCount = this.localService.get('priorityEscalatedCount');
    this.priorityEscalatedCount = savedPriorityCount ? +savedPriorityCount : 0;
    // console.log('Escalated Count on init:', this.escalatedCount, this.staffEscalatedCount, this.priorityEscalatedCount);
    // Listen to changes from notification click
    this.taskManagementService.selectedTab$.subscribe(tab => {
      // console.log('Notification Tab Clicked:', tab);
      if (!tab) return;
      // if (this.tabs.includes(tab)) {
      //   console.log('Navigation Tab:', tab);
      //   this.selectedTab = tab;
      //   // Newly added for tab data refresh
      //   this.refreshTabData();
      // }
      if (this.tabs.includes(tab) && this.shouldDisplayTab(tab)) {
        // console.log('Navigation Tab:', tab);
        this.selectedTab = tab;
        this.refreshTabData();
      } else {
        // console.log('Tab not allowed:', tab);
      }
    });
  }

  // For tab sleection
  selectTab(tab: string) {
    this.selectedTab = tab;
    // Clear room search whenever tab changes
    this.roomSearchTerm = '';
    // Optional: trigger any search filter reset logic if required
    this.onRoomSearchChange();
    // console.log('Selected Tab:', this.selectedTab);
    if (tab === 'My Escalation') {
      this.escalatedCount = 0;
      // console.log('Escalated Count:', this.escalatedCount);
      this.localService.set('escalatedCount', this.escalatedCount.toString());
    }
    if (tab === 'Staff Escalation') {
      this.staffEscalatedCount = 0;
      // console.log('Staff escalated Count:', this.staffEscalatedCount);
      this.localService.set('staffEscalatedCount', this.staffEscalatedCount.toString());
    }
    if (tab === 'Priority') {
      this.priorityEscalatedCount = 0;
      // console.log('Priority escalated Count:', this.priorityEscalatedCount);
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
      // case 'Priority':
      //   this.highPriorityComponent?.refreshData();
      //   break;
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
      // Newly added - Staff delivered
      case 'Staff Delivered':
        this.staffDeliveredComponent?.refreshData();
        break;
      // Newly added - Cancelled
      case 'Cancelled':
        this.cancelledComponent?.refreshData();
    }
  }

  openModal(task: any) {
    // console.log('Task:', task);
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
      // console.log('Staff unselected');
    } else {
      // Otherwise select new staff
      this.selectedStaff = staff;
      this.isStaffSelected = true;
      // console.log('Selected Staff:', this.selectedStaff);
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
  //         // console.log('Higher Level Officer IDs:', higherLevelIds);
  //         // Filters staves whose id is not in higherLevelIds
  //         this.staves = allStaves.filter((staff: any) => !higherLevelIds.includes(staff.id));
  //         // console.log('Filtered Staves:', this.staves);
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

  async getAllStaves(task: any): Promise<void> {
    // Newly added for staff getting based on room number
    const customerData = await this.getCustomerData(this.member_id);
    // Build label-to-room-values map from customer settings
    const roomRanges: any = customerData.settings?.room_range || []; // Assuming you store customer object locally
    // console.log('Room ranges of customer:', roomRanges);
    // const customer = JSON.parse(customerSettings);
    // const roomRanges = customer.settings?.room_range || [];
    const labelToRoomsMap: { [label: string]: string[] } = {};
    // console.log('Label to Rooms Map(Empty):', labelToRoomsMap);
    roomRanges.forEach((range: any) => {
      const start = parseInt(range.startRoom);
      // console.log('Start Room:', start);
      const end = parseInt(range.endRoom);
      // console.log('End Room:', end);
      const rooms: string[] = [];
      for (let i = start; i <= end; i++) {
        rooms.push(i.toString());
      }
      labelToRoomsMap[range.label] = rooms;
    });
    // console.log('Label to Rooms Map:', labelToRoomsMap);
    // Find the label corresponding to the task's room_no
    let taskRoomLabel = '';
    Object.keys(labelToRoomsMap).forEach(label => {
      if (labelToRoomsMap[label].includes(task.room_no)) {
        taskRoomLabel = label;
      }
    });
    // console.log('Task Room Label:', taskRoomLabel);
    // Ended
    let object: any = {
      // "hierarchy.department": task.service.category,
      "is_available": true,
      "at_desk": false,
      "higher_level_officer.id": Number(this.localService.get('UserId')),
      "member_id": this.member_id,
      // "room_no": this.labelRoomArray
      // Newly added for task allocation purpose
      "task_allocation_purpose": true,
    };
    // Newly added & commented - started
    // if (this.userDepartment === 'Select') {
    // if (!this.userDepartment.includes('Select')) {
    // object['hierarchy.department'] = 'Select'
    // }
    // Ended
    // else {
    object['hierarchy.department'] = task.service.category
    // }
    // console.log('Object:', object);
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
          // console.log('All Staves:', allStaves);
          // Collect all higher_level_officer ids
          const higherLevelIds = allStaves
            .map((staff: any) => staff.higher_level_officer?.id)
            .filter((id: any) => id !== null && id !== undefined);
          // console.log('Higher Level Officer IDs:', higherLevelIds);
          // Filter by higherLevel + room_no.label
          this.staves = allStaves.filter((staff: any) => {
            // exclude if already a higher_level_officer
            /* if (higherLevelIds.includes(staff.id)) {
              return false;
            } */
            // if no room_no array, skip
            if (!staff.room_no || staff.room_no.length === 0) {
              return false;
            }
            // extract staff room labels
            const staffLabels = staff.room_no.map((r: any) => r.label);
            // check if any staff label exists in labelRoomArray
            // console.log('Staff Labels:', staffLabels);
            // return staffLabels.some((label: string) => this.labelRoomArray.includes(label));
            // Include only if staff has the task's label
            return staffLabels.includes(taskRoomLabel);
          });
          // console.log('Filtered Staves:', this.staves);
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
      next: async (response) => {
        if (response?.success && response.result.data?.length) {
          // update with fresh task details
          this.assigningTask = response.result.data[0];
          // console.log('Assigning Task:', this.assigningTask);
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
              // console.log('Refreshing asap component(update)');
              this.asapCartComponent.refresh();
            }
            if (this.highPriorityComponent && typeof this.highPriorityComponent.refresh === 'function') {
              // console.log('High Priority component(update)');
              this.highPriorityComponent.refresh();
            }
            return;
          }
          // assign if staff selected - if not assigned
          if (this.isStaffSelected) {
            await this.updateStaffDetailsInTask(this.assigningTask);
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

  async updateStaffDetailsInTask(task: any): Promise<void> {
    let deskStaffId = Number(this.localService.get('UserId'));
    // console.log('task', task);
    // Newly added & commented for all department
    // if ((task.service.category == "F&B" && task.status == "ASAP" && task.service.service_name == "Menu Ordering") || (!task.time_line?.some((t: any) => t.status === "Assigned"))) {
    //   // this.pushKot =true;
    //   this.callPosApi(task.pms_order_summary);
    // }
    if ((task.status == "ASAP" && task.service.belongs_to == "Menu Ordering") && (!task.time_line?.some((t: any) => t.status === "Assigned"))) {
      // console.log('task.status == "ASAP" && task.service.belongs_to == "Menu Ordering"');
      // this.pushKot =true;
      try {
        await this.callPosApi(task.pms_order_summary);
      } catch (error: any) {
        const errorMsg = error?.message ? `${error.message} Staff assignment failed.` : 'Due to an issue pushing the order, staff cannot be assigned.';
        this.alertService.error(errorMsg, this.options);
        return;
      }
    }
    else {
      //  this.pushKot =false;
    }
    // Newly added for sending time_bound_value
    const servicePayload: any = {};
    if (task.service?.belongs_to != null) servicePayload.belongs_to = task.service.belongs_to;
    if (task.service?.category != null) servicePayload.category = task.service.category;
    if (task.service?.quantity != null) servicePayload.quantity = task.service.quantity;
    if (task.service?.service_description != null) servicePayload.service_description = task.service.service_description;
    if (task.service?.service_id != null) servicePayload.service_id = task.service.service_id;
    if (task.service?.service_name != null) servicePayload.service_name = task.service.service_name;
    if (task.service?.time_bound_value != null) servicePayload.time_bound_value = task.service.time_bound_value;
    // End of newly added for sending time_bound_value
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          ...task,
          "guest_id": task.guest_id,
          "staff_desk_id": deskStaffId,
          // Newly added for tasl allocation purpose
          // "status": "Assigned",
          "status": this.selectedStaff.id == this.selfStaffId ? "Processing" : "Assigned",
          "is_self_assigned": this.selectedStaff.id == this.selfStaffId,
          // End of newly added for task allocation purpose
          "assigned_staff_id": this.selectedStaff.id,
          "assigned_staff_name": this.selectedStaff.full_name,
          "assigned_staff_employee_number": this.selectedStaff.staff_employee_number,
          "department": task.service.category,
          // Newly added for sending time_bound_value
          // "service": servicePayload
          // End of newly added for sending time_bound_value
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
              // console.log('Refreshing scheduled component');
              this.scheduledcomponent.refresh();
            }
            if (this.asapCartComponent && typeof this.asapCartComponent.refresh === 'function') {
              // console.log('Refreshing asap component');
              this.asapCartComponent.refresh();
            }
            if (this.highPriorityComponent && typeof this.highPriorityComponent.refresh === 'function') {
              // console.log('High priority component');
              this.highPriorityComponent.refresh();
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


  // callPosApi(orderPayload: any) {
  //   // console.log('Sending Payload:', orderPayload);
  //   this.taskManagementService.pushOrder(orderPayload).subscribe({
  //     next: (response) => {
  //       if (response?.success == 1) {
  //         // console.log('Order pushed successfully:', response);
  //       }
  //       else {
  //         console.error('Error pushing order:', response);
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error pushing order:', error);
  //     }
  //   });
  // }

  callPosApi(orderPayload: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // console.log('Sending Payload:', orderPayload);
      this.taskManagementService.pushOrder(orderPayload).subscribe({
        next: (response: any) => {
          if (response?.success == 1 || response?.response?.success == 1) {
            // console.log('Order pushed successfully:', response);
            resolve(true);
          }
          else {
            console.error('Error pushing order:', response);
            reject(new Error(response?.response?.message || response?.message || 'Failed to push order.'));
          }
        },
        error: (error: any) => {
          console.error('Error pushing order:', error);
          reject(new Error(error?.error?.message || 'Error pushing order.'));
        }
      });
    });
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

  // Newly added & commented for getting staff based on room number
  // Gets customer data based on member id
  // getCustomerData(memberId: any) {
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": { "customer_member_id": memberId }
  //     }
  //   };
  //   this.hotelListService.getSignupAllCustomers(requestBody).subscribe((res: any) => {
  //     if (res && res.result.data.length > 0) {
  //       const customer = res.result.data[0];
  //       // console.log('Customer Data:', customer);
  //       if (customer && customer.settings?.room_range) {
  //         this.mapStaffRooms(customer.settings.room_range);
  //       }
  //     }
  //   });
  // }


  getCustomerData(memberId: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: { customer_member_id: memberId }
        }
      };
      this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
        next: (res: any) => {
          if (res && res.result.data.length > 0) {
            const customer = res.result.data[0];
            // console.log('Customer Data:', customer);
            if (customer && customer.settings?.room_range) {
              this.mapStaffRooms(customer.settings.room_range);
            }
            resolve(customer); // resolve with customer data
          } else {
            resolve(null); // resolve with null if no customer found
          }
        },
        error: (err) => {
          console.error('Error fetching customer data:', err);
          reject(err); // reject on error
        }
      });
    });
  }
  // Ended

  mapStaffRooms(roomRange: any[]) {
    let staffData: any = this.localService.get('StaffData');
    if (!staffData) {
      this.labelRoomArray = [];
      return;
    }

    let staffDataParse: any = null;
    try {
      staffDataParse = JSON.parse(staffData);
    } catch (error) {
      console.error('Error parsing StaffData:', error);
      this.labelRoomArray = [];
      return;
    }

    if (!staffDataParse || !staffDataParse.room_no) {
      this.labelRoomArray = [];
      return;
    }

    let staffRoomNo = staffDataParse.room_no; // [{ label: "Floor 1" }, { label: "Floor 3" }]
    // console.log('Staff Room No:', staffRoomNo);

    if (!Array.isArray(staffRoomNo)) {
      this.labelRoomArray = [];
      return;
    }

    // Just collect labels (no startRoom-endRoom mapping)
    let finalRoomArray: string[] = staffRoomNo
      .filter((staff: any) => staff && staff.label)
      .map((staff: any) => staff.label);
    // console.log('Final Room Array (Labels only):', finalRoomArray); // ["Floor 1", "Floor 3"]
    this.labelRoomArray = finalRoomArray;
  }

  onRoomSearchChange() {
    const term = this.roomSearchTerm.trim();
    // console.log('Room Search Term:', term);
    switch (this.selectedTab) {
      case 'ASAP':
        this.asapCartComponent?.filterByValue(term);
        break;
      case 'Schedule':
        this.scheduledComponent?.filterByValue(term);
        break;
      case 'Delivered':
        this.deliveredComponent?.filterByValue(term);
        break;
      case 'Processing':
        this.processingComponent?.filterByValue(term);
        break;
      case 'Staff Delivered':
        this.staffDeliveredComponent?.filterByValue(term);
        break;
      case 'My Escalation':
        this.escalatedComponent?.filterByValue(term);
        break;
      case 'Staff Escalation':
        this.staffEscalatedComponent?.filterByValue(term);
        break;
      case 'Priority':
        this.highPriorityComponent?.filterByValue(term);
        break;
      case 'Cancelled':
        this.cancelledComponent?.filterByValue(term);
        break;
    }
  }

  convertLabelRoomsToValues(labelRoomArray: any[]): string[] {
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

    labelRoomArray.forEach((room: any) => {
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
            ...expandAlphaRange(startSuffix.toUpperCase(), endSuffix.toUpperCase())
              .map(suffix => `${prefix}${suffix}`)
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
          roomList.push(
            ...expandAlphaRange(start.toUpperCase(), end.toUpperCase())
          );
        }

        // Otherwise push raw
        else {
          roomList.push(value);
        }
      }

      // Not a range → direct room
      else {
        roomList.push(value);
      }
    });

    return roomList;
  }

  // Navigation for Create Task
  navigateToCreateTask() {
    this.router.navigate(['/task-management/create-task']);
  }

}


