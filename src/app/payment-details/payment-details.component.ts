import { DOMAIN_NAME, USER_ID } from './../app.config';
import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentDetailsService } from './payment-details.service';
import { OnInit } from '@angular/core';
import { LoaderService } from '../shared/loader/loader.service';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertsService } from '../shared/alerts/alerts.service';
import { SharedDataService } from '../shared/shared-data.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { LocalStorageService } from '../auth-services/local-storage.service';


@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-details.component.html',
  styleUrl: './payment-details.component.scss'
})

export class PaymentDetailsComponent implements OnInit {
  orderData: any;
  paidInstallments: any;
  customerId: string | null = null;
  hotelId: Number | null = null;
  receivedData: any
  customerdata: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authTokenService: AuthTokenService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private loaderService: LoaderService,
    private alertService: AlertsService,
    private paymentDetailsService: PaymentDetailsService,
    private sharedService: SharedDataService,
    private localStorageService: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.hotelId = Number(this.localStorageService.get('UserId'));
    if (this.hotelId) {
      this.getOrderDetails();
    }
  }

  getOrderDetails() {
    const requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { customer_id: Number(this.hotelId) },
        pagination: false,
        paginationDetails: {
          limit: 0,
          pageSize: 10
        },
        sorting: true,
        sortingDetails: { email: -1 }
      }
    };
    this.paymentDetailsService.orderDetailsGetById(requestData).subscribe(
      (resp: any) => {
        if (resp?.result?.data?.length) {
          // gets all confirmed orders
          const confirmedOrders = resp.result.data.filter(
            (order: any) => order.status === "Order Confirmed"
          );
          console.log("Confirmed Orders:", confirmedOrders);
          // extract only the latest paid installment per order
          this.paidInstallments = confirmedOrders.map((order: any) => {
            let latestPaid: any = null;
            order.payment_split?.forEach((split: any) => {
              split.installments?.forEach((inst: any) => {
                if (inst.status === "Paid") {
                  // picks the latest based on paid_date_time
                  if (!latestPaid || new Date(inst.paid_date_time) > new Date(latestPaid.paid_date_time)) {
                    latestPaid = {
                      status: inst.status,
                      subscription_end_date: inst.subscription_end_date,
                      // order_total_amount: inst.order_total_amount,
                      order_total_amount: order.order_review.order_summary.order_total_amount,
                      paid_date_time: inst.paid_date_time,
                      name: split.name,   // payment_split name
                      orderId: order.id   // attaches order id
                    };
                  }
                }
              });
            });
            return latestPaid; // only one paid installment per order
          }).filter((inst: any) => inst !== null); // remove orders with no paid installments
        } else {
          this.paidInstallments = [];
        }
        console.log("Paid Installments:", this.paidInstallments);
      },
      (err) => {
        console.error("Error fetching order details", err);
      }
    );
  }

  downloadInvoice(id: number) {
    window.open("https://www.guestezee.com:5520/api/Email/DownloadEnrollmentInvoicePdf?domain_name=" + DOMAIN_NAME + "&order_id=" + id + "", '_blank')
  }

}
