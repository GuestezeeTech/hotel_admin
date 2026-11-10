import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { HotelOverviewDashboardService } from '../../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.service';
import { DashboardRefreshSource } from '../../shared/dashboard-refresh/dashboard-refresh-button.component';
import { DashboardPeriodControlsComponent } from '../../shared/dashboard-period/dashboard-period-controls.component';
import { DashboardPeriodStateService } from '../../shared/dashboard-period/dashboard-period-state.service';
import { buildDonutSlices, DonutSliceView } from '../../shared/donut-slices.util';
import { scrollAppToTop } from '../../shared/scroll-to-top.util';
import {
  FoCheckoutRequestRow,
  FoContributionRow,
  FoDashboardService,
  FoDeviceOsRow,
  FoDeviceOsSummary,
  FoEscalationSummary,
  FoGuestServiceDetailRow,
  FoKeyServiceCounts,
  FoKpiCounts,
  FoLateCheckoutRevenueRow,
  FoMobileKeyRow,
  FoServiceRecord
} from '../fo-dashboard.service';

type FoReportKey =
  | 'kpi'
  | 'mobile-keys'
  | 'mobile-keys-unused'
  | 'late-revenue'
  | 'checkout-requests'
  | 'device-os'
  | 'guest-service';

@Component({
  selector: 'app-fo-operations-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardPeriodControlsComponent],
  templateUrl: './fo-operations-dashboard.component.html',
  styleUrl: './fo-operations-dashboard.component.scss'
})
export class FoOperationsDashboardComponent implements OnInit {
  loading = true;
  refreshing = false;
  loadError = '';
  selectedPeriod = 'Today';
  customFrom = '';
  customTo = '';
  activeView: 'home' | 'report' = 'home';
  activeReportKey: FoReportKey | null = null;
  activeKpiLabel = '';
  kpiListRows: FoServiceRecord[] = [];

  private sourceTasks: any[] = [];
  private sourceMobileKeys: any[] = [];
  private sourceLateCheckoutOrders: any[] = [];
  private sourceCheckoutOrders: any[] = [];
  records: FoServiceRecord[] = [];
  mobileKeyRows: FoMobileKeyRow[] = [];
  unusedMobileKeyRows: FoMobileKeyRow[] = [];
  lateRevenueRows: FoLateCheckoutRevenueRow[] = [];
  checkoutRequestRows: FoCheckoutRequestRow[] = [];
  deviceOsRows: FoDeviceOsRow[] = [];
  deviceOsSummary: FoDeviceOsSummary = {
    total: 0,
    ios: 0,
    iosPct: 0,
    android: 0,
    androidPct: 0,
    other: 0
  };
  guestServiceRows: FoGuestServiceDetailRow[] = [];
  lateRevenueSummary = { totalRevenue: 0, averageRevenue: 0, count: 0 };
  deviceOsFilter: 'All' | 'iOS' | 'Android' = 'All';
  deviceGuestStatusFilter: 'All' | 'Checked-In' | 'Checked-Out' = 'All';

  /** Mobile key report filters. */
  mkRoomFilter = '';
  mkGuestFilter = '';
  mkOpenedFilter = '';
  mkInHouseFilter = '';

  kpis: FoKpiCounts = {
    total: 0,
    completed: 0,
    pending: 0,
    escalated: 0,
    completedPct: 0,
    pendingPct: 0,
    escalatedPct: 0
  };
  contributionRows: FoContributionRow[] = [];
  contributionDonutSlices: DonutSliceView[] = [];
  hoveredContributionLabel = '';
  hoveredContributionValue = 0;
  hoveredContributionPct = 0;
  keyServices: FoKeyServiceCounts = {
    lateCheckoutPayments: 0,
    lateCheckoutRequested: 0,
    checkoutTotal: 0
  };

  keyServiceRows: Array<{
    key: FoReportKey;
    label: string;
    value: number;
    icon: string;
    iconClass: string;
  }> = [
    {
      key: 'mobile-keys',
      label: 'Mobile Key (Check-in)',
      value: 0,
      icon: 'bi bi-phone',
      iconClass: 'service-icon--keys'
    },
    {
      key: 'checkout-requests',
      label: 'App Check-outs',
      value: 0,
      icon: 'bi bi-door-open',
      iconClass: 'service-icon--checkout'
    },
    {
      key: 'late-revenue',
      label: 'Late Check-out & Payments',
      value: 0,
      icon: 'bi bi-clock',
      iconClass: 'service-icon--payments'
    }
  ];
  escalationSummary: FoEscalationSummary = {
    open: 0,
    inProgress: 0,
    resolved: 0,
    avgDelayMinutes: null,
    resolvedSampleCount: 0,
    avgDelayLabel: '—'
  };

  dateFilter = '';
  timeFilter = '';
  roomFilter = '';
  guestFilter = '';
  typeFilter = '';
  staffFilter = '';
  statusFilter = '';
  filtersVisible = true;

  showModal = false;
  modalTitle = 'Details';
  modalHtml = '';

  get filteredRecords(): FoServiceRecord[] {
    const guest = this.guestFilter.trim().toLowerCase();
    return this.records.filter((r) => {
      if (this.dateFilter && !String(r.date).toLowerCase().includes(this.dateFilter.toLowerCase())) {
        return false;
      }
      if (this.roomFilter && r.room !== this.roomFilter) {
        return false;
      }
      if (guest && !r.guest.toLowerCase().includes(guest)) {
        return false;
      }
      if (this.typeFilter && r.type.toLowerCase() !== this.typeFilter.toLowerCase()) {
        return false;
      }
      if (this.staffFilter && r.staff.toLowerCase() !== this.staffFilter.toLowerCase()) {
        return false;
      }
      if (this.statusFilter && !r.status.toLowerCase().includes(this.statusFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  get roomOptions(): string[] {
    return [...new Set(this.records.map((r) => r.room).filter((r) => r && r !== '—'))].sort();
  }

  get staffOptions(): string[] {
    return [...new Set(this.records.map((r) => r.staff).filter(Boolean))].sort();
  }

  get filteredMobileKeyRows(): FoMobileKeyRow[] {
    return this.applyMobileKeyFilters(this.mobileKeyRows);
  }

  get filteredUnusedMobileKeyRows(): FoMobileKeyRow[] {
    return this.applyMobileKeyFilters(this.unusedMobileKeyRows);
  }

  get filteredDeviceOsRows(): FoDeviceOsRow[] {
    return this.deviceOsRows.filter((row) => {
      if (
        this.deviceGuestStatusFilter !== 'All' &&
        row.guestStatus !== this.deviceGuestStatusFilter
      ) {
        return false;
      }
      if (this.mkRoomFilter && row.roomNo !== this.mkRoomFilter) {
        return false;
      }
      const guestQ = this.mkGuestFilter.trim().toLowerCase();
      if (guestQ && !row.guestName.toLowerCase().includes(guestQ)) {
        return false;
      }
      return true;
    });
  }

  get mkRoomOptions(): string[] {
    return [
      ...new Set(this.mobileKeyRows.map((r) => r.roomNo).filter((v) => v && v !== '—'))
    ].sort();
  }

  get mkOpenedOptions(): string[] {
    return [
      ...new Set(this.mobileKeyRows.map((r) => r.openedStatus).filter((v) => v && v !== '—'))
    ].sort();
  }

  get activeReportCount(): number {
    switch (this.activeReportKey) {
      case 'kpi':
        return this.kpiListRows.length;
      case 'mobile-keys':
        return this.filteredMobileKeyRows.length;
      case 'mobile-keys-unused':
        return this.filteredUnusedMobileKeyRows.length;
      case 'late-revenue':
        return this.lateRevenueRows.length;
      case 'checkout-requests':
        return this.checkoutRequestRows.length;
      case 'device-os':
        return this.filteredDeviceOsRows.length;
      case 'guest-service':
        return this.guestServiceRows.length;
      default:
        return 0;
    }
  }

  private applyMobileKeyFilters(rows: FoMobileKeyRow[]): FoMobileKeyRow[] {
    const guestQ = this.mkGuestFilter.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (this.mkRoomFilter && row.roomNo !== this.mkRoomFilter) {
        return false;
      }
      if (guestQ && !row.guestName.toLowerCase().includes(guestQ)) {
        return false;
      }
      if (
        this.mkOpenedFilter &&
        row.openedStatus.toLowerCase() !== this.mkOpenedFilter.toLowerCase()
      ) {
        return false;
      }
      if (this.mkInHouseFilter && row.inHouseStatus !== this.mkInHouseFilter) {
        return false;
      }
      return true;
    });
  }

  constructor(
    private foDashboardService: FoDashboardService,
    private overviewService: HotelOverviewDashboardService,
    private periodState: DashboardPeriodStateService
  ) {
    this.periodState.hydrate(this);
  }

  ngOnInit(): void {
    this.loadBoard(true);
  }

  onDashboardRefresh(_source: DashboardRefreshSource): void {
    if (this.refreshing) {
      return;
    }
    this.loadBoard(false);
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

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
  }

  statusClass(status: string): string {
    return this.foDashboardService.statusClass(status);
  }

  delayClass(delay: string): string {
    return delay !== '0' ? 'delay-bad' : 'delay-good';
  }

  formatInr(amount: number | null | undefined): string {
    return this.foDashboardService.formatInr(amount);
  }

  onContributionDonutEnter(slice: DonutSliceView): void {
    this.hoveredContributionLabel = slice.label;
    this.hoveredContributionValue = slice.value;
    this.hoveredContributionPct = slice.pct;
  }

  onContributionDonutLeave(): void {
    this.hoveredContributionLabel = '';
    this.hoveredContributionValue = 0;
    this.hoveredContributionPct = 0;
  }

  openKpi(filter: 'all' | 'completed' | 'pending' | 'escalated'): void {
    const labels = {
      all: 'Total FO Requests',
      completed: 'Completed',
      pending: 'Pending',
      escalated: 'Escalated'
    };
    this.activeKpiLabel = labels[filter];
    this.activeReportKey = 'kpi';
    this.kpiListRows =
      filter === 'all'
        ? [...this.records]
        : this.records.filter((row) => {
            const pipeline = String(row.task?.status || '').toLowerCase();
            const display = String(row.status || '').toLowerCase();
            if (filter === 'completed') {
              return (
                pipeline.includes('complete') ||
                pipeline.includes('deliver') ||
                display.includes('approved')
              );
            }
            if (filter === 'pending') {
              return (
                ['processing', 'asap', 'pending', 'assigned', 'acknowledged', 'scheduled'].some(
                  (s) => pipeline === s
                ) ||
                display.includes('requested') ||
                display.includes('price updated')
              );
            }
            return pipeline.includes('escalat') || display.includes('rejected') || display.includes('declined');
          });
    this.activeView = 'report';
    scrollAppToTop();
  }

  openReport(key: FoReportKey): void {
    const labels: Record<FoReportKey, string> = {
      kpi: 'FO Requests',
      'mobile-keys': 'Mobile Key Generated Report',
      'mobile-keys-unused': 'Mobile Key Generated but Not Used',
      'late-revenue': 'Late Check-Out Revenue Report',
      'checkout-requests': 'Check-Out Request Report',
      'device-os': 'Guest Device & OS Mobility Report',
      'guest-service': 'Guest Service Request Detailed Report'
    };
    if (key === 'mobile-keys' || key === 'mobile-keys-unused' || key === 'device-os') {
      this.resetMobileKeyFilters();
    }
    this.activeReportKey = key;
    this.activeKpiLabel = labels[key];
    this.activeView = 'report';
    scrollAppToTop();
  }

  resetMobileKeyFilters(): void {
    this.mkRoomFilter = '';
    this.mkGuestFilter = '';
    this.mkOpenedFilter = '';
    this.mkInHouseFilter = '';
    this.deviceOsFilter = 'All';
    this.deviceGuestStatusFilter = 'All';
  }

  openKeyService(key: FoReportKey): void {
    this.openReport(key);
  }

  backToHome(): void {
    this.activeView = 'home';
    this.activeReportKey = null;
    this.activeKpiLabel = '';
    this.kpiListRows = [];
    scrollAppToTop();
  }

  viewRequest(record: FoServiceRecord): void {
    const amount =
      record.lateCheckoutAmount != null && Number.isFinite(record.lateCheckoutAmount)
        ? `<br>Late checkout amount: ${record.lateCheckoutAmount}`
        : '';
    const checkoutStatus = record.checkoutStatus
      ? `<br>Checkout status: ${record.checkoutStatus}`
      : '';
    this.openModal(
      `Service Request · ${record.id}`,
      `Guest: ${record.guest}<br>Room: ${record.room}<br>Request: ${record.type}<br>Assigned staff: ${record.staff}<br>Status: ${record.status}${checkoutStatus}${amount}<br>ETA: ${record.eta}<br>Delay: ${record.delay}`
    );
  }

  viewMobileKey(row: FoMobileKeyRow): void {
    this.openModal(
      `Mobile Key · ${row.guestName}`,
      `Guest: ${row.guestName}<br>Room: ${row.roomNo}<br>Check-in: ${row.checkIn}<br>Check-out: ${row.checkOut}<br>Key count: ${row.keyCount}<br>Lock: ${row.lockName}<br>Opened status: ${row.openedStatus}<br>Key used: ${row.keyUsedCount}<br>Device: ${row.deviceBrand} · ${row.deviceName}<br>In-house: ${row.inHouseStatus}`
    );
  }

  viewLateRevenue(row: FoLateCheckoutRevenueRow): void {
    this.openModal(
      `Late Check-Out · ${row.id}`,
      `Guest: ${row.guestName}<br>Room: ${row.room}<br>Requested: ${row.datetime}<br>Standard: ${row.standardCheckout}<br>Extended: ${row.requestedCheckout}<br>Additional hours: ${row.additionalHours}<br>Billed to: ${row.billedTo}<br>Fee: ${this.formatInr(row.feeAmount)}<br>Tax: ${this.formatInr(row.taxes)}<br>Total: ${this.formatInr(row.totalCharged)}<br>Status: ${row.paymentStatus}<br>Approved by: ${row.approvedBy}`
    );
  }

  viewCheckoutRequest(row: FoCheckoutRequestRow): void {
    this.openModal(
      `Check-Out Request · ${row.id}`,
      `Guest: ${row.guestName}<br>Room: ${row.room}<br>Requested: ${row.datetime}<br>Channel: ${row.channel}<br>Scheduled departure: ${row.scheduledDeparture}<br>Requested departure: ${row.requestedDeparture}<br>Status: ${row.status}<br>Staff: ${row.staff}`
    );
  }

  viewDeviceOs(row: FoDeviceOsRow): void {
    this.openModal(
      `Guest Device · ${row.guestName}`,
      `Guest: ${row.guestName}<br>Room: ${row.roomNo}<br>Check-in: ${row.checkIn}<br>Check-out: ${row.checkOut}<br>Nights: ${row.nights}<br>Device: ${row.deviceBrand} · ${row.deviceName}<br>Status: ${row.guestStatus}`
    );
  }

  viewGuestService(row: FoGuestServiceDetailRow): void {
    this.openModal(
      `Service Request · ${row.id}`,
      `Guest: ${row.guestName}<br>Room: ${row.room}<br>Department: ${row.department}<br>Category: ${row.category}<br>Service: ${row.serviceName}<br>Status: ${row.status}<br>Special instructions: ${row.specialInstructions}<br>Request time: ${row.requestTime}<br>Staff: ${row.staff}<br>Response time: ${row.responseTime}<br>Escalation: ${row.escalationLevel}`
    );
  }

  openTeamFocusModal(): void {
    this.openModal(
      'FO Team',
      'Front Office team roster and HOD view will open here when connected to staff and task APIs.'
    );
  }

  openModal(title: string, html: string): void {
    this.modalTitle = title;
    this.modalHtml = html;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  private loadBoard(showFullLoader: boolean): void {
    if (showFullLoader) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }
    this.loadError = '';
    forkJoin({
      tasks: this.foDashboardService.fetchFoTasks().pipe(catchError(() => of([]))),
      mobileKeys: this.foDashboardService.fetchMobileKeyReports().pipe(catchError(() => of([]))),
      lateCheckoutOrders: this.foDashboardService
        .fetchLateCheckoutOrders()
        .pipe(catchError(() => of([]))),
      checkoutOrders: this.foDashboardService.fetchCheckoutOrders().pipe(catchError(() => of([])))
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: ({ tasks, mobileKeys, lateCheckoutOrders, checkoutOrders }) => {
          this.sourceTasks = tasks || [];
          this.sourceMobileKeys = mobileKeys || [];
          this.sourceLateCheckoutOrders = lateCheckoutOrders || [];
          this.sourceCheckoutOrders = checkoutOrders || [];
          this.applyPeriodFilter();
        },
        error: () => {
          this.loadError = 'Unable to load Front Office data.';
          this.sourceTasks = [];
          this.sourceMobileKeys = [];
          this.sourceLateCheckoutOrders = [];
          this.sourceCheckoutOrders = [];
          this.applyPeriodFilter();
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
    const filtered = this.overviewService.filterTasksByDateRange(
      this.sourceTasks,
      range.start,
      range.end,
      !!range.unbounded
    );
    const filteredKeys = this.foDashboardService.filterMobileKeysByDateRange(
      this.sourceMobileKeys,
      range.start,
      range.end,
      !!range.unbounded
    );
    const filteredLateOrders = this.overviewService.filterOrdersByDateRange(
      this.sourceLateCheckoutOrders,
      range.start,
      range.end,
      !!range.unbounded
    );
    const filteredCheckoutOrders = this.overviewService.filterOrdersByDateRange(
      this.sourceCheckoutOrders,
      range.start,
      range.end,
      !!range.unbounded
    );

    this.records = this.foDashboardService.mapRecords(filtered);
    this.mobileKeyRows = this.foDashboardService.buildMobileKeyRows(filteredKeys);
    this.unusedMobileKeyRows = this.foDashboardService.buildUnusedMobileKeyRows(filteredKeys);
    this.lateRevenueRows = this.foDashboardService.buildLateCheckoutRevenueRows(
      filtered,
      filteredLateOrders
    );
    this.checkoutRequestRows = this.foDashboardService.buildCheckoutRequestRows(
      filtered,
      filteredCheckoutOrders
    );
    this.deviceOsRows = this.foDashboardService.buildDeviceOsRows(filteredKeys);
    this.deviceOsSummary = this.foDashboardService.buildDeviceOsSummary(this.deviceOsRows);
    this.guestServiceRows = this.foDashboardService.buildGuestServiceDetailRows(filtered);
    this.lateRevenueSummary = this.foDashboardService.lateCheckoutRevenueSummary(this.lateRevenueRows);

    this.kpis = this.foDashboardService.buildKpis(filtered);
    this.contributionRows = this.foDashboardService.buildContribution(filtered);
    this.contributionDonutSlices = buildDonutSlices(
      this.contributionRows.map((row) => ({
        label: row.label,
        value: row.count,
        color: row.color
      }))
    );
    this.onContributionDonutLeave();
    this.keyServices = this.foDashboardService.buildKeyServiceCounts(filtered);
    this.keyServiceRows = [
      {
        key: 'mobile-keys',
        label: 'Mobile Key (Check-in)',
        value: this.mobileKeyRows.length,
        icon: 'bi bi-phone',
        iconClass: 'service-icon--keys'
      },
      {
        key: 'checkout-requests',
        label: 'App Check-outs',
        value: this.checkoutRequestRows.length,
        icon: 'bi bi-door-open',
        iconClass: 'service-icon--checkout'
      },
      {
        key: 'late-revenue',
        label: 'Late Check-out & Payments',
        value: this.lateRevenueRows.length,
        icon: 'bi bi-clock',
        iconClass: 'service-icon--payments'
      }
    ];
    this.escalationSummary = this.foDashboardService.buildEscalationSummary(filtered);

    if (this.activeView === 'report' && this.activeReportKey === 'kpi') {
      // Keep prior KPI subset empty after refresh — reopen from home KPIs.
      this.kpiListRows = [...this.records];
    }
  }

  private toInputDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
