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
import { LoaderService } from '../shared/loader/loader.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AlertsComponent, CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})

export class AdminDashboardComponent implements OnInit {
  pendingRequests: number = 0;

  constructor(
    private route: ActivatedRoute,
    private alerts: AlertsService,
    private localStorageService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private bookingService: BookingsService,
    private routerUrl: Router,
    private eRef: ElementRef,
    private hotellistService: HotelListService,
    private loaderService: LoaderService) { }

  decrementPendingRequests() {
    this.pendingRequests--;
    if (this.pendingRequests <= 0) {
      this.loaderService.emitComplete();
    }
  }

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
  activities: any = {
    guest_status: {
      GuestLogged: 0,
      TotalRequest: 0,
      Completed: 0,
      Escalated: 0
    }
  };
  // report
  report: any;
  roomNo: string = '';
  startDate: string = '';
  endDate: string = '';
  minDate: string = '';
  maxDate: string = '';
  // year (graph)
  years: number[] = [];
  selectedYear: any = new Date().getFullYear().toString();
  guestUsageChart: Chart | undefined;
  // reviews
  selectedReviewYear: any = new Date().getFullYear().toString();
  isReviewDropdownOpen: boolean = false;
  review: any = {
    reviews_count: 0,
    avg_rating: 0
  };
  memberId: any;
  // Newly added for validation
  // dateError: boolean = false;
  roomError = false;
  startDateError = false;
  endDateError = false;
  dateError = false;
  // End of newly added for validation

  /*   async ngOnInit(): Promise<void> {
      const currentYear = new Date().getFullYear();
      this.selectedYear = currentYear.toString();
      this.selectedReviewYear = currentYear.toString();
  
      // Default min/max date and report dates
      this.minDate = `${currentYear}-01-01`;
      this.maxDate = `${currentYear}-12-31`;
  
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.startDate = `${currentYear}-01-01`;
      this.endDate = `${currentYear}-${mm}-${dd}`;
  
      this.loaderService.emitLoading();
      try {
        this.memberId = this.localStorageService.get('MemberId');
        console.log('Local Storage MemberId:', this.memberId);
        let createdYear = currentYear;
        if (this.memberId !== undefined && this.memberId !== null && this.memberId !== '' && this.memberId !== 'undefined' && this.memberId !== 'null') {
          const customer = await this.getCustomerById(this.memberId);
          console.log('Customer fetched from API:', customer);
          if (customer && customer.created_on) {
            createdYear = new Date(customer.created_on).getFullYear();
            console.log('Customer created_on:', customer.created_on, 'Evaluated createdYear:', createdYear);
          }
        }
  
        // Update year dropdown range
        this.years = [];
        const startYear = Math.min(createdYear, currentYear);
        for (let year = startYear; year <= currentYear; year++) {
          this.years.push(year);
        }
        console.log('Generated years range:', this.years);
  
        // Update Report calendar min/max
        this.minDate = `${createdYear}-01-01`;
        this.maxDate = `${currentYear}-12-31`;
        console.log('minDate:', this.minDate, 'maxDate:', this.maxDate);
  
        this.pendingRequests = 3;
        this.guestActivity(this.selectedYear, this.selectedReviewYear);
        this.getAllBookings();
        this.selectButton('asap', false);
      } catch (err) {
        console.error('Error fetching customer:', err);
        this.years = [currentYear];
        this.pendingRequests = 3;
        this.guestActivity(this.selectedYear, this.selectedReviewYear);
        this.getAllBookings();
        this.selectButton('asap', false);
      }
    }
   */

  async ngOnInit(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const today = new Date();

    // Default selected year
    this.selectedYear = currentYear.toString();
    this.selectedReviewYear = currentYear.toString();

    // Temporary defaults (will be updated after API call)
    this.minDate = `${currentYear}-01-01`;
    this.maxDate = today.toISOString().split('T')[0];

    this.startDate = `${currentYear}-01-01`;
    this.endDate = today.toISOString().split('T')[0];

    this.loaderService.emitLoading();

    try {
      this.memberId = this.localStorageService.get('MemberId');
      console.log('Local Storage MemberId:', this.memberId);

      let createdDate = new Date(currentYear, 0, 1);

      if (
        this.memberId &&
        this.memberId !== 'undefined' &&
        this.memberId !== 'null'
      ) {
        const customer = await this.getCustomerById(this.memberId);
        console.log('Customer fetched:', customer);

        if (customer?.created_on) {
          createdDate = new Date(customer.created_on);
        }
      }

      const createdYear = createdDate.getFullYear();

      // Populate year dropdown (Created Year -> Current Year)
      this.years = [];
      for (let year = createdYear; year <= currentYear; year++) {
        this.years.push(year);
      }

      console.log('Year Dropdown:', this.years);

      // Report calendar limits
      this.minDate = createdDate.toISOString().split('T')[0];
      this.maxDate = today.toISOString().split('T')[0];

      // Default report dates
      // this.startDate = `${currentYear}-01-01`;

      // If customer was created in current year after Jan 1,
      // use created_on date instead.
      // if (createdYear === currentYear && createdDate > new Date(currentYear, 0, 1)) {
      //   this.startDate = createdDate.toISOString().split('T')[0];
      // }

      // this.endDate = today.toISOString().split('T')[0];
      this.startDate = '';
      this.endDate = '';

      console.log('Min Date:', this.minDate);
      console.log('Max Date:', this.maxDate);

      this.pendingRequests = 3;
      this.guestActivity(this.selectedYear, this.selectedReviewYear);
      this.getAllBookings();
      this.selectButton('asap', false);

    } catch (err) {
      console.error('Error fetching customer:', err);

      this.years = [currentYear];

      this.pendingRequests = 3;
      this.guestActivity(this.selectedYear, this.selectedReviewYear);
      this.getAllBookings();
      this.selectButton('asap', false);
    }
  }

  // getCustomerById(hotelId: any): Promise<any> {
  getCustomerById(memberId: any): Promise<any> {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          // id: hotelId
          "customer_member_id": memberId
        }
      }
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
    });
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    const usageContainer = this.eRef.nativeElement.querySelector('.usage-dropdown-container');
    const reviewContainer = this.eRef.nativeElement.querySelector('.review-dropdown-container');

    if (usageContainer && !usageContainer.contains(event.target)) {
      this.isUsageDropdownOpen = false;
    }
    if (reviewContainer && !reviewContainer.contains(event.target)) {
      this.isReviewDropdownOpen = false;
    }
  }

  toggleUsageDropdown(event: Event) {
    // console.log('Toggle Usage Dropdown');
    event.stopPropagation();
    this.isUsageDropdownOpen = !this.isUsageDropdownOpen;
  }

  setUsageFilter(filter: string) {
    this.selectedUsageFilter = filter;
    this.isUsageDropdownOpen = false;
  }

  setYear(year: number) {
    this.selectedYear = year;
    // console.log('Selected Year:', this.selectedYear);
    this.isUsageDropdownOpen = false; // close dropdown
    // Reload chart for selected year
    this.loaderService.emitLoading();
    this.pendingRequests = 1;
    this.guestActivity(this.selectedYear, this.selectedReviewYear);
  }

  toggleReviewDropdown(event: Event) {
    event.stopPropagation();
    this.isReviewDropdownOpen = !this.isReviewDropdownOpen;
  }

  setReviewYear(year: number) {
    this.selectedReviewYear = year;
    this.isReviewDropdownOpen = false;
    this.loaderService.emitLoading();
    this.pendingRequests = 1;
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
  //         // console.log(this.activities, "All activity");
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
  //         // console.log('Review Year Data:', reviewYearData);
  //         if (reviewYearData && reviewYearData.length > 0) {
  //           this.review = reviewYearData[0];
  //           // console.log('Review:',this.review);
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
        /*  pagination: true,
         paginationDetails: {
           limit: 0,
           pageSize: 10
         },
         sorting: true,
         sortingDetails: {
           email: -1
         } */
      }
    };
    // console.log(requestBody);
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
        // console.log(this.activities, "All activity");
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
        this.decrementPendingRequests();
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
        this.decrementPendingRequests();
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

  createGuestUsageChart(data: number[], retryCount: number = 0) {
    const canvas = document.getElementById('guestUsageChart') as HTMLCanvasElement;
    if (!canvas) {
      // Retry up to 3 times with a delay if canvas is not ready yet
      if (retryCount < 3) {
        setTimeout(() => {
          this.createGuestUsageChart(data, retryCount + 1);
        }, 100);
      } else {
        // console.warn('Canvas element with id "guestUsageChart" not found in DOM after retries');
      }
      return;
    }
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

  selectButton(button: string, showLoader: boolean = true): void {
    this.selectedButton = button; // Sets the selected button
    if (showLoader) {
      this.loaderService.emitLoading();
      this.pendingRequests = 1;
    }
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
        if (showLoader) {
          this.loaderService.emitComplete();
        }
        break;
    }
  }

  navigateToBookings() {
    this.routerUrl.navigate(['/bookings']);
  }

  navigateToTask() {
    this.routerUrl.navigate(['/task-management']);
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
          // console.log('Tasks:', this.tasks);
        }
        this.decrementPendingRequests();
      },
      error: (err) => {
        console.error('Task API Error:', err);
        this.decrementPendingRequests();
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
          // console.log('Delivered Tasks:', this.tasks);
        }
        this.decrementPendingRequests();
      },
      error: (err) => {
        console.error('Task API Error:', err);
        this.decrementPendingRequests();
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
          // console.log('Escalated Tasks:', this.tasks);
        }
        this.decrementPendingRequests();
      },
      error: (err) => {
        console.error('Task API Error:', err);
        this.decrementPendingRequests();
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
        "pagination": false,
        /* "paginationDetails": {
          "limit": 0,
          "pageSize": 10
        }, */
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
          // console.log(this.allBookings, this.allBookings.length,  "Bookings List")
        }
        this.decrementPendingRequests();
      },
      (err: any) => {
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
        this.decrementPendingRequests();
      }
    )
  }


  roomReport(roomNo: any) {
    // console.log('Report member id:', this.memberId);
    let requestBody = {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          // "member_id": "INM00071",
          "member_id": this.memberId,
          "room_no": roomNo
        },
        "pagination": false,
        /* "paginationDetails": {
          "limit": 0,
          "pageSize": 10
        }, */
        "sorting": true,
        "sortingDetails": {
          "email": -1
        }
      }
    }
    // console.log(requestBody);
    this.bookingService.getAllReport(requestBody).subscribe(
      resp => {
        if (resp) {
          this.report = resp.result.data;
          // console.log(this.report, "All report");
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

  // Newly added for validation
  // For navigating to reports
  /* generateReport() {
    this.validateDates();
    if (!this.dateError) {
      // console.log(this.roomNo, this.startDate, this.endDate);
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
  } */

  /*  validateDates() {
   // console.log('Room No:', this.roomNo);
   // console.log('Start Date:', this.startDate);
   // console.log('End Date:', this.endDate);
   if (this.startDate && this.endDate) {
     const start = new Date(this.startDate);
     const end = new Date(this.endDate);
     this.dateError = end < start; // true if end is before start
   }
 } */

  validateDates() {
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      this.dateError = end < start;
    }
  }

  generateReport() {
    this.roomError = !this.roomNo;
    this.startDateError = !this.startDate;
    this.endDateError = !this.endDate;
    this.validateDates();
    if (this.roomError || this.startDateError || this.endDateError || this.dateError) {
      return;
    }
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

  clearRoomError() {
    if (this.roomNo) {
      this.roomError = false;
    }
  }

  clearStartDateError() {
    if (this.startDate) {
      this.startDateError = false;
    }
  }

  clearEndDateError() {
    if (this.endDate) {
      this.endDateError = false;
    }
    this.validateDates();
  }
  // End of newly added for validation

}
