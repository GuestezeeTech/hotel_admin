import { Injectable } from '@angular/core';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { CheckoutApiService } from '../hotel-enrollment-tabview/checkout.service';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { LoaderService } from '../shared/loader/loader.service';

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
        if (customerSub) {
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

    const isIndia = customerData?.property_details?.property_address?.property_country === 'India';
    const taxInfo = isIndia
      ? { gst_number: customerData?.property_details?.property_address?.property_gst || "" }
      : { vat_number: customerData?.property_details?.property_address?.property_vat || "" };

    const orderData = {
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
      send_sms: true
    };

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
