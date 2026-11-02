import { CommonModule } from '@angular/common';

import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { catchError, of } from 'rxjs';

import {
  FbDashboardService,
  FnbRecentEscalationRow,
  FnbTodayOrderSummary,
  FnbTrackingRow
} from '../fb-dashboard.service';



@Component({

  selector: 'app-fb-department-head-dashboard',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './fb-department-head-dashboard.component.html',

  styleUrl: './fb-department-head-dashboard.component.scss'

})

export class FbDepartmentHeadDashboardComponent implements OnInit {

  trackingMode: 'Orders' | 'Escalations' = 'Orders';

  restaurantFilter = 'All Restaurants';

  typeFilter = 'All Order Types';

  loadingTasks = true;

  loadError = '';



  showModal = false;

  modalTitle = '';

  modalBodyHtml = '';



  restaurants: string[] = ['All Restaurants'];

  orderTypes: string[] = ['All Order Types'];



  private menuOrderingTasks: any[] = [];

  private orderRows: FnbTrackingRow[] = [];

  private escalationRows: FnbTrackingRow[] = [];

  recentEscalations: FnbRecentEscalationRow[] = [];

  todayOrderSummary: FnbTodayOrderSummary = {
    dateLabel: '—',
    totalActive: 0,
    preparing: 0,
    outForDelivery: 0,
    completedToday: 0
  };

  offerCountLabel = '—';
  offerCountLoading = true;

  offerPaymentAmountLabel = '—';
  offerPaymentOrderNote = 'Order Confirmed · 0 orders';
  offerPaymentLoading = true;

  taskReportCounts = { delayed: 0, escalated: 0, delivered: 0 };



  readonly liveStatusRows = [

    { label: '🟠 Preparing', count: 62, pct: 26, color: '#f2b64c' },

    { label: '🟢 Ready', count: 48, pct: 20, color: '#55b79a' },

    { label: '🔵 Out for Delivery', count: 38, pct: 16, color: '#4b95e8' },

    { label: '🟢 Delivered', count: 97, pct: 40, color: '#55b79a' },

    { label: '🔴 Cancelled', count: 12, pct: 5, color: '#e45a68' }

  ];



  constructor(private fbDashboardService: FbDashboardService) {}



  ngOnInit(): void {
    this.loadOfferCount();
    this.loadOfferPaymentReport();
    this.loadMenuOrderingTasks();
  }

  private loadOfferCount(): void {
    this.offerCountLoading = true;
    this.fbDashboardService.fetchOffersByOutlet().subscribe({
      next: (count) => {
        this.offerCountLabel = count.toLocaleString('en-IN');
        this.offerCountLoading = false;
      },
      error: () => {
        this.offerCountLabel = '0';
        this.offerCountLoading = false;
      }
    });
  }

  private loadOfferPaymentReport(): void {
    this.offerPaymentLoading = true;
    this.fbDashboardService
      .fetchOfferPaymentReport()
      .pipe(catchError(() => of({ total: 0, count: 0 })))
      .subscribe({
        next: ({ total, count }) => {
          this.offerPaymentAmountLabel = this.formatInr(total);
          this.offerPaymentOrderNote =
            count === 1 ? 'Order Confirmed · 1 order' : `Order Confirmed · ${count} orders`;
          this.offerPaymentLoading = false;
        },
        error: () => {
          this.offerPaymentAmountLabel = this.formatInr(0);
          this.offerPaymentOrderNote = 'Order Confirmed · 0 orders';
          this.offerPaymentLoading = false;
        }
      });
  }

  private formatInr(amount: number): string {
    const formatted = amount.toLocaleString('en-IN', {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
    return `₹${formatted}`;
  }



  get liveClock(): string {

    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  }



  get filteredTrackingRows(): FnbTrackingRow[] {

    const source = this.trackingMode === 'Escalations' ? this.escalationRows : this.orderRows;

    return source.filter(

      (row) =>

        (this.restaurantFilter === 'All Restaurants' || row.restaurant === this.restaurantFilter) &&

        (this.typeFilter === 'All Order Types' || row.type === this.typeFilter)

    );

  }



  setTracking(mode: 'Orders' | 'Escalations'): void {

    this.trackingMode = mode;

  }



  statusClass(status: string): string {

    const s = String(status ?? '').trim();

    if (['Processing', 'Assigned', 'ASAP', 'Pending', 'In Progress'].includes(s)) {

      return 'preparing';

    }

    if (['Ready', 'Served', 'Delivered', 'Completed', 'Resolved', 'Paid', 'Active'].includes(s)) {

      return 'delivered';

    }

    if (s === 'Out for Delivery') {

      return 'out';

    }

    if (['Delayed', 'Cancelled', 'Rejected', 'Open', 'Failed', 'Escalated'].includes(s)) {

      return 'delayed';

    }

    return 'preparing';

  }



  openDetail(id: string): void {

    const row = [...this.orderRows, ...this.escalationRows].find((x) => x.id === id);

    if (!row?.task) {

      return;

    }

    const task = row.task;

    const room = task?.room_no != null && task?.room_no !== '' ? `Room ${task.room_no}` : '—';

    this.modalTitle = `Task Details — ${row.id}`;

    this.modalBodyHtml =

      `<b>Restaurant / Outlet:</b> ${row.restaurant}<br><br>` +

      `<b>Service:</b> ${row.type}<br><br>` +

      `<b>${room}</b><br><br>` +

      `<b>Status:</b> ${row.status}<br><br>` +

      `<b>Updated:</b> ${row.time}<br><br>` +

      `<b>Guest:</b> ${task?.guest_name || task?.task_created_by || '—'}`;

    this.showModal = true;

  }



  closeModal(): void {

    this.showModal = false;

  }



  private loadMenuOrderingTasks(): void {

    this.loadingTasks = true;

    this.loadError = '';



    this.fbDashboardService

      .fetchMenuOrderingTasks()

      .pipe(catchError(() => of([])))

      .subscribe({

        next: (tasks) => {
          this.menuOrderingTasks = tasks;
          this.taskReportCounts = this.fbDashboardService.buildTaskReportCounts(tasks);
          const todayTasks = this.fbDashboardService.filterTodayTasks(tasks);

          this.todayOrderSummary = this.fbDashboardService.buildTodayOrderSummary(todayTasks);
          this.orderRows = this.fbDashboardService.buildTrackingRows(todayTasks, 25);
          this.escalationRows = this.fbDashboardService.buildEscalationTrackingRows(todayTasks, 25);
          this.recentEscalations = this.fbDashboardService.buildRecentEscalations(todayTasks, 5);

          const restaurantNames = this.fbDashboardService.distinctRestaurants(todayTasks);
          this.restaurants = ['All Restaurants', ...restaurantNames];

          const types = this.fbDashboardService.distinctServiceTypes(todayTasks);
          this.orderTypes = ['All Order Types', ...types];



          this.loadingTasks = false;

        },

        error: () => {

          this.loadingTasks = false;
          this.taskReportCounts = { delayed: 0, escalated: 0, delivered: 0 };

          this.loadError = 'Unable to load F&B tasks.';

        }

      });

  }

}


