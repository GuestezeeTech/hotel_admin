import { Router } from '@angular/router';
import { AlertsService } from './../../shared/alerts/alerts.service';
import { LocalStorageService } from './../../auth-services/local-storage.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { TaskManagementService } from '../task-management.service';

@Component({
  selector: 'app-escalated-from',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './escalated-from.component.html',
  styleUrl: './escalated-from.component.scss'
})
export class EscalatedFromComponent {
  escalatedTasks: any[] = [];
  escalationTime: any;
  escalationHierarchy: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false

  };


  constructor(
    private taskManagementService: TaskManagementService,
    private localService: LocalStorageService,
    private alertsService: AlertsService,
    private router: Router
  ) { }

  ngOnInit() {
    this.escalationHierarchy = this.localService.get('hierarchy');
    if (this.escalationHierarchy !== null) {
      this.escalationHierarchy = JSON.parse(this.escalationHierarchy);
      //console.log('Escalation Hierarchy:', this.escalationHierarchy);
      this.escalationTime = this.escalationHierarchy.escalationTime;
      //console.log('Escalation Time:', this.escalationTime);
    } else {
      //console.warn('Hierarchy data not found in localStorage');
    }
    this.getAllTask();
  }

  // For modal in task component
  @Output() openAssigneeModal = new EventEmitter<any>();

  onAddAssignee(order: any) {
    this.openAssigneeModal.emit(order);
  }

  getAllTask() {
    let customerType = this.localService.get('CustomerType');
    let object;
    if (customerType == 'Staff') {
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
          "status": "Escalated",
          "sequence": sequence,
          "staff_id": Number(this.localService.get('UserId'))
        };
      }
      // what staff? -- higher level staffs but having department
      else if (staffRoomNo.length > 0) {
        object = {
          "status": "Escalated",
          "service.category": department,
          "sequence": sequence,
          "room_no": staffRoomNo,
          "staff_id": Number(this.localService.get('UserId'))
        };
      } else {
        object = {
          "status": "Escalated",
          "service.category": department,
          "sequence": sequence,
          "staff_id": Number(this.localService.get('UserId'))
        }
      }
    }
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "status": "Escalated",
           "staff_id":Number(this.localService.get('UserId'))
        },
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
          this.escalatedTasks = response.result.data.map((task: any) => ({
            ...task,
            remainingSeconds: undefined
          }));

          this.escalatedTasks.forEach(task => this.initializeTimer(task));
          //console.log('Escalated Tasks:', this.escalatedTasks);
        } else {
          //console.error('No roles found:', response?.message);
        }
      },
      error: (err: any) => {
        //console.error('API Error:', err);
      }
    });
  }

  initializeTimer(task: any): void {
    //console.log('Initializing timer for task:', task);
    const orderDateTime = new Date(`${task.order_date}T${task.escalated_time}`);
    const escalationDurationInSeconds = this.escalationHierarchy?.escalationTime * 60;

    let interval: any; //  Declare interval before using it

    const updateTime = () => {
      const now = new Date();
      const secondsSinceOrderTime = Math.floor((now.getTime() - orderDateTime.getTime()) / 1000);
      const remainingSeconds = escalationDurationInSeconds - secondsSinceOrderTime;

      if (remainingSeconds >= 0) {
        task.remainingSeconds = this.formatTime(remainingSeconds);
      } else {
        task.remainingSeconds = '00:00';
        this.updateEscalatedTaskStatusFromNonDesk(task);
        clearInterval(interval);
      }
    };

    // updateTime(); // Initial call
    interval = setInterval(updateTime, 1000);
  }

  formatInitialTime(minutes: number): string {
    const mins = Math.floor(minutes);
    const secs = 0;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatTime(seconds: number | undefined): string {
    if (seconds == undefined) return '--:--'; // show placeholder if not initialized
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateEscalatedTaskStatusFromNonDesk(task: any): void {
    const { remainingSeconds, ...taskWithoutRemaining } = task;
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: {
        update_task: {
          status: "Escalated",
          at_desk: task.at_desk,
          "sequence": task.sequence,
          "logged_in_user_id": Number(this.localService.get('UserId'))
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
          this.alertsService.success('Task status updated to Escalated.', this.options);
        } else {
          this.alertsService.error(resp?.message || 'Update failed', this.options);
        }
      },
      (err: any) => {
        this.alertsService.error(err?.error?.message || 'Something went wrong!', this.options);
      }
    );
  }

  navigateToTimeline(taskId: any) {
    this.router.navigate(['/timeline', taskId]);
  }

}
