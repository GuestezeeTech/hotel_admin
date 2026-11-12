/** GST used when neither the customer's plan nor the subscription plan has gst_percentage. */
export const DEFAULT_GST_PERCENTAGE = 18;

/**
 * GST percentage set by the superadmin on the plan (gst_percentage). Takes the first
 * source that has a valid value, e.g. the customer's saved plan, then the plan itself.
 */
export function gstPercentageOf(...sources: any[]): number {
  for (const source of sources) {
    const raw = source?.gst_percentage;
    if (raw === null || raw === undefined || raw === '') {
      continue;
    }
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return value;
    }
  }
  return DEFAULT_GST_PERCENTAGE;
}

/** Default when neither the customer's plan nor the plan has currency_type. */
export const DEFAULT_CURRENCY_CODE = 'USD';

const CURRENCY_CODES: Record<string, string> = {
  dollar: 'USD', dollars: 'USD', usd: 'USD', $: 'USD', 'us$': 'USD',
  rupee: 'INR', rupees: 'INR', inr: 'INR', rs: 'INR', '₹': 'INR',
  euro: 'EUR', euros: 'EUR', eur: 'EUR', '€': 'EUR',
  pound: 'GBP', pounds: 'GBP', gbp: 'GBP', '£': 'GBP',
  dirham: 'AED', aed: 'AED'
};

/**
 * ISO code (for Angular's currency pipe) from the superadmin's currency_type
 * ("dollar", "$", "USD", "rupee", ...). Takes the first source that has one.
 */
export function currencyCodeOf(...sources: any[]): string {
  for (const source of sources) {
    const raw = String(source?.currency_type ?? '').trim().toLowerCase().replace(/\.$/, '');
    if (!raw) {
      continue;
    }
    if (CURRENCY_CODES[raw]) {
      return CURRENCY_CODES[raw];
    }
    if (/^[a-z]{3}$/.test(raw)) {
      return raw.toUpperCase();
    }
  }
  return DEFAULT_CURRENCY_CODE;
}

/** Short symbol for a currency code: USD -> "$", INR -> "₹". */
export function currencySymbolFor(code: string): string {
  const symbols: Record<string, string> = { USD: '$', INR: '₹', EUR: '€', GBP: '£', AED: 'AED ' };
  return symbols[code] ?? `${code} `;
}

/** Used when a plan has no inr_per_usd saved yet (set by the superadmin on the plans page). */
export const DEFAULT_INR_PER_USD = 83;

/** Rupees per US dollar from the customer's saved plan or the plan itself. */
export function inrPerUsdOf(...sources: any[]): number {
  for (const source of sources) {
    const value = Number(source?.inr_per_usd);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return DEFAULT_INR_PER_USD;
}

/**
 * Hotel is in India (decides whether CCAvenue is offered).
 * The property country decides; the signup dial code is the fallback.
 */
export function isIndianCustomer(customer: any): boolean {
  const country = String(
    customer?.property_details?.property_address?.property_country ??
    customer?.property_details?.contact_details?.country ?? ''
  ).trim().toLowerCase();
  if (country) {
    return country === 'india';
  }
  const dial = String(
    customer?.property_details?.contact_details?.country_code ?? customer?.country_code ?? ''
  ).replace(/\s/g, '');
  return dial === '+91' || dial === '91';
}

/**
 * Currency every amount is shown and stored in: always USD.
 * CCAvenue (Indian hotels only) converts the USD amount to INR when the payment starts.
 */
export function billingCurrencyOf(_customer?: any): 'INR' | 'USD' {
  return 'USD';
}

/** CCAvenue is offered to hotels in India only; everyone (India included) can pay with Razorpay. */
export function canUseCcavenue(customer: any): boolean {
  return isIndianCustomer(customer);
}

/** Default gateway: CCAvenue for Indian hotels, Razorpay otherwise. */
export function defaultGatewayFor(customer: any): 'ccavenue' | 'razorpay' {
  return canUseCcavenue(customer) ? 'ccavenue' : 'razorpay';
}

/**
 * Amount and currency actually sent to the gateway. Razorpay is charged in USD as shown;
 * CCAvenue only takes INR, so the USD amount is converted at the plan's inr_per_usd.
 */
export function gatewayCharge(
  gateway: string,
  amount: number,
  currency: string | undefined,
  inrPerUsd: number
): { amount: number; currency: string } {
  const code = String(currency || 'USD').toUpperCase();
  if (gateway === 'ccavenue' && code === 'USD') {
    return { amount: Number((Number(amount) * inrPerUsd).toFixed(2)), currency: 'INR' };
  }
  return { amount: Number(Number(amount).toFixed(2)), currency: code };
}

export interface Billing {
  /** Currency the customer pays in (also sent with the order) */
  currency_code: 'INR' | 'USD';
  /** GST charged: the plan's gst_percentage for every country (18% when not set) */
  gst_percent: number;
  /** Multiply plan-currency amounts by this to get billing-currency amounts */
  rate: number;
  /** Currency the plan's prices are entered in */
  plan_currency: string;
  /** Rupees per dollar used for the conversion */
  inr_per_usd: number;
}

/**
 * How a customer is billed for a plan whose prices are in the plan's currency_type.
 * Billing is always USD: a plan priced in INR is converted to USD at inr_per_usd.
 */
export function billingFor(customer: any, ...plans: any[]): Billing {
  const currency = billingCurrencyOf(customer);
  const planCurrency = currencyCodeOf(...plans);
  const inrPerUsd = inrPerUsdOf(...plans);
  let rate = 1;
  if (planCurrency === 'USD' && currency === 'INR') {
    rate = inrPerUsd;
  } else if (planCurrency === 'INR' && currency === 'USD') {
    rate = 1 / inrPerUsd;
  }
  return {
    currency_code: currency,
    gst_percent: gstPercentageOf(...plans),
    rate,
    plan_currency: planCurrency,
    inr_per_usd: inrPerUsd
  };
}
