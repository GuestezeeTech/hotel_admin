import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { HotelOverviewDashboardService } from '../admin-dashboard/hotel-overview-dashboard/hotel-overview-dashboard.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { formatAmPmTime } from '../shared/time-format.util';

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
  orderId: string;
  datetime: string;
  dept: string;
  details: string;
  status: string;
  eta: string;
  taskId: string;
  task: any;
};

export type FnbTodayOrderSummary = {
  dateLabel: string;
  totalActive: number;
  preparing: number;
  outForDelivery: number;
  escalated: number;
  completedToday: number;
};

export type FnbOrderEscalationOverview = {
  total: number;
  orders: number;
  escalations: number;
  onTrack: number;
  ordersPct: number;
  escalationsPct: number;
  donutStyle: string;
};

export type FnbLiveStatusRow = {
  label: string;
  count: number;
  pct: number;
  color: string;
};

export type FnbTaskReportCounts = {
  delayed: number;
  escalated: number;
  delivered: number;
  orders: number;
};

export type IrdPaymentRow = {
  orderId: string;
  billNumber: string;
  guestName: string;
  roomNumber: string;
  datetime: string;
  billedTo: string;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Failed' | string;
  /** Only Paid counts toward KPI totals / hotel payment. */
  countsTowardPayment: boolean;
  subtotal: number;
  taxes: number;
  discounts: number;
  finalAmount: number;
  createdOn: string;
  sortTime: number;
  order: any;
  task: any | null;
};

/** Hotel Overview Total Revenue drill-down: IRD food + offer payments. */
export type HotelPaymentRow = IrdPaymentRow & {
  orderType: 'Food' | 'Offer';
  offerApplied: string;
};

export type IrdEscalationRow = {
  orderId: string;
  billNumber: string;
  guestName: string;
  roomNumber: string;
  orderDatetime: string;
  assignedStaff: string;
  resolution: 'Open' | 'Resolved' | string;
  issue: string;
  escalatedFrom: string;
  escalatedTo: string;
  remark: string;
  status: string;
  time: string;
  sortTime: number;
  task: any;
  order: any | null;
};

export type IrdOrderReportRow = {
  orderId: string;
  datetime: string;
  guestName: string;
  roomNumber: string;
  items: string;
  specialInstructions: string;
  orderStatus: string;
  subtotal: number;
  taxes: number;
  serviceCharge: number;
  totalAmount: number;
  staffName: string;
  sortTime: number;
  task: any | null;
  order: any;
};

export type OfferReportRow = {
  offerId: string;
  name: string;
  offerType: string;
  validity: string;
  outlets: string;
  usageCount: number;
  revenue: number;
};

export type OfferPaymentReportRow = {
  billNumber: string;
  roomNumber: string;
  guestName: string;
  datetime: string;
  offerApplied: string;
  grossAmount: number;
  discountValue: number;
  netAmount: number;
  paymentGateway: string;
  paymentStatus: 'Paid' | 'Failed' | 'Awaiting Payment' | string;
  /** Paid only — KPI / Guest Claimed / Revenue. */
  countsTowardPayment: boolean;
  sortTime: number;
  order: any;
  task: any | null;
};

export type DelayedReportRow = {
  guestName: string;
  roomNumber: string;
  orderDatetime: string;
  actualDeliveryTime: string;
  delayMinutes: string;
  staffAssigned: string;
  sortTime: number;
  task: any;
};

export type DeliveryReportRow = {
  roomNumber: string;
  guestName: string;
  orderDatetime: string;
  deliveryStaff: string;
  dispatchTime: string;
  arrivalTime: string;
  guestAck: string;
  deliveryStatus: string;
  sortTime: number;
  task: any;
};

export type EscalationReportRow = {
  guestName: string;
  roomNumber: string;
  orderDatetime: string;
  assignedStaff: string;
  resolution: string;
  issue: string;
  sortTime: number;
  task: any;
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
    return this.fetchOffersList(outletId).pipe(map((offers) => offers.length));
  }

  /**
   * Same pattern as Restaurants / Features (“Select a Restaurant to view its offers”):
   * 1) customer by customer_member_id
   * 2) outlet/getall with member_id (+ Hotel_Code)
   * 3) offer/getall with outlet_id: [winhms / id…]
   */
  fetchOffersList(outletId?: number): Observable<any[]> {
    if (outletId != null && Number.isFinite(outletId) && outletId > 0) {
      return this.postOffersByOutletIds([outletId]);
    }

    return this.loadHotelOutletIdsLikeRestaurants().pipe(
      switchMap((outletIds) => {
        if (!outletIds.length) {
          return of([]);
        }
        return this.postOffersByOutletIds(outletIds);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Mirrors features-list / restaurants-list:
   * MemberId → customer (Hotel_Code) → outlets (member_id + Hotel_Code).
   */
  private loadHotelOutletIdsLikeRestaurants(): Observable<Array<string | number>> {
    const memberId = (this.localStorage.get('MemberId') || '').trim();
    if (!memberId) {
      return of([]);
    }

    const customerPayload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: memberId
        }
      }
    };

    return this.http
      .post(ENDPOINTS.GET_LOGIN_CUSTOMER, customerPayload, {
        headers: new HttpHeaders()
          .set('Content-Type', 'application/json')
          .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
      })
      .pipe(
        switchMap((resp: any) => {
          const customer = resp?.result?.data?.[0] || {};
          const hotelCode = String(customer?.Hotel_Code || customer?.hotel_code || '').trim();
          if (hotelCode) {
            this.localStorage.set('Hotel_Code', hotelCode);
          }
          const orgId = Number(customer?.organization_id);
          if (Number.isFinite(orgId) && orgId > 0) {
            this.localStorage.set('organization_id', String(orgId));
          }
          return this.fetchHotelOutlets(memberId, hotelCode);
        }),
        catchError(() => {
          const cachedHotel = String(this.localStorage.get('Hotel_Code') || '').trim();
          return this.fetchHotelOutlets(memberId, cachedHotel);
        })
      );
  }

  /** Same find as features-list getMenuOutlets. */
  private fetchHotelOutlets(
    memberId: string,
    hotelCode: string
  ): Observable<Array<string | number>> {
    const find: Record<string, string> = {
      member_id: String(memberId).trim()
    };
    if (hotelCode) {
      find['Hotel_Code'] = hotelCode;
    }
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find,
        pagination: false,
        sorting: false
      }
    };
    return this.http
      .post(ENDPOINTS.GET_ALL_OUTLETS, payload, {
        headers: new HttpHeaders()
          .set('Content-Type', 'application/json')
          .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
      })
      .pipe(
        map((resp: any): Array<string | number> => {
          if (!(resp?.success === 1 || resp?.success === true)) {
            return [];
          }
          const rows = Array.isArray(resp?.result?.data) ? resp.result.data : [];
          const ids = rows
            .map((outlet: any) => this.getOutletIdentifier(outlet))
            .filter((id: string | number | null) => id != null && String(id).trim() !== '');
          return Array.from(new Set(ids as Array<string | number>));
        }),
        catchError((): Observable<Array<string | number>> => of([]))
      );
  }

  /** Same as features-list getOutletIdentifier — used for offer/getall outlet_id. */
  private getOutletIdentifier(outlet: any): string | number | null {
    if (!outlet) {
      return null;
    }
    const isThirdParty =
      outlet.hasOwnProperty('is_third_party_outlet_id_exist') &&
      outlet.is_third_party_outlet_id_exist != null &&
      (outlet.is_third_party_outlet_id_exist === true ||
        outlet.is_third_party_outlet_id_exist === 'true');
    if (isThirdParty) {
      const third = outlet.winhms_outlet_id || outlet.third_party_outlet_id;
      return third != null && String(third).trim() !== '' ? third : null;
    }
    // restaurants-list uses winhms_outlet_id; features uses numeric id — prefer winhms when set
    if (outlet.winhms_outlet_id != null && String(outlet.winhms_outlet_id).trim() !== '') {
      return outlet.winhms_outlet_id;
    }
    if (outlet.id != null && String(outlet.id).trim() !== '') {
      return outlet.id;
    }
    return null;
  }

  private postOffersByOutletIds(outletIds: Array<string | number>): Observable<any[]> {
    const ids = (outletIds || []).filter((id) => id != null && String(id).trim() !== '');
    if (!ids.length) {
      return of([]);
    }
    // Same payload shape as restaurants-list getOffersByOutlet (array supported)
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          outlet_id: ids.length === 1 ? ids[0] : ids
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
            return [];
          }
          const data = resp?.result?.data;
          return this.dedupeOffersById(Array.isArray(data) ? data : []);
        }),
        catchError(() => of([]))
      );
  }

  private dedupeOffersById(offers: any[]): any[] {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const offer of offers || []) {
      const key = String(offer?.id ?? offer?._id ?? '').trim();
      if (key) {
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
      }
      out.push(offer);
    }
    return out;
  }

  fetchOfferOrders(): Observable<any[]> {
    const memberId = (this.localStorage.get('MemberId') || '').trim();
    if (!memberId) {
      return of([]);
    }

    // Same payment flow as IRD: Order Confirmed + Awaiting Payment (+ Failed list-only)
    return this.overviewService
      .fetchOrdersGetAll(memberId, {
        purpose: 'offer'
      })
      .pipe(
        map((resp: any) => {
          if (!(resp?.success === 1 || resp?.success === true)) {
            return [];
          }
          return (resp?.result?.data || []).filter((order: any) => this.isOfferPaymentOrder(order));
        }),
        catchError(() => of([]))
      );
  }

  /** Offer orders eligible for payment report (Paid / Awaiting / Failed). */
  isOfferPaymentOrder(order: any): boolean {
    if (String(order?.purpose ?? '').trim().toLowerCase() !== 'offer') {
      return false;
    }
    if (this.isIrdRefundStatus(order)) {
      return false;
    }
    if (this.isIrdFailedStatus(order)) {
      return true;
    }
    const status = String(order?.status ?? '').trim().toLowerCase();
    return FbDashboardService.IRD_PAYMENT_FETCH_STATUSES.has(status);
  }

  /** Guest Claimed / offer revenue — Order Confirmed (paid) only. */
  isOfferPaidOrder(order: any): boolean {
    if (String(order?.purpose ?? '').trim().toLowerCase() !== 'offer') {
      return false;
    }
    if (this.isIrdRefundStatus(order)) {
      return false;
    }
    const status = String(order?.status ?? '')
      .trim()
      .toLowerCase();
    // Do not use system_label / awaiting / failed
    return status === 'order confirmed';
  }

  fetchOfferPaymentReport(): Observable<{ total: number; count: number }> {
    return this.fetchOfferOrders().pipe(
      map((orders) =>
        this.overviewService.sumOrderConfirmedRevenue(
          (orders || []).filter((o) => this.isOfferPaidOrder(o))
        )
      ),
      catchError(() => of({ total: 0, count: 0 }))
    );
  }

  /**
   * IRD payment list candidates: Order Confirmed, Awaiting Payment, Failed.
   * KPI / hotel payment count: Order Confirmed (Paid) only.
   * Awaiting ≤5 min: hidden (in progress). Awaiting >5 min: listed as Failed, not counted.
   */
  private static readonly IRD_PAYMENT_FETCH_STATUSES = new Set([
    'order confirmed',
    'awaiting payment'
  ]);
  private static readonly AWAITING_FAIL_AFTER_MS = 5 * 60 * 1000;

  /** IRD / F&B food orders: purpose food, Online Payment | Bill to Room. */
  fetchIrdFoodOrders(): Observable<any[]> {
    const memberId = (this.localStorage.get('MemberId') || '').trim();
    if (!memberId) {
      return of([]);
    }

    return this.overviewService
      .fetchOrdersGetAll(memberId, {
        purpose: 'food'
      })
      .pipe(
        map((resp: any) => {
          if (!(resp?.success === 1 || resp?.success === true)) {
            return [];
          }
          return (resp?.result?.data || []).filter((order: any) => this.isIrdFoodPaymentOrder(order));
        }),
        catchError(() => of([]))
      );
  }

  isIrdFoodPaymentOrder(order: any): boolean {
    if (String(order?.purpose ?? '').trim().toLowerCase() !== 'food') {
      return false;
    }
    if (!this.isIrdPaymentType(order?.payment_type)) {
      return false;
    }
    // Never include refunded orders
    if (this.isIrdRefundStatus(order)) {
      return false;
    }
    // Fetch confirmed + awaiting (+ API failed for list-only)
    if (this.isIrdFailedStatus(order)) {
      return true;
    }
    return this.isIrdFoodPaymentStatus(order);
  }

  /** Order Confirmed only — used for Live Tracking / order overview counts. */
  isIrdConfirmedFoodOrder(order: any): boolean {
    return (
      this.isIrdFoodPaymentOrder(order) &&
      String(order?.status ?? '').trim().toLowerCase() === 'order confirmed'
    );
  }

  isIrdFoodPaymentStatus(order: any): boolean {
    const status = String(order?.status ?? '').trim().toLowerCase();
    return FbDashboardService.IRD_PAYMENT_FETCH_STATUSES.has(status);
  }

  private isIrdFailedStatus(order: any): boolean {
    const status = String(order?.status ?? '').trim();
    const system = String(order?.system_label ?? '').trim();
    return /fail/i.test(status) || /fail/i.test(system);
  }

  private isIrdRefundStatus(order: any): boolean {
    const status = String(order?.status ?? '').trim();
    const system = String(order?.system_label ?? '').trim();
    return /refund/i.test(status) || /refund/i.test(system);
  }

  private isIrdAwaitingStatus(order: any): boolean {
    return /awaiting payment/i.test(String(order?.status ?? '').trim());
  }

  /** Age of awaiting/failed candidate from created/modified time. */
  private irdOrderAgeMs(order: any): number {
    const raw = order?.created_on || order?.modified_on || order?.orderConfirmDate || '';
    const d = raw ? new Date(raw) : null;
    if (!d || Number.isNaN(d.getTime())) {
      return 0;
    }
    return Math.max(0, Date.now() - d.getTime());
  }

  isIrdPaymentType(paymentType: any): boolean {
    const raw = String(paymentType ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ');
    return raw === 'online payment' || raw === 'bill to room';
  }

  buildTaskByOrderIdMap(tasks: any[]): Map<string, any> {
    const map = new Map<string, any>();
    for (const task of tasks || []) {
      const orderId = this.taskOrderId(task);
      if (!orderId || map.has(orderId)) {
        continue;
      }
      map.set(orderId, task);
    }
    return map;
  }

  taskOrderId(task: any): string {
    const raw =
      task?.pms_order_summary?.orderId ??
      task?.pms_order_summary?.order_id ??
      task?.order_id ??
      '';
    return String(raw).trim();
  }

  buildIrdPaymentRows(orders: any[], tasks: any[] = []): IrdPaymentRow[] {
    const taskByOrderId = this.buildTaskByOrderIdMap(tasks);
    return [...(orders || [])]
      .map((order) => this.toIrdPaymentRow(order, taskByOrderId.get(String(order?.id ?? '')) || null))
      // Hide in-progress Awaiting (≤5 min). Show Paid + Failed (incl. timed-out awaiting).
      .filter((row) => row.paymentStatus === 'Paid' || row.paymentStatus === 'Failed')
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  /**
   * Overview payment list: food + offer · Online / Bill to Room.
   * Listing = Paid + Failed. KPI / revenue counts = Paid only.
   */
  buildHotelPaymentRows(orders: any[], tasks: any[] = []): HotelPaymentRow[] {
    const taskByOrderId = this.buildTaskByOrderIdMap(tasks);
    return [...(orders || [])]
      .filter((order) => {
        const purpose = String(order?.purpose ?? '').trim().toLowerCase();
        if (purpose !== 'food' && purpose !== 'offer') {
          return false;
        }
        if (!this.isIrdPaymentType(order?.payment_type)) {
          return false;
        }
        if (this.isIrdRefundStatus(order)) {
          return false;
        }
        if (this.isIrdFailedStatus(order)) {
          return true;
        }
        const status = String(order?.status ?? '').trim().toLowerCase();
        return FbDashboardService.IRD_PAYMENT_FETCH_STATUSES.has(status);
      })
      .map((order) => {
        const purpose = String(order?.purpose ?? '').trim().toLowerCase();
        const row = this.toIrdPaymentRow(
          order,
          taskByOrderId.get(String(order?.id ?? '')) || null
        );
        return {
          ...row,
          orderType: (purpose === 'offer' ? 'Offer' : 'Food') as 'Food' | 'Offer',
          offerApplied: purpose === 'offer' ? this.offerDisplayName(order) : '—'
        };
      })
      .filter((row) => row.paymentStatus === 'Paid' || row.paymentStatus === 'Failed')
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  /** Paid rows only — for KPI count / payment amount. */
  filterCountableIrdPaymentRows(rows: IrdPaymentRow[]): IrdPaymentRow[] {
    return (rows || []).filter((row) => row.countsTowardPayment && row.paymentStatus === 'Paid');
  }

  buildIrdEscalationRows(tasks: any[], orders: any[] = []): IrdEscalationRow[] {
    const orderById = new Map<string, any>();
    for (const order of orders || []) {
      const id = String(order?.id ?? '').trim();
      if (id) {
        orderById.set(id, order);
      }
    }

    return (tasks || [])
      .filter((task) => this.isMenuOrderingTask(task))
      .filter((task) => this.overviewService.hasEscalationHistory(task))
      .map((task) => {
        const orderId = this.taskOrderId(task);
        const order = orderId ? orderById.get(orderId) || null : null;
        return this.toIrdEscalationRow(task, order);
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  private toIrdPaymentRow(order: any, task: any | null): IrdPaymentRow {
    const orderId = String(order?.id ?? '').trim();
    const summary = order?.order_review?.order_summary || {};
    const products = order?.product_details?.products || [];
    const discountFromProducts = products.reduce(
      (sum: number, p: any) => sum + Number(p?.discount_amount ?? 0),
      0
    );
    const discounts = Number(summary.discount ?? summary.discount_amount ?? discountFromProducts) || 0;
    const createdRaw = order?.created_on || order?.modified_on || order?.orderConfirmDate || '';
    const createdDate = createdRaw ? new Date(createdRaw) : null;
    const paymentStatus = this.irdPaymentStatus(order);

    return {
      orderId,
      billNumber: orderId || '—',
      guestName: order?.guest?.guest_name || order?.guest_name || '—',
      roomNumber: String(task?.room_no ?? order?.room_no ?? order?.delivery?.room_no ?? '—'),
      datetime: formatAmPmTime(createdRaw) || '—',
      billedTo: this.irdBilledTo(order?.payment_type),
      paymentMethod: this.irdPaymentMethodLabel(order?.payment_type),
      paymentStatus,
      countsTowardPayment: paymentStatus === 'Paid',
      subtotal: Number(summary.sub_total ?? 0) || 0,
      taxes: Number(summary.tax ?? 0) || 0,
      discounts,
      finalAmount: Number(summary.order_total_amount ?? 0) || 0,
      createdOn: createdRaw,
      sortTime: createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.getTime() : 0,
      order,
      task
    };
  }

  private toIrdEscalationRow(task: any, order: any | null): IrdEscalationRow {
    const orderId = this.taskOrderId(task);
    const latest = this.latestEscalationEntry(task);
    const status = String(task?.status ?? 'Escalated').trim();
    return {
      orderId: orderId || String(task?.id ?? ''),
      billNumber: orderId || String(task?.id ?? '') || '—',
      guestName: task?.guest_name || order?.guest?.guest_name || '—',
      roomNumber: String(task?.room_no ?? '—'),
      orderDatetime: this.taskOrderDatetimeLabel(task, order),
      assignedStaff: this.staffName(task),
      resolution: this.escalationResolution(status),
      issue: this.escalationIssueLabel(task),
      escalatedFrom: latest?.escalated_from_name || '—',
      escalatedTo: latest?.escalated_to_name || '—',
      remark: String(latest?.remark || latest?.remarks || '').trim() || '—',
      status,
      time: this.updatedTimeLabel(task),
      sortTime: this.taskSortTime(task),
      task,
      order
    };
  }

  /**
   * IRD Order Report — Menu Ordering tasks (task/getall), enriched with linked
   * order/getall row when present, otherwise pms_order_summary on the task.
   */
  buildIrdOrderReportRows(orders: any[], tasks: any[] = []): IrdOrderReportRow[] {
    const orderById = new Map<string, any>();
    for (const order of orders || []) {
      const id = String(order?.id ?? '').trim();
      if (id) {
        orderById.set(id, order);
      }
    }

    return (tasks || [])
      .filter((task) => this.isMenuOrderingTask(task))
      .map((task) => {
        const orderId = this.taskOrderId(task);
        const order = orderId ? orderById.get(orderId) || null : null;
        const pms = task?.pms_order_summary || {};
        const summary = order?.order_review?.order_summary || {};
        const amounts = this.irdOrderAmounts(order, task);
        return {
          orderId: orderId || String(pms?.orderId ?? pms?.order_id ?? task?.id ?? '—'),
          datetime: this.taskOrderDatetimeLabel(task, order),
          guestName: String(
            task?.guest_name || order?.guest?.guest_name || order?.guest_name || '—'
          ).trim() || '—',
          roomNumber: String(
            task?.room_no ?? pms?.room_no ?? order?.room_no ?? order?.delivery?.room_no ?? '—'
          ).trim() || '—',
          items: this.orderItemsLabel(order, task),
          specialInstructions: this.specialInstructionsLabel(order, task),
          orderStatus: this.orderStatusLabel(order, task),
          subtotal: amounts.subtotal,
          taxes: amounts.taxes,
          serviceCharge: amounts.serviceCharge,
          totalAmount: amounts.totalAmount,
          staffName: this.staffName(task),
          sortTime: this.taskSortTime(task),
          task,
          order
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  private irdOrderAmounts(
    order: any | null,
    task: any
  ): { subtotal: number; taxes: number; serviceCharge: number; totalAmount: number } {
    const summary = order?.order_review?.order_summary || {};
    if (order && summary) {
      const subtotal = Number(summary.sub_total ?? 0) || 0;
      const taxes = Number(summary.tax ?? 0) || 0;
      const serviceCharge = Number(summary.service_charge ?? summary.serviceCharge ?? 0) || 0;
      const totalAmount = Number(summary.order_total_amount ?? 0) || 0;
      if (subtotal || taxes || totalAmount) {
        return { subtotal, taxes, serviceCharge, totalAmount };
      }
    }

    const pms = task?.pms_order_summary || {};
    const items = Array.isArray(pms?.items) ? pms.items : [];
    let subtotal = 0;
    let taxes = 0;
    for (const item of items) {
      const qty = Number(item?.quantity ?? item?.qty ?? 1) || 1;
      subtotal += (Number(item?.price ?? 0) || 0) * qty;
      taxes += Number(item?.tax ?? 0) || 0;
    }
    const totalAmount =
      Number(pms?.totalAmount ?? pms?.total_amount ?? 0) || subtotal + taxes;
    if (!subtotal && totalAmount && taxes) {
      subtotal = Math.max(0, totalAmount - taxes);
    }
    return {
      subtotal,
      taxes,
      serviceCharge: 0,
      totalAmount
    };
  }

  buildOfferReportRows(offers: any[], offerOrders: any[] = []): OfferReportRow[] {
    // Guest Claimed + Revenue = Order Confirmed (paid) only — never Awaiting / Failed
    const paidOrders = (offerOrders || []).filter((order) => {
      const status = String(order?.status ?? '')
        .trim()
        .toLowerCase();
      return status === 'order confirmed' && this.isOfferPaidOrder(order);
    });

    return (offers || []).map((offer) => {
      const id = String(offer?.id ?? '').trim();
      const name = String(offer?.name ?? '').trim() || '—';
      const matched = paidOrders.filter((order) => this.orderMatchesOffer(order, offer));
      const revenue = matched.reduce((sum, order) => sum + this.orderAmount(order), 0);
      return {
        offerId: id || '—',
        name,
        offerType: this.offerTypeLabel(offer),
        validity: this.offerValidityLabel(offer),
        outlets: this.offerOutletsLabel(offer),
        usageCount: matched.length,
        revenue
      };
    });
  }

  buildOfferPaymentReportRows(orders: any[], tasks: any[] = []): OfferPaymentReportRow[] {
    const taskByOrderId = this.buildTaskByOrderIdMap(tasks);
    return [...(orders || [])]
      .map((order) => {
        const orderId = String(order?.id ?? '').trim();
        const summary = order?.order_review?.order_summary || {};
        const createdRaw = order?.orderConfirmDate || order?.created_on || order?.modified_on || '';
        const createdDate = createdRaw ? new Date(createdRaw) : null;
        const gross =
          Number(summary.sub_total ?? summary.gross_amount ?? summary.order_total_amount ?? 0) || 0;
        const discount =
          Number(summary.discount_amount ?? summary.discount ?? 0) || 0;
        const net =
          Number(summary.order_total_amount ?? 0) || Math.max(0, gross - discount);
        const paymentStatus = this.irdPaymentStatus(order);
        return {
          billNumber: orderId || '—',
          roomNumber: String(
            order?.room_no || order?.delivery?.room_no || order?.guest?.room_no || '—'
          ).trim() || '—',
          guestName: String(
            order?.guest?.guest_name || order?.guest_name || '—'
          ).trim() || '—',
          datetime: formatAmPmTime(createdRaw) || '—',
          offerApplied: this.offerDisplayName(order),
          grossAmount: gross,
          discountValue: discount,
          netAmount: net,
          paymentGateway: this.irdPaymentMethodLabel(order?.payment_type),
          paymentStatus,
          countsTowardPayment: paymentStatus === 'Paid',
          sortTime: createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.getTime() : 0,
          order,
          task: taskByOrderId.get(orderId) || null
        };
      })
      // Hide in-progress Awaiting (≤5 min). Show Paid + Failed (incl. timed-out awaiting).
      .filter((row) => row.paymentStatus === 'Paid' || row.paymentStatus === 'Failed')
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  filterCountableOfferPaymentRows(rows: OfferPaymentReportRow[]): OfferPaymentReportRow[] {
    return (rows || []).filter((row) => row.countsTowardPayment && row.paymentStatus === 'Paid');
  }

  buildDelayedReportRows(tasks: any[]): DelayedReportRow[] {
    return (tasks || [])
      .filter((task) => this.overviewService.isDelayedTask(task))
      .map((task) => {
        const closeMs = this.overviewService.taskCloseEndMs(task);
        return {
          guestName: String(task?.guest_name ?? '—').trim() || '—',
          roomNumber: String(task?.room_no ?? '—').trim() || '—',
          orderDatetime: this.taskOrderDatetimeLabel(task, null),
          actualDeliveryTime: this.formatCloseTimeLabel(task, closeMs),
          delayMinutes: this.slaDelayMinutesLabel(task),
          staffAssigned: this.staffName(task),
          sortTime: this.taskSortTime(task),
          task
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  buildDeliveryReportRows(tasks: any[]): DeliveryReportRow[] {
    return (tasks || [])
      .filter((task) => ['Completed', 'Delivered'].includes(String(task?.status ?? '').trim()))
      .map((task) => {
        const dispatchEntry = this.timelineEntryByStatuses(task, ['Assigned', 'Processing', 'Out for Delivery']);
        const arrivalEntry = this.timelineEntryByStatuses(task, ['Delivered', 'Completed']);
        const status = String(task?.status ?? '').trim() || '—';
        return {
          roomNumber: String(task?.room_no ?? '—').trim() || '—',
          guestName: String(task?.guest_name ?? '—').trim() || '—',
          orderDatetime: this.taskOrderDatetimeLabel(task, null),
          deliveryStaff: this.staffName(task),
          dispatchTime: dispatchEntry ? formatAmPmTime(dispatchEntry.time) || '—' : '—',
          arrivalTime: arrivalEntry ? formatAmPmTime(arrivalEntry.time) || '—' : '—',
          guestAck: this.guestAckLabel(task, status),
          deliveryStatus: status,
          sortTime: this.taskSortTime(task),
          task
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  buildEscalationReportRows(tasks: any[]): EscalationReportRow[] {
    return (tasks || [])
      .filter((task) => this.overviewService.isEscalatedTask(task))
      .map((task) => {
        const status = String(task?.status ?? '').trim();
        return {
          guestName: String(task?.guest_name ?? '—').trim() || '—',
          roomNumber: String(task?.room_no ?? '—').trim() || '—',
          orderDatetime: this.taskOrderDatetimeLabel(task, null),
          assignedStaff: this.staffName(task),
          resolution: this.escalationResolution(status),
          issue: this.escalationIssueLabel(task),
          sortTime: this.taskSortTime(task),
          task
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  private offerDisplayName(order: any): string {
    const named = String(
      order?.offer_name ||
        order?.offer?.name ||
        order?.order_review?.offer_name ||
        order?.order_review?.offer?.name ||
        order?.promo_code ||
        ''
    ).trim();
    if (named) {
      return named;
    }
    const firstProduct = order?.product_details?.products?.[0];
    const productName = String(firstProduct?.product_name || firstProduct?.name || '').trim();
    return productName || 'Offer';
  }

  /** All keys that can link an order to a catalog offer (id / name / promo). */
  private offerMatchKeys(order: any): string[] {
    const keys: string[] = [];
    const push = (raw: any) => {
      const v = String(raw ?? '').trim();
      if (v && v !== '—' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined') {
        keys.push(v);
      }
    };
    push(order?.offer_id);
    push(order?.offerId);
    push(order?.offer?.id);
    push(order?.offer?.offer_id);
    push(order?.offer?.name);
    push(order?.promo_code);
    push(order?.offer_code);
    push(order?.offer_name);
    push(order?.applied_offer_id);
    push(order?.applied_offer_name);
    push(order?.order_review?.offer_id);
    push(order?.order_review?.offer_name);
    push(order?.order_review?.promo_code);
    push(order?.order_review?.offer?.id);
    push(order?.order_review?.offer?.name);
    push(order?.order_review?.offer?.offer_id);
    push(order?.discount_offer_id);
    push(order?.selected_offer_id);
    push(order?.selected_offer?.id);
    push(order?.selected_offer?.name);
    const products = order?.product_details?.products || [];
    for (const p of products) {
      push(p?.offer_id);
      push(p?.offerId);
      push(p?.offer_name);
      push(p?.offer?.id);
      push(p?.offer?.name);
      push(p?.product_name);
      push(p?.name);
    }
    return [...new Set(keys.filter(Boolean))];
  }

  private orderMatchesOffer(order: any, offer: any): boolean {
    const offerId = String(offer?.id ?? '').trim().toLowerCase();
    const offerName = String(offer?.name ?? '').trim().toLowerCase();
    const promo = String(offer?.promo_code ?? offer?.code ?? '').trim().toLowerCase();
    const keys = this.offerMatchKeys(order).map((k) => k.toLowerCase());
    if (offerId && keys.includes(offerId)) {
      return true;
    }
    if (promo && keys.includes(promo)) {
      return true;
    }
    if (offerName && offerName !== '—' && keys.includes(offerName)) {
      return true;
    }
    return false;
  }

  private orderAmount(order: any): number {
    const summary = order?.order_review?.order_summary || {};
    return (
      Number(summary.order_total_amount ?? 0) ||
      Number(order?.payment?.amount ?? 0) ||
      Number(order?.order_total_amount ?? 0) ||
      0
    );
  }

  private offerTypeLabel(offer: any): string {
    const type = String(offer?.discount_type ?? offer?.offer_type ?? '').trim().toLowerCase();
    const value = offer?.discount_value;
    if (type === 'percentage') {
      return value != null ? `Percentage discount (${value}%)` : 'Percentage discount';
    }
    if (type === 'flat') {
      return value != null ? `Flat amount (₹${value})` : 'Flat amount';
    }
    if (type.includes('bogo') || type.includes('buy')) {
      return 'Buy-1-Get-1';
    }
    if (type.includes('free')) {
      return 'Free item';
    }
    return String(offer?.discount_type || offer?.offer_type || '—').trim() || '—';
  }

  private offerValidityLabel(offer: any): string {
    const startDate = String(offer?.start_date ?? '').trim();
    const endDate = String(offer?.end_date ?? '').trim();
    const startTime = String(offer?.start_time ?? '').trim();
    const endTime = String(offer?.end_time ?? '').trim();
    const start = [startDate, startTime ? formatAmPmTime(startTime) || startTime : '']
      .filter(Boolean)
      .join(' ');
    const end = [endDate, endTime ? formatAmPmTime(endTime) || endTime : '']
      .filter(Boolean)
      .join(' ');
    const dateMode = String(offer?.date_mode ?? '').trim().toLowerCase();
    if (dateMode === 'single' && startDate) {
      const timePart = [startTime ? formatAmPmTime(startTime) || startTime : '', endTime ? formatAmPmTime(endTime) || endTime : '']
        .filter(Boolean)
        .join(' – ');
      return timePart ? `${startDate} · ${timePart}` : startDate;
    }
    if (start && end) {
      return `${start} – ${end}`;
    }
    return start || end || '—';
  }

  private offerOutletsLabel(offer: any): string {
    const named =
      offer?.outlet_name ||
      offer?.outlet?.name ||
      (Array.isArray(offer?.outlets)
        ? offer.outlets.map((o: any) => o?.name || o?.outlet_name).filter(Boolean).join(', ')
        : '');
    if (String(named || '').trim()) {
      return String(named).trim();
    }
    const outletType = String(offer?.outlet_type ?? '').trim();
    const outletId = offer?.outlet_id;
    if (outletId != null && outletId !== '') {
      return outletType ? `${outletType} #${outletId}` : `Outlet #${outletId}`;
    }
    return outletType || '—';
  }

  private orderItemsLabel(order: any | null, task: any | null = null): string {
    const products = order?.product_details?.products || [];
    if (Array.isArray(products) && products.length) {
      return products
        .map((p: any) => {
          const name = String(p?.product_name || p?.name || 'Item').trim();
          const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
          return `${name} × ${qty}`;
        })
        .join(', ');
    }

    const pmsItems = task?.pms_order_summary?.items || [];
    if (Array.isArray(pmsItems) && pmsItems.length) {
      return pmsItems
        .map((p: any) => {
          const name = String(p?.itemName || p?.item_name || p?.name || 'Item').trim();
          const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
          return `${name} × ${qty}`;
        })
        .join(', ');
    }
    return '—';
  }

  private specialInstructionsLabel(order: any, task: any | null): string {
    // Task-level guest_instructions is the source of truth for IRD Special Instructions
    const raw =
      task?.guest_instructions ||
      order?.guest_instructions ||
      order?.special_instructions ||
      order?.delivery?.special_instructions ||
      order?.delivery?.notes ||
      order?.remarks ||
      order?.note ||
      task?.help_remarks ||
      task?.remarks ||
      '';
    return String(raw).trim() || '—';
  }

  private orderStatusLabel(order: any, task: any | null): string {
    const taskStatus = String(task?.status ?? '').trim();
    if (taskStatus) {
      // Prefer live task status (ASAP / Escalated / Delivered / …)
      return this.displayStatus(task);
    }
    const orderStatus = String(order?.status ?? '').trim();
    if (/confirm/i.test(orderStatus)) {
      return 'Received';
    }
    return orderStatus || '—';
  }

  private orderDatetimeLabel(order: any, task: any | null): string {
    const fromOrder = formatAmPmTime(
      order?.orderConfirmDate || order?.created_on || order?.modified_on || ''
    );
    if (fromOrder) {
      return fromOrder;
    }
    return this.taskOrderDatetimeLabel(task, order);
  }

  private taskOrderDatetimeLabel(task: any | null, order: any | null): string {
    if (task) {
      const datePart = String(task?.order_date ?? '').trim();
      const timePart = formatAmPmTime(task?.order_time || '') || String(task?.order_time ?? '').trim();
      const combined = [datePart, timePart].filter(Boolean).join(' ');
      if (combined) {
        return combined;
      }
    }
    if (order) {
      return (
        formatAmPmTime(order?.orderConfirmDate || order?.created_on || order?.modified_on || '') ||
        '—'
      );
    }
    return '—';
  }

  private staffName(task: any | null): string {
    if (!task) {
      return '—';
    }
    return String(task?.assigned_staff_name ?? '').trim() || '—';
  }

  private escalationResolution(status: string): string {
    const s = String(status ?? '').trim().toLowerCase();
    if (['completed', 'delivered', 'resolved', 'closed'].includes(s)) {
      return 'Resolved';
    }
    return 'Open';
  }

  private timelineEntryByStatuses(task: any, statuses: string[]): any | null {
    const wanted = new Set(statuses.map((s) => s.toLowerCase()));
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const entry = timeline[i];
      if (wanted.has(String(entry?.status ?? '').trim().toLowerCase())) {
        return entry;
      }
    }
    return null;
  }

  /** Delay Duration: time taken / allocated SLA (e.g. 12 / 10 min). */
  private slaDelayMinutesLabel(task: any): string {
    const taken = this.overviewService.taskActualCloseMinutes(task);
    const bound = this.overviewService.taskAllocatedMinutes(task);
    if (taken != null && bound > 0) {
      return `${taken} / ${bound} min`;
    }
    if (taken != null) {
      return `${taken} min`;
    }
    if (bound > 0) {
      return `— / ${bound} min`;
    }
    return '—';
  }

  private formatCloseTimeLabel(task: any, closeMs: number | null): string {
    // Same source as Taken minutes: completed first, then delivered
    const raw = this.overviewService.taskCloseTimeRaw(task);
    if (raw) {
      const label = formatAmPmTime(raw);
      if (label) {
        return label;
      }
    }
    if (closeMs != null) {
      const label = formatAmPmTime(new Date(closeMs));
      if (label) {
        return label;
      }
    }
    return '—';
  }

  private timelineTimestamp(dateRaw: any, timeRaw: any): number | null {
    const datePart = String(dateRaw ?? '').trim();
    const timePart = String(timeRaw ?? '').trim();
    if (!datePart && !timePart) {
      return null;
    }
    if (datePart && /^\d{2}-\d{2}-\d{4}$/.test(datePart)) {
      const [dd, mm, yyyy] = datePart.split('-').map(Number);
      const timeBits = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      if (timeBits) {
        hours = Number(timeBits[1]);
        minutes = Number(timeBits[2]);
        seconds = Number(timeBits[3] || 0);
        const meridiem = (timeBits[4] || '').toLowerCase();
        if (meridiem === 'pm' && hours < 12) {
          hours += 12;
        }
        if (meridiem === 'am' && hours === 12) {
          hours = 0;
        }
      }
      const d = new Date(yyyy, mm - 1, dd, hours, minutes, seconds);
      return Number.isNaN(d.getTime()) ? null : d.getTime();
    }
    const d = new Date(`${datePart} ${timePart}`.trim());
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  private guestAckLabel(task: any, status: string): string {
    const raw = task?.guest_acknowledgement ?? task?.guest_ack ?? task?.acknowledged;
    if (raw === true || raw === 1 || String(raw).toLowerCase() === 'yes') {
      return 'Yes';
    }
    if (raw === false || raw === 0 || String(raw).toLowerCase() === 'no') {
      return 'No';
    }
    if (['Delivered', 'Completed'].includes(status)) {
      return 'Yes';
    }
    return '—';
  }

  private latestEscalationEntry(task: any): any | null {
    const timeline = task?.time_line || [];
    return [...timeline].reverse().find((e: any) => String(e?.status ?? '').trim() === 'Escalated') || null;
  }

  private irdBilledTo(paymentType: any): string {
    const raw = String(paymentType ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ');
    if (raw === 'bill to room') {
      return 'Room';
    }
    if (raw === 'online payment') {
      return 'Guestezee';
    }
    return '—';
  }

  private irdPaymentMethodLabel(paymentType: any): string {
    const raw = String(paymentType ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ');
    if (raw === 'bill to room') {
      return 'Bill To Room';
    }
    if (raw === 'online payment') {
      return 'Online Payment';
    }
    return String(paymentType ?? '—').trim() || '—';
  }

  /**
   * Payment Details status:
   * - Order Confirmed → Paid (counted)
   * - Awaiting ≤5 min → Awaiting Payment (hidden from list / not counted)
   * - Awaiting >5 min or API Failed → Failed (listed, not counted)
   */
  private irdPaymentStatus(order: any): string {
    const status = String(order?.status ?? '').trim();
    const system = String(order?.system_label ?? '').trim();
    if (this.isIrdFailedStatus(order)) {
      return 'Failed';
    }
    if (this.isIrdAwaitingStatus(order)) {
      const age = this.irdOrderAgeMs(order);
      if (age >= FbDashboardService.AWAITING_FAIL_AFTER_MS) {
        return 'Failed';
      }
      return 'Awaiting Payment';
    }
    if (status.toLowerCase() === 'order confirmed' || system.toLowerCase() === 'confirmed') {
      return 'Paid';
    }
    return 'Paid';
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
    const escalated = tasks.filter((t) => this.overviewService.isEscalatedTask(t));
    return [...escalated]
      .sort((a, b) => this.taskSortTime(b) - this.taskSortTime(a))
      .slice(0, limit)
      .map((task) => ({
        ...this.toTrackingRow(task),
        type: this.escalationIssueLabel(task)
      }));
  }

  /** Escalation history for F&B (includes later Delivered). */
  buildRecentEscalations(tasks: any[], limit = 25): FnbRecentEscalationRow[] {
    return this.overviewService
      .buildRecentEscalationRows(
        (tasks || []).filter((t) => this.isMenuOrderingTask(t)),
        limit
      )
      .map((row) => ({
        orderId: row.orderId,
        datetime: row.datetime,
        dept: row.dept,
        details: row.details,
        status: row.status,
        eta: row.eta,
        taskId: row.id,
        task: row.task
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
  buildTaskReportCounts(tasks: any[], orders: any[] = []): FnbTaskReportCounts {
    const list = tasks || [];
    const status = (t: any) => String(t?.status ?? '').trim();
    return {
      delayed: list.filter((t) => this.overviewService.isDelayedTask(t)).length,
      escalated: list.filter((t) => this.overviewService.isEscalatedTask(t)).length,
      delivered: list.filter((t) => ['Completed', 'Delivered'].includes(status(t))).length,
      orders: list.filter((t) => this.isMenuOrderingTask(t)).length
    };
  }

  buildTodayOrderSummary(tasks: any[]): FnbTodayOrderSummary {
    const list = tasks || [];
    const status = (t: any) => String(t?.status ?? '').trim();
    // F&B core: ASAP, Assigned, Processing, Completed, Delivered, Escalated
    // Cancelled = guest cancel — not used for F&B
    const preparingSet = new Set(['ASAP', 'Processing']);

    let preparing = 0;
    let outForDelivery = 0;
    let escalated = 0;
    let completedToday = 0;

    for (const task of list) {
      const s = status(task);
      if (['Delivered', 'Completed'].includes(s)) {
        if (this.isTaskOnToday(task)) {
          completedToday += 1;
        }
        continue;
      }
      if (s === 'Assigned') {
        outForDelivery += 1;
        continue;
      }
      if (s === 'Escalated') {
        escalated += 1;
        continue;
      }
      if (preparingSet.has(s)) {
        preparing += 1;
      }
    }
    // Total Active must equal Preparing + Out for Delivery + Escalated
    const totalActive = preparing + outForDelivery + escalated;

    return {
      dateLabel: this.formatTodayLabel(),
      totalActive,
      preparing,
      outForDelivery,
      escalated,
      completedToday
    };
  }

  /**
   * Escalations are a subset of orders (may still deliver).
   * Chart: On time vs Escalated within total orders.
   */
  buildOrderEscalationOverview(
    orderCount: number,
    escalationCount: number
  ): FnbOrderEscalationOverview {
    const orders = Math.max(0, Number(orderCount) || 0);
    const escalations = Math.max(0, Number(escalationCount) || 0);
    const onTrack = Math.max(0, orders - Math.min(escalations, orders));
    const total = orders;
    const escalationsPct = orders ? Math.round((Math.min(escalations, orders) / orders) * 100) : 0;
    const ordersPct = orders ? Math.max(0, 100 - escalationsPct) : 0;
    const ordersColor = '#218a62';
    const escalationsColor = '#7140a8';
    const donutStyle =
      total === 0
        ? 'conic-gradient(#dce5ec 0 100%)'
        : `conic-gradient(${ordersColor} 0 ${ordersPct}%, ${escalationsColor} ${ordersPct}% 100%)`;

    return {
      total,
      orders,
      escalations,
      onTrack,
      ordersPct,
      escalationsPct,
      donutStyle
    };
  }

  buildLiveStatusRows(tasks: any[]): FnbLiveStatusRow[] {
    const list = tasks || [];
    const status = (t: any) => String(t?.status ?? '').trim();
    // F&B live statuses only — Cancelled is guest cancel, not for F&B
    // One distinct color per status — no emoji (avoids duplicate color cues)
    const buckets: Array<{ label: string; color: string; match: (s: string, t: any) => boolean }> = [
      {
        label: 'ASAP',
        color: '#e67e22',
        match: (s) => s === 'ASAP'
      },
      {
        label: 'Processing',
        color: '#8e44ad',
        match: (s) => s === 'Processing'
      },
      {
        label: 'Assigned',
        color: '#2980b9',
        match: (s) => s === 'Assigned'
      },
      {
        label: 'Completed / Delivered',
        color: '#27ae60',
        match: (s) => ['Delivered', 'Completed'].includes(s)
      },
      {
        label: 'Escalated',
        color: '#c0392b',
        match: (s) => s === 'Escalated'
      }
    ];

    const total = list.length || 1;
    return buckets.map((b) => {
      const count = list.filter((t) => b.match(status(t), t)).length;
      const pct = list.length ? Math.round((count / total) * 100) : 0;
      return { label: b.label, count, pct, color: b.color };
    });
  }

  /** Menu Ordering tasks tied to IRD food order ids (plus open escalations). */
  filterLiveTrackingTasks(tasks: any[], irdOrders: any[]): any[] {
    const orderIds = new Set(
      (irdOrders || [])
        .map((o) => String(o?.id ?? '').trim())
        .filter(Boolean)
    );
    const list = tasks || [];
    if (!orderIds.size) {
      return list;
    }
    const linked = list.filter((task) => {
      const orderId = this.taskOrderId(task);
      if (orderId && orderIds.has(orderId)) {
        return true;
      }
      return String(task?.status ?? '').trim() === 'Escalated' && (!orderId || orderIds.has(orderId));
    });
    return linked.length ? linked : list;
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
      id: this.displayOrderId(task),
      restaurant: this.restaurantLabel(task),
      type: this.typeLabel(task),
      status: this.displayStatus(task),
      time: this.updatedTimeLabel(task),
      sortTime: this.taskSortTime(task),
      task
    };
  }

  /** Prefer linked order id; always plain id (no # / IRD prefix). */
  private displayOrderId(task: any): string {
    const orderId = this.taskOrderId(task);
    if (orderId) {
      return orderId;
    }
    const raw = task?.id ?? task?.task_id;
    if (raw == null || raw === '') {
      return '—';
    }
    return String(raw);
  }

  private formatTaskId(task: any): string {
    return this.displayOrderId(task);
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
    if (
      this.overviewService.isDelayedTask(task) &&
      status !== 'Escalated' &&
      status !== 'Cancelled'
    ) {
      return 'Delayed';
    }
    return status;
  }

  /**
   * Escalation type from timeline before Escalated
   * (F&B / Menu Ordering — Cancelled is guest-side and not used for F&B):
   * - Escalation starts with no ASAP/Assigned/Processing → Desk not available
   * - After ASAP, not Assigned → Not assigned (desk there, no assign)
   * - After Assigned, not Processing → Staff not responded
   * - After Processing → Staff late
   */
  private escalationIssueLabel(task: any): string {
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    const statusesBeforeEsc: string[] = [];
    for (const entry of timeline) {
      const s = String(entry?.status ?? '').trim();
      if (!s) {
        continue;
      }
      if (s === 'Escalated') {
        break;
      }
      statusesBeforeEsc.push(s.toLowerCase());
    }

    const hadProcessing = statusesBeforeEsc.some((s) => s === 'processing');
    const hadAssigned = statusesBeforeEsc.some((s) => s === 'assigned');
    const hadAsap = statusesBeforeEsc.some((s) => s === 'asap');

    if (hadProcessing) {
      return 'Staff late';
    }
    if (hadAssigned) {
      return 'Staff not responded';
    }
    if (hadAsap) {
      return 'Not assigned';
    }
    return 'Desk not available';
  }

  private updatedTimeLabel(task: any): string {
    const timeline = task?.time_line || [];
    const last = timeline.length ? timeline[timeline.length - 1] : null;
    const time = (last?.time || task?.order_time || '').trim();
    return formatAmPmTime(time) || '—';
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
