import { CommonModule } from '@angular/common';

import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { catchError, finalize, of } from 'rxjs';

import {

  HkCategoryBar,

  HkDashboardService,

  HkEscalationSummary,

  HkPerformanceCounts,

  HkStatusFilterOption,

  HkTask

} from '../hk-dashboard.service';

import { DashboardRefreshSource } from '../../shared/dashboard-refresh/dashboard-refresh-button.component';
import { DashboardPeriodControlsComponent } from '../../shared/dashboard-period/dashboard-period-controls.component';
import { DashboardPeriodStateService } from '../../shared/dashboard-period/dashboard-period-state.service';
import { scrollAppToTop } from '../../shared/scroll-to-top.util';
import { HotelOverviewDashboardService } from '../../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.service';



export type HkModuleName =

  | 'Overview'

  | 'Tasks'

  | 'Room Cleaning'

  | 'Amenities'

  | 'Laundry'

  | 'Staff & Assignments'

  | 'Service Wise Delivery'

  | 'Delayed Tasks'

  | 'Escalations'

  | 'Delivery Report'

  | 'Cancellation Report'

  | 'Guest Services Availed';



type SummaryTile = { label: string; value: string | number };



@Component({

  selector: 'app-hk-operations-dashboard',

  standalone: true,

  imports: [CommonModule, FormsModule, DashboardPeriodControlsComponent],

  templateUrl: './hk-operations-dashboard.component.html',

  styleUrl: './hk-operations-dashboard.component.scss'

})

export class HkOperationsDashboardComponent implements OnInit {

  activeView: 'overview' | 'module' = 'overview';

  activeModule: HkModuleName = 'Tasks';

  moduleStatusFilter = '';

  refreshing = false;

  selectedPeriod = 'Today';

  customFrom = '';

  customTo = '';

  private hasLoadedOnce = false;

  private sourceApiTasks: any[] = [];

  private sourceServices: any[] = [];

  private sourceStaff: any[] = [];



  tasks: HkTask[] = [];

  apiTasks: any[] = [];

  housekeepingServices: any[] = [];

  categoryOptions: string[] = [];



  categoryOverview: HkCategoryBar[] = [

    { label: 'Room Cleaning', count: 0, widthPct: 0, barClass: '' },

    { label: 'Amenities', count: 0, widthPct: 0, barClass: 'barrow-gold' },

    { label: 'Laundry', count: 0, widthPct: 0, barClass: 'barrow-blue' }

  ];

  hoveredCategoryLabel: string | null = null;



  escalationSummary: HkEscalationSummary = {

    level1: 0,

    level2: 0,

    level3: 0,

    avgResolutionMin: '—'

  };



  staffOptions: string[] = [];
  statusFilterOptions: HkStatusFilterOption[] = [];



  catFilter = '';

  statusFilter = '';

  staffFilter = '';

  roomFilter = '';

  guestFilter = '';

  moduleSearch = '';

  /** Service Wise Delivery drill-down: empty = service list, set = guests for that service. */
  selectedServiceName = '';

  serviceWiseList: Array<{
    service: string;
    category: string;
    count: number;
    targetLabel: string;
    avgLabel: string;
    within: number;
    onTimeRate: string;
  }> = [];



  showModal = false;

  modalTitle = '';

  modalHtml = '';



  moduleHeads: string[] = [];

  moduleRows: string[][] = [];

  moduleSummary: SummaryTile[] = [];



  performanceCounts: HkPerformanceCounts = {

    total: 0,

    completed: 0,

    completedPct: 0,

    processing: 0,

    escalated: 0,

    awaiting: 0,

    delayed: 0

  };

  loadingPerformance = true;

  performanceLoadError = '';

  tasksLoadError = '';



  constructor(
    private hkDashboardService: HkDashboardService,
    private overviewService: HotelOverviewDashboardService,
    private periodState: DashboardPeriodStateService
  ) {
    this.periodState.hydrate(this);
  }



  ngOnInit(): void {

    this.loadTasksFromApi();

  }



  refreshPerformance(): void {

    this.onDashboardRefresh('manual');

  }

  onDashboardRefresh(_source: DashboardRefreshSource): void {

    if (this.refreshing) {

      return;

    }

    this.loadTasksFromApi(true);

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

  private toInputDate(d: Date): string {

    const yyyy = d.getFullYear();

    const mm = String(d.getMonth() + 1).padStart(2, '0');

    const dd = String(d.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;

  }



  private loadTasksFromApi(soft = false): void {

    if (soft) {

      this.refreshing = true;

    } else {

      this.loadingPerformance = true;

    }

    this.performanceLoadError = '';

    this.tasksLoadError = '';

    this.hkDashboardService

      .fetchHousekeepingBoardData()

      .pipe(
        catchError(() => of({ tasks: [], services: [], staff: [] })),
        finalize(() => {
          this.loadingPerformance = false;
          this.refreshing = false;
          this.hasLoadedOnce = true;
        })
      )

      .subscribe({

        next: ({ tasks: apiTasks, services, staff }) => {

          this.sourceApiTasks = apiTasks;

          this.sourceServices = services;

          this.sourceStaff = staff;

          this.applyPeriodFilter();

        },

        error: () => {

          this.apiTasks = [];

          this.housekeepingServices = [];

          this.categoryOptions = [];

          this.tasks = [];

          this.performanceCounts = this.hkDashboardService.buildPerformanceCounts([]);

          this.performanceLoadError = 'Could not load task counts.';

          this.tasksLoadError = 'Could not load housekeeping tasks.';


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

    const apiTasks = this.overviewService.filterTasksByDateRange(

      this.sourceApiTasks,

      range.start,

      range.end,

      !!range.unbounded

    );

    const services = this.sourceServices;

    const staff = this.sourceStaff;

    this.apiTasks = apiTasks;

    this.housekeepingServices = services;

    this.categoryOptions = this.hkDashboardService.distinctServiceNames(services);

    this.tasks = this.hkDashboardService.mapTasks(apiTasks, services);

    this.performanceCounts = this.hkDashboardService.buildPerformanceCounts(apiTasks);

    this.categoryOverview = this.hkDashboardService.buildCategoryOverview(services, apiTasks);

    this.escalationSummary = this.hkDashboardService.buildEscalationSummary(apiTasks);

    this.staffOptions = this.hkDashboardService.distinctStaffDisplayNames(staff);

    this.statusFilterOptions = this.hkDashboardService.buildStatusFilterOptions(apiTasks);

    if (this.activeView === 'module') {

      this.buildModuleView(this.activeModule, this.moduleStatusFilter);

    }

  }



  get filteredHomeTasks(): HkTask[] {

    const guest = this.guestFilter.trim().toLowerCase();

    const room = this.roomFilter.trim();

    return this.tasks.filter((t) => {

      if (this.catFilter && t.service.toLowerCase() !== this.catFilter.toLowerCase()) {

        return false;

      }

      if (this.statusFilter && !this.hkDashboardService.matchesStatusFilter(t, this.statusFilter)) {

        return false;

      }

      if (this.staffFilter && t.staff.toLowerCase() !== this.staffFilter.toLowerCase()) {

        return false;

      }

      if (room && !t.room.includes(room)) {

        return false;

      }

      if (guest && !t.guest.toLowerCase().includes(guest)) {

        return false;

      }

      return true;

    });

  }



  get filteredModuleRows(): string[][] {

    const q = this.moduleSearch.trim().toLowerCase();

    if (!q) {

      return this.moduleRows;

    }

    return this.moduleRows.filter((row) =>

      row.some((cell) => String(cell).toLowerCase().includes(q))

    );

  }

  get filteredServiceWiseList(): typeof this.serviceWiseList {

    const q = this.moduleSearch.trim().toLowerCase();

    if (!q) {

      return this.serviceWiseList;

    }

    return this.serviceWiseList.filter(

      (row) =>

        row.service.toLowerCase().includes(q) || row.category.toLowerCase().includes(q)

    );

  }

  get serviceGuestTasks(): HkTask[] {

    if (!this.selectedServiceName) {

      return [];

    }

    const q = this.moduleSearch.trim().toLowerCase();

    return this.tasks.filter((t) => {

      if (t.service !== this.selectedServiceName) {

        return false;

      }

      if (!q) {

        return true;

      }

      return (

        t.guest.toLowerCase().includes(q) ||

        t.room.toLowerCase().includes(q) ||

        t.id.toLowerCase().includes(q) ||

        t.staff.toLowerCase().includes(q) ||

        t.apiStatus.toLowerCase().includes(q)

      );

    });

  }

  get moduleHeading(): string {

    if (this.activeModule === 'Service Wise Delivery' && this.selectedServiceName) {

      return `${this.selectedServiceName} · Guests`;

    }

    return this.activeModule;

  }

  get moduleRecordCount(): number {

    if (this.activeModule === 'Service Wise Delivery') {

      return this.selectedServiceName

        ? this.serviceGuestTasks.length

        : this.filteredServiceWiseList.length;

    }

    return this.filteredModuleRows.length;

  }



  applyHomeFilters(): void {

    /* triggers filteredHomeTasks getter */

  }



  goOverview(): void {

    this.activeView = 'overview';

    this.moduleStatusFilter = '';

    this.selectedServiceName = '';

    this.moduleSearch = '';

    scrollAppToTop();

  }



  goModule(name: HkModuleName, statusFilter = ''): void {

    if (name === 'Overview') {

      this.goOverview();

      return;

    }

    this.activeModule = name;

    this.moduleStatusFilter = statusFilter;

    this.moduleSearch = '';

    this.selectedServiceName = '';

    this.activeView = 'module';

    this.buildModuleView(name, statusFilter);

    scrollAppToTop();

  }

  /** Services Overview bar or View All → Service Wise Delivery (optional service drill). */
  openServiceWiseDelivery(serviceName = ''): void {

    this.goModule('Service Wise Delivery');

    if (serviceName) {

      this.openServiceGuests(serviceName);

    }

  }

  openServiceGuests(serviceName: string): void {

    this.selectedServiceName = serviceName;

    this.moduleSearch = '';

    const subset = this.tasks.filter((t) => t.service === serviceName);

    const completed = subset.filter(

      (t) => t.apiStatus === 'Completed' || t.apiStatus === 'Delivered'

    ).length;

    this.moduleSummary = [

      { label: 'Guests / Requests', value: subset.length },

      { label: 'Completed', value: completed },

      {

        label: 'Pending',

        value: subset.filter(

          (t) =>

            t.apiStatus !== 'Completed' &&

            t.apiStatus !== 'Delivered' &&

            t.apiStatus !== 'Cancelled' &&

            t.apiStatus !== 'Rejected'

        ).length

      }

    ];

  }

  backFromServiceGuests(): void {

    this.selectedServiceName = '';

    this.moduleSearch = '';

    this.buildModuleView('Service Wise Delivery', '');

  }

  onModuleBack(): void {

    if (this.activeModule === 'Service Wise Delivery' && this.selectedServiceName) {

      this.backFromServiceGuests();

      return;

    }

    this.goOverview();

  }



  statusPillClass(apiStatus: string): string {

    return this.hkDashboardService.statusPillClassForApi(apiStatus);

  }



  viewTask(id: string): void {

    const t = this.tasks.find((x) => x.id === id);

    if (!t) {

      return;

    }

    this.openModal(

      `Housekeeping Task · ${id}`,

      `Guest: ${t.guest}<br>Room: ${t.room}<br>Category: ${t.cat}<br>Service: ${t.service}<br>Request time: ${t.time}<br>Assigned staff: ${t.staff}<br>Response time: ${t.response}<br>Status: ${t.apiStatus}<br>Escalation level: ${t.level}<br>Target time: ${t.target ? t.target + ' minutes' : '—'}<br>Actual time: ${t.actual ? t.actual + ' minutes' : 'Not completed'}<br>Delay / ETA: ${t.eta}<br>Delay reason: ${t.reason}`

    );

  }



  quickAction(label: string): void {

    this.openModal(

      label,

      `${label} selected. The task form and backend workflow will be added after the UI is approved.`

    );

  }



  exportCsv(): void {

    this.openModal(

      'Export CSV',

      'The export action will be connected to the hotel reporting service.'

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



  private moduleTaskList(name: HkModuleName, filter: string): HkTask[] {

    const cat =

      name === 'Room Cleaning'

        ? 'Room Cleaning'

        : name === 'Amenities'

          ? 'Amenities'

          : name === 'Laundry'

            ? 'Laundry'

            : '';



    return this.tasks.filter((t) => {

      if (cat && t.cat !== cat) {

        return false;

      }

      if (!filter) {

        return true;

      }

      if (filter === 'Processing') {

        return t.apiStatus === 'Processing';

      }

      if (filter === 'Completed') {

        return t.apiStatus === 'Completed' || t.apiStatus === 'Delivered';

      }

      return this.hkDashboardService.matchesStatusFilter(t, filter);

    });

  }



  private buildModuleView(name: HkModuleName, filter: string): void {

    this.moduleSummary = [];

    this.moduleHeads = [];

    this.moduleRows = [];



    if (['Tasks', 'Room Cleaning', 'Amenities', 'Laundry'].includes(name)) {

      const list = this.moduleTaskList(name, filter);

      this.moduleHeads = [

        'Task ID',

        'Guest',

        'Room',

        'Category',

        'Service Requested',

        'Request Time',

        'Assigned Staff',

        'Response Time',

        'Status',

        'Escalation'

      ];

      this.moduleRows = list.map((t) => [

        t.id,

        t.guest,

        t.room,

        t.cat,

        t.service,

        t.time,

        t.staff,

        t.response,

        t.status,

        t.level

      ]);

      this.moduleSummary = [

        { label: 'Total Requests', value: list.length },

        {

          label: 'Completed',

          value: list.filter((t) => t.apiStatus === 'Completed' || t.apiStatus === 'Delivered').length

        },

        {

          label: 'In Progress',

          value: list.filter((t) => t.apiStatus === 'Processing').length

        }

      ];

      return;

    }



    if (name === 'Staff & Assignments') {

      const byStaff = new Map<

        string,

        { assigned: number; completed: number; pending: number; escalated: number }

      >();

      for (const t of this.tasks) {

        const nameKey = t.staff === '—' ? 'Unassigned' : t.staff;

        const row = byStaff.get(nameKey) || { assigned: 0, completed: 0, pending: 0, escalated: 0 };

        row.assigned++;

        if (t.apiStatus === 'Completed' || t.apiStatus === 'Delivered') {

          row.completed++;

        } else if (t.apiStatus === 'Escalated') {

          row.escalated++;

        } else if (t.apiStatus !== 'Cancelled' && t.apiStatus !== 'Rejected') {

          row.pending++;

        }

        byStaff.set(nameKey, row);

      }

      this.moduleHeads = [

        'Staff Member',

        'Role',

        'Shift',

        'Tasks Assigned',

        'Completed',

        'Pending',

        'Escalated'

      ];

      this.moduleRows = [...byStaff.entries()].map(([staff, stats]) => [

        staff,

        '—',

        '—',

        String(stats.assigned),

        String(stats.completed),

        String(stats.pending),

        String(stats.escalated)

      ]);

      return;

    }



    if (name === 'Service Wise Delivery') {

      this.moduleHeads = [

        'Service Name',

        'Category',

        'Request Count',

        'Target Time',

        'Avg. Actual Time',

        'Completed On Time',

        'On-Time %'

      ];

      const serviceNames = [...new Set(this.tasks.map((t) => t.service).filter(Boolean))].sort();

      this.serviceWiseList = serviceNames.map((serviceName) => {

        const subset = this.tasks.filter((t) => t.service === serviceName);

        const done = subset.filter((t) => t.actual > 0);

        const avg = done.length

          ? Math.round(done.reduce((sum, t) => sum + t.actual, 0) / done.length)

          : 0;

        const within = done.filter((t) => t.target > 0 && t.actual <= t.target).length;

        return {

          service: serviceName,

          category: subset[0]?.cat || '—',

          count: subset.length,

          targetLabel: subset[0]?.target ? `${subset[0].target} min` : '—',

          avgLabel: avg ? `${avg} min` : '—',

          within,

          onTimeRate: done.length ? `${Math.round((within / done.length) * 100)}%` : '—'

        };

      });

      this.moduleRows = this.serviceWiseList.map((row) => [

        row.service,

        row.category,

        String(row.count),

        row.targetLabel,

        row.avgLabel,

        String(row.within),

        row.onTimeRate

      ]);

      const onTime = this.tasks.filter(

        (t) => t.target > 0 && t.actual > 0 && t.actual <= t.target

      ).length;

      const withActual = this.tasks.filter((t) => t.actual > 0);

      const avgFulfill =

        withActual.length > 0

          ? Math.round(

              withActual.reduce((sum, t) => sum + t.actual, 0) / withActual.length

            )

          : null;

      this.moduleSummary = [

        { label: 'Total Requests', value: this.tasks.length },

        { label: 'Services / Departments', value: this.serviceWiseList.length },

        {

          label: 'Avg. Fulfillment Time',

          value: avgFulfill != null ? `${avgFulfill} min` : '—'

        },

        {

          label: 'On-Time %',

          value: withActual.length

            ? `${Math.round((onTime / withActual.length) * 100)}%`

            : '—'

        }

      ];

      return;

    }



    if (name === 'Delayed Tasks') {

      // Word doc: Delay Report
      const list = this.tasks.filter((t) => this.hkDashboardService.isDelayedTask(t.source));

      this.moduleHeads = [

        'Guest Name',

        'Room',

        'Date / Time',

        'Service Requested',

        'Promised / Standard',

        'Actual Time',

        'Delay Variance',

        'Delay Reason',

        'Assigned Staff',

        'Resolution'

      ];

      this.moduleRows = list.map((t) => [

        t.guest,

        t.room,

        t.time,

        t.service,

        t.target ? `${t.target} min` : '—',

        t.actual ? `${t.actual} min` : '—',

        this.hkDashboardService.delayVarianceLabel(t.source),

        t.reason || '—',

        t.staff,

        this.hkDashboardService.hasStatus(t.source, 'Completed', 'Delivered')

          ? `${t.actual || 0} min`

          : 'Open'

      ]);

      const variances = list

        .map((t) => this.hkDashboardService.delayVarianceMinutes(t.source))

        .filter((n): n is number => n != null && n >= 0);

      const avgDelay =

        variances.length > 0

          ? Math.round(variances.reduce((a, b) => a + b, 0) / variances.length)

          : null;

      const delayRate = this.tasks.length

        ? `${Math.round((list.length / this.tasks.length) * 100)}%`

        : '—';

      this.moduleSummary = [

        { label: 'Total Delayed Tickets', value: list.length },

        { label: 'Average Delay Duration', value: avgDelay != null ? `${avgDelay} min` : '—' },

        { label: 'Delay Rate', value: delayRate }

      ];

      return;

    }



    if (name === 'Escalations') {

      // Word doc: Escalation Report
      const list = this.tasks.filter(

        (t) => t.apiStatus === 'Escalated' || t.level !== '—'

      );

      this.moduleHeads = [

        'Guest Name',

        'Room',

        'Date / Time',

        'Service',

        'Category',

        'Escalation Level',

        'Trigger Reason',

        'Assigned Staff',

        'Escalation Time',

        'Resolution Time',

        'Satisfaction'

      ];

      this.moduleRows = list.map((t) => [

        t.guest,

        t.room,

        t.time,

        t.service,

        t.cat,

        this.hkDashboardService.escalationLevelDocLabel(t.source),

        this.hkDashboardService.escalationTriggerReason(t.source),

        t.staff,

        this.hkDashboardService.timelineStatusLabel(t.source, 'Escalated'),

        this.hkDashboardService.escalationResolutionLabel(t.source),

        '—'

      ]);

      const totalEsc = list.length;

      const resolved = list.filter((t) =>

        this.hkDashboardService.hasStatus(t.source, 'Completed', 'Delivered')

      ).length;

      this.moduleSummary = [

        { label: 'Total Escalations', value: totalEsc },

        {

          label: 'Resolution Rate',

          value: totalEsc ? `${Math.round((resolved / totalEsc) * 100)}%` : '—'

        },

        { label: 'Avg. Escalation Resolution', value: this.escalationSummary.avgResolutionMin }

      ];

      return;

    }



    if (name === 'Delivery Report') {

      // Word doc: Delivery Report
      const list = this.tasks.filter(

        (t) => t.apiStatus === 'Completed' || t.apiStatus === 'Delivered'

      );

      this.moduleHeads = [

        'Guest Name',

        'Room',

        'Date / Time',

        'Service',

        'Category',

        'Assigned Staff',

        'Requested',

        'Assigned',

        'Started',

        'Completed'

      ];

      this.moduleRows = list.map((t) => [

        t.guest,

        t.room,

        t.time,

        t.service,

        t.cat,

        t.staff,

        t.time,

        this.hkDashboardService.timelineStatusLabel(t.source, 'Assigned'),

        this.hkDashboardService.timelineStatusLabel(t.source, 'Processing'),

        this.hkDashboardService.hasStatus(t.source, 'Completed')

          ? this.hkDashboardService.timelineStatusLabel(t.source, 'Completed')

          : this.hkDashboardService.timelineStatusLabel(t.source, 'Delivered')

      ]);

      const firstTime = list.filter((t) => t.level === '—' || t.level === '').length;

      this.moduleSummary = [

        { label: 'Total Delivered', value: list.length },

        {

          label: 'Completion Rate',

          value: this.performanceCounts.total

            ? `${this.performanceCounts.completedPct}%`

            : '—'

        },

        {

          label: 'First-Time Resolution Rate',

          value: list.length ? `${Math.round((firstTime / list.length) * 100)}%` : '—'

        }

      ];

      return;

    }



    if (name === 'Cancellation Report') {

      // Word doc: Cancellation Report
      const list = this.tasks.filter((t) => t.apiStatus === 'Cancelled' || t.apiStatus === 'Rejected');

      this.moduleHeads = [

        'Guest Name',

        'Room',

        'Date / Time',

        'Service',

        'Assigned Staff',

        'Initiator',

        'Time Elapsed',

        'Reason'

      ];

      this.moduleRows = list.map((t) => [

        t.guest,

        t.room,

        t.time,

        t.service,

        t.staff,

        this.hkDashboardService.cancellationInitiator(t.source),

        this.hkDashboardService.cancellationElapsedLabel(t.source),

        t.reason || '—'

      ]);

      this.moduleSummary = [{ label: 'Cancelled Requests', value: list.length }];

      return;

    }

    if (name === 'Guest Services Availed') {

      const list = [...this.tasks];

      this.moduleHeads = [

        'Date / Time',

        'Guest Name',

        'Room',

        'Service Name',

        'Service Type',

        'Service Charge',

        'Status',

        'Assigned Staff'

      ];

      this.moduleRows = list.map((t) => {

        const charge = this.hkDashboardService.resolveServiceCharge(t.source);

        return [

          t.time,

          t.guest,

          t.room,

          t.service,

          charge.type,

          charge.label,

          t.apiStatus || t.status,

          t.staff

        ];

      });

      const completed = list.filter(

        (t) => t.apiStatus === 'Completed' || t.apiStatus === 'Delivered'

      ).length;

      const paidCount = list.filter(

        (t) => this.hkDashboardService.resolveServiceCharge(t.source).type === 'Paid'

      ).length;

      const revenue = list.reduce(

        (sum, t) => sum + (this.hkDashboardService.resolveServiceCharge(t.source).amount || 0),

        0

      );

      this.moduleSummary = [

        { label: 'Total Services Requested', value: list.length },

        { label: 'Total Completed Services', value: completed },

        { label: 'Paid Services', value: paidCount },

        {

          label: 'Revenue Generated',

          value: revenue > 0 ? this.hkDashboardService.formatInr(revenue) : '—'

        }

      ];

    }

  }

}

