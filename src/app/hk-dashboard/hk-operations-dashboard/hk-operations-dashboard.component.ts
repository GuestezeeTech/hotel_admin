import { CommonModule } from '@angular/common';

import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { catchError, of } from 'rxjs';

import {

  HkCategoryBar,

  HkDashboardService,

  HkEscalationSummary,

  HkPerformanceCounts,

  HkStatusFilterOption,

  HkTask

} from '../hk-dashboard.service';



export type HkModuleName =

  | 'Overview'

  | 'Tasks'

  | 'Room Cleaning'

  | 'Amenities'

  | 'Laundry'

  | 'Staff & Assignments'

  | 'Service Delivery'

  | 'Delayed Tasks'

  | 'Escalations'

  | 'Delivery Report'

  | 'Cancellation Report';



type SummaryTile = { label: string; value: string | number };



@Component({

  selector: 'app-hk-operations-dashboard',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './hk-operations-dashboard.component.html',

  styleUrl: './hk-operations-dashboard.component.scss'

})

export class HkOperationsDashboardComponent implements OnInit {

  activeView: 'overview' | 'module' = 'overview';

  activeModule: HkModuleName = 'Tasks';

  moduleStatusFilter = '';



  tasks: HkTask[] = [];

  apiTasks: any[] = [];

  housekeepingServices: any[] = [];

  categoryOptions: string[] = [];



  categoryOverview: HkCategoryBar[] = [

    { label: 'Room Cleaning', count: 0, widthPct: 0, barClass: '' },

    { label: 'Amenities', count: 0, widthPct: 0, barClass: 'barrow-gold' },

    { label: 'Laundry', count: 0, widthPct: 0, barClass: 'barrow-blue' }

  ];



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



  constructor(private hkDashboardService: HkDashboardService) {}



  ngOnInit(): void {

    this.loadTasksFromApi();

  }



  refreshPerformance(): void {

    this.loadTasksFromApi();

  }



  private loadTasksFromApi(): void {

    this.loadingPerformance = true;

    this.performanceLoadError = '';

    this.tasksLoadError = '';

    this.hkDashboardService

      .fetchHousekeepingBoardData()

      .pipe(catchError(() => of({ tasks: [], services: [], staff: [] })))

      .subscribe({

        next: ({ tasks: apiTasks, services, staff }) => {

          this.apiTasks = apiTasks;

          this.housekeepingServices = services;

          this.categoryOptions = this.hkDashboardService.distinctServiceNames(services);

          this.tasks = this.hkDashboardService.mapTasks(apiTasks, services);

          this.performanceCounts = this.hkDashboardService.buildPerformanceCounts(apiTasks);

          this.categoryOverview = this.hkDashboardService.buildCategoryOverview(services, apiTasks);

          this.escalationSummary = this.hkDashboardService.buildEscalationSummary(apiTasks);

          this.staffOptions = this.hkDashboardService.distinctStaffDisplayNames(staff);
          this.statusFilterOptions = this.hkDashboardService.buildStatusFilterOptions(apiTasks);

          this.loadingPerformance = false;

          if (this.activeView === 'module') {

            this.buildModuleView(this.activeModule, this.moduleStatusFilter);

          }

        },

        error: () => {

          this.apiTasks = [];

          this.housekeepingServices = [];

          this.categoryOptions = [];

          this.tasks = [];

          this.performanceCounts = this.hkDashboardService.buildPerformanceCounts([]);

          this.performanceLoadError = 'Could not load task counts.';

          this.tasksLoadError = 'Could not load housekeeping tasks.';

          this.loadingPerformance = false;

        }

      });

  }



  get liveClock(): string {

    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

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



  applyHomeFilters(): void {

    /* triggers filteredHomeTasks getter */

  }



  goOverview(): void {

    this.activeView = 'overview';

    this.moduleStatusFilter = '';

  }



  goModule(name: HkModuleName, statusFilter = ''): void {

    if (name === 'Overview') {

      this.goOverview();

      return;

    }

    this.activeModule = name;

    this.moduleStatusFilter = statusFilter;

    this.moduleSearch = '';

    this.activeView = 'module';

    this.buildModuleView(name, statusFilter);

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

        'Request ID',

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



    if (name === 'Service Delivery') {

      this.moduleHeads = [

        'Service Name',

        'Category',

        'Request Count',

        'Target Time',

        'Avg. Actual Time',

        'Within SLA',

        'On-time Rate'

      ];

      const serviceNames = [...new Set(this.tasks.map((t) => t.service))].sort();

      this.moduleRows = serviceNames.map((serviceName) => {

        const subset = this.tasks.filter((t) => t.service === serviceName);

        const done = subset.filter((t) => t.actual > 0);

        const avg = done.length

          ? Math.round(done.reduce((sum, t) => sum + t.actual, 0) / done.length)

          : 0;

        const within = done.filter((t) => t.target > 0 && t.actual <= t.target).length;

        return [

          serviceName,

          subset[0]?.cat || '—',

          String(subset.length),

          subset[0]?.target ? `${subset[0].target} min` : '—',

          avg ? `${avg} min` : '—',

          String(within),

          done.length ? `${Math.round((within / done.length) * 100)}%` : '—'

        ];

      });

      const onTime = this.tasks.filter(

        (t) => t.target > 0 && t.actual > 0 && t.actual <= t.target

      ).length;

      const withActual = this.tasks.filter((t) => t.actual > 0).length;

      this.moduleSummary = [

        { label: 'Total Requests', value: this.tasks.length },

        {

          label: 'On-time Delivery Rate',

          value: withActual ? `${Math.round((onTime / withActual) * 100)}%` : '—'

        }

      ];

      return;

    }



    if (name === 'Delayed Tasks') {

      const list = this.tasks.filter((t) => this.hkDashboardService.isDelayedTask(t.source));

      this.moduleHeads = [

        'Guest',

        'Room',

        'Date / Time',

        'Service',

        'Target',

        'Actual',

        'Delay Reason',

        'Assigned Staff',

        'Delay'

      ];

      this.moduleRows = list.map((t) => [

        t.guest,

        t.room,

        t.time,

        t.service,

        t.target ? `${t.target} min` : '—',

        t.actual ? `${t.actual} min` : '—',

        t.reason,

        t.staff,

        t.eta

      ]);

      this.moduleSummary = [{ label: 'Delayed Tickets', value: list.length }];

      return;

    }



    if (name === 'Escalations') {

      const list = this.tasks.filter(

        (t) => t.apiStatus === 'Escalated' || t.level !== '—'

      );

      this.moduleHeads = [

        'Guest',

        'Room',

        'Request Time',

        'Service',

        'Escalation Level',

        'Trigger Reason',

        'Assigned Staff',

        'Status'

      ];

      this.moduleRows = list.map((t) => [

        t.guest,

        t.room,

        t.time,

        t.service,

        t.level,

        t.reason,

        t.staff,

        t.status

      ]);

      this.moduleSummary = [

        { label: 'Total Escalations', value: list.filter((t) => t.apiStatus === 'Escalated').length },

        { label: 'Avg. Resolution Time', value: this.escalationSummary.avgResolutionMin }

      ];

      return;

    }



    if (name === 'Delivery Report') {

      const list = this.tasks.filter(

        (t) => t.apiStatus === 'Completed' || t.apiStatus === 'Delivered'

      );

      this.moduleHeads = [

        'Guest',

        'Room',

        'Request Time',

        'Service',

        'Assigned Staff',

        'Target Time',

        'Actual Time',

        'Guest Acknowledgement',

        'Status'

      ];

      this.moduleRows = list.map((t) => [

        t.guest,

        t.room,

        t.time,

        t.service,

        t.staff,

        t.target ? `${t.target} min` : '—',

        t.actual ? `${t.actual} min` : '—',

        '—',

        t.status

      ]);

      this.moduleSummary = [

        { label: 'Total Delivered', value: list.length },

        {

          label: 'Completion Rate',

          value: this.performanceCounts.total

            ? `${this.performanceCounts.completedPct}%`

            : '—'

        }

      ];

      return;

    }



    if (name === 'Cancellation Report') {

      const list = this.tasks.filter((t) => t.apiStatus === 'Cancelled' || t.apiStatus === 'Rejected');

      this.moduleHeads = [

        'Request ID',

        'Guest',

        'Room',

        'Request Time',

        'Service',

        'Assigned Staff',

        'Initiator',

        'Time Before Cancellation',

        'Reason'

      ];

      this.moduleRows = list.map((t) => [

        t.id,

        t.guest,

        t.room,

        t.time,

        t.service,

        t.staff,

        '—',

        '—',

        t.reason

      ]);

      this.moduleSummary = [{ label: 'Cancelled Requests', value: list.length }];

    }

  }

}

