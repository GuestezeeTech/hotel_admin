import { TaskManagementService } from './../task-management/task-management.service';
import { LocalStorageService } from './../auth-services/local-storage.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AfterViewInit } from '@angular/core';
import html2pdf from 'html2pdf.js';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { BookingsService } from '../bookings/bookings.service';
import { Router } from '@angular/router';
import { HotelListService } from '../hotel-list/hotel-list.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})

export class ReportComponent implements AfterViewInit {
  rating: number = 4;
  memberId: any;
  roomNo: any;
  startDate: any;
  endDate: any;
  guestData: any[] = [];
  roomOccupancy: string = '';
  reviewForGuest: any[] = [];
  loading: boolean = true; // loader flag

  constructor(
    private localStorageService: LocalStorageService,
    private bookingService: BookingsService,
    private router: Router,
    private hotelListService: HotelListService,
    private taskManagementService: TaskManagementService) { }

  ngAfterViewInit(): void {
    // this.downloadPDF();
    // this.printReport();
  }

  ngOnInit() {
    const hotelId = Number(this.localStorageService.get('UserId'));
    this.getCustomerById(hotelId);
    // Get state data from router
    // const navigation = this.router.getCurrentNavigation();
    // const state = navigation?.extras.state as {
    //   roomNo: any;
    //   startDate: any;
    //   endDate: any;
    // };
    // console.log(state);
    // if (state) {
    //   this.roomNo = state.roomNo;
    //   this.startDate = state.startDate;
    //   this.endDate = state.endDate;
    // }
    this.roomNo = this.localStorageService.get('RoomNo');
    this.startDate = this.localStorageService.get('StartDate');
    this.endDate = this.localStorageService.get('EndDate');
    // console.log('Member id:', this.memberId);
    // this.getAllReport(this.roomNo, this.startDate, this.endDate);
  }

  getCustomerById(hotelId: any): Promise<any> {
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id: hotelId } }
    };
    return new Promise((resolve, reject) => {
      this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
        next: (resp: any) => {
          if (resp.success === 1 && resp.status_code === 200 && resp?.result?.data?.length > 0) {
            const userData = resp.result.data[0];
            this.memberId = userData.customer_member_id;
            console.log('Member id:', this.memberId);
            this.getAllReport(this.roomNo, this.startDate, this.endDate);
            resolve(userData);
          } else {
            reject('Customer not found');
          }
        },
        error: reject
      });
    });
  }

  // getAllReport(roomNo: any, startDate: any, endDate: any) {
  //   let requestBody = {
  //     "domain_name": DOMAIN_NAME,
  //     "user_id": USER_ID,
  //     "extras": {
  //       "find": {
  //         "member_id": "INM00071",
  //         "room_no": roomNo,
  //       }
  //     },
  //     "payload": {
  //       "date": {
  //         "start_date": startDate,
  //         "end_date": endDate
  //       }
  //     }
  //   }
  //   this.bookingService.getAllReport(requestBody).subscribe({
  //     next: (response) => {
  //       if (response?.success) {
  //         const resultData = response.result.data;
  //         // 1. Patch guest details
  //         this.guestData = resultData.guest_data.map((guest: any) => {
  //           // 2. Patch service ratings if task_data has Guest_Id match
  //           const tasksForGuest = resultData.task_data.filter((task: any) =>
  //             task.guest_id === guest.Guest_detail[0].Guest_Id
  //           );
  //           guest.requestedServices = tasksForGuest.map((task: any) => ({
  //             serviceName: task.service.service_name,
  //             rating: task.rating
  //           }));
  //           return guest;
  //         });
  //         // 3. Patch room occupancy
  //         const totalAdults = this.guestData.reduce((acc, g) => acc + g.Adult_Pax, 0);
  //         const totalChildren = this.guestData.reduce((acc, g) => acc + g.Child_Pax, 0);
  //         this.roomOccupancy = `${totalAdults} Adults and ${totalChildren} Children`;

  //         // 4. Overall rating (from review_data)
  //         // this.rating = resultData.review_data?.rating || 0;
  //         // Wait for DOM to render
  //         setTimeout(() => {
  //           this.downloadPDF();
  //           this.printReport();
  //         }, 500);

  //       }
  //     },
  //     error: (err) => {
  //       console.error('Task API Error:', err);
  //     }
  //   });
  // }

  getAllReport(roomNo: any, startDate: any, endDate: any) {
    this.loading = true;
    let requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { member_id: this.memberId, room_no: roomNo } },
      payload: { date: { start_date: startDate, end_date: endDate } }
    };
    this.bookingService.getAllReport(requestBody).subscribe({
      next: (response) => {
        if (response?.success) {
          const resultData = response.result.data;
          if (resultData) {
            this.guestData = resultData.guest_data || [];
            let guestsProcessed = 0; // counter for completed guests
            for (let i = 0; i < this.guestData.length; i++) {
              const guest = this.guestData[i];
              const guestId = guest.id;
              const tasksForGuest = resultData.task_data.filter((task: any) => task.guest_id === guestId);
              if (tasksForGuest.length > 0) {
                const ratingRequests = tasksForGuest.map((task: any) => {
                  const ratingRequestBody = {
                    domain_name: DOMAIN_NAME,
                    user_id: USER_ID,
                    extras: {
                      find: { task_id: task.id, member_id: this.memberId },
                      pagination: false,
                      sorting: true,
                      sortingDetails: { id: -1 }
                    }
                  };
                  return this.taskManagementService.getAllRatings(ratingRequestBody);
                });
                forkJoin(ratingRequests).subscribe({
                  next: (ratingResponses: any) => {
                    guest.requestedServices = [];
                    for (let j = 0; j < tasksForGuest.length; j++) {
                      let ratingValue = 0;
                      const ratingResp = ratingResponses[j];
                      if (ratingResp?.success && ratingResp.result.data.length > 0) {
                        ratingValue = ratingResp.result.data[0].rating;
                      }
                      guest.requestedServices.push({
                        serviceName: tasksForGuest[j].service.service_name,
                        rating: ratingValue,     
                        serviceIcon: tasksForGuest[j].service.icon              
                      });
                    }
                    // Calculate average rating
                    console.log('Guest requestedServices', guest.requestedServices);
                    const totalRatings = guest.requestedServices.reduce((sum: any, s: any) => sum + s.rating, 0);
                    guest.averageRating = guest.requestedServices.length > 0 ? totalRatings / guest.requestedServices.length : 0;
                    // Match review ratings
                    guest.guestRatings = resultData.review_data?.filter((r: any) => r.guest_id === guestId && r.checkout_feedback === true)   || [];
                    guestsProcessed++;
                    // If all guests processed, hide loading and trigger PDF/Print
                    if (guestsProcessed === this.guestData.length) {
                      this.finalizeReport(resultData);
                    }
                  },
                  error: () => {
                    guest.requestedServices = tasksForGuest.map((task: any) => ({ serviceName: task.service.service_name, rating: 0 }));
                    guest.averageRating = 0;
                    guest.guestRatings = resultData.review_data?.filter((r: any) => r.guest_id === guestId && r.checkout_feedback === true) || [];
                    guestsProcessed++;
                    if (guestsProcessed === this.guestData.length) {
                      this.finalizeReport(resultData);
                    }
                  }
                });
              } else {
                // No tasks for this guest
                guest.requestedServices = [];
                guest.averageRating = 0;
                guest.guestRatings = resultData.review_data?.filter((r: any) => r.guest_id === guestId && r.checkout_feedback === true) || [];
                guestsProcessed++;
                if (guestsProcessed === this.guestData.length) {
                  this.finalizeReport(resultData);
                }
              }
            }
            // If no guests at all
            if (this.guestData.length === 0) {
              this.finalizeReport(resultData);
            }
          }
        }
      },
      error: (err) => {
        console.error('Task API Error:', err);
        this.loading = false;
      }
    });
  }

  // Separate method to finalize report
  finalizeReport(resultData: any) {
    // Patch room occupancy
    let totalAdults = 0, totalChildren = 0;
    for (let i = 0; i < this.guestData.length; i++) {
      totalAdults += this.guestData[i].Adult_Pax;
      totalChildren += this.guestData[i].Child_Pax;
    }
    this.roomOccupancy = `${totalAdults} Adults and ${totalChildren} Children`;
    this.loading = false;
    setTimeout(() => {
      // Trigger PDF and Print
      this.downloadPDF();
      this.printReport();
    }, 2000)
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

  printReport(): void {
    const printElement = document.getElementById('print');
    const printContent = printElement ? printElement.innerHTML : '';
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Copies existing html files related styles
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(style => style.outerHTML)
        .join('');
      printWindow.document.write(`
          <html>
            <head>
              <title>Generate Report</title>
              ${styles}
            </head>
            <body>
              <h5>Report</h5>
              ${printContent}
            </body>
          </html>
        `);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    }
  }

  downloadPDF(): void {
    const element = document.getElementById('print') as HTMLElement; // Select the modal content
    const options = {
      margin: [10, 10, 10, 10], // Margins for the PDF
      filename: 'Report.pdf', // Name of the PDF file
      image: { type: 'jpeg', quality: 0.98 }, // Image quality
      html2canvas: {
        scale: 2, // Scale for better quality
        useCORS: true, // Enable cross-origin resource sharing
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait', // Portrait orientation
      },
      pagebreak: { mode: ['css', 'legacy'] }, // Avoid splitting content
    };
    html2pdf().set(options).from(element).save();
  }

  
  goBack() {
    this.router.navigate(['/dashboard']);
  }

}
