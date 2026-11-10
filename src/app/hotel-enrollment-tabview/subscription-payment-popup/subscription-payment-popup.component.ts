import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CustomCoverage,
  PaymentHelperService,
  PaymentPlan,
  PlanKey
} from '../../services/payment-helper.service';

/**
 * Shown after registration approval (register_status = true) when the customer
 * has no "Order Confirmed" order, or when payment_plan.payment_subscription_end_date
 * has passed. The customer must pay before continuing, so it cannot be closed.
 */
@Component({
  selector: 'app-subscription-payment-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription-payment-popup.component.html',
  styleUrl: './subscription-payment-popup.component.scss'
})
export class SubscriptionPaymentPopupComponent implements OnChanges {
  @Input() visible = false;
  @Input() customerdata: any;
  /** true when an earlier subscription has expired (renewal) */
  @Input() isRenewal = false;
  /** Enrollment gate keeps this false (must pay); /payment-details lets the user close it */
  @Input() closable = false;
  @Output() closed = new EventEmitter<void>();

  readonly planKeys: PlanKey[] = ['quarterly', 'half_yearly', 'annual'];

  plan: PaymentPlan | null = null;
  loading = false;
  loadError = '';
  paying = false;
  payError = '';

  selectedPlan: PlanKey = 'quarterly';
  installments: any[] = [];
  startDate = new Date();

  customAmount: number | null = null;
  customError = '';
  coverage: CustomCoverage | null = null;

  constructor(private paymentHelper: PaymentHelperService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] || changes['customerdata']) && this.visible && this.customerdata) {
      this.loadPlan();
    }
  }

  async loadPlan(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      this.plan = await this.paymentHelper.calculatePaymentPlan(this.customerdata);
      this.startDate = this.paymentHelper.getPlanStartDate(this.customerdata);
      if (!this.plan.annual_amount) {
        this.loadError = 'Subscription pricing is not available for this property. Please contact support.';
      }
      this.selectPlan(this.selectedPlan);
      this.onCustomAmountChange(this.customAmount);
    } catch (err) {
      console.error('Failed to calculate payment plan', err);
      this.loadError = 'Unable to load subscription plans. Please refresh and try again.';
    } finally {
      this.loading = false;
    }
  }

  selectPlan(key: PlanKey): void {
    this.selectedPlan = key;
    this.installments = this.plan
      ? this.paymentHelper.getPlanInstallments(this.plan, key, this.startDate)
      : [];
  }

  get nextDue(): number {
    return this.installments[0]?.order_total_amount || 0;
  }

  get hasCustomAmount(): boolean {
    return this.customAmount !== null && String(this.customAmount) !== '';
  }

  get canPayCustom(): boolean {
    return !!this.coverage && this.coverage.covered_days > 0 && !this.customError;
  }

  planLabel(key: PlanKey | null): string {
    return key && this.plan ? this.plan.plans[key].label : '';
  }

  onCustomAmountChange(value: any): void {
    this.customAmount = value === '' || value === null || value === undefined ? null : Number(value);
    this.customError = '';
    this.coverage = null;
    if (!this.hasCustomAmount || !this.plan) {
      return;
    }
    const amount = Number(this.customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.customError = 'Enter an amount greater than 0.';
      return;
    }
    if (amount < this.plan.per_day_cost) {
      this.customError = `Minimum amount is ₹${Math.ceil(this.plan.per_day_cost)} (one day).`;
      return;
    }
    this.coverage = this.paymentHelper.getCustomCoverage(this.plan, amount, this.startDate);
  }

  close(): void {
    if (!this.closable || this.paying) return;
    this.customAmount = null;
    this.coverage = null;
    this.customError = '';
    this.payError = '';
    this.closed.emit();
  }

  blockInvalidAmountKeys(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  async payPlan(): Promise<void> {
    if (!this.plan || this.paying) return;
    await this.pay({ plan: this.selectedPlan });
  }

  async payCustom(): Promise<void> {
    if (!this.plan || this.paying || !this.canPayCustom) return;
    await this.pay({ customAmount: Number(this.customAmount) });
  }

  private async pay(selection: { plan: PlanKey } | { customAmount: number }): Promise<void> {
    this.paying = true;
    this.payError = '';
    try {
      const redirected = await this.paymentHelper.payForPlan(this.customerdata, this.plan!, selection);
      if (!redirected) {
        this.payError = 'Unable to start the payment. Please try again.';
        this.paying = false;
      }
      // On success the browser is redirected to the payment gateway.
    } catch (err) {
      console.error('Payment start failed', err);
      this.payError = 'Unable to start the payment. Please try again.';
      this.paying = false;
    }
  }
}
