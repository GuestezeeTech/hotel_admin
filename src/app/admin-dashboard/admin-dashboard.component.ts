import { HotelListService } from './../hotel-list/hotel-list.service';
import { BookingsService } from './../bookings/bookings.service';
import { TaskManagementService } from './../task-management/task-management.service';
import { Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlertsComponent } from '../shared/alerts/alerts.component';
import { AlertsService } from '../shared/alerts/alerts.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import Chart from 'chart.js/auto';
import { Router } from '@angular/router';
import html2pdf from 'html2pdf.js';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { FormsModule } from '@angular/forms';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AlertsComponent, CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})

export class AdminDashboardComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private alerts: AlertsService,
    private localStorageService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private bookingService: BookingsService,
    private routerUrl: Router,
    private eRef: ElementRef,
    private hotellistService: HotelListService) { }

  summaryCards = [
    { label: 'Guest Logged', count: '087' },
    { label: 'Total Request', count: '65' },
    { label: 'Completed', count: '56' },
    { label: 'Escalated', count: '2' }
  ];
  // For filter dropdown
  selectedUsageFilter = 'Last Year';
  isUsageDropdownOpen = false;
  tasks: any[] = [];
  escalatedTask: any[] = [];
  deliveredTask: any[] = [];
  // Guest data
  guestData = [
    { resNo: '84721', guestName: 'Aanya Kapoor', roomNo: 101, noOfGuests: 2, checkIn: '10/12/24', checkOut: '15/12/24' },
    { resNo: '93845', guestName: 'Raghav Mehta', roomNo: 202, noOfGuests: 1, checkIn: '18/12/24', checkOut: '20/12/24' },
    { resNo: '10234', guestName: 'Sanjana Iyer', roomNo: 305, noOfGuests: 3, checkIn: '22/12/24', checkOut: '28/12/24' },
    { resNo: '64829', guestName: 'Vihaan Singh', roomNo: 410, noOfGuests: 4, checkIn: '24/12/24', checkOut: '01/01/25' },
    { resNo: '75913', guestName: 'Meera Nandakumar', roomNo: 115, noOfGuests: 2, checkIn: '19/12/24', checkOut: '23/12/24' },
    { resNo: '82394', guestName: 'Arjun Das', roomNo: 509, noOfGuests: 3, checkIn: '30/12/24', checkOut: '04/01/25' },
    { resNo: '54927', guestName: 'Kavya Sinha', roomNo: 206, noOfGuests: 2, checkIn: '25/12/24', checkOut: '31/12/24' },
    { resNo: '72831', guestName: 'Dhruv Khanna', roomNo: 307, noOfGuests: 1, checkIn: '27/12/24', checkOut: '02/01/25' },
    { resNo: '63928', guestName: 'Tara Reddy', roomNo: 412, noOfGuests: 2, checkIn: '21/12/24', checkOut: '26/12/24' },
    { resNo: '49573', guestName: 'Neeraj Verma', roomNo: 108, noOfGuests: 4, checkIn: '29/12/24', checkOut: '06/01/25' }
  ];
  // Service data
  serviceData = [
    { roomNo: 500, name: 'Nayan Brar', serviceType: 'Room Spray', serviceDept: 'Electrical', assignee: 'Varghese' },
    { roomNo: 123, name: 'Sabari', serviceType: 'Room Towel', serviceDept: 'Plumbing', assignee: 'Tom' },
    { roomNo: 600, name: 'Vineeth Raj', serviceType: 'Hand Towels', serviceDept: 'Delivery', assignee: 'Jadeja' },
    { roomNo: 124, name: 'Priyanka', serviceType: 'Body Spray', serviceDept: 'House Keeping', assignee: 'Varun' },
    { roomNo: 984, name: 'Vijayan', serviceType: 'Soap', serviceDept: 'House Keeping', assignee: 'Sivaji' },
    { roomNo: 333, name: 'Vignesh', serviceType: 'Bath Towel', serviceDept: 'House Keeping', assignee: 'Michael' },
    { roomNo: 401, name: 'Sneha', serviceType: 'Toothpaste', serviceDept: 'Delivery', assignee: 'Anita' },
    { roomNo: 215, name: 'Arun', serviceType: 'Shampoo', serviceDept: 'House Keeping', assignee: 'George' },
    { roomNo: 702, name: 'Ritika', serviceType: 'Face Tissue', serviceDept: 'House Keeping', assignee: 'Rahul' },
    { roomNo: 319, name: 'Karthik', serviceType: 'Body Lotion', serviceDept: 'Electrical', assignee: 'Mohan' }
  ];
  // Selected service 
  selectedButton: string = 'asap';  // Tracks the selected button
  allBookings: any[] = [];
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };
  activities: any;
  // report
  report: any;
  roomNo: string = '';
  startDate: string = '';
  endDate: string = '';
  dateError: boolean = false;
  // year (graph)
  years: number[] = [];
  selectedYear: any = '2025';
  guestUsageChart: Chart | undefined;
  // reviews
  selectedReviewYear: any = '2025';
  isReviewDropdownOpen: boolean = false;
  review: any;
  memberId: any;

  async ngOnInit(): Promise<void> {
    // this.memberId = this.localStorageService.get('MemberId');
    // console.log('Member ID:', this.localStorageService.get('UserId'));
    const hotelId = Number(this.localStorageService.get('UserId'));
    try {
      const customer = await this.getCustomerById(hotelId);
      console.log('Customer Data:', customer);
      this.memberId = customer.customer_member_id;
      console.log('Member ID:', this.memberId);
      // this.getAllAsapTask();
      this.guestActivity(this.selectedYear, this.selectedReviewYear);
      this.getAllBookings();
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
    // this.getCustomerById(hotelId)
    // Load chart for default year
    // this.guestActivity(this.selectedYear, this.selectedReviewYear);
    // this.createGuestUsageChart();
    this.selectButton('asap');
    // this.getAllBookings();
    const currentYear = 2025;
    for (let year = currentYear; year <= 2075; year++) {
      this.years.push(year);
    }
    console.log('All years:', this.years);
  }

  getCustomerById(hotelId: any): Promise<any> {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: hotelId } }
    };
    return new Promise((resolve, reject) => {
      this.hotellistService.getSignupAllCustomers(requestBody).subscribe({
        next: (resp: any) => {
          if (resp.success === 1 && resp.status_code === 200 && resp.result.data.length > 0) {
            const userData = resp.result.data[0];
            this.memberId = userData.customer_member_id;
            console.log('Member id:', this.memberId);
            resolve(userData);
          } else {
            reject('Customer not found');
          }
        },
        error: reject
      });
    });
  }

  toggleUsageDropdown() {
    console.log('Toggle Usage Dropdown');
    this.isUsageDropdownOpen = !this.isUsageDropdownOpen;
  }

  setUsageFilter(filter: string) {
    this.selectedUsageFilter = filter;
    this.isUsageDropdownOpen = false;
  }

  setYear(year: number) {
    this.selectedYear = year;
    console.log('Selected Year:', this.selectedYear);
    this.isUsageDropdownOpen = false; // close dropdown
    // Reload chart for selected year
    this.guestActivity(this.selectedYear, this.selectedReviewYear);
  }

  toggleReviewDropdown() {
    this.isReviewDropdownOpen = !this.isReviewDropdownOpen;
  }

  setReviewYear(year: number) {
    this.selectedReviewYear = year;
    this.isReviewDropdownOpen = false;
    this.guestActivity(this.selectedYear, this.selectedReviewYear);
  }

  // guestActivity(usageYear: string, reviewYear: string) {
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": {
  //         "member_id": this.memberId
  //       },
  //       "pagination": true,
  //       "paginationDetails": {
  //         "limit": 0,
  //         "pageSize": 10
  //       },
  //       "sorting": true,
  //       "sortingDetails": {
  //         "email": -1
  //       }
  //     }
  //   }
  //   console.log(requestBody);
  //   this.bookingService.getAllDashboard(requestBody).subscribe(
  //     resp => {
  //       if (resp) {
  //         this.activities = resp.result.data;
  //         console.log(this.activities, "All activity");
  //         // const guestUsageData = Object.values(resp.result.data.guest_activity) as number[];
  //         // pass to chart
  //         // this.createGuestUsageChart(guestUsageData);
  //         // Get guest_activity for selected year
  //         const guestYearData = resp.result.data.guest_activity[usageYear];
  //         if (guestYearData && guestYearData.length > 0) {
  //           const guestUsageData = Object.values(guestYearData[0]) as number[];
  //           this.createGuestUsageChart(guestUsageData);
  //         } else {
  //           // If no data, pass zeros
  //           this.createGuestUsageChart(new Array(12).fill(0));
  //         }
  //         const reviewYearData = resp.result.data.reviews[reviewYear];
  //         console.log('Review Year Data:', reviewYearData);
  //         if (reviewYearData && reviewYearData.length > 0) {
  //           this.review = reviewYearData[0];
  //           console.log('Review:',this.review);
  //         } else {
  //           // If no data, pass zeros
  //           this.review = {
  //             "reviews_count": 0,
  //             "avg_rating": 0
  //           }
  //         }
  //         this.getStarArray(this.review.avg_ratings);
  //       }
  //     },
  //     err => {
  //       if (err.error.statusCode === 403) {
  //         this.alerts.error('Session Time Out! Please login Again', this.options)
  //         this.routerUrl.navigate([`/login`], { skipLocationChange: false });
  //       }
  //       else if (err.error.message) {
  //         this.alerts.error(err.error.message, this.options)
  //       }
  //       else {
  //         this.alerts.error('Something bad happened. Please try again!', this.options);
  //       }
  //     }
  //   )
  // }

  guestActivity(usageYear: string, reviewYear: string) {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { member_id: this.memberId },
        pagination: true,
        paginationDetails: {
          limit: 0,
          pageSize: 10
        },
        sorting: true,
        sortingDetails: {
          email: -1
        }
      }
    };
    console.log(requestBody);
    this.bookingService.getAllDashboard(requestBody).subscribe(
      resp => {
        const data = resp?.result?.data || {};
        // Set activities safely with defaults
        this.activities = {
          guest_status: {
            GuestLogged: data.guest_status?.GuestLogged || 0,
            TotalRequest: data.guest_status?.TotalRequest || 0,
            Completed: data.guest_status?.Completed || 0,
            Escalated: data.guest_status?.Escalated || 0
          }
        };
        console.log(this.activities, "All activity");
        // Guest Usage Chart
        const guestYearData = data.guest_activity?.[usageYear] || [];
        if (guestYearData.length > 0) {
          const guestUsageData = Object.values(guestYearData[0]).map(val => val || 0) as number[];
          this.createGuestUsageChart(guestUsageData);
        } else {
          this.createGuestUsageChart(new Array(12).fill(0));
        }
        // Reviews
        const reviewYearData = data.reviews?.[reviewYear] || [];
        if (reviewYearData.length > 0) {
          this.review = {
            reviews_count: reviewYearData[0].reviews_count || 0,
            avg_rating: reviewYearData[0].avg_rating || 0
          };
        } else {
          this.review = { reviews_count: 0, avg_rating: 0 };
        }
        this.getStarArray(this.review.avg_rating);
      },
      err => {
        if (err.error?.statusCode === 403) {
          this.alerts.error('Session Time Out! Please login Again', this.options);
          this.routerUrl.navigate([`/login`], { skipLocationChange: false });
        } else if (err.error?.message) {
          this.alerts.error(err.error.message, this.options);
        } else {
          this.alerts.error('Something bad happened. Please try again!', this.options);
        }
      }
    );
  }

  getStarArray(rating: number): ('full' | 'half' | 'empty')[] {
    const stars: ('full' | 'half' | 'empty')[] = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push('full'); // full star
      } else if (rating >= i - 0.5) {
        stars.push('half'); // half star
      } else {
        stars.push('empty'); // empty star
      }
    }
    return stars;
  }

  // createGuestUsageChart(data: number[]) {
  //   const canvas = document.getElementById('guestUsageChart') as HTMLCanvasElement;
  //   const ctx = canvas.getContext('2d');
  //   if (ctx) {
  //     new Chart(ctx, {
  //       type: 'line',
  //       data: {
  //         labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  //         datasets: [{
  //           label: 'Guest Usage',
  //           data: data, // coming from API
  //           borderColor: '#FFDA2D',
  //           backgroundColor: 'transparent',
  //           borderWidth: 4,
  //           pointRadius: 0,
  //           tension: 0.4,
  //           fill: false
  //         }]
  //       },
  //       options: {
  //         responsive: true,
  //         maintainAspectRatio: false,
  //         scales: {
  //           x: {
  //             grid: { display: false },
  //             ticks: { color: '#838383' },
  //             border: { display: false }
  //           },
  //           y: {
  //             min: 0,
  //             max: 100,
  //             ticks: {
  //               stepSize: 25,
  //               color: '#838383'
  //             },
  //             grid: {
  //               color: '#E4E5E7'
  //             },
  //             border: { display: false }
  //           }
  //         },
  //         plugins: {
  //           legend: { display: false },
  //           tooltip: {
  //             enabled: true,
  //             backgroundColor: '#000',
  //             titleColor: '#fff',
  //             bodyColor: '#fff'
  //           }
  //         }
  //       }
  //     });
  //   }
  // }

  createGuestUsageChart(data: number[]) {
    const canvas = document.getElementById('guestUsageChart') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Destroy previous chart if it exists
      if (this.guestUsageChart) {
        this.guestUsageChart.destroy();
      }
      this.guestUsageChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [{
            label: 'Guest Usage',
            data: data, // coming from API
            borderColor: '#FFDA2D',
            backgroundColor: 'transparent',
            borderWidth: 4,
            pointRadius: 0,
            tension: 0.4,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#838383' },
              border: { display: false }
            },
            y: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 20,
                color: '#838383'
              },
              grid: {
                color: '#E4E5E7'
              },
              border: { display: false }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: '#000',
              titleColor: '#fff',
              bodyColor: '#fff'
            }
          }
        }
      });
    }
  }

  selectButton(button: string): void {
    this.selectedButton = button; // Sets the selected button
    switch (this.selectedButton) {
      case 'asap':
        this.getAllAsapTask();
        break;
      case 'escalated':
        this.getAllEscalatedTask();
        break;
      case 'completed':
        this.getAllDeliveredTask();
        break;
      default:
        // Optionally handle unknown button
        console.warn(`Unknown button selected: ${this.selectedButton}`);
        break;
    }
  }

  navigateToBookings() {
    this.routerUrl.navigate(['/bookings']);
  }

  navigateToTask() {
    this.routerUrl.navigate(['/task-management']);
  }

  validateDates() {
    console.log('Room No:', this.roomNo);
    console.log('Start Date:', this.startDate);
    console.log('End Date:', this.endDate);
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      this.dateError = end <= start; // true if invalid
    }
  }

  // For navigating to reports
  generateReport() {
    this.validateDates();
    if (!this.dateError) {
      console.log(this.roomNo, this.startDate, this.endDate);
      this.localStorageService.set('RoomNo', this.roomNo);
      this.localStorageService.set('StartDate', this.startDate);
      this.localStorageService.set('EndDate', this.endDate);
      this.routerUrl.navigate(['/report'], {
        state: {
          roomNo: this.roomNo,
          startDate: this.startDate,
          endDate: this.endDate
        }
      });
    }
  }

  getAllAsapTask() {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "member_id": this.memberId,
          "status": "ASAP"
        },
        "pagination": false,
        "sorting": true,
        "sortingDetails": { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.tasks = response.result.data.slice(0, 10);
          console.log('Tasks:', this.tasks);
        }
      },
      error: (err) => {
        console.error('Task API Error:', err);
      }
    });

  }

  getAllDeliveredTask() {
    let memberId = this.localStorageService.get('MemberId');
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "member_id": this.memberId,
          "status": "Delivered"
        },
        "pagination": false,
        "sorting": true,
        "sortingDetails": { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.tasks = response.result.data.slice(0, 10);
          console.log('Delivered Tasks:', this.tasks);
        }
      },
      error: (err) => {
        console.error('Task API Error:', err);
      }
    });
  }

  getAllEscalatedTask() {
    let memberId = this.localStorageService.get('MemberId');
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "member_id": this.memberId,
          "status": "Escalated"
        },
        "pagination": false,
        "sorting": true,
        "sortingDetails": { id: -1 }
      }
    };
    this.taskManagementService.getAllTask(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          this.tasks = response.result.data.slice(0, 10);
          console.log('Escalated Tasks:', this.tasks);
        }
      },
      error: (err) => {
        console.error('Task API Error:', err);
      }
    });
  }

  getAllBookings() {
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "member_id": this.memberId
        },
        "pagination": true,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 10
        },
        "sorting": true,
        "sortingDetails": {
          "email": -1
        }
      }
    }
    this.bookingService.getAllBookings(requestBody).subscribe(
      resp => {
        if (resp) {
          this.allBookings = resp.result.data;
          console.log(this.allBookings, this.allBookings.length,
            "Bookings List")
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


  roomReport(roomNo: any) {
    console.log('Report member id:', this.memberId);
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          // "member_id": "INM00071",
          "member_id": this.memberId,
          "room_no": roomNo
        },
        "pagination": true,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 10
        },
        "sorting": true,
        "sortingDetails": {
          "email": -1
        }
      }
    }
    console.log(requestBody);
    this.bookingService.getAllReport(requestBody).subscribe(
      resp => {
        if (resp) {
          this.report = resp.result.data;
          console.log(this.report, "All report");
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

}
