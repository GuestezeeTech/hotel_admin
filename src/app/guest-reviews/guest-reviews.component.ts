import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { TaskManagementService } from '../task-management/task-management.service';
import { AlertsService } from '../shared/alerts/alerts.service';
import { AlertsComponent } from '../shared/alerts/alerts.component';

@Component({
  selector: 'app-guest-reviews',
  standalone: true,
  imports: [CommonModule, AlertsComponent],
  templateUrl: './guest-reviews.component.html',
  styleUrl: './guest-reviews.component.scss'
})
export class GuestReviewsComponent implements OnInit {
  guestReviews: any[] = [];
  loading = true;
  memberId: any;
  options = {
    autoClose: true,
    keepAfterRouteChange: false
  };

  constructor(
    private localStorageService: LocalStorageService,
    private taskManagementService: TaskManagementService,
    private router: Router,
    private alerts: AlertsService
  ) { }

  ngOnInit(): void {
    this.memberId = this.localStorageService.get('MemberId');
    this.getAllGuestReviews();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getStarArray(rating: number): ('full' | 'half' | 'empty')[] {
    const stars: ('full' | 'half' | 'empty')[] = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push('full');
      } else if (rating >= i - 0.5) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }

  getAllGuestReviews() {
    const requestBody = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          member_id: this.memberId
        },
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    this.taskManagementService.getAllRatings(requestBody).subscribe({
      next: (response) => {
        this.guestReviews = response?.success ? (response.result?.data || []) : [];
        this.loading = false;
      },
      error: (err) => {
        this.guestReviews = [];
        this.loading = false;
        if (err.error?.statusCode === 403) {
          this.alerts.error('Session Time Out! Please login Again', this.options);
          this.router.navigate(['/login'], { skipLocationChange: false });
        } else if (err.error?.message) {
          this.alerts.error(err.error.message, this.options);
        } else {
          this.alerts.error('Something bad happened. Please try again!', this.options);
        }
      }
    });
  }
}
