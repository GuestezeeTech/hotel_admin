import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { PaymentDetailsService } from '../../payment-details/payment-details.service';
import { ProfileService } from '../../profile/profile.service';
import { TaskManagementService } from '../../task-management/task-management.service';

@Injectable({
  providedIn: 'root'
})
export class HotelOverviewDashboardService {
  constructor(
    private localStorage: LocalStorageService,
    private profileService: ProfileService,
    private paymentDetailsService: PaymentDetailsService,
    private taskManagementService: TaskManagementService
  ) {}

  getLoggedInUserId(): number {
    return Number(this.localStorage.get('UserId'));
  }

  getMemberId(): string {
    return (this.localStorage.get('MemberId') || '').trim();
  }

  fetchCustomerByLoginId(): Observable<any> {
    const hotelId = this.getLoggedInUserId();
    const customerType = this.localStorage.get('CustomerType');
    return this.profileService.getAdminProfileDetails(hotelId, customerType);
  }

  fetchOrdersByCustomerMemberId(customerMemberId: string): Observable<any> {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: customerMemberId,
          status: 'Order Confirmed'
        },
        pagination: false,
        paginationDetails: { limit: 0, pageSize: 10 },
        sorting: true,
        sortingDetails: { email: -1 }
      }
    };
    return this.paymentDetailsService.getAllOrderDetails(payload);
  }

  /** Tasks for dashboards — scoped to logged-in hotel via `member_id` (localStorage MemberId). */
  fetchAllTasks(memberId?: string): Observable<any> {
    const resolvedMemberId = (memberId ?? this.getMemberId()).trim();
    const find: Record<string, string> = {};
    if (resolvedMemberId) {
      find['member_id'] = resolvedMemberId;
    }
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find,
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    return this.taskManagementService.getAllTask(payload);
  }

  /** Sum order_review.order_summary.order_total_amount for Order Confirmed orders. */
  sumOrderConfirmedRevenue(orders: any[]): { total: number; count: number } {
    const confirmed = (orders || []).filter(
      (order) => String(order?.status ?? '').trim() === 'Order Confirmed'
    );
    const total = confirmed.reduce((sum, order) => sum + this.orderAmount(order), 0);
    return { total, count: confirmed.length };
  }

  private orderAmount(order: any): number {
    const summary = order?.order_review?.order_summary || {};
    const fromSummary = Number(summary.order_total_amount ?? 0);
    if (Number.isFinite(fromSummary) && fromSummary > 0) {
      return fromSummary;
    }
    const fromPayment = Number(order?.payment?.amount ?? order?.payment?.order_total_amount ?? 0);
    if (Number.isFinite(fromPayment) && fromPayment > 0) {
      return fromPayment;
    }
    const direct = Number(order?.order_total_amount ?? order?.total_amount ?? 0);
    return Number.isFinite(direct) ? direct : 0;
  }

  fetchOrdersGetAll(
    customerMemberId: string,
    findExtras: Record<string, string> = {}
  ): Observable<any> {
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: customerMemberId,
          ...findExtras
        },
        pagination: false,
        paginationDetails: { limit: 0, pageSize: 10 },
        sorting: true,
        sortingDetails: { email: -1 }
      }
    };
    return this.paymentDetailsService.getAllOrderDetails(payload);
  }

  buildRecentEscalationRows(tasks: any[], limit = 10): EscalationRow[] {
    const escalatedTasks = (tasks || [])
      .filter((task) => String(task?.status ?? '').trim() === 'Escalated')
      .map((task) => {
        const latest = this.getLatestEscalationEntry(task);
        return { task, latest, sortTime: this.escalationSortTimestamp(task, latest) };
      })
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, limit);

    return escalatedTasks.map(({ task, latest }) => ({
      datetime: this.formatEscalationDateTime(task, latest?.time),
      dept: this.mapDepartmentLabel(task),
      id: String(task?.id ?? task?.task_id ?? '—'),
      details: this.buildEscalationDetails(task),
      status: 'Escalated',
      statusClass: '',
      eta: latest?.time || task?.order_time || '—'
    }));
  }

  buildTodayDepartmentPanels(tasks: any[]): TodayDepartmentPanels {
    const todayTasks = this.filterTasksForToday(tasks);
    const fnbTasks = todayTasks.filter((t) => this.classifyDepartmentTask(t) === 'F&B');
    const hkTasks = todayTasks.filter((t) => this.classifyDepartmentTask(t) === 'Housekeeping');
    const foTasks = todayTasks.filter((t) => this.classifyDepartmentTask(t) === 'Front Office');

    return {
      dateLabel: this.formatTodayLabel(),
      fnb: this.buildDeptStatusPanel(fnbTasks, 'cancelled'),
      hk: this.buildDeptStatusPanel(hkTasks, 'escalated'),
      fo: this.buildDeptStatusPanel(foTasks, 'escalated')
    };
  }

  emptyDeptStatusPanel(thirdLabel: string): DeptStatusPanel {
    return {
      total: 0,
      donutStyle: 'conic-gradient(#e2e7ea 0 100%)',
      completed: 0,
      completedPct: 0,
      pending: 0,
      pendingPct: 0,
      thirdCount: 0,
      thirdPct: 0,
      thirdLabel,
      serviceBars: []
    };
  }

  buildDepartmentOverview(tasks: any[]): DepartmentCard[] {
    const buckets: Record<'F&B' | 'Housekeeping' | 'Front Office', any[]> = {
      'F&B': [],
      Housekeeping: [],
      'Front Office': []
    };

    for (const task of tasks || []) {
      const dept = this.classifyDepartmentTask(task);
      buckets[dept].push(task);
    }

    return [
      this.buildDepartmentCard(
        'F&B',
        buckets['F&B'],
        '🍽',
        '#1769aa',
        'Total Orders',
        'Avg. Delay'
      ),
      this.buildDepartmentCard(
        'Housekeeping',
        buckets.Housekeeping,
        '🛏',
        '#25865c',
        'Total Requests',
        'Avg. Response'
      ),
      this.buildDepartmentCard(
        'Front Office',
        buckets['Front Office'],
        '♟',
        '#7140a8',
        'Total Requests',
        'Avg. Response'
      )
    ];
  }

  private buildDepartmentCard(
    name: DepartmentCard['name'],
    deptTasks: any[],
    emoji: string,
    accent: string,
    totalLabel: string,
    avgLabel: string
  ): DepartmentCard {
    const stats = this.countTasksByStatus(deptTasks);
    const avgMin = this.averageFulfillmentMinutes(deptTasks);
    const extra =
      avgMin != null ? `${avgLabel}　${avgMin} min` : `${avgLabel}　—`;

    return {
      name,
      emoji,
      accent,
      totalLabel,
      total: stats.total,
      completed: stats.completed,
      pending: stats.pending,
      escalated: stats.escalated,
      extra
    };
  }

  /** F&B = Menu Ordering; FO = Checkout / Late checkout only; all other tasks = Housekeeping. */
  private classifyDepartmentTask(task: any): 'F&B' | 'Housekeeping' | 'Front Office' {
    if (this.isMenuOrderingTask(task)) {
      return 'F&B';
    }
    if (this.isFrontOfficeTask(task)) {
      return 'Front Office';
    }
    return 'Housekeeping';
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

  private isMenuOrderingTask(task: any): boolean {
    return String(task?.service?.belongs_to ?? '').trim() === 'Menu Ordering';
  }

  private countTasksByStatus(tasks: any[]): {
    total: number;
    completed: number;
    pending: number;
    escalated: number;
  } {
    const status = (t: any) => String(t?.status ?? '').trim();
    return {
      total: tasks.length,
      completed: tasks.filter(
        (t) => status(t) === 'Completed' || status(t) === 'Delivered'
      ).length,
      pending: tasks.filter((t) => status(t) === 'Processing').length,
      escalated: tasks.filter((t) => status(t) === 'Escalated').length
    };
  }

  private averageFulfillmentMinutes(tasks: any[]): number | null {
    const durations: number[] = [];
    for (const task of tasks) {
      const start = this.taskStartTimestamp(task);
      const end = this.taskEndTimestamp(task);
      if (start != null && end != null && end > start) {
        durations.push(Math.round((end - start) / 60000));
      }
    }
    if (!durations.length) {
      return null;
    }
    return Math.round(durations.reduce((sum, n) => sum + n, 0) / durations.length);
  }

  private taskStartTimestamp(task: any): number | null {
    const parsed = new Date(`${task?.order_date || ''} ${task?.order_time || ''}`.trim()).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  private taskEndTimestamp(task: any): number | null {
    const timeline = task?.time_line || [];
    const completedEntry = [...timeline]
      .reverse()
      .find((entry: any) => entry?.status === 'Delivered' || entry?.status === 'Completed');
    if (!completedEntry?.time) {
      return null;
    }
    const parsed = new Date(`${task?.order_date || ''} ${completedEntry.time}`.trim()).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  private getLatestEscalationEntry(task: any): any | null {
    const timeline = task?.time_line || [];
    const entries = timeline.filter((tl: any) => tl?.status === 'Escalated');
    return entries.length ? entries[entries.length - 1] : null;
  }

  private escalationSortTimestamp(task: any, latest: any | null): number {
    const timePart = latest?.time || task?.order_time || '';
    const parsed = new Date(`${task?.order_date || ''} ${timePart}`.trim()).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    const created = new Date(task?.created_on || task?.modified_on || 0).getTime();
    return Number.isNaN(created) ? 0 : created;
  }

  private formatEscalationDateTime(task: any, escalatedTime?: string): string {
    const dateRaw = task?.order_date;
    const time = (escalatedTime || task?.order_time || '').trim();
    if (!dateRaw) {
      return time || '—';
    }
    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) {
      return `${dateRaw} ${time}`.trim();
    }
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    return time ? `${day} ${month} ${time}` : `${day} ${month}`;
  }

  private mapDepartmentLabel(task: any): string {
    const dept = this.classifyDepartmentTask(task);
    return dept === 'F&B' ? 'F&B' : dept;
  }

  private buildEscalationDetails(task: any): string {
    const serviceName = task?.service?.service_name || 'Service';
    const room = task?.room_no != null && task?.room_no !== '' ? ` – ${task.room_no}` : '';
    return `${serviceName}${room}`;
  }

  private buildDeptStatusPanel(
    deptTasks: any[],
    thirdKind: 'cancelled' | 'escalated'
  ): DeptStatusPanel {
    const status = (t: any) => String(t?.status ?? '').trim();
    const total = deptTasks.length;
    const completed = deptTasks.filter(
      (t) => status(t) === 'Completed' || status(t) === 'Delivered'
    ).length;
    const pending = deptTasks.filter((t) => status(t) === 'Processing').length;
    const thirdCount =
      thirdKind === 'cancelled'
        ? deptTasks.filter((t) => status(t) === 'Cancelled' || status(t) === 'Rejected').length
        : deptTasks.filter((t) => status(t) === 'Escalated').length;
    const thirdLabel = thirdKind === 'cancelled' ? 'Cancelled' : 'Escalated';

    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

    return {
      total,
      donutStyle: this.buildDonutStyle(completed, pending, thirdCount, total),
      completed,
      completedPct: pct(completed),
      pending,
      pendingPct: pct(pending),
      thirdCount,
      thirdPct: pct(thirdCount),
      thirdLabel,
      serviceBars: this.buildServiceBars(deptTasks, 6)
    };
  }

  private buildDonutStyle(
    completed: number,
    pending: number,
    third: number,
    total: number
  ): string {
    if (total === 0) {
      return 'conic-gradient(#e2e7ea 0 100%)';
    }
    const p1 = (completed / total) * 100;
    const p2 = p1 + (pending / total) * 100;
    return `conic-gradient(#218a62 0 ${p1}%, #f39a24 ${p1}% ${p2}%, #e74a4a ${p2}% 100%)`;
  }

  private buildServiceBars(
    tasks: any[],
    maxBars: number
  ): { label: string; count: number; heightPct: number }[] {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      const name = String(task?.service?.service_name ?? 'Service').trim() || 'Service';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxBars);
    const max = sorted[0]?.[1] ?? 0;
    return sorted.map(([label, count]) => ({
      label: label.length > 14 ? `${label.slice(0, 12)}…` : label,
      count,
      heightPct: max ? Math.max(8, Math.round((count / max) * 100)) : 0
    }));
  }

  filterTasksForToday(tasks: any[]): any[] {
    return (tasks || []).filter((task) => this.isTaskOnToday(task));
  }

  private formatTodayLabel(): string {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
    if (typeof raw === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(raw.trim())) {
      const [dd, mm, yyyy] = raw.trim().split('-').map(Number);
      const d = new Date(yyyy, mm - 1, dd);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}

export type EscalationRow = {
  datetime: string;
  dept: string;
  id: string;
  details: string;
  status: string;
  statusClass: string;
  eta: string;
};

export type DepartmentCard = {
  name: string;
  emoji: string;
  accent: string;
  total: number;
  totalLabel: string;
  completed: number;
  pending: number;
  escalated: number;
  extra: string;
};

export type DeptStatusPanel = {
  total: number;
  donutStyle: string;
  completed: number;
  completedPct: number;
  pending: number;
  pendingPct: number;
  thirdCount: number;
  thirdPct: number;
  thirdLabel: string;
  serviceBars: { label: string; count: number; heightPct: number }[];
};

export type TodayDepartmentPanels = {
  dateLabel: string;
  fnb: DeptStatusPanel;
  hk: DeptStatusPanel;
  fo: DeptStatusPanel;
};
