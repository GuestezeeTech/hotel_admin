import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { HotelOverviewDashboardService } from '../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.service';
import { LocalStorageService } from '../auth-services/local-storage.service';

export type FnbTrackingRow = {
  id: string;
  restaurant: string;
  type: string;
  status: string;
  time: string;
  sortTime: number;
  task: any;
};

export type FnbRecentEscalationRow = {
  num: number;
  order: string;
  issue: string;
  restaurant: string;
  time: string;
  status: string;
};

export type FnbTodayOrderSummary = {
  dateLabel: string;
  totalActive: number;
  preparing: number;
  outForDelivery: number;
  completedToday: number;
};

export type FnbTaskReportCounts = {
  delayed: number;
  escalated: number;
  delivered: number;
};

@Injectable({
  providedIn: 'root'
})
export class FbDashboardService {
  constructor(
    private overviewService: HotelOverviewDashboardService,
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private localStorage: LocalStorageService
  ) {}

  fetchOffersByOutlet(outletId?: number): Observable<number> {
    const fromStorage = Number(this.localStorage.get('outlet_id'));
    const resolvedOutletId =
      outletId ??
      (Number.isFinite(fromStorage) && fromStorage > 0 ? fromStorage : 103);

    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          outlet_id: resolvedOutletId
        }
      }
    };

    return this.http
      .post(ENDPOINTS.GET_OFFERS_BY_OUTLET, payload, {
        headers: new HttpHeaders()
          .set('Content-Type', 'application/json')
          .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
      })
      .pipe(
        map((resp: any) => {
          if (!(resp?.success === 1 || resp?.success === true)) {
            return 0;
          }
          const total = resp?.result?.total_count;
          if (typeof total === 'number') {
            return total;
          }
          const data = resp?.result?.data;
          return Array.isArray(data) ? data.length : 0;
        }),
        catchError(() => of(0))
      );
  }

  fetchOfferPaymentReport(): Observable<{ total: number; count: number }> {
    const memberId = (this.localStorage.get('MemberId') || '').trim();
    if (!memberId) {
      return of({ total: 0, count: 0 });
    }

    return this.overviewService
      .fetchOrdersGetAll(memberId, {
        status: 'Order Confirmed',
        purpose: 'offer'
      })
      .pipe(
        map((resp: any) => {
          if (!(resp?.success === 1 || resp?.success === true)) {
            return { total: 0, count: 0 };
          }
          return this.overviewService.sumOrderConfirmedRevenue(resp?.result?.data || []);
        }),
        catchError(() => of({ total: 0, count: 0 }))
      );
  }

  fetchMenuOrderingTasks(): Observable<any[]> {
    return this.overviewService.fetchAllTasks().pipe(
      map((resp) => {
        if (!(resp?.success === 1 || resp?.success === true)) {
          return [];
        }
        return (resp.result?.data || []).filter((task: any) => this.isMenuOrderingTask(task));
      }),
      catchError(() => of([]))
    );
  }

  isMenuOrderingTask(task: any): boolean {
    return String(task?.service?.belongs_to ?? '').trim() === 'Menu Ordering';
  }

  buildTrackingRows(tasks: any[], limit = 20): FnbTrackingRow[] {
    return [...tasks]
      .sort((a, b) => this.taskSortTime(b) - this.taskSortTime(a))
      .slice(0, limit)
      .map((task) => this.toTrackingRow(task));
  }

  buildEscalationTrackingRows(tasks: any[], limit = 20): FnbTrackingRow[] {
    const escalated = tasks.filter((t) => String(t?.status ?? '').trim() === 'Escalated');
    return [...escalated]
      .sort((a, b) => this.taskSortTime(b) - this.taskSortTime(a))
      .slice(0, limit)
      .map((task) => ({
        ...this.toTrackingRow(task),
        type: this.escalationIssueLabel(task)
      }));
  }

  buildRecentEscalations(tasks: any[], limit = 5): FnbRecentEscalationRow[] {
    const escalated = tasks
      .filter((t) => String(t?.status ?? '').trim() === 'Escalated')
      .sort((a, b) => this.taskSortTime(b) - this.taskSortTime(a))
      .slice(0, limit);

    return escalated.map((task, index) => ({
      num: index + 1,
      order: this.formatTaskId(task),
      issue: this.escalationIssueLabel(task),
      restaurant: this.restaurantLabel(task),
      time: this.updatedTimeLabel(task),
      status: this.displayStatus(task)
    }));
  }

  distinctRestaurants(tasks: any[]): string[] {
    const names = new Set<string>();
    for (const task of tasks) {
      const name = this.restaurantLabel(task);
      if (name && name !== '—') {
        names.add(name);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  distinctServiceTypes(tasks: any[]): string[] {
    const types = new Set<string>();
    for (const task of tasks) {
      const type = this.typeLabel(task);
      if (type && type !== '—') {
        types.add(type);
      }
    }
    return [...types].sort((a, b) => a.localeCompare(b));
  }

  filterTodayTasks(tasks: any[]): any[] {
    return (tasks || []).filter((task) => this.isTaskOnToday(task));
  }

  /** KPI counts for Menu Ordering tasks from task/getall. */
  buildTaskReportCounts(tasks: any[]): FnbTaskReportCounts {
    const list = tasks || [];
    const status = (t: any) => String(t?.status ?? '').trim();
    return {
      delayed: list.filter((t) => this.isNotTimelyDelivered(t)).length,
      escalated: list.filter((t) => status(t) === 'Escalated').length,
      delivered: list.filter((t) => ['Completed', 'Delivered'].includes(status(t))).length
    };
  }

  private isNotTimelyDelivered(task: any): boolean {
    const value = task?.timely_delivered;
    if (value === false) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'false';
    }
    return value === 0;
  }

  buildTodayOrderSummary(todayTasks: any[]): FnbTodayOrderSummary {
    const status = (t: any) => String(t?.status ?? '').trim();
    const terminal = new Set(['Delivered', 'Completed', 'Cancelled', 'Rejected']);

    const active = todayTasks.filter((t) => !terminal.has(status(t)));
    const preparing = todayTasks.filter((t) =>
      ['Processing', 'ASAP', 'Pending'].includes(status(t))
    );
    const outForDelivery = todayTasks.filter((t) => status(t) === 'Assigned');
    const completedToday = todayTasks.filter((t) =>
      ['Delivered', 'Completed'].includes(status(t))
    );

    return {
      dateLabel: this.formatTodayLabel(),
      totalActive: active.length,
      preparing: preparing.length,
      outForDelivery: outForDelivery.length,
      completedToday: completedToday.length
    };
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

  private toTrackingRow(task: any): FnbTrackingRow {
    return {
      id: this.formatTaskId(task),
      restaurant: this.restaurantLabel(task),
      type: this.typeLabel(task),
      status: this.displayStatus(task),
      time: this.updatedTimeLabel(task),
      sortTime: this.taskSortTime(task),
      task
    };
  }

  private formatTaskId(task: any): string {
    const raw = task?.id ?? task?.task_id;
    if (raw == null || raw === '') {
      return '—';
    }
    return `#${raw}`;
  }

  private restaurantLabel(task: any): string {
    return (
      task?.outlet_name ||
      task?.outlet?.name ||
      task?.pms_order_summary?.outlet_name ||
      task?.pms_order_summary?.outletName ||
      task?.service?.category ||
      '—'
    );
  }

  private typeLabel(task: any): string {
    return (
      task?.order_type ||
      task?.service?.service_name ||
      task?.service?.service_description ||
      'Menu Ordering'
    );
  }

  private displayStatus(task: any): string {
    const status = String(task?.status ?? '').trim();
    if (!status) {
      return '—';
    }
    if (task?.timely_delivered === false && status !== 'Escalated' && status !== 'Cancelled') {
      return 'Delayed';
    }
    return status;
  }

  private escalationIssueLabel(task: any): string {
    const timeline = task?.time_line || [];
    const esc = [...timeline].reverse().find((e: any) => e?.status === 'Escalated');
    return esc?.remarks || task?.service?.service_name || 'Escalation';
  }

  private updatedTimeLabel(task: any): string {
    const timeline = task?.time_line || [];
    const last = timeline.length ? timeline[timeline.length - 1] : null;
    const time = (last?.time || task?.order_time || '').trim();
    return time || '—';
  }

  private taskSortTime(task: any): number {
    const timeline = task?.time_line || [];
    const last = timeline.length ? timeline[timeline.length - 1] : null;
    const timePart = last?.time || task?.order_time || '';
    const parsed = new Date(`${task?.order_date || ''} ${timePart}`.trim()).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    const created = new Date(task?.modified_on || task?.created_on || 0).getTime();
    return Number.isNaN(created) ? 0 : created;
  }
}
