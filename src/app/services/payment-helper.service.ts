import { Injectable } from '@angular/core';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { CheckoutApiService } from '../hotel-enrollment-tabview/checkout.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { LoaderService } from '../shared/loader/loader.service';

export type PlanKey = 'quarterly' | 'half_yearly' | 'annual';

export interface PlanOption {
  key: PlanKey;
  label: string;
  installments: number;
  months: number;
  sub_total: number;
  tax: number;
  amount: number;
}

export interface PaymentPlan {
  plan_basis: 'monthly_per_room';
  subscription_name: string;
  number_of_rooms: number;
  per_room_cost: number;
  discount_type: string;
  discount_value: number;
  gst_percent: number;
  per_room_final_price: number;
  annual_sub_total: number;
  annual_tax: number;
  annual_amount: number;
  per_day_cost: number;
  plans: Record<PlanKey, PlanOption>;
  payment_subscription_end_date: string;
}

interface OrderOptions {
  paymentType: string;
  payment_split: any[];
  order_review: any;
  subscriptionEndDate: string;
  payableTotal: number;
  extra?: any;
}

export interface CustomCoverage {
  amount: number;
  covered_days: number;
  end_date: string;
  matched_plan: PlanKey | null;
  remaining_amount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentHelperService {

  constructor(
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private checkoutApiService: CheckoutApiService,
    private localService: LocalStorageService,
    private loaderService: LoaderService
  ) {}

  getCustomerByMemberId(memberId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            customer_member_id: memberId
          }
        }
      };
      this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe({
        next: (resp: any) => {
          const customer = resp?.result?.data?.[0] || null;
          if (customer) {
            resolve(customer);
          } else {
            reject('Customer not found');
          }
        },
        error: (err: any) => reject(err)
      });
    });
  }

  async startPayment(memberId: string, customAmount?: number | null): Promise<boolean> {
    const customerData = await this.getCustomerByMemberId(memberId);
    const orderdata = await this.getLastestOrderOfCustomer(memberId);
    return this.payNow(customerData, orderdata, null, customAmount);
  }

  getLastestOrderOfCustomer(memberId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {
            "customer_member_id": memberId
          }
        }
      };
      this.hotelenrollmenttabviewService.orderDetailsGetById(req).subscribe({
        next: (res: any) => {
          const orders = res?.result?.data || [];
          const confirmedOrders = orders.filter((order: any) => order.status === 'Order Confirmed');
          const sortedConfirmed = confirmedOrders.sort((a: any, b: any) => {
            const dateA = new Date(a.created_on);
            const dateB = new Date(b.created_on);
            return dateB.getTime() - dateA.getTime(); // latest first
          });
          resolve(sortedConfirmed.length > 0 ? sortedConfirmed[0] : null);
        },
        error: (err: any) => {
          reject(err);
        }
      });
    });
  }

  getActiveSubscription(customerData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const propertySize = customerData?.property_details?.property_address?.property_size;
        const customerSub = customerData?.subscription_detail;
        // Free has no paid price: once it ends, charge the plan for the property size
        if (customerSub && customerSub.name !== 'Free') {
          return resolve(customerSub);
        }
        const reqBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: {
            find: {},
            pagination: true,
            paginationDetails: { limit: 0, pageSize: 100 },
            sorting: true,
            sortingDetails: { name: 1 }
          }
        };
        this.hotelenrollmenttabviewService.getAllSubscriptionDetails(reqBody).subscribe({
          next: (generalResp: any) => {
            if (generalResp?.result?.data?.length) {
              const allSubs = generalResp.result.data;
              let matched = allSubs.find((sub: any) => sub.name === propertySize);
              if (!matched) {
                matched = allSubs[0];
              }
              resolve(matched);
            } else {
              reject('No general subscription plans found.');
            }
          },
          error: (err: any) => reject(err)
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /** paymentsubscription filter: name === RoomPricing (fallback SingleRoomPricing / customer plan). */
  getRoomPricing(): Promise<any> {
    return new Promise((resolve, reject) => {
      const reqBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: {
          find: {},
          pagination: true,
          paginationDetails: { limit: 0, pageSize: 100 },
          sorting: true,
          sortingDetails: { name: 1 }
        }
      };
      this.hotelenrollmenttabviewService.getAllSubscriptionDetails(reqBody).subscribe({
        next: (resp: any) => {
          const allSubs = resp?.result?.data || [];
          const roomPricing =
            allSubs.find((sub: any) => String(sub?.name || '') === 'RoomPricing') ||
            allSubs.find((sub: any) => String(sub?.name || '') === 'SingleRoomPricing') ||
            allSubs[0] ||
            null;
          resolve(roomPricing);
        },
        error: (err: any) => reject(err)
      });
    });
  }

  parseSubscriptionDate(value: string | null | undefined): Date | null {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part) || part <= 0)) {
      return null;
    }
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  formatSubscriptionDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
  }

  /**
   * Yearly hotel cost (with 18% GST) / 365 = per-day rate from RoomPricing.
   */
  getPerDayCost(customerData: any, roomPricing: any): number {
    const perRoomCost = Number(
      roomPricing?.finalPrice ?? roomPricing?.perRoomCost ?? customerData?.subscription_detail?.finalPrice ?? 0
    );
    const discountType = String(roomPricing?.discountType || customerData?.subscription_detail?.discountType || '').toLowerCase();
    const discountValue = Number(roomPricing?.discountValue ?? customerData?.subscription_detail?.discountValue ?? 0);
    const numberOfRooms = Number(
      customerData?.property_details?.property_address?.number_of_rooms ||
      customerData?.customer?.number_of_rooms ||
      0
    );

    let discountedCost = perRoomCost;
    if (discountType === 'percentage') {
      discountedCost = perRoomCost - (perRoomCost * discountValue / 100);
    } else if (discountType === 'flat') {
      discountedCost = perRoomCost - discountValue;
    }
    discountedCost = Math.max(0, Number(discountedCost.toFixed(2)));

    const yearlyWithGst = Number((discountedCost * Math.max(numberOfRooms, 1) * 12 * 1.18).toFixed(2));
    if (yearlyWithGst <= 0) {
      return 0;
    }
    return Number((yearlyWithGst / 365).toFixed(4));
  }

  /** Days covered by a paid amount at the RoomPricing per-day rate. */
  getDaysCoveredByAmount(amount: number, perDayCost: number): number {
    if (!perDayCost || perDayCost <= 0 || !Number.isFinite(amount) || amount <= 0) {
      return 0;
    }
    return Math.max(1, Math.floor(amount / perDayCost));
  }

  /**
   * Extend coverage from baseEnd (or today if expired) by days covered by amount.
   * First registration dates must not be recalculated by callers — only subsequent payments.
   */
  extendSubscriptionEndDate(baseEndDate: string | null, amount: number, perDayCost: number): string | null {
    const days = this.getDaysCoveredByAmount(amount, perDayCost);
    if (days <= 0) {
      return baseEndDate;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = this.parseSubscriptionDate(baseEndDate);
    if (!start || start < today) {
      start = today;
    }
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    next.setDate(next.getDate() + days);
    return this.formatSubscriptionDate(next);
  }

  getNextSubscriptionAmount(customerData: any, roomPricing: any, installments = 4): number {
    const perDay = this.getPerDayCost(customerData, roomPricing);
    if (perDay <= 0) {
      return 0;
    }
    // One quarterly period ≈ 365/4 days
    const days = Math.round(365 / Math.max(installments, 1));
    return Number((perDay * days).toFixed(2));
  }

  async payNow(customerData: any, orderdata: any, selectedIndex: number | null, customAmount?: number | null): Promise<boolean> {
    if (this.isFreePeriodActive(customerData)) {
      return false;
    }
    this.loaderService.emitLoading();

    let payment_split: any[] = [];
    let paymentType = "";
    if (!orderdata) {
      payment_split = [];
    } else {
      payment_split = orderdata.payment_split.map((cycle: any) => ({ ...cycle }));
    }

    const allPaid = payment_split.length === 0 || payment_split.every(cycle =>
      cycle.installments.every((inst: any) => inst.status === "Paid")
    );

    if (allPaid) {
      const activeSub = await this.getActiveSubscription(customerData);
      const perRoomCost = Number(activeSub?.perRoomCost || 0);
      const discountType = (activeSub?.discountType || "").toLowerCase();
      const discountValue = Number(activeSub?.discountValue || 0);
      const numberOfRooms = Number(customerData?.property_details?.property_address?.number_of_rooms || 0);
      
      let discountedCost = perRoomCost;
      if (discountType === "percentage") {
        discountedCost = perRoomCost - (perRoomCost * discountValue / 100);
      } else if (discountType === "flat") {
        discountedCost = perRoomCost - discountValue;
      }
      discountedCost = Number(discountedCost.toFixed(2));

      const gstPerRoom = Number((discountedCost * 0.18).toFixed(2));
      const yearlyCost = Number((discountedCost * numberOfRooms * 12).toFixed(2));
      const yearlyGst = Number((gstPerRoom * numberOfRooms * 12).toFixed(2));
      const totalYearlyAmount = Number((yearlyCost + yearlyGst).toFixed(2));

      let installments = 1;
      if (selectedIndex === 0) { paymentType = "quarterly"; installments = 4; }
      if (selectedIndex === 1) { paymentType = "half-yearly"; installments = 2; }
      if (selectedIndex === 2) { paymentType = "full"; installments = 1; }

      const subTotalPerInstallment = Number((yearlyCost / installments).toFixed(2));
      const taxPerInstallment = Number((yearlyGst / installments).toFixed(2));
      const totalPerInstallment = Number((subTotalPerInstallment + taxPerInstallment).toFixed(2));

      let baseDate = new Date();
      const installmentArr = [];
      for (let i = 0; i < installments; i++) {
        let tempDate = new Date(baseDate);
        if (paymentType === "quarterly") tempDate.setMonth(tempDate.getMonth() + (3 * (i + 1)));
        if (paymentType === "half-yearly") tempDate.setMonth(tempDate.getMonth() + (6 * (i + 1)));
        if (paymentType === "full") tempDate.setFullYear(tempDate.getFullYear() + 1);
        
        const subscription_end_date = `${String(tempDate.getDate()).padStart(2, '0')}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${tempDate.getFullYear()}`;
        installmentArr.push({
          status: "Not Paid",
          sub_total: subTotalPerInstallment,
          tax: taxPerInstallment,
          order_total_amount: totalPerInstallment,
          subscription_end_date
        });
      }

      payment_split.push({
        name: paymentType,
        installments: installmentArr
      });
    } else {
      const nextUnpaidCycleIndex = payment_split.findIndex(cycle =>
        cycle.installments.some((inst: any) => inst.status === "Not Paid")
      );
      if (nextUnpaidCycleIndex === -1) {
        this.loaderService.emitComplete();
        return false;
      }
      paymentType = payment_split[nextUnpaidCycleIndex].name;
    }

    let nextUnpaid;
    for (let cycle of payment_split) {
      nextUnpaid = cycle.installments.find((inst: any) => inst.status === "Not Paid");
      if (nextUnpaid) break;
    }

    if (!nextUnpaid) {
      this.loaderService.emitComplete();
      return false;
    }

    const installmentTotal = Number(nextUnpaid.order_total_amount || 0);
    const hasCustomAmount = customAmount !== null && customAmount !== undefined && !Number.isNaN(Number(customAmount)) && Number(customAmount) > 0;
    const payableTotal = hasCustomAmount ? Number(Number(customAmount).toFixed(2)) : Number(installmentTotal.toFixed(2));
    let payableSubTotal = Number(Number(nextUnpaid.sub_total || 0).toFixed(2));
    let payableTax = Number(Number(nextUnpaid.tax || 0).toFixed(2));
    if (hasCustomAmount && installmentTotal > 0) {
      const ratio = payableTotal / installmentTotal;
      payableSubTotal = Number((Number(nextUnpaid.sub_total || 0) * ratio).toFixed(2));
      payableTax = Number((payableTotal - payableSubTotal).toFixed(2));
    } else if (hasCustomAmount) {
      payableSubTotal = payableTotal;
      payableTax = 0;
    }

    const order_review = {
      order_summary: {
        sub_total: payableSubTotal,
        tax: payableTax,
        order_total_amount: payableTotal
      }
    };

    // Scheduled quarterly/half-yearly installments keep their own end dates (old flow).
    // Only custom free-amount payments extend coverage via RoomPricing per-day.
    let subscriptionEndDate = nextUnpaid.subscription_end_date;
    if (hasCustomAmount) {
      try {
        const roomPricing = await this.getRoomPricing();
        const perDay = this.getPerDayCost(customerData, roomPricing);
        const baseEnd = orderdata?.subscription_end_date || nextUnpaid.subscription_end_date;
        const extended = this.extendSubscriptionEndDate(baseEnd, payableTotal, perDay);
        if (extended) {
          subscriptionEndDate = extended;
        }
      } catch (err) {
        console.error('Failed to calculate RoomPricing-based subscription end date', err);
      }
    }

    return this.createOrderAndRedirect(customerData, {
      paymentType,
      payment_split,
      order_review,
      subscriptionEndDate,
      payableTotal
    });
  }

  // ---------------------------------------------------------------------------
  // Subscription payment plan (registration popup flow)
  // Annual price = per-room monthly final price (incl. GST) x number_of_rooms x 12.
  // Quarterly = annual / 4, Half-yearly = annual / 2.
  // ---------------------------------------------------------------------------

  /** Orders with status "Order Confirmed" for this customer (:9475/order/getbyid). */
  getConfirmedOrders(customerId: number): Promise<any[]> {
    const req = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_id: Number(customerId),
          status: 'Order Confirmed'
        }
      },
      pagination: false,
      sorting: true,
      sortingDetails: { sortfield: '', sortorder: -1 }
    };
    return new Promise((resolve, reject) => {
      this.hotelenrollmenttabviewService.orderDetailsGetById(req).subscribe({
        next: (res: any) => resolve(res?.result?.data || []),
        error: (err: any) => reject(err)
      });
    });
  }

  /** True while the free period set by the superadmin (Free plan) is running; payment is off. */
  isFreePeriodActive(customerData: any): boolean {
    const end = this.parseSubscriptionDate(customerData?.payment_plan?.free_period?.end_date);
    if (!end) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today;
  }

  /**
   * Remembers the end date of an activated Free plan, next to the stored Status, for the
   * sidebar and route checks. Call it wherever the customer is loaded.
   */
  syncFreePlanAccess(customerData: any): void {
    if (customerData?.payment_plan?.selected_plan === 'free' && this.isFreePeriodActive(customerData)) {
      this.localService.set('FreePlanEnd', customerData.payment_plan.free_period.end_date);
    } else {
      this.localService.remove('FreePlanEnd');
    }
  }

  /** True while an activated Free plan is running: the full menu opens without approval. */
  hasFreePlanAccess(): boolean {
    const end = this.parseSubscriptionDate(this.localService.get('FreePlanEnd'));
    if (!end) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today;
  }

  /** True when payment_plan.payment_subscription_end_date is before today. */
  isSubscriptionExpired(customerData: any): boolean {
    if (this.isFreePeriodActive(customerData)) {
      return false;
    }
    const end = this.parseSubscriptionDate(customerData?.payment_plan?.payment_subscription_end_date);
    if (!end) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  }

  private round2(value: number): number {
    return Number((Number(value) || 0).toFixed(2));
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  /** Start date for a new payment: the current end date if still running, otherwise today. */
  getPlanStartDate(customerData: any): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentEnd = this.parseSubscriptionDate(customerData?.payment_plan?.payment_subscription_end_date);
    return currentEnd && currentEnd >= today ? currentEnd : today;
  }

  /** Builds the payment_plan object from subscription_detail and number_of_rooms. */
  async calculatePaymentPlan(customerData: any): Promise<PaymentPlan> {
    const sub = await this.getActiveSubscription(customerData);
    const rooms = Math.max(Number(customerData?.property_details?.property_address?.number_of_rooms || 0), 1);
    const gstPercent = 18;

    const perRoomCost = Number(sub?.perRoomCost ?? sub?.price ?? 0);
    const discountType = String(sub?.discountType || '').toLowerCase();
    const discountValue = Number(sub?.discountValue || 0);

    let discountedPerRoom: number;
    if (perRoomCost > 0) {
      discountedPerRoom = perRoomCost;
      if (discountType === 'percentage') {
        discountedPerRoom = perRoomCost - (perRoomCost * discountValue / 100);
      } else if (discountType === 'flat') {
        discountedPerRoom = perRoomCost - discountValue;
      }
    } else {
      // Only finalPrice (incl. GST) is known
      discountedPerRoom = Number(sub?.finalPrice || 0) / (1 + gstPercent / 100);
    }
    discountedPerRoom = Math.max(0, this.round2(discountedPerRoom));
    const perRoomGst = this.round2(discountedPerRoom * gstPercent / 100);
    const perRoomFinal = this.round2(discountedPerRoom + perRoomGst);

    const annualSubTotal = this.round2(discountedPerRoom * rooms * 12);
    const annualTax = this.round2(annualSubTotal * gstPercent / 100);
    const annualAmount = this.round2(annualSubTotal + annualTax);

    // years = length of the plan; installments = payments spread over that length
    const option = (key: PlanKey, label: string, installments: number, years = 1): PlanOption => ({
      key,
      label,
      installments,
      months: (12 * years) / installments,
      sub_total: this.round2((annualSubTotal * years) / installments),
      tax: this.round2((annualTax * years) / installments),
      amount: this.round2((annualAmount * years) / installments)
    });

    return {
      plan_basis: 'monthly_per_room',
      subscription_name: sub?.name || '',
      number_of_rooms: rooms,
      per_room_cost: perRoomCost,
      discount_type: discountType,
      discount_value: discountValue,
      gst_percent: gstPercent,
      per_room_final_price: perRoomFinal,
      annual_sub_total: annualSubTotal,
      annual_tax: annualTax,
      annual_amount: annualAmount,
      per_day_cost: annualAmount > 0 ? Number((annualAmount / 365).toFixed(4)) : 0,
      plans: {
        quarterly: option('quarterly', 'Quarterly', 4),
        half_yearly: option('half_yearly', 'Half-yearly', 2),
        annual: option('annual', 'Annual', 1)
      },
      payment_subscription_end_date: customerData?.payment_plan?.payment_subscription_end_date || ''
    };
  }

  /** Installment rows (amount + end date) for a plan, starting from startDate. */
  getPlanInstallments(plan: PaymentPlan, key: PlanKey, startDate: Date): any[] {
    const opt = plan.plans[key];
    const rows = [];
    for (let i = 0; i < opt.installments; i++) {
      rows.push({
        installmentNo: i + 1,
        status: 'Not Paid',
        sub_total: opt.sub_total,
        tax: opt.tax,
        order_total_amount: opt.amount,
        subscription_end_date: this.formatSubscriptionDate(this.addMonths(startDate, opt.months * (i + 1)))
      });
    }
    return rows;
  }

  /**
   * Custom amount → days covered at the per-day rate, the resulting end date,
   * the biggest plan the amount reaches, and the remaining amount up to the annual price.
   */
  getCustomCoverage(plan: PaymentPlan, amount: number, startDate: Date): CustomCoverage {
    const paid = this.round2(amount);
    const days = this.getDaysCoveredByAmount(paid, plan.per_day_cost);
    const end = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    end.setDate(end.getDate() + days);

    let matchedPlan: PlanKey | null = null;
    if (paid >= plan.plans.annual.amount) matchedPlan = 'annual';
    else if (paid >= plan.plans.half_yearly.amount) matchedPlan = 'half_yearly';
    else if (paid >= plan.plans.quarterly.amount) matchedPlan = 'quarterly';

    return {
      amount: paid,
      covered_days: days,
      end_date: days > 0 ? this.formatSubscriptionDate(end) : '',
      matched_plan: matchedPlan,
      remaining_amount: Math.max(0, this.round2(plan.annual_amount - paid))
    };
  }

  /**
   * Saves the pending choice on the customer (payment_plan), creates the order
   * and redirects to the payment gateway. The confirmation page promotes the
   * pending values once payment succeeds.
   */
  async payForPlan(customerData: any, plan: PaymentPlan, selection: { plan: PlanKey } | { customAmount: number }): Promise<boolean> {
    if (this.isFreePeriodActive(customerData)) {
      return false;
    }
    const startDate = this.getPlanStartDate(customerData);
    let paymentType: string;
    let installments: any[];
    let paidAmount: number;
    let endDate: string;
    let coveredDays = 0;

    if ('plan' in selection) {
      paymentType = selection.plan;
      installments = this.getPlanInstallments(plan, selection.plan, startDate);
      paidAmount = installments[0].order_total_amount;
      endDate = installments[0].subscription_end_date;
    } else {
      const coverage = this.getCustomCoverage(plan, selection.customAmount, startDate);
      if (coverage.covered_days <= 0) {
        return false;
      }
      paymentType = 'custom';
      paidAmount = coverage.amount;
      endDate = coverage.end_date;
      coveredDays = coverage.covered_days;
      const subTotal = this.round2(paidAmount / (1 + plan.gst_percent / 100));
      installments = [{
        installmentNo: 1,
        status: 'Not Paid',
        sub_total: subTotal,
        tax: this.round2(paidAmount - subTotal),
        order_total_amount: paidAmount,
        subscription_end_date: endDate
      }];
    }
    installments = installments.map(({ installmentNo, ...rest }) => rest);

    const paymentPlan = {
      ...(customerData?.payment_plan || {}),
      ...plan,
      // Keep the current (still valid or expired) end date until payment is confirmed
      payment_subscription_end_date: customerData?.payment_plan?.payment_subscription_end_date || '',
      pending_plan: paymentType,
      pending_amount: paidAmount,
      pending_covered_days: coveredDays,
      pending_start_date: this.formatSubscriptionDate(startDate),
      pending_subscription_end_date: endDate,
      pending_remaining_amount: Math.max(0, this.round2(plan.annual_amount - paidAmount)),
      status: 'Awaiting Payment',
      updated_on: new Date().toISOString()
    };

    this.loaderService.emitLoading();
    const saved = await new Promise<boolean>((resolve) => {
      this.hotelenrollmenttabviewService.updateCustomerFcm({
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { id: customerData?.id } },
        payload: { customer_update: { payment_plan: paymentPlan } }
      }).subscribe({
        next: (resp: any) => resolve(resp?.success === 1),
        error: () => resolve(false)
      });
    });
    if (!saved) {
      this.loaderService.emitComplete();
      return false;
    }

    return this.createOrderAndRedirect(customerData, {
      paymentType,
      payment_split: [{ name: paymentType, installments }],
      order_review: {
        order_summary: {
          sub_total: installments[0].sub_total,
          tax: installments[0].tax,
          order_total_amount: paidAmount
        }
      },
      subscriptionEndDate: endDate,
      payableTotal: paidAmount,
      // choosen_plan_type: quarterly | half_yearly | annual | custom
      extra: { payment_plan: paymentPlan, choosen_plan_type: paymentType, order_type: 'subscription' }
    });
  }

  /**
   * Free plan: no gateway. Records the free period on the customer and creates a ₹0
   * confirmed order, so the rest of the app treats registration as complete and the
   * payment popup returns when the period ends. The caller shows the confirmation page.
   */
  async activateFreePlan(customerData: any): Promise<boolean> {
    if (!this.isFreePeriodActive(customerData)) {
      return false;
    }
    const { start_date, end_date } = customerData.payment_plan.free_period;
    const paidAt = new Date().toISOString();

    this.loaderService.emitLoading();
    const saved = await new Promise<boolean>((resolve) => {
      this.hotelenrollmenttabviewService.updateCustomerFcm({
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { id: customerData.id } },
        payload: {
          customer_update: {
            subscription_end_date: end_date,
            payment_plan: {
              ...customerData.payment_plan,
              selected_plan: 'free',
              paid_amount: 0,
              payment_start_date: start_date,
              payment_subscription_end_date: end_date,
              status: 'Free'
            }
          }
        }
      }).subscribe({
        next: (resp: any) => resolve(resp?.success === 1),
        error: () => resolve(false)
      });
    });
    if (!saved) {
      this.loaderService.emitComplete();
      return false;
    }

    const base = this.buildOrderData(customerData, {
      paymentType: 'free',
      payment_split: [{
        name: 'free',
        installments: [{
          status: 'Paid',
          sub_total: 0,
          tax: 0,
          order_total_amount: 0,
          subscription_end_date: end_date,
          paid_date_time: paidAt
        }]
      }],
      order_review: { order_summary: { sub_total: 0, tax: 0, order_total_amount: 0 } },
      subscriptionEndDate: end_date,
      payableTotal: 0,
      extra: { choosen_plan_type: 'free', order_type: 'subscription' }
    });
    const orderData = {
      ...base,
      status: 'Order Confirmed',
      status_id: '3',
      system_label: 'Confirmed',
      payment_status: 'Paid',
      payment: { ...base.payment, payment_date: paidAt, payment_status: 'Paid' }
    };

    const created = await new Promise<boolean>((resolve) => {
      this.hotelenrollmenttabviewService.orderUpsert({
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        payload: { order_creation: orderData },
        extras: { find: { id: '' } }
      }).subscribe({
        next: (resp: any) => resolve(!!resp?.success),
        error: () => resolve(false)
      });
    });
    this.loaderService.emitComplete();
    if (created) {
      this.localService.set('FreePlanEnd', end_date);
    }
    return created;
  }

  /** Order document shared by paid and free orders. */
  private buildOrderData(customerData: any, opts: OrderOptions): any {
    const { paymentType, payment_split, order_review, subscriptionEndDate } = opts;
    const isIndia = customerData?.property_details?.property_address?.property_country === 'India';
    const taxInfo = isIndia
      ? { gst_number: customerData?.property_details?.property_address?.property_gst || "" }
      : { vat_number: customerData?.property_details?.property_address?.property_vat || "" };

    return {
      customer_id: customerData?.id,
      status: "Awaiting Payment",
      status_id: "1",
      system_label: "Pending",
      orderConfirmDate: new Date(),
      subscription_end_date: subscriptionEndDate,
      customer: {
        customer_id: customerData?.id,
        customer_name: customerData?.first_name,
        email: customerData?.email,
        customer_type: "business customer",
        phone_number: customerData?.phone_number,
        address: customerData?.property_details?.property_address?.property_address,
        brand: customerData?.property_details?.contact_details?.brand,
        hotel_name: customerData?.property_details?.contact_details?.hotel_name,
        property_size: customerData?.property_details?.property_address?.property_size,
        number_of_rooms: customerData?.property_details?.property_address?.number_of_rooms,
        is_email_opt_in: false
      },
      "shipping": {
        "shipping_address_count": "",
        "fixed_shippping_price": false,
        "pay_to_logistics": "",
        "free_shipping": false,
        "shipped_date": "",
        "items_total": "",
        "items_shipped": "",
        "items_total_quantity": "",
        "shipping_addresses": [
          {
            "customer_id": customerData?.id,
            "alias": "",
            "first_name": customerData?.first_name,
            ...taxInfo,
            "last_name": "",
            "company_name": "",
            "entire_location": customerData?.email,
            "address1": customerData?.property_details?.property_address?.property_address,
            "landmark": "",
            "city": "",
            "state": "",
            "country": "",
            "country_code": "104",
            "zipcode": "",
            "email": "",
            "phone_number": "",
            "is_preferred_address": false,
            "address_type": "",
            "latitude": "",
            "longitude": ""
          }
        ],
        "delivery_instructions": "",
        "shipping_method": {
          "name": "",
          "delivery_charge": 0,
          "pay_to_logistics": 0,
          "total_shipping_price": 0
        },
        "shipping_carrier": {
          "shipping_carrier_id": "",
          "shipping_carrier_name": "",
          "api_integration_id": "",
          "api_integration_name": ""
        },
        "deliveries": [],
        "geo_info": {},
        "customer_comment": "",
        "notes": ""
      },
      "payment": {
        "status_flow": {
          "name": "Online Payment",
          "title": "Order - Online Payment",
          "statuses": [
            {
              "name": "",
              "title": "",
              "status_id": 1,
              "status_name": "Pending",
              "status_system_label": "Pending",
              "status_custom_label": "Order Placed",
              "process": "Checkout",
              "sequence": 1,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 2,
              "status_name": "Awaiting Payment",
              "status_system_label": "Awaiting Payment",
              "status_custom_label": "Awaiting Payment",
              "process": "Checkout",
              "sequence": 2,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 3,
              "status_name": "Confirmed",
              "status_system_label": "Confirmed",
              "status_custom_label": "Order Confirmed",
              "process": "Checkout",
              "sequence": 3,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": true
            },
            {
              "name": "",
              "title": "",
              "status_id": 4,
              "status_name": "Processing",
              "status_system_label": "Processing",
              "status_custom_label": "Being Prepared",
              "process": "Manual",
              "sequence": 4,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 5,
              "status_name": "Awaiting Shipment",
              "status_system_label": "Awaiting Shipment",
              "status_custom_label": "Ready for Delivery",
              "process": "Manual",
              "sequence": 5,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 6,
              "status_name": "Shipped",
              "status_system_label": "Shipped",
              "status_custom_label": "Out for Delivery",
              "process": "Manual/API",
              "sequence": 6,
              "sms_notification": false,
              "email_notification": false,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 7,
              "status_name": "Delivered",
              "status_system_label": "Delivered",
              "status_custom_label": "Delivered",
              "process": "Manual/API",
              "sequence": 7,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": false
            },
            {
              "name": "",
              "title": "",
              "status_id": 8,
              "status_name": "Cancelled",
              "status_system_label": "Cancelled",
              "status_custom_label": "Cancelled",
              "process": "Manual/API",
              "sequence": 8,
              "sms_notification": true,
              "email_notification": true,
              "push_notification": false
            }
          ]
        },
        "payment_date": "",
        "payment_reference_no": "",
        "payment_status": ""
      },
      "delivery": {
        "outlet_id": "1",
        "outlet_name": "guest ezee",
        "email": customerData?.property_details?.contact_details?.email,
        "phone_number": customerData?.property_details?.contact_details?.primary_phone_number,
        "address": customerData?.property_details?.property_address?.property_address,
        "is_email_opt_in": false
      },
      payment_type: paymentType,
      payment_split,
      order_review,
      customer_member_id: customerData?.customer_member_id,
      organization_id: 46,
      store_id: 1,
      created_by: this.localService.get('UserId'),
      is_deleted: false,
      is_active: true,
      modified_by: 16,
      is_registration: true,
      send_sms: true,
      ...(opts.extra || {})
    };
  }

  /** Creates the order and posts the HDFC/CCAvenue form. Shared by payNow and payForPlan. */
  private createOrderAndRedirect(customerData: any, opts: OrderOptions): Promise<boolean> {
    const { payableTotal } = opts;
    const orderData = this.buildOrderData(customerData, opts);

    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { order_creation: orderData },
      extras: { find: { id: "" } }
    };

    return new Promise((resolve) => {
      this.hotelenrollmenttabviewService.orderUpsert(requestData).subscribe({
        next: (resp: any) => {
          if (!resp.success) {
            this.loaderService.emitComplete();
            console.error("Order creation failed");
            resolve(false);
            return;
          }
          const upsertData = resp.result.data;
          const orderId = String(upsertData?.[0]?.id ?? '').split('-')[0];
          const hdfcData = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            oid: orderId,
            customer_id: customerData?.id,
            amount: payableTotal
          };
          console.log('Order Id:', orderId);
          this.checkoutApiService.getHDFClink(hdfcData).then(responseData3 => {
            this.loaderService.emitComplete();
            const respData3: any = responseData3;
            console.log('Access Code:', respData3?.access_code);
            console.log('Working Key:', respData3?.working_key || respData3?.workingKey);
            console.log('Order Id:', orderId);
            if (!respData3) {
              console.error("Payment link generation failed");
              resolve(false);
              return;
            }
            const form = document.createElement("form");
            form.method = "POST";
            form.action = respData3.payment_url;
            form.target = "_self";
            const input1 = document.createElement("input");
            input1.name = "encRequest";
            input1.value = respData3.enc_request;
            form.appendChild(input1);
            const input2 = document.createElement("input");
            input2.name = "access_code";
            input2.value = respData3.access_code;
            form.appendChild(input2);
            document.body.appendChild(form);
            form.submit();
            resolve(true);
          });
        },
        error: (err: any) => {
          this.loaderService.emitComplete();
          console.error("Order upsert failed:", err);
          resolve(false);
        }
      });
    });
  }
}
