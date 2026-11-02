import { CommonModule } from '@angular/common';

import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { forkJoin, of } from 'rxjs';

import { catchError } from 'rxjs/operators';

import { HotelOverviewDashboardService, EscalationRow, DepartmentCard, TodayDepartmentPanels } from './hotel-overview-dashboard.service';



type KpiItem = {

  cssClass: string;

  icon: string;

  label: string;

  value: string;

  note: string;

};



@Component({

  selector: 'app-hotel-overview-dashboard',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './hotel-overview-dashboard.component.html',

  styleUrl: './hotel-overview-dashboard.component.scss'

})

export class HotelOverviewDashboardComponent implements OnInit {

  selectedPeriod = 'This Month';

  loading = true;

  loadError = '';



  kpis: KpiItem[] = [

    { cssClass: 'primary', icon: '▤', label: 'Total Revenue', value: '—', note: 'Loading…' },

    { cssClass: 'blue', icon: '▧', label: 'Total Orders / Requests', value: '—', note: 'Loading…' },

    { cssClass: 'green', icon: '✓', label: 'Completed', value: '—', note: '—' },

    { cssClass: 'orange', icon: '◷', label: 'Pending', value: '—', note: '—' },

    { cssClass: 'red', icon: '!', label: 'Escalated', value: '—', note: '—' },

    { cssClass: 'pale', icon: '◷', label: 'Delayed', value: '—', note: '—' }

  ];



  revenueLegend = [

    { color: '#1769aa', name: 'Room Revenue', amount: '₹15,00,000', pct: '58%' },

    { color: '#f39a24', name: 'F&B Revenue', amount: '₹7,80,000', pct: '30%' },

    { color: '#218a62', name: 'Upselling', amount: '₹2,10,000', pct: '8%' },

    { color: '#7544ac', name: 'Spa', amount: '₹45,000', pct: '2%' },

    { color: '#27a9c2', name: 'Laundry', amount: '₹25,000', pct: '1%' },

    { color: '#8996a3', name: 'Other', amount: '₹15,000', pct: '1%' }

  ];



  departments: DepartmentCard[] = [
    {
      name: 'F&B',
      emoji: '🍽',
      accent: '#1769aa',
      total: 0,
      totalLabel: 'Total Orders',
      completed: 0,
      pending: 0,
      escalated: 0,
      extra: 'Avg. Delay　—'
    },
    {
      name: 'Housekeeping',
      emoji: '🛏',
      accent: '#25865c',
      total: 0,
      totalLabel: 'Total Requests',
      completed: 0,
      pending: 0,
      escalated: 0,
      extra: 'Avg. Response　—'
    },
    {
      name: 'Front Office',
      emoji: '♟',
      accent: '#7140a8',
      total: 0,
      totalLabel: 'Total Requests',
      completed: 0,
      pending: 0,
      escalated: 0,
      extra: 'Avg. Response　—'
    }
  ];



  offerItems = [

    { name: 'Spa Package', amount: '₹1,12,500' },

    { name: 'Airport Transfer', amount: '₹60,000' },

    { name: 'Dinner Package', amount: '₹40,000' }

  ];



  todayPanels!: TodayDepartmentPanels;


  escalations: EscalationRow[] = [];



  insights = [

    'F&B escalations are high – focus on service recovery and staff training.',

    'Average F&B delay is 12 min – target below 10 min.',

    'Upselling revenue is 8% of total – opportunity to increase conversion.',

    'Housekeeping response time is good – maintain current SLA.',

    'Front Office has 2 escalations – review late checkout requests.'

  ];



  constructor(

    private router: Router,

    private overviewService: HotelOverviewDashboardService

  ) {
    this.todayPanels = this.createEmptyTodayPanels();
  }

  private createEmptyTodayPanels(): TodayDepartmentPanels {
    return {
      dateLabel: '—',
      fnb: this.overviewService.emptyDeptStatusPanel('Cancelled'),
      hk: this.overviewService.emptyDeptStatusPanel('Escalated'),
      fo: this.overviewService.emptyDeptStatusPanel('Escalated')
    };
  }



  ngOnInit(): void {

    this.loadDashboardAccessAndMetrics();

  }



  private loadDashboardAccessAndMetrics(): void {

    this.loading = true;

    this.loadError = '';



    this.overviewService.fetchCustomerByLoginId().subscribe({

      next: (customerResp) => {

        const customer = customerResp?.result?.data?.[0];

        const memberId =

          (customer?.customer_member_id || this.overviewService.getMemberId() || '').trim();



        if (!memberId) {

          this.loading = false;

          this.loadError = 'Member ID not found for this account.';

          return;

        }



        forkJoin({

          orders: this.overviewService.fetchOrdersByCustomerMemberId(memberId).pipe(

            catchError(() => of(null))

          ),

          tasks: this.overviewService.fetchAllTasks(memberId).pipe(catchError(() => of(null)))

        }).subscribe({

          next: ({ orders, tasks }) => {

            if (tasks?.success === 1 || tasks?.success === true) {

              this.applyTaskMetrics(tasks.result?.data || []);

            } else {

              this.setKpi('Total Orders / Requests', '0', 'No task data');

            }

            if (orders?.success === 1 || orders?.success === true) {
              this.applyOrderRevenue(orders.result?.data || []);
            } else {
              this.setKpi('Total Revenue', this.formatInr(0), 'Order Confirmed · 0 orders');
            }

            this.loading = false;

          },

          error: () => {

            this.loading = false;

            this.loadError = 'Unable to load dashboard metrics.';

          }

        });

      },

      error: () => {

        this.loading = false;

        this.loadError = 'Unable to verify user access.';

      }

    });

  }



  private applyTaskMetrics(tasks: any[]): void {
    const total = tasks.length;
    const status = (t: any) => String(t?.status ?? '').trim();

    const delayed = tasks.filter((t) => t.timely_delivered === false).length;
    const escalated = tasks.filter((t) => status(t) === 'Escalated').length;
    const pending = tasks.filter((t) => status(t) === 'Processing').length;
    const completed = tasks.filter(
      (t) => status(t) === 'Completed' || status(t) === 'Delivered'
    ).length;

    const completionPct = total ? Math.round((completed / total) * 100) : 0;
    const pendingPct = total ? Math.round((pending / total) * 100) : 0;
    const escalatedPct = total ? Math.round((escalated / total) * 100) : 0;
    const delayedPct = total ? Math.round((delayed / total) * 100) : 0;

    this.setKpi('Total Orders / Requests', String(total), 'All service tasks');
    this.setKpi('Completed', String(completed), `${completionPct}% completion rate`);
    this.setKpi('Pending', String(pending), `${pendingPct}% pending`);
    this.setKpi('Escalated', String(escalated), `${escalatedPct}% escalated`);
    this.setKpi('Delayed', String(delayed), `${delayedPct}% delayed`);

    this.escalations = this.overviewService.buildRecentEscalationRows(tasks, 10);
    this.departments = this.overviewService.buildDepartmentOverview(tasks);
    this.todayPanels = this.overviewService.buildTodayDepartmentPanels(tasks);
  }

  private applyOrderRevenue(orders: any[]): void {
    const { total, count } = this.overviewService.sumOrderConfirmedRevenue(orders);
    this.setKpi(
      'Total Revenue',
      this.formatInr(total),
      count === 1 ? 'Order Confirmed · 1 order' : `Order Confirmed · ${count} orders`
    );
  }

  private formatInr(amount: number): string {
    const formatted = amount.toLocaleString('en-IN', {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
    return `₹${formatted}`;
  }

  private setKpi(label: string, value: string, note: string): void {

    const kpi = this.kpis.find((k) => k.label === label);

    if (kpi) {

      kpi.value = value;

      kpi.note = note;

    }

  }



  openDepartment(name: string) {
    if (name === 'F&B') {
      this.router.navigate(['/fb/dashboard']);
      return;
    }
    if (name === 'Front Office') {
      this.router.navigate(['/fo/dashboard']);
      return;
    }
    if (name === 'Housekeeping') {
      this.router.navigate(['/hk/dashboard']);
      return;
    }
    this.router.navigate(['/task-management'], { queryParams: { dept: name } });
  }

}


