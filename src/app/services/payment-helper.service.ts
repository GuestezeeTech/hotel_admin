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

  async payNow(customerData: any, orderdata: any, selectedIndex: number | null): Promise<void> {
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
        return;
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
      return;
    }

    const order_review = {
      order_summary: {
        sub_total: Number(nextUnpaid.sub_total.toFixed(2)),
        tax: Number(nextUnpaid.tax.toFixed(2)),
        order_total_amount: Number(nextUnpaid.order_total_amount.toFixed(2))
      }
    };

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
      subscription_end_date: nextUnpaid.subscription_end_date,
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

    this.hotelenrollmenttabviewService.orderUpsert(requestData).subscribe({
      next: (resp: any) => {
        if (!resp.success) {
          this.loaderService.emitComplete();
          return console.error("Order creation failed");
        }
        const upsertData = resp.result.data;
        const hdfcData = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          oid: upsertData[0].id,
          customer_id: customerData?.id,
          amount: nextUnpaid.order_total_amount
        };
        this.checkoutApiService.getHDFClink(hdfcData).then(responseData3 => {
          this.loaderService.emitComplete();
          let respData3: any = responseData3;
          if (!respData3) return console.error("Payment link generation failed");
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
        });
      },
      error: (err: any) => {
        this.loaderService.emitComplete();
        console.error("Order upsert failed:", err);
      }
    });
  }
}
