import { LocalStorageService } from './../../auth-services/local-storage.service';
import { HotelListService } from './../../hotel-list/hotel-list.service';
import { ServiceDetailService } from '../../hotel-enrollment-tabview/service-details/service-details.service';
import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TaskManagementService } from '../task-management.service';
import { AlertsService } from '../../shared/alerts/alerts.service';
import { LoaderService } from '../../shared/loader/loader.service';
import { HotelEnrollmentTabviewService } from '../../hotel-enrollment-tabview/hotel-enrollment-tabview.service';

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
  timely_delivered: boolean = true;
  hotelLogoUrl: string | null = null;
  expectedDelivery: string = '-';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private taskManagementService: TaskManagementService,
    private alertService: AlertsService,
    private loaderService: LoaderService,
    private hotelListService: HotelListService,
    private localService: LocalStorageService,
    private hotelenrollmentservice: HotelEnrollmentTabviewService,
    private serviceDetailService: ServiceDetailService) { }

  ngOnInit(): void {
    this.member_id = this.localService.get('MemberId');
    const taskId = Number(this.route.snapshot.paramMap.get('id'));
    //console.log('Received Task ID:', taskId);
    this.getTaskById(taskId);
    this.getCustomerLogo();
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
        pagination: false,
        // paginationDetails: { limit: 0, pageSize: 1 },
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success && response.result.data.length > 0) {
          const task = response.result.data[0];
          this.timelineData = task;
          this.timely_delivered = task.hasOwnProperty('timely_delivered') ? task.timely_delivered : true;
          // Compute expected delivery as soon as we have the task (no need to wait for rating)
          this.getDeliveryTime();
          // Fetch rating for this task (only updates rating fields when done)
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
                this.timelineData.rating = ratingData.rating;
                this.timelineData.feedback_text = ratingData.feedback_text;
                this.timelineData.created_on = ratingData.created_on;
              } else {
                this.timelineData.rating = 0;
                this.timelineData.feedback_text = '';
                this.timelineData.created_on = null;
              }
            },
            error: (err) => {
              console.error('Rating API Error:', err);
              this.timelineData.rating = 0;
              this.timelineData.feedback_text = '';
              this.timelineData.created_on = null;
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

  /*  getDeliveryTime(): void {
     this.expectedDelivery = '-';
     if (!this.timelineData || !this.timelineData.order_time || !this.timelineData.service?.service_name || !this.member_id) {
       return;
     }
     const requestBody = {
       domain_name: DOMAIN_NAME,
       user_id: USER_ID,
       extras: {
         find: {
           member_id: this.member_id
         }
       }
     };
     this.serviceDetailService.getAllServices(requestBody).subscribe(
       (resp: any) => {
         if (resp?.success === 1 && resp?.status_code === 200) {
           const allServices = resp.result.data || [];
           const matchedService = allServices.find(
             (service: any) =>
               service.name?.toLowerCase() === this.timelineData.service.service_name?.toLowerCase()
           );
           const timeBoundValue = matchedService?.time_bound_value;
           if (
             timeBoundValue !== undefined &&
             timeBoundValue !== null &&
             !isNaN(Number(timeBoundValue)) &&
             Number(timeBoundValue) > 0
           ) {
             const expected = this.getExpectedTime(this.timelineData.order_time, Number(timeBoundValue));
             this.expectedDelivery = expected || '-';
           } else {
             this.expectedDelivery = '-';
           }
         } else {
           this.expectedDelivery = '-';
         }
       },
       () => {
         this.expectedDelivery = '-';
       }
     );
   } */

  getDeliveryTime(): void {
    this.expectedDelivery = '-';
    if (!this.timelineData || !this.timelineData.order_time || !this.timelineData.service?.service_name) {
      return;
    }
    const excludedBelongsTo = ['Menu Ordering', 'Late checkout', 'Checkout', 'Help Service'];
    const belongsTo = this.timelineData.service?.belongs_to;
    let findObj: any = {};
    // Send member_id only for other services
    if (!excludedBelongsTo.includes(belongsTo) && this.member_id) {
      findObj.member_id = this.member_id;
    }
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: findObj
      }
    };
    this.serviceDetailService.getAllServices(requestBody).subscribe(
      (resp: any) => {
        if (resp?.success === 1 && resp?.status_code === 200) {
          const allServices = resp.result.data || [];
          const matchedService = allServices.find(
            (service: any) =>
              service.name?.toLowerCase() ===
              this.timelineData.service.service_name?.toLowerCase()
          );
          const timeBoundValue = matchedService?.time_bound_value;
          if (
            timeBoundValue !== undefined &&
            timeBoundValue !== null &&
            !isNaN(Number(timeBoundValue)) &&
            Number(timeBoundValue) > 0
          ) {
            const expected = this.getExpectedTime(
              this.timelineData.order_time,
              Number(timeBoundValue)
            );
            this.expectedDelivery = expected || '-';
          } else {
            this.expectedDelivery = '-';
          }
        } else {
          this.expectedDelivery = '-';
        }
      },
      () => {
        this.expectedDelivery = '-';
      }
    );
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

  getCustomerLogo() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: this.member_id
        },
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.hotelenrollmentservice.getLoginCustomerById(requestBody).subscribe({
      next: (response: any) => {
        if (response?.success && response.result?.data?.length > 0) {
          const customerData = response.result.data[0];
          // console.log('Customer Data:', customerData);
          this.hotelLogoUrl = customerData.property_details.hotel_logo || null;
          // console.log('Customer logo fetched:', this.hotelLogoUrl);
        } else {
          console.warn('No customer logo found.');
          this.hotelLogoUrl = null;
        }
      },
      error: (err) => {
        console.error('Error fetching customer logo:', err);
        this.hotelLogoUrl = null;
      }
    });
  }

}
