import { DOMAIN_NAME, USER_ID } from './../app.config';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertsService } from '../shared/alerts/alerts.service';
import { SharedDataService } from '../shared/shared-data.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { PaymentHelperService } from '../services/payment-helper.service';
import { PaymentDetailsService } from './payment-details.service';
import { AuthTokenService } from '../auth-services/auth-token.service';

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-details.component.html',
  styleUrl: './payment-details.component.scss'
})

export class PaymentDetailsComponent implements OnInit {
  /** One row per Order Confirmed payment */
  paymentRows: any[] = [];
  orderId: number | null = null;
  memberId: string | null = null;
  paying = false;
  isCustomModalOpen = false;
  isSplitModalOpen = false;
  modalTitle = 'Custom';
  customAmount: number | null = null;
  customAmountError = '';

  paidCount = 0;
  totalPaidAmount = 0;
  totalScheduleAmount = 0;
  remainingAmount = 0;
  currentCoverageEnd: string | null = null;
  isSubscriptionExpired = false;
  nextSubscriptionAmount = 0;
  perDayCost = 0;

  /** Active quarterly / half-yearly schedule (old installment flow) */
  isInstallmentPlan = false;
  paymentTypeName = '';
  installmentText = '';
  nextInstallmentAmount = 0;
  remainingSplits: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authTokenService: AuthTokenService,
    private alertService: AlertsService,
    private paymentDetailsService: PaymentDetailsService,
    private sharedService: SharedDataService,
    private localStorageService: LocalStorageService,
    private paymentHelperService: PaymentHelperService
  ) { }

  ngOnInit(): void {
    this.memberId = this.localStorageService.get('MemberId');
    if (this.memberId && this.memberId !== 'undefined' && this.memberId !== 'null') {
      this.getOrderDetails();
    }
  }

  private toCents(value: any): number {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return 0;
    }
    return Math.round((amount + Number.EPSILON) * 100);
  }

  private fromCents(cents: number): number {
    return Number((Math.max(0, cents) / 100).toFixed(2));
  }

  private isConfirmedOrder(order: any): boolean {
    const status = String(order?.status || '');
    return status === 'Order Confirmed' || status === 'Confirmed';
  }

  private getOrderSummary(order: any) {
    const summary = order?.order_review?.order_summary || {};
    return {
      sub_total: Number(summary.sub_total || 0),
      tax: Number(summary.tax || 0),
      order_total_amount: Number(summary.order_total_amount || 0)
    };
  }

  private getPaidDate(order: any): string | null {
    return order?.payment?.payment_date || order?.orderConfirmDate || order?.modified_on || order?.created_on || null;
  }

  private capitalizeFirstLetter(value: string): string {
    if (!value) {
      return '';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private normalizePlanName(name: any): string {
    return String(name || '').toLowerCase().replace(/\s+/g, '-');
  }

  private isSplitPlan(name: any): boolean {
    const n = this.normalizePlanName(name);
    return n === 'quarterly' || n === 'half-yearly' || n === 'halfyearly';
  }

  /**
   * From the latest order with payment_split, detect unpaid quarterly/half-yearly installments
   * and build header-style installment label + remaining split rows.
   */
  private applyInstallmentPlan(confirmedOrders: any[]): void {
    this.isInstallmentPlan = false;
    this.paymentTypeName = '';
    this.installmentText = '';
    this.nextInstallmentAmount = 0;
    this.remainingSplits = [];

    const withSplit = [...confirmedOrders]
      .reverse()
      .find(order => Array.isArray(order?.payment_split) && order.payment_split.length);
    if (!withSplit) {
      return;
    }

    const cycles: any[] = withSplit.payment_split || [];
    const nextCycleIndex = cycles.findIndex(cycle =>
      (cycle?.installments || []).some((inst: any) => inst.status === 'Not Paid')
    );
    if (nextCycleIndex === -1) {
      return;
    }

    const cycle = cycles[nextCycleIndex];
    if (!this.isSplitPlan(cycle?.name)) {
      return;
    }

    const installments: any[] = cycle.installments || [];
    const nextUnpaidIndex = installments.findIndex((inst: any) => inst.status === 'Not Paid');
    if (nextUnpaidIndex === -1) {
      return;
    }

    const nextUnpaid = installments[nextUnpaidIndex];
    this.isInstallmentPlan = true;
    this.paymentTypeName = this.capitalizeFirstLetter(String(cycle.name || 'Installment'));
    this.installmentText =
      `${this.paymentTypeName} - Installment ${nextUnpaidIndex + 1} of ${installments.length}`;
    this.nextInstallmentAmount = Number(nextUnpaid?.order_total_amount || 0);
    this.remainingSplits = installments
      .map((inst: any, index: number) => ({
        installmentNo: index + 1,
        status: inst.status || 'Not Paid',
        isPaid: String(inst.status || '') === 'Paid',
        isNext: index === nextUnpaidIndex,
        sub_total: Number(inst.sub_total || 0),
        tax: Number(inst.tax || 0),
        order_total_amount: Number(inst.order_total_amount || 0),
        subscription_end_date: inst.subscription_end_date || '-',
        paid_date_time: inst.paid_date_time || null
      }))
      .filter((row: any) => !row.isPaid);
  }

  /** Original equal installment schedule used to compute remaining balance. */
  private getScheduleTotal(confirmedOrders: any[]): number {
    const withSplit = confirmedOrders.filter(order => order?.payment_split?.length);
    if (!withSplit.length) {
      return 0;
    }

    const scored = withSplit.map(order => {
      const installments = (order.payment_split || []).flatMap((cycle: any) => cycle?.installments || []);
      const totals = installments.map((inst: any) => this.toCents(inst.order_total_amount));
      const first = totals[0] || 0;
      const allEqual = totals.length > 0 && totals.every((total: number) => total === first);
      const sum = totals.reduce((acc: number, value: number) => acc + value, 0);
      return { allEqual, sum, count: installments.length };
    });

    const original = scored.find(item => item.allEqual) || scored[0];
    return this.fromCents(original?.sum || 0);
  }

  /** Show each confirmed order's stored subscription_end_date (do not recalculate in the list). */
  private buildPaymentRows(confirmedOrders: any[], customerData: any, roomPricing: any): any[] {
    this.perDayCost = this.paymentHelperService.getPerDayCost(customerData, roomPricing);

    return confirmedOrders.map((order: any, index: number) => {
      const summary = this.getOrderSummary(order);
      return {
        paymentNo: index + 1,
        orderId: order.id,
        status: 'Paid',
        isPaid: true,
        isFirstPayment: index === 0,
        sub_total: summary.sub_total,
        tax: summary.tax,
        order_total_amount: summary.order_total_amount,
        subscription_end_date: order.subscription_end_date || '',
        paid_date_time: this.getPaidDate(order),
        invoice_no: order.invoice_no || null
      };
    });
  }

  private finalizeOrderState(confirmedOrders: any[], customerData?: any, roomPricing?: any): void {
    this.orderId = confirmedOrders[confirmedOrders.length - 1]?.id ?? null;
    this.totalScheduleAmount = this.getScheduleTotal(confirmedOrders);

    if (customerData && roomPricing) {
      this.nextSubscriptionAmount = this.paymentHelperService.getNextSubscriptionAmount(
        customerData,
        roomPricing,
        4
      );
      this.paymentRows = this.buildPaymentRows(confirmedOrders, customerData, roomPricing);
    } else {
      this.paymentRows = confirmedOrders.map((order: any, index: number) => {
        const summary = this.getOrderSummary(order);
        return {
          paymentNo: index + 1,
          orderId: order.id,
          status: 'Paid',
          isPaid: true,
          isFirstPayment: index === 0,
          sub_total: summary.sub_total,
          tax: summary.tax,
          order_total_amount: summary.order_total_amount,
          subscription_end_date: order.subscription_end_date || '',
          paid_date_time: this.getPaidDate(order)
        };
      });
    }

    this.paidCount = this.paymentRows.length;
    this.totalPaidAmount = this.fromCents(
      this.paymentRows.reduce((sum, row) => sum + this.toCents(row.order_total_amount), 0)
    );
    this.remainingAmount = this.fromCents(
      this.toCents(this.totalScheduleAmount) - this.toCents(this.totalPaidAmount)
    );
    this.currentCoverageEnd = this.paymentRows.length
      ? this.paymentRows[this.paymentRows.length - 1].subscription_end_date
      : null;

    const endDate = this.paymentHelperService.parseSubscriptionDate(this.currentCoverageEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (endDate) {
      endDate.setHours(0, 0, 0, 0);
    }
    this.isSubscriptionExpired = !!(endDate && today > endDate);
    this.applyInstallmentPlan(confirmedOrders);
  }

  async getOrderDetails() {
    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: {
          customer_member_id: this.memberId
        },
        pagination: false,
        paginationDetails: {
          limit: 0,
          pageSize: 10
        },
        sorting: true,
        sortingDetails: { email: -1 }
      }
    };

    try {
      const [customerData, roomPricing] = await Promise.all([
        this.paymentHelperService.getCustomerByMemberId(this.memberId as string),
        this.paymentHelperService.getRoomPricing()
      ]);

      this.paymentDetailsService.orderDetailsGetById(requestData).subscribe(
        (resp: any) => {
          const confirmedOrders = (resp?.result?.data || [])
            .filter((order: any) => this.isConfirmedOrder(order))
            .sort((a: any, b: any) => Number(a.id) - Number(b.id));
          this.finalizeOrderState(confirmedOrders, customerData, roomPricing);
        },
        (err) => {
          console.error('Error fetching order details', err);
          this.paymentRows = [];
          this.paidCount = 0;
          this.totalPaidAmount = 0;
          this.remainingAmount = 0;
          this.isSubscriptionExpired = false;
          this.isInstallmentPlan = false;
        }
      );
    } catch (err) {
      console.error('Error loading RoomPricing / customer for payment details', err);
      this.paymentDetailsService.orderDetailsGetById(requestData).subscribe((resp: any) => {
        const confirmedOrders = (resp?.result?.data || [])
          .filter((order: any) => this.isConfirmedOrder(order))
          .sort((a: any, b: any) => Number(a.id) - Number(b.id));
        this.finalizeOrderState(confirmedOrders);
      });
    }
  }

  get payableAmount(): number {
    if (this.isInstallmentPlan) {
      return this.nextInstallmentAmount > 0 ? this.nextInstallmentAmount : 0;
    }
    return this.remainingAmount > 0 ? this.remainingAmount : 0;
  }

  get payButtonLabel(): string {
    // Due date exceeded → red button (via pay-button-overdue) with Pay Now / installment label
    // Coverage still active → "Pay in Advance"
    if (!this.isSubscriptionExpired) {
      return 'Pay in Advance';
    }
    if (this.isInstallmentPlan && this.installmentText) {
      return `${this.installmentText} - Pay`;
    }
    return 'Pay Now';
  }

  get canPayCustomAmount(): boolean {
    if (this.customAmount === null || this.customAmount === undefined || String(this.customAmount) === '') {
      return false;
    }
    const amount = Number(this.customAmount);
    return !Number.isNaN(amount) && amount > 0 && !this.customAmountError;
  }

  /** True when user typed in the custom amount field (disable installment Pay Now). */
  get hasCustomAmountInput(): boolean {
    return this.customAmount !== null
      && this.customAmount !== undefined
      && String(this.customAmount).trim() !== '';
  }

  openPayModal() {
    if (this.isInstallmentPlan) {
      this.customAmount = null;
      this.customAmountError = '';
      this.isSplitModalOpen = true;
      return;
    }
    this.modalTitle = this.isSubscriptionExpired ? 'Pay Now' : 'Pay in Advance';
    this.customAmount = this.payableAmount > 0 ? Number(this.payableAmount.toFixed(2)) : null;
    this.customAmountError = '';
    this.isCustomModalOpen = true;
  }

  closeSplitModal() {
    this.isSplitModalOpen = false;
    this.customAmount = null;
    this.customAmountError = '';
  }

  openCustomModal() {
    this.modalTitle = 'Custom Payment';
    this.customAmount = null;
    this.customAmountError = '';
    this.isCustomModalOpen = true;
  }

  /** Opens free-amount payment so user can pay any amount they enter. */
  openCustomPayment() {
    if (this.paying) {
      return;
    }
    this.isSplitModalOpen = false;
    this.openCustomModal();
  }

  closeCustomModal() {
    this.isCustomModalOpen = false;
    this.customAmountError = '';
  }

  validateCustomAmount() {
    if (this.customAmount === null || this.customAmount === undefined || String(this.customAmount) === '') {
      this.customAmountError = '';
      return;
    }
    const amount = Number(this.customAmount);
    if (Number.isNaN(amount)) {
      this.customAmountError = 'Enter a valid amount';
      return;
    }
    if (amount < 0) {
      this.customAmount = 0;
      this.customAmountError = 'Amount cannot be negative';
      return;
    }
    this.customAmountError = '';
  }

  onCustomAmountChange(value: number | null) {
    this.customAmount = value;
    this.validateCustomAmount();
  }

  blockInvalidAmountKeys(event: KeyboardEvent) {
    if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  /** Old flow: pay next unpaid installment amount from payment_split (no custom amount). */
  async payNextInstallment() {
    if (this.paying || !this.memberId || !this.isInstallmentPlan) {
      return;
    }
    this.paying = true;
    try {
      const started = await this.paymentHelperService.startPayment(this.memberId);
      if (!started) {
        this.alertService.error('Unable to open the payment page. Please try again.');
      } else {
        this.closeSplitModal();
      }
    } catch (err) {
      console.error('Installment payment failed', err);
      this.alertService.error('Unable to start payment. Please try again.');
    } finally {
      this.paying = false;
    }
  }

  async payCustomAmount() {
    this.validateCustomAmount();
    const amount = Number(this.customAmount);
    if (
      this.paying ||
      !this.memberId ||
      this.customAmount === null ||
      this.customAmount === undefined ||
      String(this.customAmount) === '' ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      !!this.customAmountError
    ) {
      if (!this.customAmountError && (this.customAmount === null || String(this.customAmount) === '')) {
        this.customAmountError = 'Enter a valid amount';
      }
      return;
    }

    this.paying = true;
    try {
      const started = await this.paymentHelperService.startPayment(this.memberId, amount);
      if (!started) {
        this.alertService.error('Unable to open the payment page. Please try again.');
      } else {
        this.closeCustomModal();
        this.closeSplitModal();
      }
    } catch (err) {
      console.error('Custom payment failed', err);
      this.alertService.error('Unable to start payment. Please try again.');
    } finally {
      this.paying = false;
    }
  }

  downloadInvoice(id: number) {
    window.open(`https://www.guestezee.com:8010/attachments/invoice?domain_name=https://www.guestezee.com&order_id=${id}`, '_blank');
  }

}
