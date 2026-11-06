import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  HotelOverviewDashboardService,
  EscalationRow,
  DepartmentCard,
  DeptStatusPanel,
  TodayDepartmentPanels,
  UpsellSoldRow,
  GuestSatisfactionRow,
  GuestSatisfactionSummary,
  StaffDirectoryRow,
  StaffPerformanceReport,
  AppRevenueOrderRow,
  AppRevenueReport
} from './hotel-overview-dashboard.service';
import { formatAmPmTime } from '../../shared/time-format.util';
import { formatInr as formatInrSafe } from '../../shared/inr-format.util';
import { buildDonutSlices, DonutSliceView } from '../../shared/donut-slices.util';
import { FbDashboardService, HotelPaymentRow } from '../../fb-dashboard/fb-dashboard.service';
import { DashboardRefreshSource } from '../../shared/dashboard-refresh/dashboard-refresh-button.component';
import { DashboardPeriodControlsComponent } from '../../shared/dashboard-period/dashboard-period-controls.component';
import { DashboardPeriodStateService } from '../../shared/dashboard-period/dashboard-period-state.service';
import { scrollAppToTop } from '../../shared/scroll-to-top.util';

export type KpiFilterKey =
  | 'revenue'
  | 'all'
  | 'completed'
  | 'pending'
  | 'escalated'
  | 'delayed';

type KpiItem = {
  cssClass: string;
  icon: string;
  label: string;
  value: string;
  note: string;
  filterKey: KpiFilterKey;
};

type KpiListRow = {
  id: string;
  trackId: string | number | null;
  datetime: string;
  dept: string;
  details: string;
  status: string;
  statusClass: string;
  meta: string;
};

@Component({
  selector: 'app-hotel-overview-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardPeriodControlsComponent],
  templateUrl: './hotel-overview-dashboard.component.html',
  styleUrl: './hotel-overview-dashboard.component.scss'
})
export class HotelOverviewDashboardComponent implements OnInit {
  selectedPeriod = 'Today';
  customFrom = '';
  customTo = '';
  periodLabel = 'Today';
  loading = true;
  refreshing = false;
  loadError = '';
  activeView:
    | 'home'
    | 'kpi-list'
    | 'revenue-year'
    | 'upsells-sold'
    | 'escalations'
    | 'payment-details'
    | 'guest-satisfaction'
    | 'staff-directory'
    | 'staff-performance'
    | 'app-revenue' = 'home';
  activeKpiFilter: KpiFilterKey | null = null;
  activeKpiLabel = '';
  kpiListRows: KpiListRow[] = [];
  upsellSoldRows: UpsellSoldRow[] = [];
  upsellPaymentFilter: 'All Payments' | 'Online Payment' | 'Bill To Room' = 'All Payments';
  hotelPaymentRows: HotelPaymentRow[] = [];
  hotelPaymentSearch = '';
  hotelPaymentMethod = 'All Methods';
  hotelPaymentStatus = 'All Status';
  hotelPaymentRoom = 'All Rooms';
  hotelPaymentType = 'All Types';
  hotelPaymentPage = 1;
  readonly hotelPaymentPageSize = 20;

  private sourceCheckoutReviews: any[] = [];
  guestSatisfactionRows: GuestSatisfactionRow[] = [];
  guestSatisfactionSummary: GuestSatisfactionSummary = {
    total: 0,
    averageRating: 0,
    positive: 0,
    positivePct: 0,
    negative: 0,
    withEscalation: 0,
    withDelay: 0
  };
  satisfactionPage = 1;
  readonly satisfactionPageSize = 20;

  staffDirectory: StaffDirectoryRow[] = [];
  staffSearch = '';
  selectedStaff: StaffDirectoryRow | null = null;
  staffPerformance: StaffPerformanceReport | null = null;
  staffDetailTab:
    | 'delivered'
    | 'escalated'
    | 'delayed'
    | 'onTime'
    | 'notAccepted'
    | 'assigned' = 'delivered';

  private sourceAppOrders: any[] = [];
  appRevenueRows: AppRevenueOrderRow[] = [];
  appRevenueReport: AppRevenueReport = {
    count: 0,
    gross: 0,
    discount: 0,
    net: 0,
    aov: 0,
    byPurpose: [],
    rows: []
  };
  appRevenuePurposeFilter = 'All Types';
  appRevenueSearch = '';
  appRevenuePage = 1;
  readonly appRevenuePageSize = 20;

  escalationPage = 1;
  readonly escalationPageSize = 20;
  readonly escalationHomeLimit = 10;

  private sourceTasks: any[] = [];
  private sourceOrders: any[] = [];
  private catalogOfferCount = 0;
  private allTasks: any[] = [];
  private allOrders: any[] = [];
  private pendingKpiRestore: KpiFilterKey | null = null;
  private pendingKpiLabel = '';

  kpis: KpiItem[] = [
    {
      cssClass: 'primary',
      icon: 'bi bi-cash-stack',
      label: 'Total Revenue',
      value: '—',
      note: 'Loading…',
      filterKey: 'revenue'
    },
    {
      cssClass: 'blue',
      icon: 'bi bi-grid-3x3-gap-fill',
      label: 'Total Orders / Requests',
      value: '—',
      note: 'Loading…',
      filterKey: 'all'
    },
    {
      cssClass: 'green',
      icon: 'bi bi-check-circle-fill',
      label: 'Completed',
      value: '—',
      note: '—',
      filterKey: 'completed'
    },
    {
      cssClass: 'orange',
      icon: 'bi bi-hourglass-split',
      label: 'Pending',
      value: '—',
      note: '—',
      filterKey: 'pending'
    },
    {
      cssClass: 'red',
      icon: 'bi bi-exclamation-triangle-fill',
      label: 'Escalated',
      value: '—',
      note: '—',
      filterKey: 'escalated'
    },
    {
      cssClass: 'pale',
      icon: 'bi bi-clock-history',
      label: 'Delayed',
      value: '—',
      note: '—',
      filterKey: 'delayed'
    }
  ];

  revenueTotalLabel = '₹0.00';
  revenueDonutStyle = 'conic-gradient(#dce5ec 0 100%)';
  revenueDonutSlices: DonutSliceView[] = [];
  hoveredRevenueLabel: string | null = null;
  hoveredRevenueValue: string | null = null;

  fnbStatusDonutSlices: DonutSliceView[] = [];
  hkStatusDonutSlices: DonutSliceView[] = [];
  foStatusDonutSlices: DonutSliceView[] = [];
  hoveredStatusChart: 'fnb' | 'hk' | 'fo' | null = null;
  hoveredStatusLabel: string | null = null;
  hoveredStatusValue: string | null = null;
  hoveredStatusCount: number | null = null;
  hoveredServiceKey: string | null = null;
  hoveredTrendKey: string | null = null;
  revenueLegend: Array<{ color: string; name: string; amount: string; pct: string }> = [
    { color: '#f39a24', name: 'Food', amount: '₹0.00', pct: '0%' },
    { color: '#218a62', name: 'Upsell', amount: '₹0.00', pct: '0%' }
  ];

  /** FO Key Services — Mobile Key / App Check-out static until APIs exist; late checkout from tasks. */
  foKeyServiceRows: Array<{ label: string; value: number; icon: string; cssClass: string }> = [
    {
      label: 'Mobile Key (Check-in)',
      value: 0,
      icon: 'bi bi-phone',
      cssClass: 'fo-key-card--keys'
    },
    {
      label: 'App Check-outs',
      value: 0,
      icon: 'bi bi-phone',
      cssClass: 'fo-key-card--checkout'
    },
    {
      label: 'Late Check-out & Payments',
      value: 0,
      icon: 'bi bi-clock',
      cssClass: 'fo-key-card--late'
    }
  ];

  onRevenueDonutEnter(slice: DonutSliceView): void {
    this.hoveredRevenueLabel = slice.label;
    this.hoveredRevenueValue = `${this.formatInrCompact(slice.value)} · ${slice.pct}%`;
  }

  onRevenueDonutLeave(): void {
    this.hoveredRevenueLabel = null;
    this.hoveredRevenueValue = null;
  }

  onStatusDonutEnter(chart: 'fnb' | 'hk' | 'fo', slice: DonutSliceView): void {
    this.hoveredStatusChart = chart;
    this.hoveredStatusLabel = slice.label;
    this.hoveredStatusCount = slice.value;
    this.hoveredStatusValue = `${slice.value} · ${slice.pct}%`;
  }

  onStatusDonutLeave(): void {
    this.hoveredStatusChart = null;
    this.hoveredStatusLabel = null;
    this.hoveredStatusValue = null;
    this.hoveredStatusCount = null;
  }

  onServiceBarEnter(dept: 'fnb' | 'hk' | 'fo', bar: { label: string; count: number }): void {
    this.hoveredServiceKey = `${dept}-${bar.label}`;
  }

  clearServiceHover(): void {
    this.hoveredServiceKey = null;
  }

  private buildStatusDonutSlices(panel: DeptStatusPanel): DonutSliceView[] {
    return buildDonutSlices(
      [
        { label: 'Completed', value: panel.completed, color: '#218a62' },
        { label: 'Pending', value: panel.pending, color: '#f39a24' },
        { label: panel.thirdLabel || 'Escalated', value: panel.thirdCount, color: '#e74a4a' }
      ],
      { r: 58, ir: 34 }
    );
  }

  departments: DepartmentCard[] = [
    {
      name: 'F&B',
      icon: 'bi bi-cup-hot-fill',
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
      icon: 'bi bi-house-heart-fill',
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
      icon: 'bi bi-pc-display',
      accent: '#7140a8',
      total: 0,
      totalLabel: 'Total Requests',
      completed: 0,
      pending: 0,
      escalated: 0,
      extra: 'Avg. Response　—'
    }
  ];

  offerPerf = {
    totalOffers: 0,
    offersSold: 0,
    conversionPct: 0,
    revenueLabel: '₹0',
    items: [] as Array<{ name: string; amount: string; count: number }>
  };

  revenueTrendMonths: Array<{
    key: string;
    label: string;
    count: number;
    amount: number;
    heightPct: number;
  }> = [];

  yearMonthRows: Array<{ key: string; label: string; count: number; amount: number }> = [];
  revenueTrendYear = new Date().getFullYear();

  todayPanels!: TodayDepartmentPanels;
  /** Full escalation list for View All (paginated). */
  escalations: EscalationRow[] = [];
  /** Home preview — last 10. */
  recentEscalations: EscalationRow[] = [];

  insights = [
    'F&B escalations are high – focus on service recovery and staff training.',
    'Average F&B delay is 12 min – target below 10 min.',
    'Upselling revenue is 8% of total – opportunity to increase conversion.',
    'Housekeeping response time is good – maintain current SLA.',
    'Front Office has 2 escalations – review late checkout requests.'
  ];

  constructor(
    private router: Router,
    private overviewService: HotelOverviewDashboardService,
    private fbDashboardService: FbDashboardService,
    private periodState: DashboardPeriodStateService
  ) {
    this.periodState.hydrate(this);
    this.todayPanels = this.createEmptyTodayPanels();
  }

  private createEmptyTodayPanels(): TodayDepartmentPanels {
    return {
      dateLabel: '—',
      fnb: this.overviewService.emptyDeptStatusPanel('Escalated'),
      hk: this.overviewService.emptyDeptStatusPanel('Escalated'),
      fo: this.overviewService.emptyDeptStatusPanel('Escalated')
    };
  }

  ngOnInit(): void {
    this.restoreOverviewReturnState();
    this.loadDashboardAccessAndMetrics(false);
  }

  onDashboardRefresh(_source: DashboardRefreshSource): void {
    this.loadDashboardAccessAndMetrics(true);
  }

  private setActiveView(
    view:
      | 'home'
      | 'kpi-list'
      | 'revenue-year'
      | 'upsells-sold'
      | 'escalations'
      | 'payment-details'
      | 'guest-satisfaction'
      | 'staff-directory'
      | 'staff-performance'
      | 'app-revenue'
  ): void {
    this.activeView = view;
    scrollAppToTop();
  }

  openKpi(kpi: KpiItem): void {
    this.activeKpiFilter = kpi.filterKey;
    this.activeKpiLabel = kpi.label;
    if (kpi.filterKey === 'revenue') {
      this.openPaymentDetails();
      return;
    }
    this.kpiListRows = this.buildTaskRows(this.filterTasks(kpi.filterKey));
    this.setActiveView('kpi-list');
  }

  openPaymentDetails(): void {
    this.activeKpiFilter = 'revenue';
    this.activeKpiLabel = 'Payment Details';
    this.resetHotelPaymentFilters();
    this.hotelPaymentRows = this.fbDashboardService.buildHotelPaymentRows(
      this.allOrders,
      this.allTasks
    );
    this.setActiveView('payment-details');
  }

  backToOverview(): void {
    this.setActiveView('home');
    this.activeKpiFilter = null;
    this.activeKpiLabel = '';
    this.kpiListRows = [];
    this.upsellSoldRows = [];
    this.upsellPaymentFilter = 'All Payments';
    this.hotelPaymentRows = [];
    this.resetHotelPaymentFilters();
    this.resetSatisfactionFilters();
    this.selectedStaff = null;
    this.staffPerformance = null;
    this.staffSearch = '';
    this.resetAppRevenueFilters();
    this.escalationPage = 1;
  }

  openGuestSatisfaction(): void {
    this.resetSatisfactionFilters();
    this.setActiveView('guest-satisfaction');
  }

  openStaffDirectory(): void {
    this.staffSearch = '';
    this.selectedStaff = null;
    this.staffPerformance = null;
    this.setActiveView('staff-directory');
  }

  openStaffPerformance(row: StaffDirectoryRow): void {
    this.selectedStaff = row;
    this.staffDetailTab = 'delivered';
    this.staffPerformance = this.overviewService.buildStaffPerformance(row.id, this.allTasks);
    this.setActiveView('staff-performance');
  }

  backToStaffDirectory(): void {
    this.selectedStaff = null;
    this.staffPerformance = null;
    this.setActiveView('staff-directory');
  }

  get filteredStaffDirectory(): StaffDirectoryRow[] {
    const q = this.staffSearch.trim().toLowerCase();
    if (!q) {
      return this.staffDirectory;
    }
    return this.staffDirectory.filter((row) =>
      [row.name, row.employeeId, row.department].join(' ').toLowerCase().includes(q)
    );
  }

  get staffDetailTasks(): any[] {
    const report = this.staffPerformance;
    if (!report) {
      return [];
    }
    switch (this.staffDetailTab) {
      case 'escalated':
        return report.escalated;
      case 'delayed':
        return report.delayed;
      case 'onTime':
        return report.onTime;
      case 'notAccepted':
        return report.notAccepted;
      case 'assigned':
        return report.assigned;
      case 'delivered':
      default:
        return report.delivered;
    }
  }

  openAppRevenue(): void {
    this.resetAppRevenueFilters();
    this.setActiveView('app-revenue');
  }

  private resetAppRevenueFilters(): void {
    this.appRevenuePurposeFilter = 'All Types';
    this.appRevenueSearch = '';
    this.appRevenuePage = 1;
  }

  onAppRevenueFilterChange(): void {
    this.appRevenuePage = 1;
  }

  get filteredAppRevenueRows(): AppRevenueOrderRow[] {
    const q = this.appRevenueSearch.trim().toLowerCase();
    return (this.appRevenueRows || []).filter((row) => {
      if (
        this.appRevenuePurposeFilter !== 'All Types' &&
        row.purpose !== this.appRevenuePurposeFilter
      ) {
        return false;
      }
      if (!q) {
        return true;
      }
      return [row.guestName, row.roomNumber, row.purpose, row.paymentMethod, row.id]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }

  get appRevenueTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAppRevenueRows.length / this.appRevenuePageSize));
  }

  get pagedAppRevenueRows(): AppRevenueOrderRow[] {
    const start = (this.appRevenuePage - 1) * this.appRevenuePageSize;
    return this.filteredAppRevenueRows.slice(start, start + this.appRevenuePageSize);
  }

  get appRevenueShowingLabel(): string {
    const total = this.filteredAppRevenueRows.length;
    if (!total) {
      return '0 records';
    }
    const start = (this.appRevenuePage - 1) * this.appRevenuePageSize + 1;
    const end = Math.min(this.appRevenuePage * this.appRevenuePageSize, total);
    return `Showing ${start}–${end} of ${total}`;
  }

  goAppRevenuePage(page: number): void {
    if (page < 1 || page > this.appRevenueTotalPages) {
      return;
    }
    this.appRevenuePage = page;
  }

  staffTaskDatetime(task: any): string {
    return [task?.order_date || '—', formatAmPmTime(task?.order_time)].filter(Boolean).join(' ').trim();
  }

  staffTaskService(task: any): string {
    return String(task?.service?.service_name || task?.request_details || '—');
  }

  staffTaskStatus(task: any): string {
    return String(task?.status ?? '—').trim() || '—';
  }

  staffInitials(name: string): string {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  onStaffPhotoError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.style.display = 'none';
      const fallback = img.nextElementSibling as HTMLElement | null;
      if (fallback) {
        fallback.hidden = false;
      }
    }
  }

  private resetSatisfactionFilters(): void {
    this.satisfactionPage = 1;
  }

  get filteredGuestSatisfactionRows(): GuestSatisfactionRow[] {
    return this.guestSatisfactionRows || [];
  }

  get satisfactionTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredGuestSatisfactionRows.length / this.satisfactionPageSize)
    );
  }

  get satisfactionPageNumbers(): number[] {
    const total = this.satisfactionTotalPages;
    const current = this.satisfactionPage;
    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pages: number[] = [];
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    return pages;
  }

  get pagedGuestSatisfactionRows(): GuestSatisfactionRow[] {
    const start = (this.satisfactionPage - 1) * this.satisfactionPageSize;
    return this.filteredGuestSatisfactionRows.slice(start, start + this.satisfactionPageSize);
  }

  get satisfactionShowingLabel(): string {
    const total = this.filteredGuestSatisfactionRows.length;
    if (!total) {
      return '0 records';
    }
    const start = (this.satisfactionPage - 1) * this.satisfactionPageSize + 1;
    const end = Math.min(this.satisfactionPage * this.satisfactionPageSize, total);
    return `Showing ${start}–${end} of ${total}`;
  }

  goSatisfactionPage(page: number): void {
    if (page < 1 || page > this.satisfactionTotalPages) {
      return;
    }
    this.satisfactionPage = page;
  }

  starArray(rating: number): Array<'full' | 'half' | 'empty'> {
    const stars: Array<'full' | 'half' | 'empty'> = [];
    for (let i = 1; i <= 5; i += 1) {
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

  private resetHotelPaymentFilters(): void {
    this.hotelPaymentSearch = '';
    this.hotelPaymentMethod = 'All Methods';
    this.hotelPaymentStatus = 'All Status';
    this.hotelPaymentRoom = 'All Rooms';
    this.hotelPaymentType = 'All Types';
    this.hotelPaymentPage = 1;
  }

  get hotelPaymentMethodOptions(): string[] {
    const methods = new Set<string>();
    for (const row of this.hotelPaymentRows) {
      if (row.paymentMethod) {
        methods.add(row.paymentMethod);
      }
    }
    return ['All Methods', ...[...methods].sort((a, b) => a.localeCompare(b))];
  }

  get hotelPaymentStatusOptions(): string[] {
    const statuses = new Set<string>(['Paid', 'Failed']);
    for (const row of this.hotelPaymentRows) {
      if (row.paymentStatus) {
        statuses.add(row.paymentStatus);
      }
    }
    return [
      'All Status',
      ...[...statuses].sort((a, b) => {
        const order = { Paid: 0, Failed: 1 } as Record<string, number>;
        return (order[a] ?? 9) - (order[b] ?? 9) || a.localeCompare(b);
      })
    ];
  }

  get hotelPaymentRoomOptions(): string[] {
    const rooms = new Set<string>();
    for (const row of this.hotelPaymentRows) {
      if (row.roomNumber && row.roomNumber !== '—') {
        rooms.add(String(row.roomNumber));
      }
    }
    return ['All Rooms', ...[...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }

  get filteredHotelPaymentRows(): HotelPaymentRow[] {
    const q = this.hotelPaymentSearch.trim().toLowerCase();
    return this.hotelPaymentRows.filter((row) => {
      if (this.hotelPaymentType !== 'All Types' && row.orderType !== this.hotelPaymentType) {
        return false;
      }
      if (this.hotelPaymentMethod !== 'All Methods' && row.paymentMethod !== this.hotelPaymentMethod) {
        return false;
      }
      if (this.hotelPaymentStatus !== 'All Status' && row.paymentStatus !== this.hotelPaymentStatus) {
        return false;
      }
      if (this.hotelPaymentRoom !== 'All Rooms' && String(row.roomNumber) !== this.hotelPaymentRoom) {
        return false;
      }
      if (!q) {
        return true;
      }
      const hay = [
        row.billNumber,
        row.orderId,
        row.guestName,
        row.roomNumber,
        row.billedTo,
        row.paymentMethod,
        row.paymentStatus,
        row.orderType,
        row.offerApplied
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  get hotelPaymentTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredHotelPaymentRows.length / this.hotelPaymentPageSize));
  }

  get hotelPaymentPageNumbers(): number[] {
    const total = this.hotelPaymentTotalPages;
    const current = this.hotelPaymentPage;
    const pages: number[] = [];
    const start = Math.max(1, current - 1);
    const end = Math.min(total, start + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get pagedHotelPaymentRows(): HotelPaymentRow[] {
    const start = (this.hotelPaymentPage - 1) * this.hotelPaymentPageSize;
    return this.filteredHotelPaymentRows.slice(start, start + this.hotelPaymentPageSize);
  }

  get hotelPaymentShowingLabel(): string {
    const total = this.filteredHotelPaymentRows.length;
    if (total === 0) {
      return 'Showing 0 of 0 results';
    }
    const start = (this.hotelPaymentPage - 1) * this.hotelPaymentPageSize + 1;
    const end = Math.min(this.hotelPaymentPage * this.hotelPaymentPageSize, total);
    return `Showing ${start}-${end} of ${total} results`;
  }

  onHotelPaymentFilterChange(): void {
    this.hotelPaymentPage = 1;
  }

  goHotelPaymentPage(page: number): void {
    if (page < 1 || page > this.hotelPaymentTotalPages) {
      return;
    }
    this.hotelPaymentPage = page;
  }

  paymentStatusClass(status: string): string {
    const s = String(status ?? '').trim().toLowerCase();
    if (s === 'paid') {
      return 'paid';
    }
    if (s === 'failed') {
      return 'failed';
    }
    if (s === 'awaiting payment') {
      return 'awaiting';
    }
    return 'paid';
  }

  formatDiscount(amount: number): string {
    if (!amount) {
      return this.formatInr(0);
    }
    return `- ${this.formatInr(amount)}`;
  }

  openHotelPaymentTimeline(row: HotelPaymentRow): void {
    const trackId = row.task?.id ?? row.task?.task_id ?? null;
    if (trackId == null || trackId === '' || trackId === '—') {
      return;
    }
    this.persistOverviewReturnState();
    this.router.navigate(['/timeline', trackId], {
      queryParams: { from: 'hotel-overview' }
    });
  }

  exportHotelPaymentData(): void {
    const rows = this.filteredHotelPaymentRows;
    const header = [
      'Type',
      'Bill Number',
      'Guest Name',
      'Room Number',
      'Offer',
      'Billed To',
      'Payment Method',
      'Payment Status',
      'Subtotal',
      'Taxes',
      'Discounts',
      'Final Charged Amount'
    ];
    const lines = rows.map((row) =>
      [
        row.orderType,
        row.billNumber,
        row.guestName,
        row.roomNumber,
        row.offerApplied,
        row.billedTo,
        row.paymentMethod,
        row.paymentStatus,
        row.subtotal,
        row.taxes,
        row.discounts,
        row.finalAmount
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotel-payment-details-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openAllEscalations(): void {
    this.escalationPage = 1;
    this.setActiveView('escalations');
  }

  get escalationTotalPages(): number {
    return Math.max(1, Math.ceil(this.escalations.length / this.escalationPageSize));
  }

  get pagedEscalations(): EscalationRow[] {
    const start = (this.escalationPage - 1) * this.escalationPageSize;
    return this.escalations.slice(start, start + this.escalationPageSize);
  }

  get escalationPageNumbers(): number[] {
    const total = this.escalationTotalPages;
    const pages: number[] = [];
    const window = 5;
    let start = Math.max(1, this.escalationPage - Math.floor(window / 2));
    let end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    return pages;
  }

  get escalationShowingLabel(): string {
    if (!this.escalations.length) {
      return 'Showing 0';
    }
    const start = (this.escalationPage - 1) * this.escalationPageSize + 1;
    const end = Math.min(this.escalationPage * this.escalationPageSize, this.escalations.length);
    return `Showing ${start}–${end} of ${this.escalations.length}`;
  }

  goEscalationPage(page: number): void {
    if (page < 1 || page > this.escalationTotalPages) {
      return;
    }
    this.escalationPage = page;
  }

  openUpsellsSold(): void {
    this.upsellPaymentFilter = 'All Payments';
    this.upsellSoldRows = this.overviewService.buildUpsellSoldRows(this.allOrders);
    this.setActiveView('upsells-sold');
  }

  get filteredUpsellSoldRows(): UpsellSoldRow[] {
    if (this.upsellPaymentFilter === 'All Payments') {
      return this.upsellSoldRows;
    }
    return this.upsellSoldRows.filter((row) => row.paymentMethod === this.upsellPaymentFilter);
  }

  openRevenueTrendYear(): void {
    this.revenueTrendYear = new Date().getFullYear();
    this.yearMonthRows = this.overviewService.buildYearMonthlyOrderCounts(
      this.sourceOrders,
      this.revenueTrendYear
    );
    this.setActiveView('revenue-year');
  }

  openTrackOrder(row: KpiListRow): void {
    if (row.trackId == null || row.trackId === '' || row.trackId === '—') {
      return;
    }
    this.persistOverviewReturnState();
    this.router.navigate(['/timeline', row.trackId], {
      queryParams: { from: 'hotel-overview' }
    });
  }

  openEscalationTrack(row: EscalationRow): void {
    const trackId = row?.id;
    if (trackId == null || trackId === '' || trackId === '—') {
      return;
    }
    this.persistOverviewReturnState();
    this.router.navigate(['/timeline', trackId], {
      queryParams: { from: 'hotel-overview' }
    });
  }

  private persistOverviewReturnState(): void {
    try {
      sessionStorage.setItem(
        'overviewReturn',
        JSON.stringify({
          view: this.activeView,
          filterKey: this.activeKpiFilter,
          label: this.activeKpiLabel
        })
      );
    } catch {
      /* ignore storage failures */
    }
  }

  private restoreOverviewReturnState(): void {
    try {
      const raw = sessionStorage.getItem('overviewReturn');
      if (!raw) {
        return;
      }
      sessionStorage.removeItem('overviewReturn');
      const saved = JSON.parse(raw);
      if (
        (saved?.view === 'kpi-list' || saved?.view === 'payment-details') &&
        saved?.filterKey
      ) {
        const kpi = this.kpis.find((item) => item.filterKey === saved.filterKey);
        if (kpi) {
          // Defer until metrics are loaded
          this.pendingKpiRestore = saved.filterKey;
          this.pendingKpiLabel = saved.label || kpi.label;
        }
      }
    } catch {
      /* ignore */
    }
  }

  private applyPendingKpiRestore(): void {
    if (!this.pendingKpiRestore) {
      return;
    }
    const kpi = this.kpis.find((item) => item.filterKey === this.pendingKpiRestore);
    if (kpi) {
      if (kpi.filterKey === 'revenue') {
        this.openPaymentDetails();
      } else {
        this.activeKpiFilter = kpi.filterKey;
        this.activeKpiLabel = this.pendingKpiLabel || kpi.label;
        this.kpiListRows = this.buildTaskRows(this.filterTasks(kpi.filterKey));
        this.setActiveView('kpi-list');
      }
    }
    this.pendingKpiRestore = null;
    this.pendingKpiLabel = '';
  }

  private loadDashboardAccessAndMetrics(soft = false): void {
    if (soft) {
      if (this.refreshing) {
        return;
      }
      this.refreshing = true;
    } else {
      this.loading = true;
    }
    this.loadError = '';

    this.overviewService.fetchCustomerByLoginId().subscribe({
      next: (customerResp) => {
        const customer = customerResp?.result?.data?.[0];
        const memberId = (
          customer?.customer_member_id ||
          this.overviewService.getMemberId() ||
          ''
        ).trim();

        if (!memberId) {
          this.loading = false;
          this.refreshing = false;
          this.loadError = 'Member ID not found for this account.';
          return;
        }

        forkJoin({
          orders: this.overviewService
            .fetchOrdersByCustomerMemberId(memberId)
            .pipe(catchError(() => of(null))),
          tasks: this.overviewService
            .fetchAllTasks(memberId)
            .pipe(catchError(() => of(null))),
          offerCount: this.fbDashboardService
            .fetchOffersByOutlet()
            .pipe(catchError(() => of(0))),
          checkoutReviews: this.overviewService
            .fetchCheckoutFeedbackReviews(memberId)
            .pipe(catchError(() => of(null))),
          staff: this.overviewService
            .fetchHotelStaff(memberId)
            .pipe(catchError(() => of([]))),
          appOrders: this.overviewService
            .fetchAppConfirmedOrders(memberId)
            .pipe(catchError(() => of(null)))
        })
          .pipe(finalize(() => {
            this.loading = false;
            this.refreshing = false;
          }))
          .subscribe({
            next: ({ orders, tasks, offerCount, checkoutReviews, staff, appOrders }) => {
              this.catalogOfferCount = Number(offerCount) || 0;
              this.sourceTasks =
                tasks?.success === 1 || tasks?.success === true ? tasks.result?.data || [] : [];
              this.sourceOrders =
                orders?.success === 1 || orders?.success === true
                  ? (orders.result?.data || []).filter(
                    (order: any) => String(order?.status ?? '').trim() === 'Order Confirmed'
                  )
                  : [];
              this.sourceCheckoutReviews =
                checkoutReviews?.success === 1 || checkoutReviews?.success === true
                  ? checkoutReviews.result?.data || []
                  : [];
              this.staffDirectory = staff || [];
              this.sourceAppOrders =
                appOrders?.success === 1 || appOrders?.success === true
                  ? appOrders.result?.data || []
                  : [];

              this.applyPeriodFilter();
              this.applyPendingKpiRestore();
            },
            error: () => {
              this.loadError = 'Unable to load dashboard metrics.';
            }
          });
      },
      error: () => {
        this.loading = false;
        this.refreshing = false;
        this.loadError = 'Unable to verify user access.';
      }
    });
  }

  onPeriodChange(): void {
    this.syncPeriodDateInputs();
    this.periodState.apply(this.selectedPeriod, this.customFrom, this.customTo);
    this.selectedPeriod = this.periodState.selectedPeriod;
    this.customFrom = this.periodState.customFrom;
    this.customTo = this.periodState.customTo;
    // Date Range waits until both From and To are picked.
    if (this.isIncompleteDateRange()) {
      return;
    }
    // APIs return all docs; period (Today / Week / Month / …) is applied on the UI.
    this.applyPeriodFilter();
  }

  onCustomRangeChange(): void {
    this.periodState.setCustomRange(this.customFrom, this.customTo);
    this.customFrom = this.periodState.customFrom;
    this.customTo = this.periodState.customTo;
    if (this.selectedPeriod === 'For Date' && this.customFrom) {
      this.applyPeriodFilter();
      return;
    }
    if (
      (this.selectedPeriod === 'Date Range' || this.selectedPeriod === 'Custom Range') &&
      this.customFrom &&
      this.customTo
    ) {
      this.applyPeriodFilter();
    }
  }

  private isIncompleteDateRange(): boolean {
    return (
      (this.selectedPeriod === 'Date Range' || this.selectedPeriod === 'Custom Range') &&
      (!this.customFrom || !this.customTo)
    );
  }

  private syncPeriodDateInputs(): void {
    const now = new Date();
    if (this.selectedPeriod === 'For Date') {
      if (!this.customFrom) {
        this.customFrom = this.toInputDate(now);
      }
      this.customTo = this.customFrom;
      return;
    }
    if (this.selectedPeriod === 'Date Range' || this.selectedPeriod === 'Custom Range') {
      // From/To stay empty until the user picks both.
      return;
    }
    this.customFrom = '';
    this.customTo = '';
  }

  private applyPeriodFilter(): void {
    if (this.isIncompleteDateRange()) {
      return;
    }
    const range = this.overviewService.resolvePeriodRange(
      this.selectedPeriod,
      this.customFrom,
      this.customTo
    );
    this.periodLabel = range.label;
    const filteredTasks = this.overviewService.filterTasksByDateRange(
      this.sourceTasks,
      range.start,
      range.end,
      !!range.unbounded
    );
    const filteredOrders = this.overviewService.filterOrdersByDateRange(
      this.sourceOrders,
      range.start,
      range.end,
      !!range.unbounded
    );
    this.applyTaskMetrics(filteredTasks, range.label);
    this.applyOrderRevenue(filteredOrders, this.catalogOfferCount);
    this.applyGuestSatisfaction(range.start, range.end, !!range.unbounded);
    this.applyAppRevenue(range.start, range.end, !!range.unbounded);
    if (this.selectedStaff && this.activeView === 'staff-performance') {
      this.staffPerformance = this.overviewService.buildStaffPerformance(
        this.selectedStaff.id,
        this.allTasks
      );
    }
    if (this.activeView === 'payment-details') {
      this.hotelPaymentRows = this.fbDashboardService.buildHotelPaymentRows(
        this.allOrders,
        this.allTasks
      );
      this.hotelPaymentPage = 1;
    }
  }

  private applyAppRevenue(start: Date, end: Date, unbounded: boolean): void {
    const built = this.overviewService.buildAppRevenueReport(this.sourceAppOrders);
    const filteredRows = this.overviewService.filterAppRevenueByDateRange(
      built.rows,
      start,
      end,
      unbounded
    );
    this.appRevenueReport = this.overviewService.buildAppRevenueReport(
      filteredRows.map((r) => r.order)
    );
    this.appRevenueRows = this.appRevenueReport.rows;
    if (this.appRevenuePage > this.appRevenueTotalPages) {
      this.appRevenuePage = this.appRevenueTotalPages;
    }
  }

  private applyGuestSatisfaction(start: Date, end: Date, unbounded: boolean): void {
    // Enrich against full hotel task set (stay context), then filter reviews by period.
    const built = this.overviewService.buildGuestSatisfactionRows(
      this.sourceCheckoutReviews,
      this.sourceTasks
    );
    this.guestSatisfactionRows = this.overviewService.filterGuestSatisfactionByDateRange(
      built,
      start,
      end,
      unbounded
    );
    this.guestSatisfactionSummary = this.overviewService.summarizeGuestSatisfaction(
      this.guestSatisfactionRows
    );
    if (this.satisfactionPage > this.satisfactionTotalPages) {
      this.satisfactionPage = this.satisfactionTotalPages;
    }
  }

  private toInputDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private applyTaskMetrics(tasks: any[], panelDateLabel?: string): void {
    this.allTasks = tasks || [];
    const total = this.allTasks.length;
    const status = (t: any) => String(t?.status ?? '').trim();

    const delayed = this.allTasks.filter((t) => this.overviewService.isDelayedTask(t)).length;
    const escalated = this.allTasks.filter((t) => this.overviewService.isEscalatedTask(t)).length;
    const pending = this.allTasks.filter((t) => status(t) === 'Processing').length;
    const completed = this.allTasks.filter(
      (t) => status(t) === 'Completed' || status(t) === 'Delivered'
    ).length;

    const completionPct = total ? Math.round((completed / total) * 100) : 0;
    const pendingPct = total ? Math.round((pending / total) * 100) : 0;
    const escalatedPct = total ? Math.round((escalated / total) * 100) : 0;
    const delayedPct = total ? Math.round((delayed / total) * 100) : 0;

    this.setKpi('Total Orders / Requests', String(total), `${this.periodLabel} · service tasks`);
    this.setKpi('Completed', String(completed), `${completionPct}% completion rate`);
    this.setKpi('Pending', String(pending), `${pendingPct}% pending`);
    this.setKpi('Escalated', String(escalated), `${escalatedPct}% escalated`);
    this.setKpi('Delayed', String(delayed), `${delayedPct}% delayed`);

    this.escalations = this.overviewService.buildRecentEscalationRows(this.allTasks, 500);
    this.recentEscalations = this.escalations.slice(0, this.escalationHomeLimit);
    if (this.escalationPage > this.escalationTotalPages) {
      this.escalationPage = this.escalationTotalPages;
    }
    this.departments = this.overviewService.buildDepartmentOverview(this.allTasks);
    this.todayPanels = this.overviewService.buildDepartmentStatusPanels(
      this.allTasks,
      panelDateLabel || this.periodLabel
    );
    this.fnbStatusDonutSlices = this.buildStatusDonutSlices(this.todayPanels.fnb);
    this.hkStatusDonutSlices = this.buildStatusDonutSlices(this.todayPanels.hk);
    this.foStatusDonutSlices = this.buildStatusDonutSlices(this.todayPanels.fo);
    this.refreshFoKeyServices(this.allTasks);
    this.onStatusDonutLeave();
  }

  private refreshFoKeyServices(tasks: any[]): void {
    const lateCheckout = (tasks || []).filter((task) => {
      const belongs = String(task?.service?.belongs_to ?? '')
        .trim()
        .toLowerCase();
      const name = String(task?.service?.service_name ?? '')
        .trim()
        .toLowerCase();
      return belongs === 'late checkout' || name === 'late checkout';
    }).length;

    this.foKeyServiceRows = [
      {
        label: 'Mobile Key (Check-in)',
        value: 0,
        icon: 'bi bi-phone',
        cssClass: 'fo-key-card--keys'
      },
      {
        label: 'App Check-outs',
        value: 0,
        icon: 'bi bi-phone',
        cssClass: 'fo-key-card--checkout'
      },
      {
        label: 'Late Check-out & Payments',
        value: lateCheckout,
        icon: 'bi bi-clock',
        cssClass: 'fo-key-card--late'
      }
    ];
  }

  private applyOrderRevenue(orders: any[], catalogOfferCount = 0): void {
    this.allOrders = orders || [];
    // Revenue Trend is always last 6 calendar months (not tied to period filter)
    this.revenueTrendMonths = this.overviewService.buildRevenueTrendLast6Months(this.sourceOrders);
    const offers = this.overviewService.buildOffersPerformance(this.allOrders, catalogOfferCount);
    this.offerPerf = {
      totalOffers: offers.totalOffers,
      offersSold: offers.offersSold,
      conversionPct: offers.conversionPct,
      revenueLabel: offers.revenueLabel,
      items: offers.items
    };
    const breakdown = this.overviewService.sumRevenueByPurpose(this.allOrders);
    const { total, count, food, offer } = breakdown;

    this.setKpi(
      'Total Revenue',
      this.formatInrCompact(total),
      count === 1 ? '1 order' : `${count} orders`
    );

    this.revenueTotalLabel = this.formatInrCompact(total);
    const foodPct = total ? Math.round((food / total) * 100) : 0;
    const offerPct = total ? Math.round((offer / total) * 100) : 0;
    const foodOfferTotal = food + offer;
    const foodSlice = foodOfferTotal ? Math.round((food / foodOfferTotal) * 100) : 0;

    this.revenueLegend = [
      {
        color: '#f39a24',
        name: 'Food',
        amount: this.formatInrCompact(food),
        pct: `${foodPct}%`
      },
      {
        color: '#218a62',
        name: 'Upsell',
        amount: this.formatInrCompact(offer),
        pct: `${offerPct}%`
      }
    ];

    this.revenueDonutStyle =
      foodOfferTotal === 0
        ? 'conic-gradient(#dce5ec 0 100%)'
        : `conic-gradient(#f39a24 0 ${foodSlice}%, #218a62 ${foodSlice}% 100%)`;

    this.revenueDonutSlices = buildDonutSlices([
      { label: 'Food', value: food, color: '#f39a24' },
      { label: 'Upsell', value: offer, color: '#218a62' }
    ]);
  }

  openFeaturesUpselling(): void {
    this.router.navigate(['/features']);
  }

  private filterTasks(filterKey: KpiFilterKey): any[] {
    const status = (t: any) => String(t?.status ?? '').trim();
    switch (filterKey) {
      case 'completed':
        return this.allTasks.filter(
          (t) => status(t) === 'Completed' || status(t) === 'Delivered'
        );
      case 'pending':
        return this.allTasks.filter((t) => status(t) === 'Processing');
      case 'escalated':
        return this.allTasks.filter((t) => this.overviewService.isEscalatedTask(t));
      case 'delayed':
        return this.allTasks.filter((t) => this.overviewService.isDelayedTask(t));
      case 'all':
      default:
        return [...this.allTasks];
    }
  }

  private buildTaskRows(tasks: any[]): KpiListRow[] {
    return (tasks || []).map((task) => {
      const status = String(task?.status ?? '').trim() || '—';
      const trackId = task?.id ?? task?.task_id ?? null;
      return {
        id: String(trackId ?? '—'),
        trackId,
        datetime: [task?.order_date || '—', formatAmPmTime(task?.order_time)]
          .filter(Boolean)
          .join(' ')
          .trim(),
        dept: String(task?.service?.belongs_to || task?.department || '—'),
        details: String(
          task?.service?.service_name ||
          task?.request_details ||
          task?.description ||
          '—'
        ),
        status,
        statusClass: this.statusClass(status),
        meta: String(task?.room_no || task?.room_number || task?.guest_name || '—')
      };
    });
  }

  statusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('escalat')) return '';
    if (normalized.includes('delay') || normalized.includes('pending') || normalized === 'processing') {
      return 'warn';
    }
    if (normalized.includes('complet') || normalized.includes('deliver')) {
      return 'info';
    }
    return 'info';
  }

  formatInr(amount: number | null | undefined | string): string {
    return formatInrSafe(amount);
  }

  /** KPI / donut — short form for crore-scale totals. */
  formatInrCompact(amount: number | null | undefined | string): string {
    return formatInrSafe(amount, { compact: true });
  }

  private setKpi(label: string, value: string, note: string): void {
    const kpi = this.kpis.find((k) => k.label === label);
    if (kpi) {
      kpi.value = value;
      kpi.note = note;
    }
  }

  openDepartment(name: string): void {
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
