import { LocalStorageService } from './../../auth-services/local-storage.service';
import { HotelListService } from './../../hotel-list/hotel-list.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TaskManagementService } from '../task-management.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LoaderService } from '../../shared/loader/loader.service';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})

export class TimelineComponent {
  timelineData: any;
  member_id: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private taskManagementService: TaskManagementService,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private hotelListService: HotelListService,
    private localService: LocalStorageService) { }

  ngOnInit(): void {
    this.member_id = this.localService.get('MemberId');
    const taskId = Number(this.route.snapshot.paramMap.get('id'));
    //console.log('Received Task ID:', taskId);
    this.getTaskById(taskId);
  }

  getRoomType(memberId: string): string {
    if (!memberId) return '';
    const firstChar = memberId.charAt(0).toUpperCase();
    switch (firstChar) {
      case 'S': return 'Silver';
      case 'B': return 'Bronze';
      case 'P': return 'Platinum';
      case 'G': return 'Gold';
      default: return '';
    }
  }

  // Timeline - Order details array
  // orderDetails = {
  //   productName: 'Baby Powder',
  //   quantity: 2,
  //   roomNo: 400,
  //   customerName: 'Aswin',
  //   roomType: 'Gold',
  //   department: 'Housekeeping',
  //   orderPlacedTime: '11:54am',
  //   expectedDeliveryTime: '12:15pm',
  //   deliveredTime: '12:20pm',
  //   productImage: '../../assets/images/guestezee/Powder.png'
  // };

  // Timeline data
  // timelineDatas = [
  //   {
  //     title: 'Order Received (Room No:400)',
  //     details: 'Desk in person - Sam 11:54am',
  //     status: 'scheduled',
  //     escalated: false
  //   },
  //   {
  //     title: 'Task Processed',
  //     details: 'Desk arranged new assignee - Siva 11:55am',
  //     status: 'processing',
  //     escalated: false
  //   },
  //   {
  //     title: 'Escalated',
  //     details: "Service person didn't accept order - Siva 11:58am",
  //     status: 'processing',
  //     escalated: true
  //   },
  //   {
  //     title: 'Re-Assigned',
  //     details: 'Supervisor arranged new assignee - Vijay 11:59am',
  //     status: 'reassigned',
  //     escalated: false
  //   },
  // ];

  // Timeline review data
  // reviews = [
  //   {
  //     name: 'Aswin ',
  //     profileImage: '../../assets/images/guestezee/profile.png', // replace with actual path
  //     timeAgo: '30 min ago',
  //     rating: 4,
  //     comment: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.`,
  //     liked: true
  //   }
  // ];

  // getTaskById(taskId: any) {
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": {
  //         "id": taskId
  //       },
  //       "pagination": true,
  //       "paginationDetails": {
  //         "limit": 0,
  //         "pageSize": 1
  //       },
  //       "sorting": true,
  //       "sortingDetails": {
  //         "id": -1
  //       }
  //     }
  //   }
  //   this.taskManagementService.getAllTask(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         this.timelineData = response.result.data[0];
  //       } else {
  //         console.error('No tasks found:', response?.message);
  //       }
  //     },
  //     error: (err) => {
  //       //console.error('API Error:', err);
  //     }
  //   });
  // }

  getTaskById(taskId: any) {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { id: taskId },
        pagination: true,
        paginationDetails: { limit: 0, pageSize: 1 },
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success && response.result.data.length > 0) {
          const task = response.result.data[0];
          // Now fetch rating for this task
          const ratingRequestBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            extras: {
              find: {
                task_id: task.id,
                member_id: this.member_id
              },
              pagination: false,
              sorting: true,
              sortingDetails: { id: -1 }
            }
          };
          this.taskManagementService.getAllRatings(ratingRequestBody).subscribe({
            next: (ratingResponse) => {
              if (ratingResponse?.success && ratingResponse.result.data.length > 0) {
                const ratingData = ratingResponse.result.data[0];
                task.rating = ratingData.rating;
                task.feedback_text = ratingData.feedback_text;
                task.created_on = ratingData.created_on;
              } else {
                task.rating = 0;
                task.feedback_text = '';
                task.created_on = null;
              }
              this.timelineData = task; // attach everything to timelineData
            },
            error: (err) => {
              console.error('Rating API Error:', err);
              task.rating = 0;
              task.feedback_text = '';
              task.created_on = null;
              this.timelineData = task;
            }
          });
        } else {
          this.timelineData = null;
        }
      },
      error: (err) => {
        console.error('Task API Error:', err);
        this.timelineData = null;
      }
    });
  }

  getExpectedTime(orderTime: string, minutesToAdd: number): string {
    if (!orderTime || isNaN(minutesToAdd)) return '';
    const [hours, minutes, seconds] = orderTime.split(':').map(Number);
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
    const resultDate = new Date(baseDate.getTime() + minutesToAdd * 60000);
    const hh = String(resultDate.getHours()).padStart(2, '0');
    const mm = String(resultDate.getMinutes()).padStart(2, '0');
    const ss = String(resultDate.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }


  getStatusIcon(item: any): string {
    if (item == 'Escalated') {
      return this.statusIcons['Escalated'];
    }
    else {
      return this.statusIcons['Assigned'];
    }
  }

  statusIcons: { [key: string]: string } = {
    'Assigned': '../../assets/images/guestezee/assigned.png',
    'Scheduled': '../../assets/images/guestezee/assigned.png',
    'Processing': '../../assets/images/guestezee/assigned.png',
    'Delivered': '../../assets/images/guestezee/assigned.png',
    'Reassigned': '../../assets/images/guestezee/reassigned.png',
    'Escalated': '../../assets/images/guestezee/escalated.png',
  };

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  navigateToCart() {
    this.router.navigate(['/task-management']);
  }
}
