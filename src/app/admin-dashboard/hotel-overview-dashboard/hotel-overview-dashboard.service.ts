import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DOMAIN_NAME, USER_ID } from '../../app.config';
import { LocalStorageService } from '../../auth-services/local-storage.service';
import { PaymentDetailsService } from '../../payment-details/payment-details.service';
import { ProfileService } from '../../profile/profile.service';
import { TaskManagementService } from '../../task-management/task-management.service';
import { formatAmPmTime } from '../../shared/time-format.util';
import { formatInr, parseMoneyAmount } from '../../shared/inr-format.util';

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

  /**
   * Guest Satisfaction — productreviews/getall with checkout_feedback + hotel member_id.
   */
  fetchCheckoutFeedbackReviews(memberId?: string): Observable<any> {
    const resolvedMemberId = (memberId ?? this.getMemberId()).trim();
    const find: Record<string, unknown> = {
      checkout_feedback: true
    };
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
    return this.taskManagementService.getAllRatings(payload);
  }

  /**
   * Checkout satisfaction rows enriched with stay escalation / delay flags from tasks.
   * Doc: “Based on Escalation and delay (Should be generated after checkout)”.
   */
  buildGuestSatisfactionRows(reviews: any[], tasks: any[] = []): GuestSatisfactionRow[] {
    const tasksByGuest = new Map<string, any[]>();
    for (const task of tasks || []) {
      const gid = String(task?.guest_id ?? '').trim();
      if (!gid) {
        continue;
      }
      const list = tasksByGuest.get(gid) || [];
      list.push(task);
      tasksByGuest.set(gid, list);
    }

    return [...(reviews || [])]
      .filter((review) => review?.checkout_feedback === true || review?.checkout_feedback === 'true')
      .map((review) => {
        const guestId = String(review?.guest_id ?? '').trim();
        const guestTasks = guestId ? tasksByGuest.get(guestId) || [] : [];
        const hadEscalation = guestTasks.some((t) => this.isEscalatedTask(t) || this.hasEscalationHistory(t));
        const hadDelay = guestTasks.some((t) => this.isDelayedTask(t));
        const guestName =
          String(
            guestTasks.find((t) => String(t?.guest_name ?? '').trim())?.guest_name || ''
          ).trim() || '—';
        const staffFromTask = guestTasks.find((t) => String(t?.assigned_staff_name ?? '').trim());
        const staffName =
          String(staffFromTask?.assigned_staff_name ?? '').trim() ||
          (review?.assigned_staff_id != null && review?.assigned_staff_id !== ''
            ? `Staff #${review.assigned_staff_id}`
            : '—');
        const createdRaw = review?.created_on || review?.delivered_time || review?.modified_on || '';
        const createdDate = createdRaw ? new Date(createdRaw) : null;
        const rating = Number(review?.rating);
        return {
          id: String(review?.id ?? review?._id ?? '—'),
          datetime: formatAmPmTime(createdRaw) || '—',
          deliveredAt: formatAmPmTime(review?.delivered_time || '') || '—',
          roomNumber: String(review?.room_no ?? '—').trim() || '—',
          reserveNo: String(review?.reserve_no ?? '—').trim() || '—',
          guestId: guestId || '—',
          guestName,
          rating: Number.isFinite(rating) ? rating : 0,
          feedback: String(review?.feedback_text ?? '').trim() || '—',
          staffName,
          wouldRecommend: review?.yes === true || review?.yes === 'true' || review?.yes === 1,
          hadEscalation,
          hadDelay,
          sortTime: createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.getTime() : 0,
          review
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  filterGuestSatisfactionByDateRange(
    rows: GuestSatisfactionRow[],
    start: Date,
    end: Date,
    unbounded = false
  ): GuestSatisfactionRow[] {
    if (unbounded) {
      return [...(rows || [])];
    }
    const startMs = this.startOfDay(start).getTime();
    const endMs = this.endOfDay(end).getTime();
    return (rows || []).filter((row) => {
      if (!row.sortTime) {
        return false;
      }
      return row.sortTime >= startMs && row.sortTime <= endMs;
    });
  }

  summarizeGuestSatisfaction(rows: GuestSatisfactionRow[]): GuestSatisfactionSummary {
    const list = rows || [];
    const total = list.length;
    const rated = list.filter((r) => r.rating > 0);
    const avg =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
        : 0;
    const positive = list.filter((r) => r.rating >= 4).length;
    const negative = list.filter((r) => r.rating > 0 && r.rating <= 2).length;
    const withEscalation = list.filter((r) => r.hadEscalation).length;
    const withDelay = list.filter((r) => r.hadDelay).length;
    return {
      total,
      averageRating: Math.round(avg * 10) / 10,
      positive,
      positivePct: total ? Math.round((positive / total) * 100) : 0,
      negative,
      withEscalation,
      withDelay
    };
  }

  /** Sum order_review.order_summary.order_total_amount for Order Confirmed orders. */
  sumOrderConfirmedRevenue(orders: any[]): { total: number; count: number } {
    const confirmed = (orders || []).filter(
      (order) => String(order?.status ?? '').trim() === 'Order Confirmed'
    );
    const total = confirmed.reduce((sum, order) => sum + this.orderAmount(order), 0);
    return { total, count: confirmed.length };
  }

  /** Last 6 calendar months order counts + revenue from created_on. */
  buildRevenueTrendLast6Months(orders: any[]): Array<{
    key: string;
    label: string;
    count: number;
    amount: number;
    heightPct: number;
  }> {
    const now = new Date();
    const months: Array<{ key: string; label: string; year: number; month: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-GB', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }

    const buckets = months.map((m) => ({ ...m, count: 0, amount: 0 }));
    for (const order of orders || []) {
      const created = this.parseOrderCreatedOn(order);
      if (!created) {
        continue;
      }
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.find((b) => b.key === key);
      if (!bucket) {
        continue;
      }
      bucket.count += 1;
      bucket.amount += this.orderAmount(order);
    }

    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((b) => ({
      key: b.key,
      label: b.label,
      count: b.count,
      amount: b.amount,
      heightPct: Math.max(6, Math.round((b.count / maxCount) * 100))
    }));
  }

  /** Monthly totals from Jan of the given year through current month (created_on). */
  buildYearMonthlyOrderCounts(
    orders: any[],
    year = new Date().getFullYear()
  ): Array<{ key: string; label: string; count: number; amount: number }> {
    const now = new Date();
    const endMonth = year < now.getFullYear() ? 11 : now.getMonth();
    const rows: Array<{ key: string; label: string; count: number; amount: number }> = [];
    for (let month = 0; month <= endMonth; month++) {
      const d = new Date(year, month, 1);
      rows.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-GB', { month: 'short', year: 'numeric' }),
        count: 0,
        amount: 0
      });
    }

    for (const order of orders || []) {
      const created = this.parseOrderCreatedOn(order);
      if (!created || created.getFullYear() !== year) {
        continue;
      }
      const key = `${year}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const row = rows.find((r) => r.key === key);
      if (!row) {
        continue;
      }
      row.count += 1;
      row.amount += this.orderAmount(order);
    }
    return rows;
  }

  buildOffersPerformance(
    orders: any[],
    catalogOfferCount = 0
  ): {
    totalOffers: number;
    offersSold: number;
    conversionPct: number;
    revenue: number;
    revenueLabel: string;
    items: Array<{ name: string; amount: string; count: number }>;
  } {
    const offerOrders = this.filterConfirmedOfferOrders(orders);
    const revenue = offerOrders.reduce((sum, order) => sum + this.orderAmount(order), 0);
    const productTotals = new Map<string, { amount: number; count: number }>();
    for (const order of offerOrders) {
      const products = order?.product_details?.products || [];
      if (products.length) {
        for (const product of products) {
          const name = String(product?.product_name || product?.name || 'Upsell').trim() || 'Upsell';
          const prev = productTotals.get(name) || { amount: 0, count: 0 };
          const line =
            Number(product?.total_amount ?? product?.price_inc_tax ?? product?.price ?? 0) || 0;
          prev.amount += line;
          prev.count += Number(product?.quantity ?? 1) || 1;
          productTotals.set(name, prev);
        }
      } else {
        const name = this.offerDisplayName(order);
        const prev = productTotals.get(name) || { amount: 0, count: 0 };
        prev.amount += this.orderAmount(order);
        prev.count += 1;
        productTotals.set(name, prev);
      }
    }

    const items = [...productTotals.entries()]
      .map(([name, v]) => ({ name, amount: v.amount, count: v.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((item) => ({
        name: item.name,
        count: item.count,
        amount: formatInr(item.amount, { compact: true })
      }));

    const offersSold = offerOrders.length;
    const totalOffers = catalogOfferCount > 0 ? catalogOfferCount : productTotals.size;
    const conversionPct = totalOffers ? Math.round((offersSold / totalOffers) * 100) : 0;

    return {
      totalOffers,
      offersSold,
      conversionPct,
      revenue,
      revenueLabel: formatInr(revenue, { compact: true }),
      items
    };
  }

  filterConfirmedOfferOrders(orders: any[]): any[] {
    return (orders || []).filter(
      (order) =>
        String(order?.status ?? '').trim() === 'Order Confirmed' &&
        String(order?.purpose ?? '').trim().toLowerCase() === 'offer'
    );
  }

  buildUpsellSoldRows(orders: any[]): UpsellSoldRow[] {
    return this.filterConfirmedOfferOrders(orders)
      .map((order) => this.toUpsellSoldRow(order))
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  private toUpsellSoldRow(order: any): UpsellSoldRow {
    const summary = order?.order_review?.order_summary || {};
    const createdRaw = order?.orderConfirmDate || order?.created_on || order?.modified_on || '';
    const createdDate = createdRaw ? new Date(createdRaw) : null;
    const paymentStatus =
      String(order?.payment?.payment_status || order?.payment_status || '').trim() ||
      (String(order?.status ?? '').trim() === 'Order Confirmed' ? 'Paid' : '—');
    return {
      id: String(order?.id ?? '—'),
      datetime: formatAmPmTime(createdRaw) || '—',
      offerName: this.offerDisplayName(order),
      guestName: String(order?.guest?.guest_name || order?.guest_name || '—').trim() || '—',
      roomNumber: String(
        order?.room_no || order?.delivery?.room_no || order?.guest?.room_no || '—'
      ).trim() || '—',
      outletName: String(order?.outlet_name || order?.delivery?.outlet_name || '—').trim() || '—',
      paymentMethod: this.paymentMethodLabel(order?.payment_type),
      paymentStatus,
      subtotal: Number(summary.sub_total ?? 0) || 0,
      discount: Number(summary.discount_amount ?? summary.discount ?? 0) || 0,
      amount: this.orderAmount(order),
      sortTime: createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.getTime() : 0
    };
  }

  private offerDisplayName(order: any): string {
    const named = String(order?.offer_name || '').trim();
    if (named) {
      return named;
    }
    const firstProduct = order?.product_details?.products?.[0];
    const productName = String(firstProduct?.product_name || firstProduct?.name || '').trim();
    return productName || 'Upsell';
  }

  private paymentMethodLabel(paymentType: any): string {
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

  private parseOrderCreatedOn(order: any): Date | null {
    const raw = order?.created_on || order?.orderConfirmDate || order?.modified_on;
    if (!raw) {
      return null;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** Revenue Breakdown: total + food + offer by purpose (Order Confirmed only). */
  sumRevenueByPurpose(orders: any[]): {
    total: number;
    count: number;
    food: number;
    foodCount: number;
    offer: number;
    offerCount: number;
  } {
    const confirmed = (orders || []).filter(
      (order) => String(order?.status ?? '').trim() === 'Order Confirmed'
    );
    let food = 0;
    let foodCount = 0;
    let offer = 0;
    let offerCount = 0;
    let total = 0;

    for (const order of confirmed) {
      const amount = this.orderAmount(order);
      total += amount;
      const purpose = String(order?.purpose ?? '')
        .trim()
        .toLowerCase();
      if (purpose === 'food') {
        food += amount;
        foodCount += 1;
      } else if (purpose === 'offer') {
        offer += amount;
        offerCount += 1;
      }
    }

    return { total, count: confirmed.length, food, foodCount, offer, offerCount };
  }

  private orderAmount(order: any): number {
    const summary = order?.order_review?.order_summary || {};
    const fromSummary = parseMoneyAmount(summary.order_total_amount);
    if (fromSummary > 0) {
      return fromSummary;
    }
    const fromPayment = parseMoneyAmount(
      order?.payment?.amount ?? order?.payment?.order_total_amount
    );
    if (fromPayment > 0) {
      return fromPayment;
    }
    return parseMoneyAmount(order?.order_total_amount ?? order?.total_amount);
  }

  fetchOrdersGetAll(
    customerMemberId: string,
    findExtras: Record<string, unknown> = {}
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

  /** App revenue — order/getall · from_app:true · Order Confirmed. */
  fetchAppConfirmedOrders(customerMemberId: string): Observable<any> {
    return this.fetchOrdersGetAll(customerMemberId, {
      status: 'Order Confirmed',
      from_app: true
    });
  }

  /** Hotel staff list — staff/getall by member_id (name + employee id only on UI). */
  fetchHotelStaff(memberId?: string): Observable<StaffDirectoryRow[]> {
    const resolvedMemberId = (memberId ?? this.getMemberId()).trim();
    if (!resolvedMemberId) {
      return of([]);
    }
    const payload = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { member_id: resolvedMemberId },
        pagination: false,
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    return this.taskManagementService.getAllStaves(payload).pipe(
      map((resp: any) => {
        if (!(resp?.success === 1 || resp?.success === true)) {
          return [];
        }
        return this.buildStaffDirectoryRows(resp?.result?.data || []);
      }),
      catchError(() => of([]))
    );
  }

  buildStaffDirectoryRows(staff: any[]): StaffDirectoryRow[] {
    return [...(staff || [])]
      .filter((s) => s && s.is_deleted !== true && s.is_active !== false)
      .map((s) => {
        const id = Number(s?.id ?? s?.staff_id ?? 0) || 0;
        const name =
          String(s?.full_name ?? '').trim() ||
          [s?.first_name, s?.last_name].filter(Boolean).join(' ').trim() ||
          '—';
        const employeeId =
          String(s?.staff_employee_number ?? s?.employee_id ?? s?.employee_number ?? '').trim() ||
          (id ? String(id) : '—');
        const department = String(
          s?.hierarchy?.department ?? s?.department ?? s?.belongs_to ?? ''
        ).trim() || '—';
        const photoUrl =
          String(
            s?.profile_image ?? s?.profile_picture ?? s?.image_url ?? s?.photo ?? s?.avatar ?? ''
          ).trim() || '';
        const email = String(s?.email ?? s?.mail ?? '').trim() || '—';
        const phone =
          String(s?.phone_number ?? s?.phone ?? s?.mobile_number ?? s?.mobile ?? '').trim() || '—';
        return { id, name, employeeId, department, photoUrl, email, phone, staff: s };
      })
      .filter((row) => row.id > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Staff-wise + on-time metrics from already-loaded tasks (no extra APIs).
   * Escalated = timeline Escalated with escalated_from_id === staff (once per task).
   * Delivered = assigned_staff_id + Delivered/Completed.
   * Delayed = delivered late vs SLA.
   * Not accepted = desk_staff_ids includes staff, never assigned/accepted.
   */
  buildStaffPerformance(staffId: number, tasks: any[]): StaffPerformanceReport {
    const id = Number(staffId) || 0;
    const assigned: any[] = [];
    const delivered: any[] = [];
    const escalated: any[] = [];
    const delayed: any[] = [];
    const onTime: any[] = [];
    const notAccepted: any[] = [];

    for (const task of tasks || []) {
      const assignedId = Number(task?.assigned_staff_id ?? 0) || 0;
      const status = String(task?.status ?? '').trim();
      const isDelivered = status === 'Delivered' || status === 'Completed';
      const escalatedByStaff = this.taskEscalatedFromStaff(task, id);
      const onDesk = this.taskDeskIncludesStaff(task, id);
      const wasAccepted = this.taskAcceptedByStaff(task, id);

      if (escalatedByStaff) {
        escalated.push(task);
      }
      if (assignedId === id) {
        assigned.push(task);
        if (isDelivered) {
          delivered.push(task);
          if (this.isDelayedTask(task)) {
            delayed.push(task);
          } else {
            onTime.push(task);
          }
        }
      }
      // Desk saw them but they never accepted / were never assigned
      if (onDesk && !wasAccepted && assignedId !== id) {
        notAccepted.push(task);
      }
    }

    const avgDelivery =
      delivered.length > 0
        ? delivered.reduce((sum, t) => sum + (this.taskActualCloseMinutes(t) || 0), 0) /
          delivered.length
        : 0;
    const onTimePct = delivered.length
      ? Math.round((onTime.length / delivered.length) * 100)
      : 0;

    return {
      staffId: id,
      assignedCount: assigned.length,
      deliveredCount: delivered.length,
      escalatedCount: escalated.length,
      delayedCount: delayed.length,
      onTimeCount: onTime.length,
      onTimePct,
      notAcceptedCount: notAccepted.length,
      averageDeliveryMinutes: Math.round(avgDelivery * 10) / 10,
      assigned,
      delivered,
      escalated,
      delayed,
      onTime,
      notAccepted
    };
  }

  private taskEscalatedFromStaff(task: any, staffId: number): boolean {
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    return timeline.some((entry: any) => {
      if (String(entry?.status ?? '').trim() !== 'Escalated') {
        return false;
      }
      return Number(entry?.escalated_from_id ?? 0) === staffId;
    });
  }

  private taskDeskIncludesStaff(task: any, staffId: number): boolean {
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    for (const entry of timeline) {
      const deskIds = Array.isArray(entry?.desk_staff_ids) ? entry.desk_staff_ids : [];
      if (deskIds.some((d: any) => Number(d) === staffId)) {
        return true;
      }
    }
    const topDesk = Array.isArray(task?.desk_staff_ids) ? task.desk_staff_ids : [];
    return topDesk.some((d: any) => Number(d) === staffId);
  }

  private taskAcceptedByStaff(task: any, staffId: number): boolean {
    if (Number(task?.assigned_staff_id ?? 0) === staffId) {
      return true;
    }
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    return timeline.some((entry: any) => {
      const status = String(entry?.status ?? '').trim().toLowerCase();
      if (!['assigned', 'accepted', 'processing', 'in progress'].includes(status)) {
        return false;
      }
      const entryStaff =
        Number(entry?.assigned_staff_id ?? entry?.staff_id ?? entry?.accepted_by_id ?? 0) || 0;
      return entryStaff === staffId;
    });
  }

  buildAppRevenueReport(orders: any[]): AppRevenueReport {
    const confirmed = (orders || []).filter(
      (order) => String(order?.status ?? '').trim() === 'Order Confirmed'
    );
    const byPurpose: Record<string, { count: number; amount: number }> = {
      food: { count: 0, amount: 0 },
      offer: { count: 0, amount: 0 },
      'late checkout': { count: 0, amount: 0 },
      checkout: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 }
    };
    let discount = 0;
    const rows: AppRevenueOrderRow[] = [];

    for (const order of confirmed) {
      const amount = this.orderAmount(order);
      const summary = order?.order_review?.order_summary || {};
      const disc = Number(summary.discount_amount ?? summary.discount ?? 0) || 0;
      discount += disc > 0 ? disc : 0;
      const purposeRaw = String(order?.purpose ?? '').trim().toLowerCase();
      const purposeKey =
        purposeRaw === 'food' ||
        purposeRaw === 'offer' ||
        purposeRaw === 'late checkout' ||
        purposeRaw === 'checkout'
          ? purposeRaw
          : 'other';
      byPurpose[purposeKey].count += 1;
      byPurpose[purposeKey].amount += amount;

      const createdRaw = order?.created_on || order?.orderConfirmDate || order?.modified_on || '';
      const createdDate = createdRaw ? new Date(createdRaw) : null;
      rows.push({
        id: String(order?.id ?? '—'),
        datetime: formatAmPmTime(createdRaw) || '—',
        purpose: this.appPurposeLabel(purposeKey),
        purposeKey,
        guestName: String(order?.guest?.guest_name || order?.guest_name || '—').trim() || '—',
        roomNumber: String(
          order?.room_no || order?.delivery?.room_no || order?.guest?.room_no || '—'
        ).trim() || '—',
        paymentMethod: this.paymentMethodLabel(order?.payment_type),
        amount,
        discount: disc > 0 ? disc : 0,
        sortTime: createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.getTime() : 0,
        order
      });
    }

    rows.sort((a, b) => b.sortTime - a.sortTime);
    const net = rows.reduce((sum, r) => sum + r.amount, 0);
    const count = rows.length;
    return {
      count,
      gross: net + discount,
      discount,
      net,
      aov: count ? net / count : 0,
      byPurpose: [
        { key: 'food', label: 'Food / IRD', ...byPurpose['food'] },
        { key: 'offer', label: 'Offer / Upsell', ...byPurpose['offer'] },
        { key: 'late checkout', label: 'Late Checkout', ...byPurpose['late checkout'] },
        { key: 'checkout', label: 'Checkout', ...byPurpose['checkout'] },
        { key: 'other', label: 'Other', ...byPurpose['other'] }
      ].filter((p) => p.count > 0 || p.amount > 0),
      rows
    };
  }

  private appPurposeLabel(key: string): string {
    switch (key) {
      case 'food':
        return 'Food';
      case 'offer':
        return 'Offer';
      case 'late checkout':
        return 'Late Checkout';
      case 'checkout':
        return 'Checkout';
      default:
        return 'Other';
    }
  }

  filterAppRevenueByDateRange(
    rows: AppRevenueOrderRow[],
    start: Date,
    end: Date,
    unbounded = false
  ): AppRevenueOrderRow[] {
    if (unbounded) {
      return [...(rows || [])];
    }
    const startMs = this.startOfDay(start).getTime();
    const endMs = this.endOfDay(end).getTime();
    return (rows || []).filter((row) => row.sortTime >= startMs && row.sortTime <= endMs);
  }

  /**
   * Escalation history: any task that was escalated in time_line
   * (includes later Delivered / Completed).
   */
  buildRecentEscalationRows(tasks: any[], limit = 25): EscalationRow[] {
    const escalatedTasks = (tasks || [])
      .filter((task) => this.hasEscalationHistory(task))
      .map((task) => {
        const latest = this.getLatestEscalationEntry(task);
        return { task, latest, sortTime: this.escalationSortTimestamp(task, latest) };
      })
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, limit);

    return escalatedTasks.map(({ task, latest }) => {
      const currentStatus = String(task?.status ?? '').trim() || '—';
      return {
        orderId: this.escalationOrderId(task),
        datetime: this.formatEscalationDateTime(task, latest?.time),
        dept: this.mapDepartmentLabel(task),
        id: String(task?.id ?? task?.task_id ?? '—'),
        details: this.buildEscalationDetails(task),
        status: currentStatus,
        statusClass: this.escalationStatusClass(currentStatus),
        eta: this.formatEscalationEtaDelay(task),
        task
      };
    });
  }

  hasEscalationHistory(task: any): boolean {
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    return timeline.some((e: any) => String(e?.status ?? '').trim() === 'Escalated');
  }

  /**
   * Delayed = Delivered/Completed only, and
   * (order_time → completed_time|delivered_time) > service.time_bound_value.
   * Prefer completed_time (staff close) over delivered_time (guest ack can be much later).
   */
  isDelayedTask(task: any): boolean {
    const status = String(task?.status ?? '').trim();
    if (!['Delivered', 'Completed'].includes(status)) {
      return false;
    }
    const bound = this.taskAllocatedMinutes(task);
    if (bound <= 0) {
      return false;
    }
    const actual = this.taskActualCloseMinutes(task);
    return actual != null && actual > bound;
  }

  /** Current status Escalated, or any Escalated entry in time_line history. */
  isEscalatedTask(task: any): boolean {
    const status = String(task?.status ?? '').trim();
    if (status === 'Escalated') {
      return true;
    }
    return this.hasEscalationHistory(task);
  }

  /** Allocated SLA minutes from service.time_bound_value. */
  taskAllocatedMinutes(task: any): number {
    const n = Number(task?.service?.time_bound_value ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /**
   * Actual minutes to close:
   * order_date/order_time → completed_time (preferred) || delivered_time || timeline
   */
  taskActualCloseMinutes(task: any): number | null {
    const startMs = this.taskOrderStartMs(task);
    if (startMs == null) {
      return null;
    }

    const endMs = this.taskCloseEndMs(task);
    if (endMs != null && endMs >= startMs) {
      return Math.round((endMs - startMs) / 60000);
    }
    return null;
  }

  /** Minutes past SLA (0 if on time / unknown). */
  taskDelayOverrunMinutes(task: any): number {
    const bound = this.taskAllocatedMinutes(task);
    const actual = this.taskActualCloseMinutes(task);
    if (bound <= 0 || actual == null) {
      return 0;
    }
    return Math.max(0, actual - bound);
  }

  /** order_date + order_time (or created_on fallback). */
  taskOrderStartMs(task: any): number | null {
    const fromOrder = this.parseFlexibleTimestamp(
      task?.order_date,
      task?.order_time
    );
    if (fromOrder != null) {
      return fromOrder;
    }
    const created = this.parseIsoTimestamp(task?.created_on);
    return created;
  }

  /**
   * Close timestamp for SLA:
   * completed_time → timeline Completed → delivered_time → timeline Delivered.
   * Guest ack (delivered_time) can lag hours after staff completed.
   */
  taskCloseEndMs(task: any): number | null {
    return this.taskEndTimestamp(task);
  }

  /** Which raw timestamp was used for SLA close (for UI labels). */
  taskCloseTimeRaw(task: any): string {
    const completed = String(task?.completed_time ?? '').trim();
    if (completed && this.parseIsoTimestamp(completed) != null) {
      return completed;
    }
    const timelineCompleted = this.timelineStatusEntry(task, 'Completed');
    if (timelineCompleted?.time) {
      return `${timelineCompleted.date || task?.order_date || ''} ${timelineCompleted.time}`.trim();
    }
    const delivered = String(task?.delivered_time ?? '').trim();
    if (delivered && this.parseIsoTimestamp(delivered) != null) {
      return delivered;
    }
    const timelineDelivered = this.timelineStatusEntry(task, 'Delivered');
    if (timelineDelivered?.time) {
      return `${timelineDelivered.date || task?.order_date || ''} ${timelineDelivered.time}`.trim();
    }
    return '';
  }

  private timelineStatusEntry(task: any, status: string): any | null {
    const wanted = String(status).trim().toLowerCase();
    const timeline = Array.isArray(task?.time_line) ? task.time_line : [];
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const entry = timeline[i];
      if (String(entry?.status ?? '').trim().toLowerCase() === wanted) {
        return entry;
      }
    }
    return null;
  }

  private parseIsoTimestamp(raw: any): number | null {
    const s = String(raw ?? '').trim();
    if (!s) {
      return null;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  private parseFlexibleTimestamp(dateRaw: any, timeRaw: any): number | null {
    const datePart = String(dateRaw ?? '').trim();
    const timePart = String(timeRaw ?? '').trim();
    if (!datePart && !timePart) {
      return null;
    }
    // ISO datetime in either field
    if (datePart.includes('T') || /\d{4}-\d{2}-\d{2}/.test(datePart) && timePart === '') {
      const iso = this.parseIsoTimestamp(datePart);
      if (iso != null) {
        return iso;
      }
    }
    if (timePart.includes('T')) {
      const iso = this.parseIsoTimestamp(timePart);
      if (iso != null) {
        return iso;
      }
    }
    // dd-MM-yyyy + time
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
    const combined = `${datePart} ${timePart}`.trim();
    const d = new Date(combined);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  private escalationOrderId(task: any): string {
    const fromPms =
      task?.pms_order_summary?.orderId ??
      task?.pms_order_summary?.order_id ??
      task?.order_id;
    if (fromPms != null && String(fromPms).trim() !== '') {
      return String(fromPms).trim();
    }
    return String(task?.id ?? task?.task_id ?? '—');
  }

  /** Delivered/Completed → `{bound} min / {actual}`; otherwise — */
  private formatEscalationEtaDelay(task: any): string {
    const current = String(task?.status ?? '').trim();
    if (!['Delivered', 'Completed'].includes(current)) {
      return '—';
    }
    const bound = Number(task?.service?.time_bound_value ?? 0);
    const actual = Number(task?.actual_time_to_close_the_task ?? 0);
    if (bound > 0 && actual >= 0) {
      return `${bound} min / ${actual}`;
    }
    if (actual > 0) {
      return `${actual} min`;
    }
    return '—';
  }

  private escalationStatusClass(status: string): string {
    if (['Delivered', 'Completed'].includes(status)) {
      return 'info';
    }
    if (status === 'Escalated') {
      return '';
    }
    if (['Cancelled', 'Rejected'].includes(status)) {
      return 'warn';
    }
    return 'info';
  }

  buildTodayDepartmentPanels(tasks: any[]): TodayDepartmentPanels {
    return this.buildDepartmentStatusPanels(this.filterTasksForToday(tasks), this.formatTodayLabel());
  }

  /** Dept status panels from an already period-filtered task list. */
  buildDepartmentStatusPanels(tasks: any[], dateLabel: string): TodayDepartmentPanels {
    const list = tasks || [];
    const fnbTasks = list.filter((t) => this.classifyDepartmentTask(t) === 'F&B');
    const hkTasks = list.filter((t) => this.classifyDepartmentTask(t) === 'Housekeeping');
    const foTasks = list.filter((t) => this.classifyDepartmentTask(t) === 'Front Office');

    return {
      dateLabel,
      fnb: this.buildDeptStatusPanel(fnbTasks, 'escalated'),
      hk: this.buildDeptStatusPanel(hkTasks, 'escalated'),
      fo: this.buildDeptStatusPanel(foTasks, 'escalated')
    };
  }

  /** Inclusive local-day range filter for tasks (order_date / created_on). */
  filterTasksByDateRange(
    tasks: any[],
    start: Date,
    end: Date,
    unbounded = false
  ): any[] {
    if (unbounded) {
      return [...(tasks || [])];
    }
    const startMs = this.startOfDay(start).getTime();
    const endMs = this.endOfDay(end).getTime();
    return (tasks || []).filter((task) => {
      const d = this.parseTaskDate(task) || this.parseCreatedDate(task?.created_on || task?.modified_on);
      if (!d) {
        return false;
      }
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    });
  }

  /** Inclusive local-day range filter for orders (created_on). */
  filterOrdersByDateRange(
    orders: any[],
    start: Date,
    end: Date,
    unbounded = false
  ): any[] {
    if (unbounded) {
      return [...(orders || [])];
    }
    const startMs = this.startOfDay(start).getTime();
    const endMs = this.endOfDay(end).getTime();
    return (orders || []).filter((order) => {
      const d = this.parseOrderCreatedOn(order);
      if (!d) {
        return false;
      }
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    });
  }

  resolvePeriodRange(
    period: string,
    customFrom?: string,
    customTo?: string
  ): { start: Date; end: Date; label: string; unbounded?: boolean } {
    const now = new Date();
    const end = this.endOfDay(now);
    if (period === 'All Dates' || period === 'All' || period === 'All Time') {
      return {
        start: this.startOfDay(new Date(1970, 0, 1)),
        end: this.endOfDay(new Date(2099, 11, 31)),
        label: 'All Dates',
        unbounded: true
      };
    }
    if (period === 'Today') {
      return { start: this.startOfDay(now), end, label: this.formatTodayLabel() };
    }
    if (period === 'This Week') {
      const start = this.startOfDay(now);
      const day = start.getDay(); // 0 Sun
      const diffToMon = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diffToMon);
      return { start, end, label: 'This Week' };
    }
    if ((period === 'For Date' || period === 'Particular Date') && customFrom) {
      const day = this.parseLocalDateInput(customFrom);
      if (day) {
        return {
          start: this.startOfDay(day),
          end: this.endOfDay(day),
          label: this.formatShortDate(day)
        };
      }
    }
    if (
      (period === 'Date Range' || period === 'Custom Range') &&
      customFrom &&
      customTo
    ) {
      let start = this.parseLocalDateInput(customFrom);
      let customEnd = this.parseLocalDateInput(customTo);
      if (start && customEnd) {
        if (start.getTime() > customEnd.getTime()) {
          const tmp = start;
          start = customEnd;
          customEnd = tmp;
        }
        start = this.startOfDay(start);
        customEnd = this.endOfDay(customEnd);
        return {
          start,
          end: customEnd,
          label: `${this.formatShortDate(start)} – ${this.formatShortDate(customEnd)}`
        };
      }
    }
    // Default: This Month
    const start = this.startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end, label: 'This Month' };
  }

  /** Parse `YYYY-MM-DD` as local calendar day (avoids UTC shift from `new Date(isoDate)`). */
  private parseLocalDateInput(value: string): Date | null {
    const m = String(value || '')
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      return null;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const date = new Date(y, mo, d, 0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatShortDate(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  private parseCreatedDate(raw: any): Date | null {
    if (!raw) {
      return null;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
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
        'bi bi-cup-hot-fill',
        '#1769aa',
        'Total Orders',
        'Avg. Delay'
      ),
      this.buildDepartmentCard(
        'Housekeeping',
        buckets.Housekeeping,
        'bi bi-house-heart-fill',
        '#25865c',
        'Total Requests',
        'Avg. Response'
      ),
      this.buildDepartmentCard(
        'Front Office',
        buckets['Front Office'],
        'bi bi-pc-display',
        '#7140a8',
        'Total Requests',
        'Avg. Response'
      )
    ];
  }

  private buildDepartmentCard(
    name: DepartmentCard['name'],
    deptTasks: any[],
    icon: string,
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
      icon,
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
  classifyDepartmentTask(task: any): 'F&B' | 'Housekeeping' | 'Front Office' {
    if (this.isMenuOrderingTask(task)) {
      return 'F&B';
    }
    if (this.isFrontOfficeTask(task)) {
      return 'Front Office';
    }
    return 'Housekeeping';
  }

  /** Checkout / Late checkout tasks for Front Office dashboards. */
  isFrontOfficeTask(task: any): boolean {
    const belongs = String(task?.service?.belongs_to ?? '').trim().toLowerCase();
    const serviceName = String(task?.service?.service_name ?? '').trim().toLowerCase();
    return (
      belongs === 'checkout' ||
      belongs === 'late checkout' ||
      serviceName === 'checkout' ||
      serviceName === 'late checkout'
    );
  }

  filterFrontOfficeTasks(tasks: any[]): any[] {
    return (tasks || []).filter((t) => this.isFrontOfficeTask(t));
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
    return this.taskOrderStartMs(task);
  }

  private taskEndTimestamp(task: any): number | null {
    // 1) Staff completed (SLA clock) — not guest delivered ack
    const completedIso = this.parseIsoTimestamp(task?.completed_time);
    if (completedIso != null) {
      return completedIso;
    }
    const timelineCompleted = this.timelineStatusEntry(task, 'Completed');
    if (timelineCompleted?.time) {
      const fromTl =
        this.parseFlexibleTimestamp(
          timelineCompleted.date || task?.order_date,
          timelineCompleted.time
        ) ?? this.parseIsoTimestamp(timelineCompleted.time);
      if (fromTl != null) {
        return fromTl;
      }
    }

    // 2) Guest delivered ack / Delivered timeline (fallback)
    const deliveredIso = this.parseIsoTimestamp(task?.delivered_time);
    if (deliveredIso != null) {
      return deliveredIso;
    }
    const timelineDelivered = this.timelineStatusEntry(task, 'Delivered');
    if (timelineDelivered?.time) {
      return (
        this.parseFlexibleTimestamp(
          timelineDelivered.date || task?.order_date,
          timelineDelivered.time
        ) ??
        this.parseIsoTimestamp(timelineDelivered.time) ??
        null
      );
    }
    return null;
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
    const time = formatAmPmTime(escalatedTime || task?.order_time || '');
    if (!dateRaw) {
      return time || '—';
    }
    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) {
      return `${dateRaw} ${time}`.trim() || '—';
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
  orderId: string;
  datetime: string;
  dept: string;
  id: string;
  details: string;
  status: string;
  statusClass: string;
  eta: string;
  task?: any;
};

export type DepartmentCard = {
  name: string;
  icon: string;
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

export type UpsellSoldRow = {
  id: string;
  datetime: string;
  offerName: string;
  guestName: string;
  roomNumber: string;
  outletName: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  amount: number;
  sortTime: number;
};

export type GuestSatisfactionRow = {
  id: string;
  datetime: string;
  deliveredAt: string;
  roomNumber: string;
  reserveNo: string;
  guestId: string;
  guestName: string;
  rating: number;
  feedback: string;
  staffName: string;
  wouldRecommend: boolean;
  hadEscalation: boolean;
  hadDelay: boolean;
  sortTime: number;
  review: any;
};

export type GuestSatisfactionSummary = {
  total: number;
  averageRating: number;
  positive: number;
  positivePct: number;
  negative: number;
  withEscalation: number;
  withDelay: number;
};

export type StaffDirectoryRow = {
  id: number;
  name: string;
  employeeId: string;
  department: string;
  /** Empty string when missing — UI shows initials placeholder. */
  photoUrl: string;
  email: string;
  phone: string;
  staff: any;
};

export type StaffPerformanceReport = {
  staffId: number;
  assignedCount: number;
  deliveredCount: number;
  escalatedCount: number;
  delayedCount: number;
  onTimeCount: number;
  onTimePct: number;
  notAcceptedCount: number;
  averageDeliveryMinutes: number;
  assigned: any[];
  delivered: any[];
  escalated: any[];
  delayed: any[];
  onTime: any[];
  notAccepted: any[];
};

export type AppRevenueOrderRow = {
  id: string;
  datetime: string;
  purpose: string;
  purposeKey: string;
  guestName: string;
  roomNumber: string;
  paymentMethod: string;
  amount: number;
  discount: number;
  sortTime: number;
  order: any;
};

export type AppRevenueReport = {
  count: number;
  gross: number;
  discount: number;
  net: number;
  aov: number;
  byPurpose: Array<{ key: string; label: string; count: number; amount: number }>;
  rows: AppRevenueOrderRow[];
};
