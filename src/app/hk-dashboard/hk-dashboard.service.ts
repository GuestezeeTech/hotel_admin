import { Injectable } from '@angular/core';

import { forkJoin, Observable, of } from 'rxjs';

import { catchError, map } from 'rxjs/operators';

import { DOMAIN_NAME, USER_ID } from '../app.config';

import { HotelOverviewDashboardService } from '../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.service';

import { ServiceDetailService } from '../hotel-enrollment-tabview/service-details/service-details.service';

import { TaskManagementService } from '../task-management/task-management.service';



export type HkPerformanceCounts = {

  total: number;

  completed: number;

  completedPct: number;

  processing: number;

  escalated: number;

  awaiting: number;

  delayed: number;

};



export type HkTask = {

  id: string;

  apiStatus: string;

  room: string;

  guest: string;

  cat: string;

  service: string;

  time: string;

  staff: string;

  response: string;

  /** UI label mapped from API status */

  status: string;

  eta: string;

  level: string;

  target: number;

  actual: number;

  reason: string;

  source: any;

};



export type HkCategoryBar = {

  label: string;

  count: number;

  widthPct: number;

  barClass: string;

};



export type HkEscalationSummary = {

  level1: number;

  level2: number;

  level3: number;

  avgResolutionMin: string;

};



/** `task.status` values from task/getall (same as task management). */

export const HK_TASK_GETALL_STATUSES = [

  'ASAP',

  'Assigned',

  'Acknowledged',

  'Scheduled',

  'Processing',

  'Escalated',

  'Completed',

  'Delivered',

  'Cancelled',

  'Rejected'

] as const;



export type HkStatusFilterOption = { value: string; label: string };

export type HkBoardData = {
  tasks: any[];
  services: any[];
  staff: any[];
};



@Injectable({

  providedIn: 'root'

})

export class HkDashboardService {

  constructor(

    private overviewService: HotelOverviewDashboardService,

    private serviceDetailService: ServiceDetailService,

    private taskManagementService: TaskManagementService

  ) {}



  /** Tasks for HK board: member tasks filtered by services/getall (excl. F&B / FO). */

  fetchHousekeepingTasks(): Observable<any[]> {

    return this.fetchHousekeepingBoardData().pipe(map((data) => data.tasks));

  }



  fetchHousekeepingBoardData(): Observable<HkBoardData> {

    const memberId = this.overviewService.getMemberId();

    return forkJoin({

      services: this.fetchMemberServices(memberId),

      tasksResp: this.overviewService.fetchAllTasks(),

      staff: this.fetchMemberStaff(memberId)

    }).pipe(

      map(({ services, tasksResp, staff }) => {

        const allTasks =

          tasksResp?.success === 1 || tasksResp?.success === true

            ? tasksResp.result?.data || []

            : [];

        const allowedServices = this.filterHousekeepingServices(services);

        const tasks = this.filterTasksByAllowedServices(allTasks, allowedServices);

        const staffForBoard = this.filterStaffForHousekeeping(staff, allowedServices);

        return { tasks, services: allowedServices, staff: staffForBoard };

      }),

      catchError(() => of({ tasks: [], services: [], staff: [] }))

    );

  }



  fetchMemberStaff(memberId: string): Observable<any[]> {

    if (!memberId) {

      return of([]);

    }

    const payload = {

      domain_name: DOMAIN_NAME,

      user_id: USER_ID,

      extras: {

        find: {

          member_id: memberId

        },

        pagination: true,

        sorting: true,

        sortingDetails: { id: -1 }

      }

    };

    return this.taskManagementService.getAllStaves(payload).pipe(

      map((resp: any) => {

        if (!(resp?.success === 1 || resp?.success === true)) {

          return [];

        }

        return resp.result?.data || [];

      }),

      catchError(() => of([]))

    );

  }



  /** Staff whose hierarchy department matches HK service departments (e.g. Service). */

  filterStaffForHousekeeping(staff: any[], allowedServices: any[]): any[] {

    const departments = this.departmentsFromServices(allowedServices);

    if (!departments.size) {

      departments.add('Service');

    }

    return (staff || []).filter((member) => departments.has(this.resolveStaffMemberDepartment(member)));

  }



  departmentsFromServices(services: any[]): Set<string> {

    const departments = new Set<string>();

    for (const service of this.filterHousekeepingServices(services)) {

      const dept = String(service?.department ?? '').trim();

      if (dept) {

        departments.add(dept);

      }

    }

    return departments;

  }



  resolveStaffMemberDepartment(staff: any): string {

    const fromHierarchy = staff?.hierarchy?.[0]?.department;

    if (fromHierarchy) {

      return String(fromHierarchy).trim();

    }

    return String(staff?.higher_level_hierarchy?.[0]?.department ?? '').trim();

  }



  distinctStaffDisplayNames(staff: any[]): string[] {

    const names = new Set<string>();

    for (const member of staff || []) {

      const name = String(member?.full_name ?? '').trim();

      if (name) {

        names.add(name);

      }

    }

    return [...names].sort((a, b) => a.localeCompare(b));

  }



  fetchMemberServices(memberId: string): Observable<any[]> {

    if (!memberId) {

      return of([]);

    }

    const payload = {

      domain_name: DOMAIN_NAME,

      user_id: USER_ID,

      extras: {

        find: {

          member_id: memberId

        }

      }

    };

    return this.serviceDetailService.getAllServices(payload).pipe(

      map((resp: any) => {

        if (!(resp?.success === 1 || resp?.success === true)) {

          return [];

        }

        return resp.result?.data || [];

      }),

      catchError(() => of([]))

    );

  }



  filterHousekeepingServices(services: any[]): any[] {

    return (services || []).filter((service) => !this.isExcludedServiceRecord(service));

  }



  /** Service names from member services/getall (excl. Menu Ordering, Checkout, Late checkout). */

  distinctServiceNames(services: any[]): string[] {

    const names = new Set<string>();

    for (const service of this.filterHousekeepingServices(services)) {

      const name = this.resolveServiceName(service);

      if (name) {

        names.add(name);

      }

    }

    return [...names].sort((a, b) => a.localeCompare(b));

  }



  /** @deprecated Use distinctServiceNames — departments are often identical (e.g. all "Service"). */

  distinctServiceCategories(services: any[]): string[] {

    return this.distinctServiceNames(services);

  }



  private filterTasksByAllowedServices(tasks: any[], allowedServices: any[]): any[] {

    const list = tasks || [];

    if (!allowedServices.length) {

      return list.filter((task) => this.isHousekeepingTask(task));

    }

    const allowedIds = new Set(

      allowedServices

        .map((s) => Number(s?.id))

        .filter((id) => Number.isFinite(id) && id > 0)

    );

    const allowedKeys = new Set(allowedServices.map((s) => this.serviceMatchKey(s)));

    return list.filter((task) => {

      if (this.isExcludedTaskService(task)) {

        return false;

      }

      const serviceId = Number(task?.service?.service_id);

      if (Number.isFinite(serviceId) && serviceId > 0 && allowedIds.has(serviceId)) {

        return true;

      }

      return allowedKeys.has(this.taskServiceMatchKey(task));

    });

  }



  private isExcludedServiceRecord(service: any): boolean {

    return (

      this.isExcludedServiceLabel(service?.belongs_to) ||

      this.isExcludedServiceLabel(service?.name) ||

      this.isExcludedServiceLabel(service?.service_name)

    );

  }



  private isExcludedTaskService(task: any): boolean {

    return (

      this.isExcludedServiceLabel(task?.service?.belongs_to) ||

      this.isExcludedServiceLabel(task?.service?.service_name)

    );

  }



  private isExcludedServiceLabel(value: unknown): boolean {

    const normalized = String(value ?? '')

      .trim()

      .toLowerCase()

      .replace(/\s+/g, '');

    if (!normalized) {

      return false;

    }

    if (normalized === 'menuordering' || normalized.includes('menuordering')) {

      return true;

    }

    if (normalized === 'checkout') {

      return true;

    }

    return normalized === 'latecheckout' || normalized.includes('latecheckout');

  }



  private serviceMatchKey(service: any): string {

    const belongs = String(service?.belongs_to ?? '')

      .trim()

      .toLowerCase();

    const name = String(service?.name ?? service?.service_name ?? '')

      .trim()

      .toLowerCase();

    return `${belongs}::${name}`;

  }



  private taskServiceMatchKey(task: any): string {

    const belongs = String(task?.service?.belongs_to ?? '')

      .trim()

      .toLowerCase();

    const name = String(task?.service?.service_name ?? '')

      .trim()

      .toLowerCase();

    return `${belongs}::${name}`;

  }



  mapTasks(apiTasks: any[], allowedServices: any[] = []): HkTask[] {

    return [...(apiTasks || [])]

      .sort((a, b) => this.taskSortTime(b) - this.taskSortTime(a))

      .map((task) => this.toHkTask(task, allowedServices));

  }



  buildPerformanceCounts(tasks: any[]): HkPerformanceCounts {

    const list = tasks || [];

    let completed = 0;

    let processing = 0;

    let escalated = 0;

    let awaiting = 0;



    for (const task of list) {

      if (this.hasStatus(task, 'Cancelled', 'Rejected')) {

        continue;

      }

      if (this.hasStatus(task, 'Completed', 'Delivered')) {

        completed++;

      } else if (this.hasStatus(task, 'Escalated')) {

        escalated++;

      } else if (this.hasStatus(task, 'Processing')) {

        processing++;

      } else {

        awaiting++;

      }

    }



    const total = completed + processing + escalated + awaiting;

    const delayed = list.filter((t) => this.isDelayedTask(t)).length;



    return {

      total,

      completed,

      completedPct: total ? Math.round((completed / total) * 100) : 0,

      processing,

      escalated,

      awaiting,

      delayed

    };

  }



  buildCategoryOverview(services: any[], tasks: any[]): HkCategoryBar[] {

    const serviceNames = this.distinctServiceNames(services);

    if (!serviceNames.length) {

      return [];

    }

    const today = this.filterTodayTasks(tasks);

    const counts = new Map<string, number>();

    for (const label of serviceNames) {

      counts.set(label, 0);

    }

    for (const task of today) {

      const name = this.resolveTaskServiceName(task, services);

      if (counts.has(name)) {

        counts.set(name, (counts.get(name) ?? 0) + 1);

      }

    }

    const max = Math.max(...[...counts.values()], 1);

    const barClasses = ['', 'barrow-gold', 'barrow-blue'];

    return serviceNames.map((label, index) => {

      const count = counts.get(label) ?? 0;

      return {

        label,

        count,

        widthPct: Math.round((count / max) * 100),

        barClass: barClasses[index % barClasses.length]

      };

    });

  }



  buildEscalationSummary(tasks: any[]): HkEscalationSummary {

    const escalated = (tasks || []).filter((t) => this.hasStatus(t, 'Escalated'));

    let level1 = 0;

    let level2 = 0;

    let level3 = 0;

    const resolutionMinutes: number[] = [];



    for (const task of escalated) {

      const depth = this.escalationDepth(task);

      if (depth >= 3) {

        level3++;

      } else if (depth === 2) {

        level2++;

      } else {

        level1++;

      }

    }



    for (const task of tasks || []) {

      if (!this.hasStatus(task, 'Completed', 'Delivered')) {

        continue;

      }

      if (this.escalationDepth(task) > 0) {

        const actual = Number(task?.actual_time_to_close_the_task ?? 0);

        if (Number.isFinite(actual) && actual > 0) {

          resolutionMinutes.push(actual);

        }

      }

    }



    const avg =

      resolutionMinutes.length > 0

        ? Math.round(resolutionMinutes.reduce((s, n) => s + n, 0) / resolutionMinutes.length)

        : null;



    return {

      level1,

      level2,

      level3,

      avgResolutionMin: avg != null ? `${avg} min` : '—'

    };

  }



  distinctStaffNames(tasks: any[]): string[] {

    const names = new Set<string>();

    for (const task of tasks || []) {

      const name = String(task?.assigned_staff_name ?? '').trim();

      if (name) {

        names.add(name);

      }

    }

    return [...names].sort((a, b) => a.localeCompare(b));

  }



  filterTodayTasks(tasks: any[]): any[] {

    return (tasks || []).filter((task) => this.isTaskOnToday(task));

  }



  /** Status dropdown: canonical API labels, plus any extra values present in the payload. */

  buildStatusFilterOptions(tasks: any[]): HkStatusFilterOption[] {

    const present = new Set<string>();

    for (const task of tasks || []) {

      const s = String(task?.status ?? '').trim();

      if (s) {

        present.add(s);

      }

    }



    const ordered: string[] = [];

    for (const s of HK_TASK_GETALL_STATUSES) {

      if (present.size === 0 || present.has(s)) {

        ordered.push(s);

      }

    }

    for (const s of present) {

      if (!ordered.includes(s)) {

        ordered.push(s);

      }

    }



    return ordered.map((value) => ({ value, label: value }));

  }



  matchesStatusFilter(task: HkTask, filter: string): boolean {

    const f = filter.trim();

    if (!f) {

      return true;

    }

    return task.apiStatus === f;

  }



  statusPillClassForApi(apiStatus: string): string {

    const s = String(apiStatus ?? '').trim();

    if (s === 'Completed' || s === 'Delivered') {

      return '';

    }

    if (s === 'ASAP' || s === 'Assigned' || s === 'Acknowledged' || s === 'Scheduled') {

      return 'pending';

    }

    if (s === 'Escalated') {

      return 'escalated';

    }

    if (s === 'Processing') {

      return 'processing';

    }

    if (s === 'Cancelled' || s === 'Rejected') {

      return 'cancelled';

    }

    return '';

  }



  hasStatus(task: any, ...statuses: string[]): boolean {

    const current = String(task?.status ?? '')

      .trim()

      .toLowerCase();

    return statuses.some((s) => s.toLowerCase() === current);

  }



  isHousekeepingTask(task: any): boolean {

    if (this.isMenuOrderingTask(task) || this.isFrontOfficeTask(task)) {

      return false;

    }

    return true;

  }



  isDelayedTask(task: any): boolean {

    if (this.hasStatus(task, 'Cancelled', 'Rejected')) {

      return false;

    }

    const value = task?.timely_delivered;

    if (value === false) {

      return true;

    }

    if (typeof value === 'string') {

      return value.trim().toLowerCase() === 'false';

    }

    if (value === 0) {

      return true;

    }

    const target = Number(task?.service?.time_bound_value ?? 0);

    const actual = Number(task?.actual_time_to_close_the_task ?? 0);

    if (target > 0 && actual > target) {

      return true;

    }

    return false;

  }



  private toHkTask(task: any, allowedServices: any[] = []): HkTask {

    const apiStatus = String(task?.status ?? '').trim();

    const target = Number(task?.service?.time_bound_value ?? 0) || 0;

    const actual = Number(task?.actual_time_to_close_the_task ?? 0) || 0;

    const cat = this.resolveTaskCategory(task, allowedServices);

    const serviceName = this.resolveTaskServiceName(task, allowedServices);



    return {

      id: `HK-${task?.id ?? task?._id ?? ''}`,

      apiStatus,

      room: String(task?.room_no ?? '—'),

      guest: String(task?.guest_name ?? '—'),

      cat,

      service: serviceName,

      time: this.formatRequestTime(task),

      staff: String(task?.assigned_staff_name ?? '').trim() || '—',

      response: this.formatResponseTime(task),

      status: apiStatus,

      eta: this.formatEtaDelay(task, target, actual),

      level: this.formatEscalationLevel(task),

      target,

      actual,

      reason: this.escalationReason(task),

      source: task

    };

  }



  resolveServiceName(service: any): string {

    return String(service?.name ?? service?.service_name ?? '').trim();

  }



  resolveTaskServiceName(task: any, allowedServices: any[] = []): string {

    const serviceId = Number(task?.service?.service_id);

    if (Number.isFinite(serviceId) && serviceId > 0) {

      const match = (allowedServices || []).find((s) => Number(s?.id) === serviceId);

      if (match) {

        return this.resolveServiceName(match);

      }

    }

    const key = this.taskServiceMatchKey(task);

    const byKey = (allowedServices || []).find((s) => this.serviceMatchKey(s) === key);

    if (byKey) {

      return this.resolveServiceName(byKey);

    }

    return String(task?.service?.service_name ?? task?.service?.name ?? '').trim();

  }



  resolveServiceCategory(service: any): string {

    const dept = String(service?.department ?? service?.category ?? '').trim();

    return dept || 'General';

  }



  resolveTaskCategory(task: any, allowedServices: any[] = []): string {

    const serviceId = Number(task?.service?.service_id);

    if (Number.isFinite(serviceId) && serviceId > 0) {

      const match = (allowedServices || []).find((s) => Number(s?.id) === serviceId);

      if (match) {

        return this.resolveServiceCategory(match);

      }

    }

    const fromTask = String(task?.service?.category ?? task?.service?.department ?? '').trim();

    if (fromTask) {

      return fromTask;

    }

    return this.resolveHkCategory(task);

  }



  private resolveHkCategory(task: any): string {

    const cat = String(task?.service?.category ?? '').trim();

    const name = String(task?.service?.service_name ?? '').toLowerCase();

    const belongs = String(task?.service?.belongs_to ?? '').toLowerCase();

    const blob = `${cat} ${name} ${belongs}`.toLowerCase();



    if (/laundry/.test(blob)) {

      return 'Laundry';

    }

    if (/clean|checkout room|occupied room|turndown|housekeeping|room service/.test(blob)) {

      return 'Room Cleaning';

    }

    if (/amenit|towel|iron|pillow|blanket|soap|sewing|spray/.test(blob)) {

      return 'Amenities';

    }

    if (cat && !/^(default|f&b|fo)$/i.test(cat)) {

      return cat;

    }

    if (belongs && belongs !== 'menu ordering') {

      return belongs.replace(/\b\w/g, (c) => c.toUpperCase());

    }

    return 'Amenities';

  }



  private formatRequestTime(task: any): string {

    const dateRaw = task?.order_date;

    const time = String(task?.order_time ?? '').trim();

    if (!dateRaw) {

      return time || '—';

    }

    const d = this.parseTaskDate(task);

    if (!d) {

      return `${dateRaw} ${time}`.trim();

    }

    const day = d.getDate().toString().padStart(2, '0');

    const month = d.toLocaleString('en-GB', { month: 'short' });

    const year = d.getFullYear();

    return time ? `${day} ${month} ${year} ${time}` : `${day} ${month} ${year}`;

  }



  private formatResponseTime(task: any): string {

    const timeline = task?.time_line || [];

    const start = this.timelineTimestamp(task?.order_date, timeline[0]?.time || task?.order_time);

    const assigned = timeline.find(

      (e: any) => e?.status === 'Assigned' || e?.status === 'Processing'

    );

    if (!start || !assigned?.time) {

      return task?.assigned_staff_name ? '—' : 'Not accepted';

    }

    const end = this.timelineTimestamp(assigned.date || task?.order_date, assigned.time);

    if (!end || end <= start) {

      return '—';

    }

    const mins = Math.max(1, Math.round((end - start) / 60000));

    return `${mins} min`;

  }



  private formatEtaDelay(task: any, target: number, actual: number): string {

    const apiStatus = String(task?.status ?? '').trim();

    if (apiStatus === 'Completed' || apiStatus === 'Delivered') {

      return 'Delivered';

    }

    if (apiStatus === 'Cancelled' || apiStatus === 'Rejected') {

      return '—';

    }

    if (this.isDelayedTask(task)) {

      if (target > 0 && actual > target) {

        return `+${actual - target} min`;

      }

      return 'Overdue';

    }

    if (target > 0) {

      return `${target} min`;

    }

    return '—';

  }



  private formatEscalationLevel(task: any): string {

    if (!this.hasStatus(task, 'Escalated')) {

      const depth = this.escalationDepth(task);

      if (depth === 0) {

        return '—';

      }

    }

    const depth = Math.max(1, this.escalationDepth(task));

    if (depth >= 3) {

      return 'L3';

    }

    if (depth === 2) {

      return 'L2';

    }

    return 'L1';

  }



  private escalationDepth(task: any): number {

    const timeline = task?.time_line || [];

    return timeline.filter((e: any) => e?.status === 'Escalated').length;

  }



  private escalationReason(task: any): string {

    const timeline = task?.time_line || [];

    const entries = timeline.filter((e: any) => e?.status === 'Escalated');

    const last = entries[entries.length - 1];

    const remark = String(last?.remark ?? task?.help_remarks ?? '').trim();

    return remark || '—';

  }



  private timelineTimestamp(dateRaw: string | undefined, timeRaw: string | undefined): number | null {

    if (!dateRaw || !timeRaw) {

      return null;

    }

    const parsed = new Date(`${dateRaw} ${timeRaw}`.trim()).getTime();

    return Number.isNaN(parsed) ? null : parsed;

  }



  private taskSortTime(task: any): number {

    const parsed = new Date(`${task?.order_date || ''} ${task?.order_time || ''}`.trim()).getTime();

    if (!Number.isNaN(parsed)) {

      return parsed;

    }

    const created = new Date(task?.modified_on || task?.created_on || 0).getTime();

    return Number.isNaN(created) ? 0 : created;

  }



  private isTaskOnToday(task: any): boolean {

    const taskDate = this.parseTaskDate(task);

    if (!taskDate) {

      return false;

    }

    const today = new Date();

    return (

      taskDate.getFullYear() === today.getFullYear() &&

      taskDate.getMonth() === today.getMonth() &&

      taskDate.getDate() === today.getDate()

    );

  }



  private parseTaskDate(task: any): Date | null {

    const raw = task?.order_date;

    if (!raw) {

      return null;

    }

    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {

      const d = new Date(raw.trim());

      return Number.isNaN(d.getTime()) ? null : d;

    }

    if (typeof raw === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(raw.trim())) {

      const [dd, mm, yyyy] = raw.trim().split('-').map(Number);

      const d = new Date(yyyy, mm - 1, dd);

      return Number.isNaN(d.getTime()) ? null : d;

    }

    const d = new Date(raw);

    return Number.isNaN(d.getTime()) ? null : d;

  }



  private isMenuOrderingTask(task: any): boolean {

    return String(task?.service?.belongs_to ?? '').trim() === 'Menu Ordering';

  }



  private isFrontOfficeTask(task: any): boolean {

    const belongs = String(task?.service?.belongs_to ?? '').trim().toLowerCase();

    const serviceName = String(task?.service?.service_name ?? '').trim().toLowerCase();

    return (

      belongs === 'checkout' ||

      belongs === 'late checkout' ||

      serviceName === 'checkout' ||

      serviceName === 'late checkout'

    );

  }

}

