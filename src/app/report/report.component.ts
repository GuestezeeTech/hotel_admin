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

  async ngOnInit(): Promise<void> {
    // Newly added for getting member id for customer type
    // const hotelId = Number(this.localStorageService.get('UserId'));
    // this.getCustomerById(hotelId);
    this.roomNo = this.localStorageService.get('RoomNo');
    this.startDate = this.localStorageService.get('StartDate');
    this.endDate = this.localStorageService.get('EndDate');
    this.memberId = this.localStorageService.get('MemberId');
    // console.log('Member ID from report component:', this.memberId);
    if (this.memberId !== undefined && this.memberId !== null && this.memberId !== '' && this.memberId !== 'undefined' && this.memberId !== 'null') {
      const customer = await this.getCustomerById(this.memberId);
    }
    // End of newly added for getting member id for customer type
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
      this.hotelListService.getSignupAllCustomers(requestBody).subscribe({
        next: (resp: any) => {
          if (resp.success === 1 && resp.status_code === 200 && resp?.result?.data?.length > 0) {
            const userData = resp.result.data[0];
            // this.memberId = userData.customer_member_id;
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
            // Build a flat list of all guest profiles we need to process
            const allProfilesToProcess: any[] = [];
            for (let i = 0; i < this.guestData.length; i++) {
              const reservation = this.guestData[i];
              const guests = reservation.guestDatas || [];
              for (let j = 0; j < guests.length; j++) {
                allProfilesToProcess.push({
                  reservationIndex: i,
                  profile: guests[j]
                });
              }
            }
            let profilesProcessed = 0;
            const totalProfiles = allProfilesToProcess.length;
            if (totalProfiles === 0) {
              this.finalizeReport(resultData);
              return;
            }
            for (const item of allProfilesToProcess) {
              const profile = item.profile;
              const profileId = profile.id;
              const tasksForProfile = (resultData.task_data || []).filter(
                (task: any) => task.guest_id === profileId
              );
              if (tasksForProfile.length > 0) {
                const ratingRequests = tasksForProfile.map((task: any) => {
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
                    profile.requestedServices = [];
                    for (let k = 0; k < tasksForProfile.length; k++) {
                      let ratingValue = 0;
                      const ratingResp = ratingResponses[k];
                      if (ratingResp?.success && ratingResp.result.data.length > 0) {
                        ratingValue = ratingResp.result.data[0].rating;
                      }
                      profile.requestedServices.push({
                        serviceName: tasksForProfile[k].service.service_name,
                        rating: ratingValue,
                        serviceIcon: tasksForProfile[k].service.icon
                      });
                    }
                    // Calculate average rating
                    const totalRatings = profile.requestedServices.reduce((sum: any, s: any) => sum + s.rating, 0);
                    profile.averageRating = profile.requestedServices.length > 0 ? totalRatings / profile.requestedServices.length : 0;
                    // Match review ratings
                    profile.guestRatings = resultData.review_data?.filter(
                      (r: any) => r.guest_id === profileId && r.checkout_feedback === true
                    ) || [];
                    profilesProcessed++;
                    if (profilesProcessed === totalProfiles) {
                      this.finalizeReport(resultData);
                    }
                  },
                  error: () => {
                    profile.requestedServices = tasksForProfile.map((task: any) => ({
                      serviceName: task.service.service_name,
                      rating: 0
                    }));
                    profile.averageRating = 0;
                    profile.guestRatings = resultData.review_data?.filter(
                      (r: any) => r.guest_id === profileId && r.checkout_feedback === true
                    ) || [];

                    profilesProcessed++;
                    if (profilesProcessed === totalProfiles) {
                      this.finalizeReport(resultData);
                    }
                  }
                });
              } else {
                // No tasks for this profile
                profile.requestedServices = [];
                profile.averageRating = 0;
                profile.guestRatings = resultData.review_data?.filter(
                  (r: any) => r.guest_id === profileId && r.checkout_feedback === true
                ) || [];
                profilesProcessed++;
                if (profilesProcessed === totalProfiles) {
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

}
