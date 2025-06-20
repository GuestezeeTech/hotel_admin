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

  constructor(
    private localService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private alertsService: AlertsService,
    private router: Router) { }

  ngOnInit(): void {
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

  getAllDeliveredTask() {
    let customerType = this.localService.get('CustomerType');
    let object;
    if (customerType == 'Customer') {
      object = { "status": "Delivered" };
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
          "status": "Delivered",
          "sequence": sequence
        };
      }
      else if (sequence == 2) {
        object = {
          "status": "Delivered",
          "service.category": department,
          "room_no": staffRoomNo
        };
      }
      else {

        // what staff? -- higher level staffs but having department
        if (staffRoomNo.length > 0) {
          object = {
            "status": "Delivered",
            "service.category": department,
            "sequence": sequence,
            "room_no": staffRoomNo,
            "staff_id": Number(this.localService.get('UserId'))
          };
        } else {
          object = {
            "status": "Delivered",
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
          this.deliveredTasks = response.result.data;
          //console.log('Delivered Tasks:', this.deliveredTasks)
          this.allDeliveredTasks = response.result.data; //For pagination
          this.totalDeliveredTasks = this.deliveredTasks.length;
          //console.log('Total  Tasks:', this.totalDeliveredTasks);
          this.totalPages = Math.ceil(this.totalDeliveredTasks / this.pageSize);
          //console.log('Total Pages:', this.totalPages);
          this.updatePaginatedDeliveredTasks(); // Sets first page
        } else {
          //console.error('No tasks found:', response?.message);
        }
      },
      error: (err) => {
        //console.error('API Error:', err);
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
