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
    private sharedService: SharedDataService
  ) { }

  ngOnInit(): void {
    this.getOrderDetails();
  }

  getOrderDetails() {
    var requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": {
          customer_id: (this.hotelId)
        },
        "pagination": false,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 10
        },
        "sorting": true,
        "sortingDetails": {
          "email": -1
        }
      }
    }
    this.paymentDetailsService.orderDetailsGetById(requestData).subscribe(
      resp => {
        if (resp) {
          // get the first confirmed order only
          this.orderData = resp.result.data.find((order: any) => order.status === "Order Confirmed" || "Confirmed");
          // extract only paid installments with their payment_split name
          if (this.orderData?.payment_split) {
            this.paidInstallments = this.orderData.payment_split.flatMap((split: any) =>
              split.installments
                .filter((inst: any) => inst.status === "Paid") // only Paid
                .map((inst: any) => ({
                  ...inst,
                  name: split.name // attach payment_split name
                }))
            );
          } else {
            this.paidInstallments = [];
          }
        }
      },
      err => {
        console.error("Error fetching order details", err);
      }
    )
  }

  downloadInvoice(id: number) {
    window.open("https://www.guestezee.com:5520/api/Email/DownloadEnrollmentInvoicePdf?domain_name=" + this.authTokenService.getDomain() + "&order_id=" + id + "", '_blank')
  }

}
