import { Injectable } from '@angular/core';
import { HotelEnrollmentTabviewService } from './hotel-enrollment-tabview.service';
import { DOMAIN_NAME, ENDPOINTS } from '../app.config';
import { canUseCcavenue, gatewayCharge, inrPerUsdOf } from '../shared/plan-pricing.util';

export type GatewayKey = 'ccavenue' | 'razorpay';

/** A payment option shown to the hotel (no keys or secrets are kept). */
export interface PaymentGatewayOption {
  key: GatewayKey;
  /** "India" for the CCAvenue setting, "Others" for Razorpay */
  label: string;
  title: string;
  description: string;
  image: string;
  settingId: number | null;
}

declare const Razorpay: any;

const RAZORPAY_CHECKOUT_JS = 'https://checkout.razorpay.com/v1/checkout.js';

@Injectable({
  providedIn: 'root'
})
export class CheckoutApiService {

  commonRequestData = {
    "extras": {
      "find": {
      }
    }
  }

  respObject = {
    success: true,
    data: {},
    message: ""
  }

  /** Why the last startGatewayPayment failed (backend message), for showing to the user */
  lastPaymentError = '';

  constructor(
    public hotelenrollmenttabviewservice: HotelEnrollmentTabviewService,
  ) { }

  checkoutAPICall(endPoint: string, reqData?: any) {
    return new Promise((resolve, reject) => {
      var respObject = {
        success: true,
        data: {},
        message: ""
      }
      this.hotelenrollmenttabviewservice.postApiCall(reqData ? reqData : this.commonRequestData, endPoint).subscribe({
        next: (resp1) => {
          let resp = resp1;
          if (resp.success === 1) {
            respObject.success = true;
            if (resp.result) {
              respObject.data = resp.result.data;
            }
            else {
              respObject = resp;
            }
            if (resp.message) {
              respObject.message = resp.message;
            }
            resolve(respObject);
          }
          else if (resp.success === 0) {
            if (resp.result) {
              if (resp.result.data.deliveryCharge) {
                respObject.success = true;
                if (resp.result) {
                  respObject.data = resp.result.data;
                }
                else {
                  respObject = resp;
                }
                if (resp.message) {
                  respObject.message = resp.message;
                }
                resolve(respObject);
              }
              else {
                respObject.success = false;
                respObject.data = resp;
                if (resp.message) {
                  respObject.message = resp.message;
                }
                resolve(respObject)
              }
            }
            else {
              respObject.success = false;
              respObject.data = resp;
              if (resp.message) {
                respObject.message = resp.message;
              }
              resolve(respObject)
            }
          }
          else {
            respObject.success = false;
            if (resp.message) {
              respObject.message = resp.message;
            }
            else {
              respObject.message = 'Something bad happened; Please try again!';
            }
            resolve(respObject);
          }
        },
        error: (err) => {
          respObject.success = false;
          if (err.error.statusCode === 401) {
            respObject.message = "Your password is invalid. Please try again."
          }
          else if (err.error.statusCode === 500) {
            respObject.message = err.error.message;
          }
          else if (err.error.error) {
            if (err.error.error.message) {
              respObject.message = err.error.error.message
            }
          }
          else {
            respObject.message = 'Something bad happened; Please try again!';
          }
          resolve(respObject);
        }
      })
    })
  }

  getHDFClink(dataObj: any) {
    return new Promise((resolve, reject) => {
      let hdfcData: any = dataObj;
      let requestData = {
        "domain_name": hdfcData.domain_name,
        "user_id": hdfcData.user_id,
        "payload": {
          "payment": {
            "order_id": String(hdfcData.oid).split('-')[0],
            "customer_id": String(hdfcData.customer_id),
            // Razorpay takes the amount as a number; the backend converts it to paise
            "amount": hdfcData.gateway === 'razorpay'
              ? Number(Number(hdfcData.amount).toFixed(2))
              : Number(hdfcData.amount).toFixed(2),
            "gateway": hdfcData.gateway || "ccavenue",
            ...(hdfcData.currency ? { "currency": hdfcData.currency } : {})
          }
        }
      }
      // console.log('Request body of HDFC', requestData);
      this.hotelenrollmenttabviewservice.postApiCall(requestData, ENDPOINTS.HDFC_PAYMENT).subscribe(
        respData => {
          let resp: any = respData
          const wanted = hdfcData.gateway || 'ccavenue';
          if (wanted === 'razorpay') {
            // Payment-Gateway: { success: 1, result: {...} }; Nest: { gateway: 'razorpay', key_id, order_id, ... }
            if (resp?.success === 1 && resp.result) {
              resolve(resp.result);
            } else if (resp?.gateway === 'razorpay' && resp?.key_id) {
              resolve({ ...resp, razorpay_order_id: resp.razorpay_order_id || resp.order_id });
            } else {
              this.lastPaymentError = resp?.message || 'Failed to initiate razorpay payment.';
              console.error(this.lastPaymentError);
              resolve(false);
            }
            return;
          }
          if (resp.success === 1 && resp.result && (resp.result.gateway || 'ccavenue') === wanted) {
            resolve(resp.result)
          } else {
            console.error(resp.message || `Failed to initiate ${wanted} payment.`);
            resolve(false)
          }
        },
        err => {
          resolve(false)
        }
      )
    })
  }
  /**
   * Payment gateways from ecomintegrationsettings (type "Payment"). The enabled setting
   * with country "India" is CCAvenue (HDFC); "Others" always pays with Razorpay.
   * Only display fields are kept: the API also returns gateway keys, which are dropped here.
   */
  async getPaymentGatewayOptions(customer?: any): Promise<PaymentGatewayOption[]> {
    // CCAvenue is for hotels in India only; others see Razorpay alone
    if (customer && !canUseCcavenue(customer)) {
      return [this.razorpayOption()];
    }
    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: 1,
      extras: { find: { type: 'Payment' } }
    };
    const rows = await new Promise<any[]>((resolve) => {
      this.hotelenrollmenttabviewservice.postApiCall(requestData, ENDPOINTS.GET_ALL_API_INT_SETTINGS).subscribe({
        next: (resp: any) => resolve(resp?.success === 1 ? (resp?.result?.data || []) : []),
        error: () => resolve([])
      });
    });
    const india = rows.find((r: any) =>
      String(r?.country || '').trim().toLowerCase() === 'india' && r?.is_enabled !== false && r?.is_deleted !== true);
    const options: PaymentGatewayOption[] = [];
    if (india) {
      options.push({
        key: 'ccavenue',
        label: 'India',
        title: india.title || india.name || 'CCAvenue',
        description: 'Indian cards, UPI, net banking (charged in INR)',
        image: india.image || india.logo || '',
        settingId: india.id ?? null
      });
    }
    options.push(this.razorpayOption());
    return options;
  }

  private razorpayOption(): PaymentGatewayOption {
    return {
      key: 'razorpay',
      label: 'Others',
      title: 'Razorpay',
      description: 'International cards (USD)',
      image: '',
      settingId: null
    };
  }

  /**
   * Hands an order over to the chosen gateway. CCAvenue: posts the encrypted form (as before).
   * Razorpay: the backend creates the Razorpay order (gateway "razorpay"); we open Checkout with
   * its key_id / Razorpay order id and confirm only after /payment/verify succeeds.
   * Resolves false when the payment could not be started.
   */
  async startGatewayPayment(
    order: { oid: any; customer_id: any; amount: number; currency?: string; inrPerUsd?: number },
    gateway: GatewayKey,
    customer?: any
  ): Promise<boolean> {
    this.lastPaymentError = '';
    if (gateway === 'ccavenue' && customer && !canUseCcavenue(customer)) {
      this.lastPaymentError = 'CCAvenue is available for hotels in India only. Please pay with Razorpay.';
      return false;
    }
    // Amounts are in USD; CCAvenue is charged the INR equivalent
    const rate = order.inrPerUsd || inrPerUsdOf(customer?.payment_plan, customer?.subscription_detail);
    const charge = gatewayCharge(gateway, order.amount, order.currency, rate);
    order = { ...order, amount: charge.amount, currency: charge.currency };
    const result: any = await this.getHDFClink({
      domain_name: DOMAIN_NAME,
      user_id: 1,
      oid: order.oid,
      customer_id: order.customer_id,
      amount: order.amount,
      gateway,
      currency: order.currency
    });
    if (!result) {
      return false;
    }
    if (gateway === 'ccavenue') {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = result.payment_url;
      form.target = '_self';
      const encRequest = document.createElement('input');
      encRequest.name = 'encRequest';
      encRequest.value = result.enc_request;
      form.appendChild(encRequest);
      const accessCode = document.createElement('input');
      accessCode.name = 'access_code';
      accessCode.value = result.access_code;
      form.appendChild(accessCode);
      document.body.appendChild(form);
      form.submit();
      return true;
    }
    return this.openRazorpay(result, order, customer);
  }

  private async openRazorpay(
    result: any,
    order: { oid: any; customer_id: any; amount: number; currency?: string },
    customer?: any
  ): Promise<boolean> {
    // Checkout needs the server-created Razorpay order (order_XXXX), never the GuestEzee order id
    const razorpayOrderId = result.razorpay_order_id
      || (String(result.order_id || '').startsWith('order_') ? result.order_id : '');
    const key = result.key_id || result.key;
    if (!key || !razorpayOrderId) {
      console.error('Razorpay order details missing from the payment response');
      return false;
    }
    try {
      await this.loadScript(RAZORPAY_CHECKOUT_JS);
    } catch {
      console.error('Unable to load Razorpay Checkout');
      return false;
    }
    const pageUrl = (page: string, params: Record<string, string> = {}) => new URL(
      `${page}?${new URLSearchParams({ customer_id: String(order.customer_id), order_id: String(order.oid), ...params })}`,
      document.baseURI
    ).href;
    const guestEzeeOrderId = String(order.oid).split('-')[0];
    const options: any = {
      key,
      order_id: razorpayOrderId,
      amount: result.amount, // already in paise from the backend
      currency: result.currency || order.currency || 'INR',
      name: 'GuestEzee',
      description: 'Subscription payment',
      prefill: {
        name: customer?.first_name || '',
        email: customer?.email || '',
        contact: customer?.phone_number ? String(customer.phone_number) : ''
      },
      notes: { order_id: guestEzeeOrderId, customer_id: String(order.customer_id) },
      theme: { color: '#800020' },
      // Closed without paying: no signature exists, so no /verify call
      modal: { ondismiss: () => window.location.assign(pageUrl('cancellation')) },
      // Paid in Checkout: the server checks the signature before the order counts as paid
      handler: async (resp: any) => {
        const verified = await this.verifyRazorpayPayment({
          order_id: guestEzeeOrderId,
          razorpay_order_id: resp?.razorpay_order_id || '',
          razorpay_payment_id: resp?.razorpay_payment_id || '',
          razorpay_signature: resp?.razorpay_signature || ''
        });
        if (verified) {
          window.location.assign(pageUrl('confirmation'));
        } else {
          alert('Payment verification failed');
          window.location.assign(pageUrl('cancellation'));
        }
      }
    };
    const checkout = new Razorpay(options);
    checkout.on('payment.failed', () => window.location.assign(pageUrl('cancellation')));
    checkout.open();
    return true;
  }

  /**
   * POST /payment/verify with the Checkout response. True only when the server says verified
   * (Payment-Gateway: success 1 + result.verified; Nest: verified). Sends both body shapes'
   * fields so either service can read it.
   */
  private verifyRazorpayPayment(payment: {
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<boolean> {
    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: 1,
      payload: { payment },
      ...payment
    };
    return new Promise((resolve) => {
      this.hotelenrollmenttabviewservice.postApiCall(requestData, ENDPOINTS.VERIFY_PAYMENT).subscribe({
        next: (resp: any) => resolve(
          (resp?.success === 1 && resp?.result?.verified === true) || resp?.verified === true
        ),
        error: () => resolve(false)
      });
    });
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof Razorpay !== 'undefined') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }
}


