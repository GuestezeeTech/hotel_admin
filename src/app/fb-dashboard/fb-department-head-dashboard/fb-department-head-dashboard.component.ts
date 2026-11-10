import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  DelayedReportRow,
  DeliveryReportRow,
  EscalationReportRow,
  FbDashboardService,
  FnbLiveStatusRow,
  FnbOrderEscalationOverview,
  FnbRecentEscalationRow,
  FnbTodayOrderSummary,
  FnbTrackingRow,
  IrdEscalationRow,
  IrdOrderReportRow,
  IrdPaymentRow,
  OfferPaymentReportRow,
  OfferReportRow
} from '../fb-dashboard.service';
import { formatAmPmTime } from '../../shared/time-format.util';
import { formatInr as formatInrSafe } from '../../shared/inr-format.util';
import { buildDonutSlices, DonutSliceView } from '../../shared/donut-slices.util';
import { DashboardRefreshSource } from '../../shared/dashboard-refresh/dashboard-refresh-button.component';
import { DashboardPeriodControlsComponent } from '../../shared/dashboard-period/dashboard-period-controls.component';
import { DashboardPeriodStateService } from '../../shared/dashboard-period/dashboard-period-state.service';
import { scrollAppToTop } from '../../shared/scroll-to-top.util';
import { HotelOverviewDashboardService } from '../../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.service';

type FbKpiKey = 'orders' | 'offers' | 'offer-payments' | 'payments' | 'delayed' | 'escalated' | 'delivered';
type FbView = 'home' | 'kpi-list' | 'ird-payments';
type OfferReportTab = 'offers' | 'payments';

@Component({
  selector: 'app-fb-department-head-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardPeriodControlsComponent],
  templateUrl: './fb-department-head-dashboard.component.html',
  styleUrl: './fb-department-head-dashboard.component.scss'
})
export class FbDepartmentHeadDashboardComponent implements OnInit {
  get pageLoading(): boolean {
    return !this.hasLoadedOnce && (this.offerCountLoading || this.loadingTasks);
  }

  refreshing = false;
  selectedPeriod = 'Today';
  customFrom = '';
  customTo = '';
  periodLabel = 'Today';
  private hasLoadedOnce = false;
  private sourceTasks: any[] = [];
  private sourceOrders: any[] = [];

  activeView: FbView = 'home';
  activeKpiKey: FbKpiKey | null = null;
  activeKpiLabel = '';
  kpiListRows: FnbTrackingRow[] = [];
  offerReportTab: OfferReportTab = 'offers';

  irdOrderReportRows: IrdOrderReportRow[] = [];
  offerReportRows: OfferReportRow[] = [];
  offerPaymentReportRows: OfferPaymentReportRow[] = [];
  delayedReportRows: DelayedReportRow[] = [];
  deliveryReportRows: DeliveryReportRow[] = [];
  escalationReportRows: EscalationReportRow[] = [];

  trackingMode: 'Orders' | 'Escalations' = 'Orders';
  irdTab: 'Orders' | 'Escalations' = 'Orders';

  restaurantFilter = 'All Restaurants';
  typeFilter = 'All Order Types';
  paymentFilter: 'All Payments' | 'Online Payment' | 'Bill To Room' = 'All Payments';

  loadingTasks = true;
  loadError = '';

  showModal = false;
  modalTitle = '';
  modalBodyHtml = '';

  restaurants: string[] = ['All Restaurants'];
  orderTypes: string[] = ['All Order Types'];

  private menuOrderingTasks: any[] = [];
  private irdOrders: any[] = [];
  private sourceOfferOrders: any[] = [];
  private offerCatalog: any[] = [];
  private offerOrders: any[] = [];
  orderRows: FnbTrackingRow[] = [];
  escalationRows: FnbTrackingRow[] = [];
  irdPaymentRows: IrdPaymentRow[] = [];
  irdEscalationRows: IrdEscalationRow[] = [];

  recentEscalations: FnbRecentEscalationRow[] = [];
  todayOrderSummary: FnbTodayOrderSummary = {
    dateLabel: '—',
    totalActive: 0,
    preparing: 0,
    outForDelivery: 0,
    escalated: 0,
    completedToday: 0
  };
  orderEscalationOverview: FnbOrderEscalationOverview = {
    total: 0,
    orders: 0,
    escalations: 0,
    onTrack: 0,
    ordersPct: 0,
    escalationsPct: 0,
    donutStyle: 'conic-gradient(#dce5ec 0 100%)'
  };
  liveStatusRows: FnbLiveStatusRow[] = [];
  overviewDonutSlices: DonutSliceView[] = [];
  liveStatusDonutSlices: DonutSliceView[] = [];
  hoveredChart: 'overview' | 'live' | null = null;
  hoveredDonutLabel: string | null = null;
  hoveredDonutValue: string | null = null;

  get liveStatusTotal(): number {
    return this.liveStatusRows.reduce((sum, row) => sum + (row.count || 0), 0);
  }

  offerCountLabel = '—';
  offerCountLoading = true;

  offerPaymentAmountLabel = '—';
  offerPaymentOrderNote = 'Order Confirmed · 0 orders';
  offerPaymentLoading = true;

  irdPaymentAmountLabel = '—';
  irdPaidOrderCount = 0;

  taskReportCounts = { delayed: 0, escalated: 0, delivered: 0, orders: 0 };

  irdSearch = '';
  irdDateRange = 'Today';
  irdCustomFrom = '';
  irdCustomTo = '';
  irdPaymentMethod = 'All Methods';
  irdStatus = 'All Status';
  irdRoom = 'All Rooms';
  irdPage = 1;
  readonly irdPageSize = 20;

  /** Offer Payment Report — Paid / Failed listing filter (counts stay Paid-only). */
  offerPaymentStatus: 'All Status' | 'Paid' | 'Failed' = 'All Status';

  constructor(
    private fbDashboardService: FbDashboardService,
    private overviewService: HotelOverviewDashboardService,
    private periodState: DashboardPeriodStateService,
    private router: Router
  ) {
    this.periodState.hydrate(this);
  }

  ngOnInit(): void {
    this.loadOfferCatalogAndPayments();
    this.loadFbLiveData(false);
  }

  onDashboardRefresh(_source: DashboardRefreshSource): void {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    this.loadOfferCatalogAndPayments();
    this.loadFbLiveData(true);
  }

  onPeriodChange(): void {
    this.syncPeriodDateInputs();
    this.periodState.apply(this.selectedPeriod, this.customFrom, this.customTo);
    this.selectedPeriod = this.periodState.selectedPeriod;
    this.customFrom = this.periodState.customFrom;
    this.customTo = this.periodState.customTo;
    if (this.isIncompleteDateRange()) {
      return;
    }
    this.applyPeriodFilter();
    this.applyOfferPeriodFilter();
  }

  onCustomRangeChange(): void {
    this.periodState.setCustomRange(this.customFrom, this.customTo);
    this.customFrom = this.periodState.customFrom;
    this.customTo = this.periodState.customTo;
    if (this.selectedPeriod === 'For Date' && this.customFrom) {
      this.applyPeriodFilter();
      this.applyOfferPeriodFilter();
      return;
    }
    if (
      (this.selectedPeriod === 'Date Range' || this.selectedPeriod === 'Custom Range') &&
      this.customFrom &&
      this.customTo
    ) {
      this.applyPeriodFilter();
      this.applyOfferPeriodFilter();
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

  openKpi(key: FbKpiKey): void {
    if (key === 'payments') {
      this.openIrdPayments('Orders');
      return;
    }
    const labels: Record<FbKpiKey, string> = {
      orders: 'IRD Order Report',
      offers: 'Restaurant Offer Report',
      'offer-payments': 'Offer Payment Report',
      payments: 'IRD Payment Details',
      delayed: 'Delayed Report',
      escalated: 'Escalation Report',
      delivered: 'Delivery Report'
    };
    this.activeKpiKey = key;
    this.activeKpiLabel = labels[key];
    this.offerReportTab = key === 'offer-payments' ? 'payments' : 'offers';
    this.refreshReportRows();
    this.activeView = 'kpi-list';
    scrollAppToTop();
  }

  setOfferReportTab(tab: OfferReportTab): void {
    this.offerReportTab = tab;
    this.activeKpiKey = tab === 'payments' ? 'offer-payments' : 'offers';
    this.activeKpiLabel = tab === 'payments' ? 'Offer Payment Report' : 'Restaurant Offer Report';
    if (tab === 'payments') {
      this.offerPaymentStatus = 'All Status';
    }
  }

  openIrdPayments(tab: 'Orders' | 'Escalations' = 'Orders'): void {
    this.irdTab = tab;
    this.irdPage = 1;
    this.activeView = 'ird-payments';
    scrollAppToTop();
  }

  backToHome(): void {
    this.activeView = 'home';
    this.activeKpiKey = null;
    this.activeKpiLabel = '';
    this.kpiListRows = [];
    this.offerReportTab = 'offers';
    this.offerPaymentStatus = 'All Status';
    scrollAppToTop();
  }

  get activeReportCount(): number {
    switch (this.activeKpiKey) {
      case 'orders':
        return this.irdOrderReportRows.length;
      case 'offers':
        return this.offerReportTab === 'payments'
          ? this.filteredOfferPaymentReportRows.length
          : this.offerReportRows.length;
      case 'offer-payments':
        return this.filteredOfferPaymentReportRows.length;
      case 'delayed':
        return this.delayedReportRows.length;
      case 'escalated':
        return this.escalationReportRows.length;
      case 'delivered':
        return this.deliveryReportRows.length;
      default:
        return this.kpiListRows.length;
    }
  }

  get offerPaymentStatusOptions(): Array<'All Status' | 'Paid' | 'Failed'> {
    return ['All Status', 'Paid', 'Failed'];
  }

  get filteredOfferPaymentReportRows(): OfferPaymentReportRow[] {
    return (this.offerPaymentReportRows || []).filter((row) => {
      if (this.offerPaymentStatus === 'All Status') {
        return true;
      }
      return row.paymentStatus === this.offerPaymentStatus;
    });
  }

  /** Paid offer payments only — never Failed (KPI / Guest Claimed). */
  get paidOfferPaymentCount(): number {
    return (this.offerPaymentReportRows || []).filter((row) => row.paymentStatus === 'Paid').length;
  }

  openOrderReportTimeline(row: { task?: any | null }): void {
    const taskId = row?.task?.id ?? null;
    if (taskId == null || taskId === '') {
      return;
    }
    this.router.navigate(['/timeline', taskId], {
      queryParams: { from: 'fb-dashboard' }
    });
  }

  setIrdTab(tab: 'Orders' | 'Escalations'): void {
    this.irdTab = tab;
    this.irdPage = 1;
  }

  openTrackOrder(row: FnbTrackingRow): void {
    const taskId = row?.task?.id ?? null;
    if (taskId == null || taskId === '') {
      return;
    }
    this.router.navigate(['/timeline', taskId], {
      queryParams: { from: 'fb-dashboard' }
    });
  }

  openRecentEscalation(row: FnbRecentEscalationRow): void {
    const taskId = row?.task?.id ?? row?.taskId ?? null;
    if (taskId == null || taskId === '' || taskId === '—') {
      return;
    }
    this.router.navigate(['/timeline', taskId], {
      queryParams: { from: 'fb-dashboard' }
    });
  }

  openIrdOrderTimeline(row: IrdPaymentRow | IrdEscalationRow): void {
    const taskId = row?.task?.id ?? null;
    if (taskId == null || taskId === '') {
      return;
    }
    this.router.navigate(['/timeline', taskId], {
      queryParams: { from: 'fb-dashboard' }
    });
  }

  private refreshReportRows(): void {
    const tasks = this.menuOrderingTasks || [];
    const orders = this.irdOrders || [];
    this.irdOrderReportRows = this.fbDashboardService.buildIrdOrderReportRows(orders, tasks);
    this.offerReportRows = this.fbDashboardService.buildOfferReportRows(
      this.offerCatalog,
      this.offerOrders
    );
    this.offerPaymentReportRows = this.fbDashboardService.buildOfferPaymentReportRows(
      this.offerOrders,
      tasks
    );
    this.delayedReportRows = this.fbDashboardService.buildDelayedReportRows(tasks);
    this.deliveryReportRows = this.fbDashboardService.buildDeliveryReportRows(tasks);
    this.escalationReportRows = this.fbDashboardService.buildEscalationReportRows(tasks);
  }

  private loadOfferCatalogAndPayments(): void {
    this.offerCountLoading = true;
    this.offerPaymentLoading = true;
    forkJoin({
      offers: this.fbDashboardService.fetchOffersList().pipe(catchError(() => of([]))),
      offerOrders: this.fbDashboardService.fetchOfferOrders().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ offers, offerOrders }) => {
        this.offerCatalog = offers || [];
        this.sourceOfferOrders = offerOrders || [];
        this.offerCountLabel = this.offerCatalog.length.toLocaleString('en-IN');
        this.offerCountLoading = false;
        this.applyOfferPeriodFilter();
        this.offerPaymentLoading = false;
        if (this.activeView === 'kpi-list') {
          this.refreshReportRows();
        }
      },
      error: () => {
        this.offerCatalog = [];
        this.sourceOfferOrders = [];
        this.offerOrders = [];
        this.offerCountLabel = '0';
        this.offerPaymentAmountLabel = this.formatInr(0);
        this.offerPaymentOrderNote = 'Order Confirmed · 0 orders';
        this.offerCountLoading = false;
        this.offerPaymentLoading = false;
      }
    });
  }

  private applyOfferPeriodFilter(): void {
    const range = this.overviewService.resolvePeriodRange(
      this.selectedPeriod,
      this.customFrom,
      this.customTo
    );
    this.offerOrders = this.overviewService.filterOrdersByDateRange(
      this.sourceOfferOrders,
      range.start,
      range.end,
      !!range.unbounded
    );
    const paid = this.offerOrders.filter((o) => this.fbDashboardService.isOfferPaidOrder(o));
    const { total, count } = this.overviewService.sumOrderConfirmedRevenue(paid);
    this.offerPaymentAmountLabel = this.formatInrCompact(total);
    this.offerPaymentOrderNote =
      count === 1 ? 'Paid · 1 order' : `Paid · ${count} orders`;
  }

  formatInr(amount: number | null | undefined | string): string {
    return formatInrSafe(amount);
  }

  /** KPI cards — compact for large totals (L / Cr). */
  formatInrCompact(amount: number | null | undefined | string): string {
    return formatInrSafe(amount, { compact: true });
  }

  formatDiscount(amount: number): string {
    const value = Number(String(amount ?? '').replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) {
      return this.formatInr(0);
    }
    return `- ${this.formatInr(value)}`;
  }

  get filteredTrackingRows(): FnbTrackingRow[] {
    const source = this.trackingMode === 'Escalations' ? this.escalationRows : this.orderRows;
    return source.filter((row) => {
      if (this.restaurantFilter !== 'All Restaurants' && row.restaurant !== this.restaurantFilter) {
        return false;
      }
      // Payment method filter on Orders tab (Online Payment / Bill To Room)
      if (
        this.trackingMode === 'Orders' &&
        this.paymentFilter !== 'All Payments' &&
        row.type !== this.paymentFilter
      ) {
        return false;
      }
      // Issue types filter only on Escalations tab
      if (
        this.trackingMode === 'Escalations' &&
        this.typeFilter !== 'All Order Types' &&
        row.type !== this.typeFilter
      ) {
        return false;
      }
      return true;
    });
  }

  get escalationTypeOptions(): string[] {
    return this.orderTypes;
  }

  onDonutEnter(chart: 'overview' | 'live', slice: DonutSliceView): void {
    this.hoveredChart = chart;
    this.hoveredDonutLabel = slice.label;
    this.hoveredDonutValue = `${slice.value} · ${slice.pct}%`;
  }

  onDonutLeave(): void {
    this.hoveredChart = null;
    this.hoveredDonutLabel = null;
    this.hoveredDonutValue = null;
  }

  get irdPaymentMethodOptions(): string[] {
    const methods = new Set<string>();
    for (const row of this.irdPaymentRows) {
      if (row.paymentMethod) {
        methods.add(row.paymentMethod);
      }
    }
    return ['All Methods', ...[...methods].sort((a, b) => a.localeCompare(b))];
  }

  get irdStatusOptions(): string[] {
    // Always expose Paid / Failed for payment listing filter
    const statuses = new Set<string>(['Paid', 'Failed']);
    for (const row of this.irdPaymentRows) {
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

  get irdRoomOptions(): string[] {
    const rooms = new Set<string>();
    for (const row of this.irdPaymentRows) {
      if (row.roomNumber && row.roomNumber !== '—') {
        rooms.add(String(row.roomNumber));
      }
    }
    return ['All Rooms', ...[...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }

  get filteredIrdPaymentRows(): IrdPaymentRow[] {
    const q = this.irdSearch.trim().toLowerCase();
    return this.irdPaymentRows.filter((row) => {
      if (this.irdPaymentMethod !== 'All Methods' && row.paymentMethod !== this.irdPaymentMethod) {
        return false;
      }
      if (this.irdStatus !== 'All Status' && row.paymentStatus !== this.irdStatus) {
        return false;
      }
      if (this.irdRoom !== 'All Rooms' && String(row.roomNumber) !== this.irdRoom) {
        return false;
      }
      if (this.irdDateRange !== 'All Dates' && !this.matchesDateRange(row.createdOn, this.irdDateRange)) {
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
        row.paymentStatus
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  get filteredIrdEscalationRows(): IrdEscalationRow[] {
    const q = this.irdSearch.trim().toLowerCase();
    return this.irdEscalationRows.filter((row) => {
      if (this.irdRoom !== 'All Rooms' && String(row.roomNumber) !== this.irdRoom) {
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
        row.issue,
        row.escalatedFrom,
        row.escalatedTo,
        row.remark,
        row.status
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  get irdTotalResults(): number {
    return this.irdTab === 'Orders'
      ? this.filteredIrdPaymentRows.length
      : this.filteredIrdEscalationRows.length;
  }

  get irdTotalPages(): number {
    return Math.max(1, Math.ceil(this.irdTotalResults / this.irdPageSize));
  }

  get irdPageNumbers(): number[] {
    const total = this.irdTotalPages;
    const current = this.irdPage;
    const pages: number[] = [];
    const start = Math.max(1, current - 1);
    const end = Math.min(total, start + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get pagedIrdPaymentRows(): IrdPaymentRow[] {
    const start = (this.irdPage - 1) * this.irdPageSize;
    return this.filteredIrdPaymentRows.slice(start, start + this.irdPageSize);
  }

  get pagedIrdEscalationRows(): IrdEscalationRow[] {
    const start = (this.irdPage - 1) * this.irdPageSize;
    return this.filteredIrdEscalationRows.slice(start, start + this.irdPageSize);
  }

  get irdShowingLabel(): string {
    const total = this.irdTotalResults;
    if (total === 0) {
      return 'Showing 0 of 0 results';
    }
    const start = (this.irdPage - 1) * this.irdPageSize + 1;
    const end = Math.min(this.irdPage * this.irdPageSize, total);
    return `Showing ${start}-${end} of ${total} results`;
  }

  onIrdFilterChange(): void {
    this.irdPage = 1;
  }

  goIrdPage(page: number): void {
    if (page < 1 || page > this.irdTotalPages) {
      return;
    }
    this.irdPage = page;
  }

  setTracking(mode: 'Orders' | 'Escalations'): void {
    this.trackingMode = mode;
    if (mode === 'Orders') {
      this.typeFilter = 'All Order Types';
    } else {
      this.paymentFilter = 'All Payments';
    }
  }

  openTrackingRow(row: FnbTrackingRow): void {
    if (this.trackingMode === 'Escalations') {
      this.openTrackOrder(row);
    }
  }

  openTrackingAction(event: Event, row: FnbTrackingRow): void {
    event.stopPropagation();
    if (this.trackingMode === 'Escalations') {
      this.openTrackOrder(row);
      return;
    }
    this.openDetail(row.id);
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

  openDetail(id: string): void {
    const row = [...this.orderRows, ...this.escalationRows].find((x) => x.id === id);
    if (!row) {
      return;
    }
    const task = row.task;
    const room = task?.room_no != null && task?.room_no !== '' ? `Room ${task.room_no}` : '—';
    this.modalTitle = `Details — ${row.id}`;
    this.modalBodyHtml =
      `<b>Restaurant / Outlet:</b> ${row.restaurant}<br><br>` +
      `<b>Type:</b> ${row.type}<br><br>` +
      `<b>${room}</b><br><br>` +
      `<b>Status:</b> ${row.status}<br><br>` +
      `<b>Updated:</b> ${row.time}<br><br>` +
      `<b>Guest:</b> ${task?.guest_name || task?.guest?.guest_name || '—'}`;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  exportIrdData(): void {
    const rows =
      this.irdTab === 'Orders' ? this.filteredIrdPaymentRows : this.filteredIrdEscalationRows;
    if (!rows.length) {
      return;
    }

    let csv = '';
    if (this.irdTab === 'Orders') {
      csv =
        'Bill Number,Guest Name,Room Number,Billed To,Payment Method,Payment Status,Subtotal,Taxes,Discounts,Final Charged Amount\n';
      for (const row of rows as IrdPaymentRow[]) {
        csv +=
          [
            row.billNumber,
            row.guestName,
            row.roomNumber,
            row.billedTo,
            row.paymentMethod,
            row.paymentStatus,
            row.subtotal,
            row.taxes,
            row.discounts,
            row.finalAmount
          ]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',') + '\n';
      }
    } else {
      csv =
        'Order / Bill,Guest Name,Room Number,Issue,Escalated From,Escalated To,Remark,Status,Time\n';
      for (const row of rows as IrdEscalationRow[]) {
        csv +=
          [
            row.billNumber,
            row.guestName,
            row.roomNumber,
            row.issue,
            row.escalatedFrom,
            row.escalatedTo,
            row.remark,
            row.status,
            row.time
          ]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',') + '\n';
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.irdTab === 'Orders' ? 'ird-payment-orders.csv' : 'ird-payment-escalations.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  onIrdDatePresetChange(): void {
    const now = new Date();
    if (this.irdDateRange === 'For Date') {
      if (!this.irdCustomFrom) {
        this.irdCustomFrom = this.toInputDate(now);
      }
      this.irdCustomTo = this.irdCustomFrom;
      this.onIrdFilterChange();
      return;
    }
    if (this.irdDateRange === 'Date Range') {
      // Start empty; filter applies when both From and To are set.
      this.irdCustomFrom = '';
      this.irdCustomTo = '';
      return;
    }
    this.irdCustomFrom = '';
    this.irdCustomTo = '';
    this.onIrdFilterChange();
  }

  onIrdParticularDateChange(): void {
    this.irdCustomTo = this.irdCustomFrom;
    this.onIrdFilterChange();
  }

  onIrdFromChange(): void {
    // Selecting/changing From clears To.
    this.irdCustomTo = '';
  }

  onIrdToChange(): void {
    if (this.irdCustomFrom && this.irdCustomTo) {
      this.onIrdFilterChange();
    }
  }

  private matchesDateRange(createdOn: string, range: string): boolean {
    if (!createdOn) {
      return false;
    }
    const created = new Date(createdOn);
    if (Number.isNaN(created.getTime())) {
      return false;
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === 'Today') {
      return created >= startOfToday;
    }
    if (range === 'This Week') {
      const start = new Date(startOfToday);
      const day = start.getDay();
      const diffToMon = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diffToMon);
      return created >= start;
    }
    if (range === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return created >= start;
    }
    if (range === 'For Date' && this.irdCustomFrom) {
      const start = new Date(`${this.irdCustomFrom}T00:00:00`);
      const end = new Date(`${this.irdCustomFrom}T23:59:59.999`);
      return created >= start && created <= end;
    }
    if (range === 'Date Range') {
      if (!this.irdCustomFrom || !this.irdCustomTo) {
        return false;
      }
      let start = new Date(`${this.irdCustomFrom}T00:00:00`);
      let end = new Date(`${this.irdCustomTo}T23:59:59.999`);
      if (start.getTime() > end.getTime()) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      return created >= start && created <= end;
    }
    if (range === 'Last 7 Days') {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 6);
      return created >= start;
    }
    if (range === 'Last 30 Days') {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 29);
      return created >= start;
    }
    return true;
  }

  private loadFbLiveData(soft = false): void {
    if (!soft) {
      this.loadingTasks = true;
    }
    this.loadError = '';

    forkJoin({
      tasks: this.fbDashboardService.fetchMenuOrderingTasks().pipe(catchError(() => of([]))),
      orders: this.fbDashboardService.fetchIrdFoodOrders().pipe(catchError(() => of([])))
    })
      .pipe(
        finalize(() => {
          this.loadingTasks = false;
          this.refreshing = false;
          this.hasLoadedOnce = true;
        })
      )
      .subscribe({
        next: ({ tasks, orders }) => {
          this.sourceTasks = tasks;
          this.sourceOrders = orders;
          this.applyPeriodFilter();
        },
        error: () => {
          this.sourceTasks = [];
          this.sourceOrders = [];
          this.taskReportCounts = { delayed: 0, escalated: 0, delivered: 0, orders: 0 };
          this.irdPaymentAmountLabel = this.formatInr(0);
          this.irdPaidOrderCount = 0;
          this.liveStatusRows = [];
          this.orderEscalationOverview = this.fbDashboardService.buildOrderEscalationOverview(0, 0);
          this.loadError = 'Unable to load F&B orders.';
        }
      });
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
    const tasks = this.overviewService.filterTasksByDateRange(
      this.sourceTasks,
      range.start,
      range.end,
      !!range.unbounded
    );
    const orders = this.overviewService.filterOrdersByDateRange(
      this.sourceOrders,
      range.start,
      range.end,
      !!range.unbounded
    );

    this.menuOrderingTasks = tasks;
    this.irdOrders = orders;
    this.applyOfferPeriodFilter();
    this.taskReportCounts = this.fbDashboardService.buildTaskReportCounts(tasks, orders);

    this.irdPaymentRows = this.fbDashboardService.buildIrdPaymentRows(orders, tasks);
    this.irdEscalationRows = this.fbDashboardService.buildIrdEscalationRows(tasks, orders);
    // KPI: Order Confirmed (Paid) only — Awaiting / timed-out Failed stay list-only
    const countablePayments = this.fbDashboardService.filterCountableIrdPaymentRows(
      this.irdPaymentRows
    );
    this.irdPaidOrderCount = countablePayments.length;
    const irdTotal = countablePayments.reduce((sum, row) => sum + (Number(row.finalAmount) || 0), 0);
    this.irdPaymentAmountLabel = this.formatInrCompact(irdTotal);

    const confirmedOrders = orders.filter((order) =>
      this.fbDashboardService.isIrdConfirmedFoodOrder(order)
    );
    const confirmedPaymentRows = countablePayments;
    const liveTasks = this.fbDashboardService.filterLiveTrackingTasks(tasks, confirmedOrders);
    this.todayOrderSummary = this.fbDashboardService.buildTodayOrderSummary(liveTasks);
    this.liveStatusRows = this.fbDashboardService.buildLiveStatusRows(liveTasks);
    this.orderEscalationOverview = this.fbDashboardService.buildOrderEscalationOverview(
      confirmedPaymentRows.length,
      this.irdEscalationRows.length
    );
    this.overviewDonutSlices = buildDonutSlices([
      {
        label: 'On time',
        value: this.orderEscalationOverview.onTrack,
        color: '#218a62'
      },
      {
        label: 'Escalated',
        value: Math.min(
          this.orderEscalationOverview.escalations,
          this.orderEscalationOverview.orders
        ),
        color: '#7140a8'
      }
    ]);
    this.liveStatusDonutSlices = buildDonutSlices(
      this.liveStatusRows.map((row) => ({
        label: row.label,
        value: row.count,
        color: row.color
      }))
    );

    this.orderRows = this.mapIrdOrdersToTracking(confirmedPaymentRows).slice(0, 25);
    this.escalationRows = this.mapIrdEscalationsToTracking(this.irdEscalationRows).slice(0, 25);
    this.recentEscalations = this.fbDashboardService.buildRecentEscalations(tasks, 10);

    const orderRestaurants = this.orderRows.map((r) => r.restaurant).filter((n) => n && n !== '—');
    const escRestaurants = this.escalationRows
      .map((r) => r.restaurant)
      .filter((n) => n && n !== '—');
    this.restaurants = [
      'All Restaurants',
      ...[...new Set([...orderRestaurants, ...escRestaurants])].sort((a, b) => a.localeCompare(b))
    ];

    const issueTypes = [
      ...new Set(this.escalationRows.map((r) => r.type).filter((t) => t && t !== '—'))
    ].sort((a, b) => a.localeCompare(b));
    this.orderTypes = ['All Order Types', ...issueTypes];

    // Keep report tables in sync whenever period data changes
    this.refreshReportRows();
  }

  private toInputDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private mapIrdOrdersToTracking(rows: IrdPaymentRow[]): FnbTrackingRow[] {
    return rows.map((row) => {
      const taskStatus = row.task ? String(row.task?.status ?? '').trim() : '';
      const timeline = row.task?.time_line || [];
      const last = timeline.length ? timeline[timeline.length - 1] : null;
      const taskTime = formatAmPmTime(last?.time || row.task?.order_time || '') || '';
      return {
        id: row.orderId || row.billNumber,
        restaurant: row.order?.delivery?.outlet_name || row.task?.outlet_name || '—',
        type: row.paymentMethod || 'Dine In',
        status: taskStatus || row.paymentStatus,
        time: taskTime || this.formatOrderTime(row.createdOn),
        sortTime: row.sortTime,
        task: row.task
      };
    });
  }

  private mapIrdEscalationsToTracking(rows: IrdEscalationRow[]): FnbTrackingRow[] {
    return rows.map((row) => ({
      id: row.orderId || row.billNumber,
      restaurant: row.task?.outlet_name || row.order?.delivery?.outlet_name || '—',
      type: row.issue,
      status: row.status,
      time: row.time,
      sortTime: row.sortTime,
      task: row.task
    }));
  }

  private formatOrderTime(raw: string): string {
    return formatAmPmTime(raw) || '—';
  }
}
