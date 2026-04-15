import { TaskManagementService } from './../task-management/task-management.service';
import { HotelListService } from './../hotel-list/hotel-list.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { AlertsService } from '../shared/alerts/alerts.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { Router } from '@angular/router';
import { BookingsService } from '../bookings/bookings.service';
import { DOMAIN_NAME, USER_ID } from '../app.config';

@Component({
  selector: 'app-late-checkout',
  standalone: true,
  imports: [AlertsComponent, CommonModule],
  templateUrl: './late-checkout.component.html',
  styleUrl: './late-checkout.component.scss'
})

export class LateCheckoutComponent {
  constructor(
    private routerUrl: Router,
    private alerts: AlertsService,
    private localStorageService: LocalStorageService,
    private bookingService: BookingsService,
    private route: ActivatedRoute,
    private hotellistService: HotelListService,
    private taskManagementService: TaskManagementService) { }

  // Table data
  // guestLogs = [
  //   {
  //     name: 'Peter Parker',
  //     dateTime: '16/01/2024 12:05 hrs',
  //     reason: 'Checked in',
  //     status: 'Occupied'
  //   },
  //   {
  //     name: 'Lois Lane',
  //     dateTime: '16/01/2024 12:30 hrs',
  //     reason: 'Guest leave',
  //     status: 'Dirty'
  //   },
  //   {
  //     name: 'Housekeeping staff',
  //     dateTime: '16/01/2024 12:35 hrs',
  //     reason: 'Cleaning starts',
  //     status: 'In-service'
  //   },
  //   {
  //     name: 'Eve Adams',
  //     dateTime: '16/01/2024 18:20 hrs',
  //     reason: 'Guest enters',
  //     status: 'Occupied'
  //   },
  //   {
  //     name: 'Housekeeping staff',
  //     dateTime: '16/01/2024 13:00 hrs',
  //     reason: 'Cleaning completed',
  //     status: 'In-service'
  //   }
  // ];
  guestLogs: any = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  // Stores the guest data 
  guestId: any;
  guestData: any = {};
  hotelId: any;
  memberId: any;
  allGuestTask: any

  async ngOnInit(): Promise<void> {
    // const data = this.localStorageService.get('guestData');
    //console.log('Data:', data);
    // if (data) {
    //   this.guestData = JSON.parse(data);
    // }
    //console.log(this.guestData);
    // this.route.paramMap.subscribe(params => {
    //   const id = params.get('id');
    //   if (id) {
    //     this.guestId = Number(id); // Converts to number;
    //     // this.guestData = this.guests.find(guest => guest.id === this.guestId);
    //     this.getBookingsById(this.guestId);
    //   }
    // });

    // Newly added for getting member id for customer type
    // this.hotelId = Number(this.localStorageService.get('UserId'));
    this.memberId = this.localStorageService.get('MemberId');
    // console.log('Member ID from late checkout component:', this.memberId);
    try {
      // Waits for customer data first
      // await this.getCustomerById(this.hotelId);
      if (this.memberId !== undefined && this.memberId !== null && this.memberId !== '' && this.memberId !== 'undefined' && this.memberId !== 'null') {
        const customer = await this.getCustomerById(this.memberId);
      }
      // End of newly added for getting member id for customer type
      // Only then proceeds with route param
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.guestId = Number(id);
          this.getBookingsById(this.guestId);
        }
      });
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  }

  navigateToManagement() {
    this.routerUrl.navigate([`/bookings-management/${this.guestData.id}`]);
  }

  goBack() {
    this.routerUrl.navigate([`/bookings-management/${this.guestData.id}`]);
  }

  // getCustomerById(hotelId: any) {
  getCustomerById(memberId: any) {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { 
        // id: hotelId
        "customer_member_id": memberId
       } }
    };
    return new Promise((resolve, reject) => {
      this.hotellistService.getSignupAllCustomers(requestBody).subscribe({
        next: (resp: any) => {
          if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
            const userData = resp.result.data[0];
            // this.memberId = userData.customer_member_id;
            // console.log('Member id:', this.memberId);
            resolve(userData);
          } else {
            reject('Customer not found');
          }
        },
        error: reject
      });
    })
  }

  getBookingsById(guestId: number) {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "id": guestId,
          // "member_id": this.memberId
        },
      }
    }
    this.bookingService.getAllBookings(requestBody).subscribe(
      resp => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.guestData = resp.result.data[0];
          // console.log(this.guestData, "Guest Booking");
          this.getBookingStatus(this.guestData.Reserve_No);
          // this.getAllTask(this.guestData.Guest_detail[0].Guest_Id)
          this.getAllTask(this.guestData.id)
        }
      },
      err => {
        if (err.error.statusCode === 403) {
          this.alerts.error('Session Time Out! Please login Again', this.options)
          this.routerUrl.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alerts.error(err.error.message, this.options)
        }
        else {
          this.alerts.error('Something bad happened. Please try again!', this.options);
        }
      }
    )
  }

  getBookingStatus(reserveNo: string) {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "Reserve_No": reserveNo
        }
      }
    }
    this.bookingService.getAllBookingStatus(requestBody).subscribe(
      resp => {
        if (resp.success === 1 && resp.status_code === 200) {
          this.guestLogs = resp.result.data;
          // console.log(this.guestLogs, "Guest Logs");
        }
      },
      err => {
        if (err.error.statusCode === 403) {
          this.alerts.error('Session Time Out! Please login Again', this.options)
          this.routerUrl.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alerts.error(err.error.message, this.options)
        }
        else {
          this.alerts.error('Something bad happened. Please try again!', this.options);
        }
      }
    )
  }

  getAllTask(guestid: any) {
    let object: any = {
      // "member_id": this.memberId,
      "guest_id": guestid
    };
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
    };
    this.taskManagementService.getAllTask(requestBody).subscribe(resp => {
      if (resp.success === 1 && resp.status_code === 200) {
        this.allGuestTask = resp.result.data;
        // console.log(this.allGuestTask, "Guest Tasks");
      }
    },
      err => {
        if (err.error.statusCode === 403) {
          this.alerts.error('Session Time Out! Please login Again', this.options)
          this.routerUrl.navigate([`/login`], { skipLocationChange: false });
        }
        else if (err.error.message) {
          this.alerts.error(err.error.message, this.options)
        }
        else {
          this.alerts.error('Something bad happened. Please try again!', this.options);
        }
      });
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

}
