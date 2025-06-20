import { Router } from '@angular/router';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TaskManagementService } from '../task-management.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-processing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing.component.html',
  styleUrl: './processing.component.scss'
})
export class ProcessingComponent {
  // Processed orders data
  processedOrders = [
    {
      name: 'Ava Green',
      roomNo: '101',
      service: 'Room Cleaning',
      orderTime: '10:00 AM',
      deliveredTime: '10:30 AM',
      assignedStaff: 'Elena'
    },
    {
      name: 'Liam Smith',
      roomNo: '202',
      service: 'Laundry',
      orderTime: '10:15 AM',
      deliveredTime: '10:45 AM',
      assignedStaff: 'Nathan'
    },
    {
      name: 'Isabella Brown',
      roomNo: '303',
      service: 'Food Delivery',
      orderTime: '10:40 AM',
      deliveredTime: '11:00 AM',
      assignedStaff: 'Sophia'
    },
    {
      name: 'Noah Wilson',
      roomNo: '404',
      service: 'Mini Bar Restock',
      orderTime: '11:00 AM',
      deliveredTime: '11:25 AM',
      assignedStaff: 'Lucas'
    },
    {
      name: 'Mia Taylor',
      roomNo: '505',
      service: 'Towel Replacement',
      orderTime: '11:20 AM',
      deliveredTime: '11:50 AM',
      assignedStaff: 'Grace'
    },
    {
      name: 'Oliver Johnson',
      roomNo: '606',
      service: 'Laundry',
      orderTime: '11:45 AM',
      deliveredTime: '12:10 PM',
      assignedStaff: 'Ethan'
    },
    {
      name: 'Emma Davis',
      roomNo: '707',
      service: 'Food Delivery',
      orderTime: '12:00 PM',
      deliveredTime: '12:30 PM',
      assignedStaff: 'Chloe'
    },
    {
      name: 'Jackson Lee',
      roomNo: '808',
      service: 'Room Cleaning',
      orderTime: '12:20 PM',
      deliveredTime: '12:50 PM',
      assignedStaff: 'Aiden'
    },
    {
      name: 'Amelia White',
      roomNo: '909',
      service: 'Laundry',
      orderTime: '12:40 PM',
      deliveredTime: '01:00 PM',
      assignedStaff: 'Zoe'
    },
    {
      name: 'Lucas Martin',
      roomNo: '1001',
      service: 'Food Delivery',
      orderTime: '01:00 PM',
      deliveredTime: '01:20 PM',
      assignedStaff: 'Lily'
    }
  ];
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


  constructor(
    private taskManagementService: TaskManagementService,
    private localService: LocalStorageService,
    private alertsService: AlertsService,
    private router: Router,
    private loaderService: LoaderService) { }

  ngOnInit() {
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

  getAllProcessedTask() {
    let customerType = this.localService.get('CustomerType');
    let object;
    if (customerType == 'Customer') {
      object = { "status": "Processing" };
    }
    else {
      let staffData: any = this.localService.get('StaffData');
      // //console.log('Staff Data:', staffData);
      let staffDataParse = JSON.parse(staffData);
      let staffRoomNo = staffDataParse.room_no;
      // //console.log('Staff Room No:', staffRoomNo)
      let hierarchy: any = this.localService.get('hierarchy');
      let hierarchyParse = JSON.parse(hierarchy)
      let sequence = hierarchyParse?.sequence;
      // //console.log('Hierarchy Sequence:', sequence);
      let department = hierarchyParse?.department;
      // //console.log('Hierarchy Department:', department);
      if (hierarchy.department == '') {
        object = {
          "status": "Processing",
          "sequence": sequence
        };
      }
      else if (sequence == 2) {
        object = {
          "status": "Processing",
          "service.category": department,
          "room_no": staffRoomNo
        };
      }
      else {
        // what staff? -- higher level staffs but having department
        if (staffRoomNo.length > 0) {
          object = {
            "status": "Processing",
            "service.category": department,
            "sequence": sequence,
            "room_no": staffRoomNo,
            "staff_id": Number(this.localService.get('UserId'))
          };
        } else {
          object = {
            "status": "Processing",
            "service.category": department,
            "sequence": sequence,
            "staff_id": Number(this.localService.get('UserId'))
          }
        }

      }
    }
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
    }
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.processedTasks = response.result.data;
          //console.log('Processed Tasks:', this.processedTasks);
          this.allProcessedTasks = response.result.data; //For pagination
          this.totalTasks = this.allProcessedTasks.length;
          //console.log('Total Processed Tasks:', this.totalTasks);
          this.totalPages = Math.ceil(this.totalTasks / this.pageSize);
          //console.log('Total Pages:', this.totalPages);
          this.updatePaginatedProcessedTasks(); // Sets first page
          // Call getAllStaves for each processed task using assigned_staff_id
          this.processedTasks.forEach((task: any) => {
            const staffId = task.assigned_staff_id;
            if (staffId) {
              this.getAllStaves(staffId, task);
            }
          });
        } else {
          //console.error('No tasks found:', response?.message);
        }
      },
      error: (err) => {
        //console.error('API Error:', err);
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
          //console.log('Order Time:', task.order_time);
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
