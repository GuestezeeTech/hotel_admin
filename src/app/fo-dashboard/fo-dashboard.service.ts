import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HotelOverviewDashboardService } from '../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.service';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { formatAmPmTime } from '../shared/time-format.util';
import { formatInr as formatInrSafe } from '../shared/inr-format.util';

export type FoServiceRecord = {
  id: string;
  room: string;
  guest: string;
  type: string;
  staff: string;
  status: string;
  eta: string;
  delay: string;
  date: string;
  time: string;
  checkoutStatus: string;
  lateCheckoutAmount: number | null;
  task: any;
};

/** Flat row from keys collection `mobile_key_report` payload (no key gen id / reserve_no in UI). */
export type FoMobileKeyRow = {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  keyCount: number;
  totalGuests: number;
  checkIn: string;
  checkOut: string;
  checkInRaw: string;
  checkOutRaw: string;
  roomNo: string;
  roomType: string;
  lockName: string;
  sdk: string;
  openedStatus: string;
  endpointId: string;
  keyUsedCount: number;
  unlockAttempts: number;
  deviceBrand: string;
  deviceName: string;
  deviceModel: string;
  deviceOs: string;
  deviceOsVersion: string;
  inHouseStatus: string;
  idleHoursLabel: string;
  memberId: string;
  sortTime: number;
  raw: any;
};

export type FoLateCheckoutRevenueRow = {
  id: string;
  guestName: string;
  room: string;
  datetime: string;
  standardCheckout: string;
  requestedCheckout: string;
  additionalHours: string;
  billedTo: string;
  feeAmount: number | null;
  taxes: number | null;
  totalCharged: number | null;
  paymentStatus: string;
  paymentMethod: string;
  approvedBy: string;
  sortTime: number;
  task: any;
};

export type FoCheckoutRequestRow = {
  id: string;
  guestName: string;
  room: string;
  datetime: string;
  channel: string;
  scheduledDeparture: string;
  requestedDeparture: string;
  status: string;
  staff: string;
  sortTime: number;
  task: any;
};

export type FoDeviceOsRow = {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  roomNo: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: string;
  deviceBrand: string;
  deviceName: string;
  deviceModel: string;
  deviceOs: string;
  deviceOsVersion: string;
  guestStatus: string;
  sortTime: number;
  raw: any;
};

export type FoDeviceOsSummary = {
  total: number;
  ios: number;
  iosPct: number;
  android: number;
  androidPct: number;
  other: number;
};

export type FoGuestServiceDetailRow = {
  id: string;
  datetime: string;
  department: string;
  status: string;
  specialInstructions: string;
  guestName: string;
  room: string;
  category: string;
  serviceName: string;
  requestTime: string;
  staff: string;
  responseTime: string;
  escalationLevel: string;
  sortTime: number;
  task: any;
};

export type FoKpiCounts = {
  total: number;
  completed: number;
  pending: number;
  escalated: number;
  completedPct: number;
  pendingPct: number;
  escalatedPct: number;
};

export type FoContributionRow = {
  label: string;
  count: number;
  pct: number;
  tone: 'blue' | 'teal' | 'gold' | 'coral' | 'purple' | 'amber';
  color: string;
};

const FO_TONE_COLOR: Record<FoContributionRow['tone'], string> = {
  blue: '#397fc5',
  teal: '#299a69',
  gold: '#e4a400',
  coral: '#e45138',
  purple: '#b94f8d',
  amber: '#d88b19'
};

export type FoKeyServiceCounts = {
  lateCheckoutPayments: number;
  lateCheckoutRequested: number;
  checkoutTotal: number;
};

export type FoEscalationSummary = {
  /** Open and In Progress share the same unresolved-escalation count. */
  open: number;
  inProgress: number;
  resolved: number;
  avgDelayMinutes: number | null;
  resolvedSampleCount: number;
  avgDelayLabel: string;
};

const LATE_CHECKOUT_STATUS_LABEL: Record<string, string> = {
  Pending: 'Late checkout (Requested)',
  'Price Updated': 'Late checkout (Price Updated)',
  Approved: 'Late checkout (Approved)',
  'Guest Declined': 'Late checkout (Guest Declined)',
  Rejected: 'Late checkout (Rejected)'
};

@Injectable({ providedIn: 'root' })
export class FoDashboardService {
  /**
   * UI testing: load `assets/fixtures/mobile-key-example.json` instead of key/getall.
   * Keep false for live keys collection.
   */
  static readonly USE_MOBILE_KEY_FIXTURE = false;

  constructor(
    private overviewService: HotelOverviewDashboardService,
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private localStorage: LocalStorageService,
    private router: Router
  ) {}

  fetchFoTasks(): Observable<any[]> {
    return this.overviewService.fetchAllTasks().pipe(
      map((resp) => {
        const all =
          resp?.success === 1 || resp?.success === true ? resp.result?.data || [] : [];
        return this.overviewService.filterFrontOfficeTasks(all);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Order/getall by purpose for FO reports:
   * food | offer | late checkout | checkout
   */
  fetchOrdersByPurpose(purpose: string): Observable<any[]> {
    const memberId = (this.localStorage.get('MemberId') || '').trim();
    const normalized = String(purpose || '')
      .trim()
      .toLowerCase();
    if (!memberId || !normalized) {
      return of([]);
    }
    return this.overviewService.fetchOrdersGetAll(memberId, { purpose: normalized }).pipe(
      map((resp: any) => {
        if (!(resp?.success === 1 || resp?.success === true)) {
          return [];
        }
        return (resp?.result?.data || []).filter(
          (order: any) =>
            String(order?.purpose ?? '')
              .trim()
              .toLowerCase() === normalized
        );
      }),
      catchError(() => of([]))
    );
  }

  fetchLateCheckoutOrders(): Observable<any[]> {
    return this.fetchOrdersByPurpose('late checkout');
  }

  fetchCheckoutOrders(): Observable<any[]> {
    return this.fetchOrdersByPurpose('checkout');
  }

  /** Mobile key analytics rows for the hotel (`1001/key/getall`). */
  fetchMobileKeyReports(): Observable<any[]> {
    const memberId = (this.localStorage.get('MemberId') || '').trim();
    if (FoDashboardService.USE_MOBILE_KEY_FIXTURE) {
      return this.loadMobileKeyFixture(memberId || '12345');
    }
    if (!memberId) {
      return of([]);
    }
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate(['/login'], { skipLocationChange: false });
      return of([]);
    }

    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          'hotel.member_id': memberId
        },
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };

    return this.http
      .post(ENDPOINTS.MOBILE_KEY_GETALL, payload, {
        headers: new HttpHeaders()
          .set('Content-Type', 'application/json')
          .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
      })
      .pipe(
        map((resp: any) => {
          if (!(resp?.success === 1 || resp?.success === true)) {
            return [];
          }
          const data = resp?.result?.data;
          const list = Array.isArray(data) ? data : [];
          const scoped = list.filter((row: any) => this.mobileKeyBelongsToMember(row, memberId));
          return this.dedupeMobileKeyDocs(scoped);
        }),
        catchError(() => of([]))
      );
  }

  /** Test fixture only — not mixed with API. */
  private loadMobileKeyFixture(memberId: string): Observable<any[]> {
    return this.http.get<any[]>('assets/fixtures/mobile-key-example.json').pipe(
      map((list) => {
        if (!Array.isArray(list)) {
          return [];
        }
        return this.dedupeMobileKeyDocs(
          list.map((row) => {
            const clone = JSON.parse(JSON.stringify(row));
            const report =
              clone?.payload?.mobile_key_report ||
              clone?.mobile_key_report ||
              clone;
            if (report?.hotel) {
              report.hotel.member_id = memberId || report.hotel.member_id || '12345';
            }
            return clone;
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  private mobileKeyBelongsToMember(row: any, memberId: string): boolean {
    if (!memberId) {
      return true;
    }
    const report = this.unwrapMobileKeyReport(row);
    const rowMember = String(
      report?.hotel?.member_id ??
        report?.hotel?.memberId ??
        row?.hotel?.member_id ??
        row?.hotel?.memberId ??
        ''
    ).trim();
    // Require explicit match — skip docs with missing/other member_id.
    return rowMember === memberId;
  }

  /**
   * Collapse duplicate key docs for the same stay/device
   * (same guest + room + lock/endpoint; keep newest).
   */
  private dedupeMobileKeyDocs(rows: any[]): any[] {
    const best = new Map<string, any>();
    for (const row of rows || []) {
      const key = this.mobileKeyDedupeKey(row);
      const prev = best.get(key);
      if (!prev) {
        best.set(key, row);
        continue;
      }
      const prevTs = this.mobileKeySortDate(prev)?.getTime() || 0;
      const nextTs = this.mobileKeySortDate(row)?.getTime() || 0;
      const prevId = Number(prev?.id ?? prev?._id ?? 0);
      const nextId = Number(row?.id ?? row?._id ?? 0);
      if (nextTs > prevTs || (nextTs === prevTs && nextId >= prevId)) {
        best.set(key, row);
      }
    }
    return [...best.values()];
  }

  private mobileKeyDedupeKey(row: any): string {
    const report = this.unwrapMobileKeyReport(row);
    const guest = report?.guest || {};
    const room = report?.room || {};
    const key = report?.key || {};
    const endpoint = String(key?.endpoint_id ?? key?.endpointId ?? '').trim();
    if (endpoint) {
      return `ep:${endpoint}`;
    }
    const guestId = String(guest?.guest_id ?? guest?.guestId ?? '').trim();
    const phone = String(guest?.guest_phone ?? guest?.guestPhone ?? '').trim();
    const roomNo = String(room?.room_no ?? room?.roomNo ?? '').trim();
    const sdk = String(key?.sdk ?? key?.lock_name ?? key?.lockName ?? '').trim().toLowerCase();
    const docId = String(row?.id ?? row?._id ?? '').trim();
    return `g:${guestId || phone}|r:${roomNo}|s:${sdk}|id:${docId || 'x'}`;
  }

  filterMobileKeysByDateRange(
    rows: any[],
    start: Date,
    end: Date,
    unbounded = false
  ): any[] {
    if (unbounded) {
      return [...(rows || [])];
    }
    const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).getTime();
    const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();
    return (rows || []).filter((row) => {
      const d = this.mobileKeySortDate(row);
      if (!d) {
        return false;
      }
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    });
  }

  buildMobileKeyRows(rows: any[]): FoMobileKeyRow[] {
    return this.dedupeMobileKeyDocs(rows || [])
      .map((row) => this.mapMobileKeyRow(row))
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  buildUnusedMobileKeyRows(rows: any[]): FoMobileKeyRow[] {
    return this.buildMobileKeyRows(rows).filter((row) => {
      const status = row.openedStatus.toLowerCase();
      return !status || status === 'unused' || status === 'not used' || status === 'pending';
    });
  }

  buildLateCheckoutRevenueRows(
    tasks: any[],
    orders: any[] = []
  ): FoLateCheckoutRevenueRow[] {
    const purposeOrders = (orders || []).filter(
      (order) =>
        String(order?.purpose ?? '')
          .trim()
          .toLowerCase() === 'late checkout'
    );
    const taskByOrderId = this.buildTaskByOrderIdMap(tasks);
    const fromOrders = purposeOrders.map((order) => {
      const orderId = String(order?.id ?? '').trim();
      const task = taskByOrderId.get(orderId) || null;
      const summary = order?.order_review?.order_summary || {};
      const fee =
        Number(summary.sub_total ?? summary.base_amount ?? summary.order_total_amount ?? 0) ||
        this.lateCheckoutFee(task) ||
        null;
      const taxes = Number(summary.tax ?? 0) || this.lateCheckoutTax(task) || null;
      const total =
        Number(summary.order_total_amount ?? 0) ||
        (fee != null || taxes != null ? Number((fee || 0) + (taxes || 0)) : fee);
      const createdRaw = order?.orderConfirmDate || order?.created_on || order?.modified_on || '';
      const createdDate = createdRaw ? new Date(createdRaw) : null;
      return {
        id: orderId || String(task?.id ?? '—'),
        guestName: String(
          order?.guest?.guest_name || order?.guest_name || task?.guest_name || '—'
        ).trim() || '—',
        room: String(
          order?.room_no || order?.delivery?.room_no || order?.guest?.room_no || task?.room_no || '—'
        ).trim() || '—',
        datetime: formatAmPmTime(createdRaw) || (task ? this.formatTaskDateTime(task) : '—'),
        standardCheckout: task ? this.standardCheckoutLabel(task) : '—',
        requestedCheckout: task ? this.requestedCheckoutLabel(task) : '—',
        additionalHours: task ? this.additionalHoursLabel(task) : '—',
        billedTo: this.lateCheckoutBilledTo(task) || this.orderBilledTo(order),
        feeAmount: fee,
        taxes,
        totalCharged: total,
        paymentStatus: task
          ? this.displayStatus(task)
          : String(order?.status ?? '—').trim() || '—',
        paymentMethod:
          this.lateCheckoutPaymentMethod(task) ||
          String(order?.payment_type ?? '—').trim() ||
          '—',
        approvedBy: String(task?.assigned_staff_name ?? task?.approved_by_name ?? '—'),
        sortTime: createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.getTime() : task ? this.taskSortTime(task) : 0,
        task
      } as FoLateCheckoutRevenueRow;
    });

    const coveredOrderIds = new Set(
      fromOrders.map((r) => String(r.id || '').trim()).filter(Boolean)
    );
    const fromTasks = (tasks || [])
      .filter((task) => this.isLateCheckout(task))
      .filter((task) => {
        const oid = String(task?.order_id ?? task?.pms_order_summary?.orderId ?? '').trim();
        return !oid || !coveredOrderIds.has(oid);
      })
      .map((task) => {
        const fee = this.lateCheckoutFee(task);
        const taxes = this.lateCheckoutTax(task);
        const total =
          fee != null || taxes != null ? Number((fee || 0) + (taxes || 0)) : fee;
        const sortTime = this.taskSortTime(task);
        return {
          id: String(task?.id ?? task?.task_id ?? '—'),
          guestName: String(task?.guest_name ?? task?.created_by_name ?? '—'),
          room: String(task?.room_no ?? task?.room_range_label ?? '—'),
          datetime: this.formatTaskDateTime(task),
          standardCheckout: this.standardCheckoutLabel(task),
          requestedCheckout: this.requestedCheckoutLabel(task),
          additionalHours: this.additionalHoursLabel(task),
          billedTo: this.lateCheckoutBilledTo(task),
          feeAmount: fee,
          taxes,
          totalCharged: total,
          paymentStatus: this.displayStatus(task),
          paymentMethod: this.lateCheckoutPaymentMethod(task),
          approvedBy: String(task?.assigned_staff_name ?? task?.approved_by_name ?? '—'),
          sortTime,
          task
        } as FoLateCheckoutRevenueRow;
      });

    return [...fromOrders, ...fromTasks].sort((a, b) => b.sortTime - a.sortTime);
  }

  lateCheckoutRevenueSummary(rows: FoLateCheckoutRevenueRow[]): {
    totalRevenue: number;
    averageRevenue: number;
    count: number;
  } {
    const withAmount = (rows || []).filter(
      (r) => r.totalCharged != null && Number.isFinite(r.totalCharged) && (r.totalCharged as number) > 0
    );
    const totalRevenue = withAmount.reduce((sum, r) => sum + Number(r.totalCharged || 0), 0);
    const count = withAmount.length;
    return {
      totalRevenue,
      averageRevenue: count ? totalRevenue / count : 0,
      count
    };
  }

  buildCheckoutRequestRows(tasks: any[], orders: any[] = []): FoCheckoutRequestRow[] {
    const purposeOrders = (orders || []).filter(
      (order) =>
        String(order?.purpose ?? '')
          .trim()
          .toLowerCase() === 'checkout'
    );
    const taskByOrderId = this.buildTaskByOrderIdMap(tasks);
    const fromOrders = purposeOrders.map((order) => {
      const orderId = String(order?.id ?? '').trim();
      const task = taskByOrderId.get(orderId) || null;
      const createdRaw = order?.orderConfirmDate || order?.created_on || order?.modified_on || '';
      const createdDate = createdRaw ? new Date(createdRaw) : null;
      return {
        id: orderId || String(task?.id ?? '—'),
        guestName: String(
          order?.guest?.guest_name || order?.guest_name || task?.guest_name || '—'
        ).trim() || '—',
        room: String(
          order?.room_no || order?.delivery?.room_no || order?.guest?.room_no || task?.room_no || '—'
        ).trim() || '—',
        datetime: formatAmPmTime(createdRaw) || (task ? this.formatTaskDateTime(task) : '—'),
        channel: task ? this.checkoutChannel(task) : order?.from_app ? 'Guest App' : '—',
        scheduledDeparture: task ? this.scheduledDepartureLabel(task) : '—',
        requestedDeparture: task ? this.requestedDepartureLabel(task) : '—',
        status: task ? this.displayStatus(task) : String(order?.status ?? '—').trim() || '—',
        staff: String(task?.assigned_staff_name ?? 'Unassigned'),
        sortTime:
          createdDate && !Number.isNaN(createdDate.getTime())
            ? createdDate.getTime()
            : task
              ? this.taskSortTime(task)
              : 0,
        task
      } as FoCheckoutRequestRow;
    });

    const coveredOrderIds = new Set(
      fromOrders.map((r) => String(r.id || '').trim()).filter(Boolean)
    );
    const fromTasks = (tasks || [])
      .filter((task) => this.isCheckout(task))
      .filter((task) => {
        const oid = String(task?.order_id ?? task?.pms_order_summary?.orderId ?? '').trim();
        return !oid || !coveredOrderIds.has(oid);
      })
      .map((task) => {
        const sortTime = this.taskSortTime(task);
        return {
          id: String(task?.id ?? task?.task_id ?? '—'),
          guestName: String(task?.guest_name ?? task?.created_by_name ?? '—'),
          room: String(task?.room_no ?? task?.room_range_label ?? '—'),
          datetime: this.formatTaskDateTime(task),
          channel: this.checkoutChannel(task),
          scheduledDeparture: this.scheduledDepartureLabel(task),
          requestedDeparture: this.requestedDepartureLabel(task),
          status: this.displayStatus(task),
          staff: String(task?.assigned_staff_name ?? 'Unassigned'),
          sortTime,
          task
        } as FoCheckoutRequestRow;
      });

    return [...fromOrders, ...fromTasks].sort((a, b) => b.sortTime - a.sortTime);
  }

  private buildTaskByOrderIdMap(tasks: any[]): Map<string, any> {
    const map = new Map<string, any>();
    for (const task of tasks || []) {
      const orderId = String(
        task?.order_id ??
          task?.pms_order_summary?.orderId ??
          task?.pms_order_summary?.order_id ??
          ''
      ).trim();
      if (orderId && !map.has(orderId)) {
        map.set(orderId, task);
      }
    }
    return map;
  }

  private orderBilledTo(order: any): string {
    const raw = String(order?.payment_type ?? '')
      .trim()
      .toLowerCase();
    if (raw.includes('room')) {
      return 'Bill To Room';
    }
    if (raw.includes('online')) {
      return 'GuestEzee';
    }
    return String(order?.payment_type ?? '—').trim() || '—';
  }

  buildDeviceOsRows(rows: any[]): FoDeviceOsRow[] {
    return this.buildMobileKeyRows(rows).map((row) => {
      const checkIn = this.parseLooseDate(row.checkInRaw);
      const checkOut = this.parseLooseDate(row.checkOutRaw);
      const nights =
        checkIn && checkOut
          ? String(
              Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000))
            )
          : '—';
      return {
        guestName: row.guestName,
        guestPhone: row.guestPhone,
        guestEmail: row.guestEmail,
        roomNo: row.roomNo,
        roomType: row.roomType,
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        nights,
        deviceBrand: row.deviceBrand,
        deviceName: row.deviceName,
        deviceModel: row.deviceModel,
        deviceOs: row.deviceOs,
        deviceOsVersion: row.deviceOsVersion,
        guestStatus: row.inHouseStatus,
        sortTime: row.sortTime,
        raw: row.raw
      };
    });
  }

  buildDeviceOsSummary(rows: FoDeviceOsRow[]): FoDeviceOsSummary {
    const total = (rows || []).length;
    let ios = 0;
    let android = 0;
    let other = 0;
    for (const row of rows || []) {
      const os = row.deviceOs.toLowerCase();
      if (os.includes('ios')) {
        ios += 1;
      } else if (os.includes('android')) {
        android += 1;
      } else {
        other += 1;
      }
    }
    return {
      total,
      ios,
      iosPct: total ? Math.round((ios / total) * 100) : 0,
      android,
      androidPct: total ? Math.round((android / total) * 100) : 0,
      other
    };
  }

  buildGuestServiceDetailRows(tasks: any[]): FoGuestServiceDetailRow[] {
    return (tasks || [])
      .map((task) => {
        const sortTime = this.taskSortTime(task);
        const serviceName =
          String(task?.service?.service_name ?? '').trim() || this.serviceTypeLabel(task);
        return {
          id: String(task?.id ?? task?.task_id ?? '—'),
          datetime: this.formatTaskDateTime(task),
          department: 'Front Desk',
          status: this.displayStatus(task),
          specialInstructions: String(
            task?.guest_instructions ?? task?.special_instructions ?? task?.remarks ?? '—'
          ).trim() || '—',
          guestName: String(task?.guest_name ?? task?.created_by_name ?? '—'),
          room: String(task?.room_no ?? task?.room_range_label ?? '—'),
          category: this.serviceTypeLabel(task),
          serviceName,
          requestTime: this.formatTaskDateTime(task),
          staff: String(task?.assigned_staff_name ?? 'Unassigned'),
          responseTime: this.responseTimeLabel(task),
          escalationLevel: this.escalationLevelLabel(task),
          sortTime,
          task
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  isLateCheckout(task: any): boolean {
    const belongs = String(task?.service?.belongs_to ?? '').trim().toLowerCase();
    const name = String(task?.service?.service_name ?? '').trim().toLowerCase();
    return belongs === 'late checkout' || name === 'late checkout';
  }

  isCheckout(task: any): boolean {
    const belongs = String(task?.service?.belongs_to ?? '').trim().toLowerCase();
    const name = String(task?.service?.service_name ?? '').trim().toLowerCase();
    return belongs === 'checkout' || name === 'checkout';
  }

  /** App UI status label for FO rows (Late checkout uses checkout_status). */
  displayStatus(task: any): string {
    if (this.isLateCheckout(task)) {
      const checkoutStatus = String(task?.checkout_status ?? '').trim();
      if (checkoutStatus && LATE_CHECKOUT_STATUS_LABEL[checkoutStatus]) {
        return LATE_CHECKOUT_STATUS_LABEL[checkoutStatus];
      }
      if (checkoutStatus) {
        return `Late checkout (${checkoutStatus})`;
      }
      return 'Late checkout';
    }
    if (this.isCheckout(task)) {
      const pipeline = String(task?.status ?? '').trim();
      return pipeline ? `Checkout (${pipeline})` : 'Checkout';
    }
    return String(task?.status ?? '').trim() || '—';
  }

  serviceTypeLabel(task: any): string {
    if (this.isLateCheckout(task)) {
      return 'Late checkout';
    }
    if (this.isCheckout(task)) {
      return 'Checkout';
    }
    return String(task?.service?.service_name ?? '').trim() || 'FO Service';
  }

  buildKpis(tasks: any[]): FoKpiCounts {
    const list = tasks || [];
    const status = (t: any) => String(t?.status ?? '').trim();
    const total = list.length;
    const completed = list.filter((t) =>
      ['Completed', 'Delivered'].includes(status(t))
    ).length;
    const escalated = list.filter((t) => this.overviewService.isEscalatedTask(t)).length;
    const pending = list.filter((t) =>
      ['Processing', 'ASAP', 'Pending', 'Assigned', 'Acknowledged', 'Scheduled'].includes(
        status(t)
      )
    ).length;
    return {
      total,
      completed,
      pending,
      escalated,
      completedPct: total ? Math.round((completed / total) * 100) : 0,
      pendingPct: total ? Math.round((pending / total) * 100) : 0,
      escalatedPct: total ? Math.round((escalated / total) * 100) : 0
    };
  }

  /** Overall contribution: Checkout vs Late checkout (+ late checkout_status splits). */
  buildContribution(tasks: any[]): FoContributionRow[] {
    const list = tasks || [];
    const total = list.length;
    if (!total) {
      return [];
    }

    const checkout = list.filter((t) => this.isCheckout(t)).length;
    const late = list.filter((t) => this.isLateCheckout(t));
    const rows: FoContributionRow[] = [];

    const pushRow = (label: string, count: number, tone: FoContributionRow['tone']) => {
      if (count <= 0) {
        return;
      }
      rows.push({
        label,
        count,
        pct: Math.round((count / total) * 100),
        tone,
        color: FO_TONE_COLOR[tone]
      });
    };

    pushRow('Checkout', checkout, 'blue');

    const statusOrder = [
      'Pending',
      'Price Updated',
      'Approved',
      'Guest Declined',
      'Rejected'
    ] as const;
    const tones: FoContributionRow['tone'][] = ['coral', 'gold', 'teal', 'amber', 'purple'];
    statusOrder.forEach((key, i) => {
      const count = late.filter(
        (t) => String(t?.checkout_status ?? '').trim() === key
      ).length;
      pushRow(LATE_CHECKOUT_STATUS_LABEL[key], count, tones[i]);
    });

    const known = new Set<string>(statusOrder);
    const otherLate = late.filter((t) => !known.has(String(t?.checkout_status ?? '').trim()));
    pushRow('Late checkout (Other)', otherLate.length, 'amber');

    return rows;
  }

  buildKeyServiceCounts(tasks: any[]): FoKeyServiceCounts {
    const list = tasks || [];
    const late = list.filter((t) => this.isLateCheckout(t));
    return {
      checkoutTotal: list.filter((t) => this.isCheckout(t)).length,
      lateCheckoutRequested: late.filter(
        (t) => String(t?.checkout_status ?? '').trim() === 'Pending'
      ).length,
      lateCheckoutPayments: late.filter((t) => {
        const amount = Number(t?.late_checkout_amount);
        const st = String(t?.checkout_status ?? '').trim();
        return (Number.isFinite(amount) && amount > 0) || st === 'Price Updated' || st === 'Approved';
      }).length
    };
  }

  /**
   * Escalation summary from FO Checkout / Late checkout tasks:
   * - Open = In Progress = escalated history, not yet Completed/Delivered
   * - Resolved = escalated history + Completed/Delivered
   * - Avg Delay = average minutes (escalation → delivery) across resolved docs
   */
  buildEscalationSummary(tasks: any[]): FoEscalationSummary {
    const escalated = (tasks || []).filter((t) => this.overviewService.hasEscalationHistory(t));
    const status = (t: any) => String(t?.status ?? '').trim();
    const resolved = escalated.filter((t) => ['Completed', 'Delivered'].includes(status(t)));
    const open = escalated.filter((t) => !['Completed', 'Delivered'].includes(status(t))).length;

    const delays: number[] = [];
    for (const task of resolved) {
      const mins = this.escalationToResolutionMinutes(task);
      if (mins != null && mins >= 0) {
        delays.push(mins);
      }
    }

    const avgDelayMinutes =
      delays.length > 0
        ? Math.round(delays.reduce((sum, n) => sum + n, 0) / delays.length)
        : null;
    const resolvedSampleCount = delays.length;
    const avgDelayLabel =
      avgDelayMinutes == null
        ? '—'
        : `${avgDelayMinutes} min · ${resolvedSampleCount} doc${resolvedSampleCount === 1 ? '' : 's'}`;

    return {
      open,
      inProgress: open,
      resolved: resolved.length,
      avgDelayMinutes,
      resolvedSampleCount,
      avgDelayLabel
    };
  }

  /** Minutes from latest Escalated timeline entry to Delivered/Completed (fallback: actual close time). */
  private escalationToResolutionMinutes(task: any): number | null {
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    const orderDate = String(task?.order_date ?? '').trim();

    const escalatedEntries = timeline.filter(
      (e: any) => String(e?.status ?? '').trim() === 'Escalated'
    );
    const latestEsc = escalatedEntries.length
      ? escalatedEntries[escalatedEntries.length - 1]
      : null;
    const completedEntry = [...timeline]
      .reverse()
      .find((e: any) => ['Delivered', 'Completed'].includes(String(e?.status ?? '').trim()));

    const escTs = this.timelineEntryTimestamp(orderDate, latestEsc?.time || latestEsc?.date);
    const doneTs = this.timelineEntryTimestamp(orderDate, completedEntry?.time || completedEntry?.date);

    if (escTs != null && doneTs != null && doneTs >= escTs) {
      return Math.round((doneTs - escTs) / 60000);
    }

    const actual = Number(task?.actual_time_to_close_the_task);
    if (Number.isFinite(actual) && actual >= 0) {
      return Math.round(actual);
    }

    return null;
  }

  private timelineEntryTimestamp(orderDate: string, timeOrDate: any): number | null {
    const timePart = String(timeOrDate ?? '').trim();
    if (!timePart && !orderDate) {
      return null;
    }
    // Prefer order_date + time; fall back to ISO-ish date alone
    const candidates = [
      orderDate && timePart ? `${orderDate} ${timePart}` : '',
      timePart,
      orderDate
    ].filter(Boolean);
    for (const raw of candidates) {
      const parsed = new Date(raw).getTime();
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  mapRecords(tasks: any[]): FoServiceRecord[] {
    return (tasks || []).map((task) => {
      const status = String(task?.status ?? '').trim();
      const bound = Number(task?.service?.time_bound_value ?? 0);
      return {
        id: String(task?.id ?? task?.task_id ?? '—'),
        room: String(task?.room_no ?? task?.room_range_label ?? '—'),
        guest: String(task?.guest_name ?? task?.created_by_name ?? '—'),
        type: this.serviceTypeLabel(task),
        staff: String(task?.assigned_staff_name ?? 'Unassigned'),
        status: this.displayStatus(task),
        eta: bound > 0 ? `${bound} min` : '—',
        delay: this.overviewService.isDelayedTask(task)
          ? `+${this.overviewService.taskDelayOverrunMinutes(task)} min`
          : '0',
        date: String(task?.order_date ?? ''),
        time: formatAmPmTime(task?.order_time),
        checkoutStatus: String(task?.checkout_status ?? '').trim(),
        lateCheckoutAmount:
          task?.late_checkout_amount != null && task?.late_checkout_amount !== ''
            ? Number(task.late_checkout_amount)
            : null,
        task
      };
    });
  }

  statusClass(displayStatus: string): string {
    const s = displayStatus.toLowerCase();
    if (s.includes('approved') || s.includes('delivered') || s.includes('completed')) {
      return 'delivered';
    }
    if (s.includes('rejected') || s.includes('declined') || s.includes('escalat')) {
      return 'escalated';
    }
    if (s.includes('requested') || s.includes('pending') || s.includes('price updated') || s.includes('asap') || s.includes('assigned') || s.includes('processing')) {
      return 'pending';
    }
    return 'processing';
  }

  formatInr(amount: number | null | undefined): string {
    if (amount == null || !Number.isFinite(Number(amount))) {
      return '—';
    }
    return formatInrSafe(amount);
  }

  /** Normalize getall doc → mobile_key_report payload shape. */
  private unwrapMobileKeyReport(row: any): any {
    if (!row || typeof row !== 'object') {
      return {};
    }
    if (row.mobile_key_report && typeof row.mobile_key_report === 'object') {
      return row.mobile_key_report;
    }
    if (row.payload?.mobile_key_report && typeof row.payload.mobile_key_report === 'object') {
      return row.payload.mobile_key_report;
    }
    if (row.guest || row.reservation || row.room || row.key || row.device) {
      return row;
    }
    return row;
  }

  private mapMobileKeyRow(row: any): FoMobileKeyRow {
    const report = this.unwrapMobileKeyReport(row);
    const guest = report?.guest || {};
    const reservation = report?.reservation || {};
    const hotel = report?.hotel || {};
    const room = report?.room || {};
    const key = report?.key || {};
    const device = report?.device || {};

    const checkInRaw = String(reservation?.check_in ?? reservation?.checkIn ?? '').trim();
    const checkOutRaw = String(reservation?.check_out ?? reservation?.checkOut ?? '').trim();
    const checkInDate = this.parseLooseDate(checkInRaw);
    const checkOutDate = this.parseLooseDate(checkOutRaw);
    const sortDate = this.mobileKeySortDate(row);
    const opened = String(key?.opened_status ?? key?.openedStatus ?? 'unused').trim() || 'unused';
    const attempts = Array.isArray(key?.unlock_attempts)
      ? key.unlock_attempts.length
      : Array.isArray(key?.unlockAttempts)
        ? key.unlockAttempts.length
        : 0;

    const idleBase = checkInDate || sortDate;
    const idleHours = idleBase ? Math.max(0, (Date.now() - idleBase.getTime()) / 3600000) : null;
    const idleHoursLabel =
      idleHours == null
        ? '—'
        : idleHours < 1
          ? `${Math.round(idleHours * 60)} min`
          : `${Math.round(idleHours)} hr`;

    const keyCount = Number(guest?.key_count ?? guest?.keyCount ?? 1);
    const totalGuests = Number(reservation?.total_guests ?? reservation?.totalGuests ?? 1);

    return {
      guestName: String(guest?.guest_name ?? guest?.guestName ?? '—').trim() || '—',
      guestPhone: String(guest?.guest_phone ?? guest?.guestPhone ?? '').trim() || '—',
      guestEmail: String(guest?.guest_email ?? guest?.guestEmail ?? '').trim() || '—',
      keyCount: Number.isFinite(keyCount) ? keyCount : 1,
      totalGuests: Number.isFinite(totalGuests) ? totalGuests : 1,
      checkIn: checkInDate ? this.formatDisplayDateTime(checkInDate) : checkInRaw || '—',
      checkOut: checkOutDate ? this.formatDisplayDateTime(checkOutDate) : checkOutRaw || '—',
      checkInRaw,
      checkOutRaw,
      roomNo: String(room?.room_no ?? room?.roomNo ?? '—').trim() || '—',
      roomType: String(room?.room_type ?? room?.roomType ?? '—').trim() || '—',
      lockName: String(key?.lock_name ?? key?.lockName ?? '—').trim() || '—',
      sdk: String(key?.sdk ?? '—').trim() || '—',
      openedStatus: opened,
      endpointId: String(key?.endpoint_id ?? key?.endpointId ?? '').trim() || '—',
      keyUsedCount: Number(key?.key_used_count ?? key?.keyUsedCount ?? 0) || 0,
      unlockAttempts: attempts,
      deviceBrand: String(device?.device_brand ?? device?.deviceBrand ?? '—').trim() || '—',
      deviceName: String(device?.device_name ?? device?.deviceName ?? '—').trim() || '—',
      deviceModel: String(device?.device_model ?? device?.deviceModel ?? '—').trim() || '—',
      deviceOs: this.deviceOsLabel(device),
      deviceOsVersion: String(device?.device_os_version ?? device?.deviceOsVersion ?? '').trim() || '—',
      inHouseStatus: this.inHouseStatusFromStay(checkInDate, checkOutDate),
      idleHoursLabel,
      memberId: String(hotel?.member_id ?? hotel?.memberId ?? '').trim(),
      sortTime: sortDate?.getTime() || checkInDate?.getTime() || 0,
      raw: row
    };
  }

  private mobileKeySortDate(row: any): Date | null {
    const report = this.unwrapMobileKeyReport(row);
    const reservation = report?.reservation || {};
    return (
      this.parseLooseDate(row?.created_on) ||
      this.parseLooseDate(row?.created_at) ||
      this.parseLooseDate(row?.modified_on) ||
      this.parseLooseDate(reservation?.check_in || reservation?.checkIn)
    );
  }

  private lateCheckoutFee(task: any): number | null {
    const amount = Number(task?.late_checkout_amount);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  private lateCheckoutTax(task: any): number | null {
    const tax = Number(task?.late_checkout_tax ?? task?.tax_amount ?? task?.gst_amount);
    return Number.isFinite(tax) && tax > 0 ? tax : null;
  }

  private lateCheckoutBilledTo(task: any): string {
    const raw = String(
      task?.payment_type ?? task?.billed_to ?? task?.bill_to ?? task?.payment_method ?? ''
    )
      .trim()
      .toLowerCase();
    if (!raw) {
      return '—';
    }
    if (raw.includes('room') || raw.includes('bill')) {
      return 'Bill to room';
    }
    if (raw.includes('guest') || raw.includes('app') || raw.includes('online') || raw.includes('upi')) {
      return 'Guestezee';
    }
    return String(task?.payment_type ?? task?.billed_to ?? task?.bill_to ?? '—').trim();
  }

  private lateCheckoutPaymentMethod(task: any): string {
    const raw = String(task?.payment_type ?? task?.payment_method ?? '').trim();
    return raw || '—';
  }

  private standardCheckoutLabel(task: any): string {
    const raw = String(
      task?.standard_checkout_time ?? task?.hotel_checkout_time ?? task?.default_checkout_time ?? ''
    ).trim();
    return raw || '11:00 AM';
  }

  private requestedCheckoutLabel(task: any): string {
    const raw = String(
      task?.requested_checkout_time ??
        task?.extended_checkout_time ??
        task?.approved_checkout_time ??
        task?.checkout_time ??
        ''
    ).trim();
    if (raw) {
      return formatAmPmTime(raw) || raw;
    }
    const orderTime = formatAmPmTime(task?.order_time);
    return orderTime || '—';
  }

  private additionalHoursLabel(task: any): string {
    const hours = Number(task?.additional_hours ?? task?.extended_hours);
    if (Number.isFinite(hours) && hours > 0) {
      return `${hours} hr`;
    }
    return '—';
  }

  private checkoutChannel(task: any): string {
    const source = String(
      task?.request_channel ?? task?.channel ?? task?.source ?? task?.created_via ?? ''
    )
      .trim()
      .toLowerCase();
    if (source.includes('desk') || source.includes('front') || source.includes('staff')) {
      return 'Front Desk';
    }
    if (source.includes('app') || source.includes('guest') || source.includes('mobile')) {
      return 'Guest App';
    }
    // FO checkout tasks originate from the guest app by default.
    return 'Guest App';
  }

  private scheduledDepartureLabel(task: any): string {
    const raw = String(
      task?.scheduled_departure ?? task?.check_out ?? task?.checkout_date ?? task?.reservation_checkout ?? ''
    ).trim();
    if (!raw) {
      return '—';
    }
    const d = this.parseLooseDate(raw);
    return d ? this.formatDisplayDateTime(d) : raw;
  }

  private requestedDepartureLabel(task: any): string {
    const raw = String(
      task?.requested_departure ?? task?.requested_checkout_time ?? task?.order_time ?? ''
    ).trim();
    if (task?.order_date || task?.order_time) {
      return this.formatTaskDateTime(task);
    }
    if (!raw) {
      return '—';
    }
    const d = this.parseLooseDate(raw);
    return d ? this.formatDisplayDateTime(d) : formatAmPmTime(raw) || raw;
  }

  private formatTaskDateTime(task: any): string {
    const date = String(task?.order_date ?? '').trim();
    const time = formatAmPmTime(task?.order_time);
    if (date && time) {
      return `${date} · ${time}`;
    }
    if (date) {
      return date;
    }
    const created = this.parseLooseDate(task?.created_on || task?.modified_on);
    return created ? this.formatDisplayDateTime(created) : '—';
  }

  private taskSortTime(task: any): number {
    const created = this.parseLooseDate(task?.created_on || task?.modified_on);
    if (created) {
      return created.getTime();
    }
    const date = String(task?.order_date ?? '').trim();
    const time = String(task?.order_time ?? '').trim();
    const parsed = this.parseLooseDate(date && time ? `${date} ${time}` : date);
    return parsed?.getTime() || 0;
  }

  private formatDisplayDateTime(d: Date): string {
    const date = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${date} · ${time}`;
  }

  private parseLooseDate(raw: any): Date | null {
    if (raw == null || raw === '') {
      return null;
    }
    if (raw instanceof Date) {
      return Number.isNaN(raw.getTime()) ? null : raw;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private deviceOsLabel(device: any): string {
    const osRaw = String(device?.device_os ?? device?.deviceOs ?? '').trim().toLowerCase();
    const osVersion = String(device?.device_os_version ?? device?.deviceOsVersion ?? '').trim();
    if (osRaw.includes('ios') || osRaw === 'iphone' || osRaw === 'ipad') {
      return osVersion ? `iOS ${osVersion}` : 'iOS';
    }
    if (osRaw.includes('android')) {
      return osVersion ? `Android ${osVersion}` : 'Android';
    }
    if (osRaw) {
      return osVersion ? `${osRaw} ${osVersion}` : osRaw;
    }
    return '—';
  }

  private inHouseStatusFromStay(checkIn: Date | null, checkOut: Date | null): string {
    if (!checkIn || !checkOut) {
      return '—';
    }
    const now = Date.now();
    if (now < checkIn.getTime()) {
      return 'Upcoming';
    }
    if (now > checkOut.getTime()) {
      return 'Checked-Out';
    }
    return 'Checked-In';
  }

  private responseTimeLabel(task: any): string {
    const mins = Number(task?.response_time ?? task?.acknowledgement_time);
    if (Number.isFinite(mins) && mins >= 0) {
      return `${Math.round(mins)} min`;
    }
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    const ack = timeline.find((e: any) =>
      ['Assigned', 'Acknowledged', 'Processing', 'ASAP'].includes(String(e?.status ?? '').trim())
    );
    if (!ack) {
      return '—';
    }
    const orderDate = String(task?.order_date ?? '').trim();
    const start = this.timelineEntryTimestamp(orderDate, task?.order_time);
    const ackTs = this.timelineEntryTimestamp(orderDate, ack?.time || ack?.date);
    if (start == null || ackTs == null || ackTs < start) {
      return '—';
    }
    return `${Math.round((ackTs - start) / 60000)} min`;
  }

  private escalationLevelLabel(task: any): string {
    if (!this.overviewService.hasEscalationHistory(task)) {
      return '—';
    }
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    const escalations = timeline.filter(
      (e: any) => String(e?.status ?? '').trim() === 'Escalated'
    );
    if (escalations.length >= 3) {
      return 'Level 3';
    }
    if (escalations.length === 2) {
      return 'Level 2';
    }
    if (escalations.length === 1) {
      return 'Level 1';
    }
    return 'Level 1';
  }
}
