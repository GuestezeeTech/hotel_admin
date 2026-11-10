import { DOMAIN_NAME, USER_ID } from './../app.config';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { PaymentHelperService, PaymentPlan } from '../services/payment-helper.service';
import { PaymentDetailsService } from './payment-details.service';
import { SubscriptionPaymentPopupComponent } from '../hotel-enrollment-tabview/subscription-payment-popup/subscription-payment-popup.component';

type PaymentTab = 'subscription' | 'app';

/**
 * Payment Details page.
 * - Subscription tab: confirmed orders with order_type = "subscription" (paid from the
 *   subscription popup). Paying again uses the same subscription popup as enrollment.
 * - Payment from App tab: every other confirmed order.
 */
@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [CommonModule, SubscriptionPaymentPopupComponent],
  templateUrl: './payment-details.component.html',
  styleUrl: './payment-details.component.scss'
})
export class PaymentDetailsComponent implements OnInit {
  memberId: string | null = null;
  customerData: any = null;

  activeTab: PaymentTab = 'subscription';
  loading = false;
  loadError = '';

  subscriptionRows: any[] = [];
  appRows: any[] = [];

  showSubscriptionPopup = false;
  /** Amounts worked out from the plan the superadmin saved on the customer */
  planAmounts: PaymentPlan | null = null;

  private readonly planLabels: Record<string, string> = {
    quarterly: 'Quarterly',
    half_yearly: 'Half-yearly',
    annual: 'Annual',
    custom: 'Custom'
  };

  constructor(
    private paymentDetailsService: PaymentDetailsService,
    private localStorageService: LocalStorageService,
    private paymentHelperService: PaymentHelperService
  ) { }

  ngOnInit(): void {
    this.memberId = this.localStorageService.get('MemberId');
    if (this.memberId && this.memberId !== 'undefined' && this.memberId !== 'null') {
      this.loadData();
    }
  }

  // ---- Subscription summary (from customer.payment_plan) ----

  get paymentPlan(): any {
    return this.customerData?.payment_plan || null;
  }

  get validUntil(): string {
    return this.paymentPlan?.payment_subscription_end_date || '';
  }

  get isSubscriptionExpired(): boolean {
    return this.paymentHelperService.isSubscriptionExpired(this.customerData);
  }

  get isFreePeriodActive(): boolean {
    return this.paymentHelperService.isFreePeriodActive(this.customerData);
  }

  get freePeriodEndDate(): string {
    return this.paymentPlan?.free_period?.end_date || '';
  }

  /** The plan the superadmin saved on the customer */
  get subscriptionName(): string {
    return this.customerData?.subscription_detail?.name || '';
  }

  get currentPlanLabel(): string {
    return this.planLabel(this.paymentPlan?.selected_plan);
  }

  get payButtonLabel(): string {
    if (!this.validUntil) return 'Pay Now';
    return this.isSubscriptionExpired ? 'Renew Now' : 'Pay in Advance';
  }

  get appTotalPaid(): number {
    return Number(this.appRows.reduce((sum, row) => sum + Number(row.order_total_amount || 0), 0).toFixed(2));
  }

  planLabel(key: string | null | undefined): string {
    if (!key) return '-';
    return this.planLabels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }

  setTab(tab: PaymentTab): void {
    this.activeTab = tab;
  }

  openSubscriptionPopup(): void {
    if (this.customerData && !this.isFreePeriodActive) {
      this.showSubscriptionPopup = true;
    }
  }

  closeSubscriptionPopup(): void {
    this.showSubscriptionPopup = false;
  }

  // ---- Data ----

  private isConfirmedOrder(order: any): boolean {
    const status = String(order?.status || '');
    return status === 'Order Confirmed' || status === 'Confirmed';
  }

  private getPaidDate(order: any): string | null {
    return order?.payment?.payment_date || order?.orderConfirmDate || order?.modified_on || order?.created_on || null;
  }

  private toRow(order: any, index: number) {
    const summary = order?.order_review?.order_summary || {};
    return {
      paymentNo: index + 1,
      orderId: order.id,
      status: 'Paid',
      plan: order.choosen_plan_type || order.payment_type || '',
      sub_total: Number(summary.sub_total || 0),
      tax: Number(summary.tax || 0),
      order_total_amount: Number(summary.order_total_amount || 0),
      subscription_end_date: order.subscription_end_date || '',
      paid_date_time: this.getPaidDate(order)
    };
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      this.customerData = await this.paymentHelperService.getCustomerByMemberId(this.memberId as string);
    } catch (err) {
      console.error('Error loading customer for payment details', err);
    }

    this.planAmounts = null;
    if (this.customerData && !this.isFreePeriodActive) {
      try {
        this.planAmounts = await this.paymentHelperService.calculatePaymentPlan(this.customerData);
      } catch (err) {
        console.error('Error calculating subscription amounts', err);
      }
    }

    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { customer_member_id: this.memberId },
        pagination: false,
        paginationDetails: { limit: 0, pageSize: 10 },
        sorting: true,
        sortingDetails: { email: -1 }
      }
    };

    this.paymentDetailsService.orderDetailsGetById(requestData).subscribe({
      next: (resp: any) => {
        const confirmed = (resp?.result?.data || [])
          .filter((order: any) => this.isConfirmedOrder(order))
          .sort((a: any, b: any) => Number(a.id) - Number(b.id));
        this.subscriptionRows = confirmed
          .filter((order: any) => order.order_type === 'subscription')
          .map((order: any, i: number) => this.toRow(order, i));
        this.appRows = confirmed
          .filter((order: any) => order.order_type !== 'subscription')
          .map((order: any, i: number) => this.toRow(order, i));
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error fetching order details', err);
        this.subscriptionRows = [];
        this.appRows = [];
        this.loadError = 'Unable to load payments. Please refresh and try again.';
        this.loading = false;
      }
    });
  }

  downloadInvoice(id: number) {
    window.open(`https://www.guestezee.com:8010/attachments/invoice?domain_name=https://www.guestezee.com&order_id=${id}`, '_blank');
  }
}
