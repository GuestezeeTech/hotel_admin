import { DOMAIN_NAME, USER_ID } from './../app.config';
import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentDetailsService } from './payment-details.service';
import { OnInit } from '@angular/core';
import { LoaderService } from '../shared/loader/loader.service';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute,Router } from '@angular/router';
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
  orderData: Array<any> = [];
  customerId: string | null = null;
  hotelId: Number | null = null;
  receivedData:any
  customerdata:any;
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authTokenService: AuthTokenService,
         private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
         private loaderService:LoaderService,
         private alertService:AlertsService,
         private paymentDetailsService:PaymentDetailsService,
         private sharedService:SharedDataService
      ){}
      
  ngOnInit(): void {
    
   
    this.route.paramMap.subscribe(params => {
      var temphotelid =  params.get('id'); // Get the 'id' from the URL
      this.hotelId =Number(temphotelid) ;
      //console.log('Hotel ID:', this.hotelId);
      this.getCustomerById(); // Debugging
    });
    this.getOrderDetails();
    
    this.sharedService.currentData.subscribe(data => {
      //console.log("data")
      if (data) {
        this.receivedData = data;
        //console.log('Received data:', this.receivedData);
      }
      else{
        this.receivedData=this.sharedService.getStoredData();
      }
    });
    
  }
  getOrderDetails() {
    var requestData = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      "extras": {
        "find": {
          customer_id:(this.hotelId)
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
          this.orderData = resp.result.data.filter((order:any) => order.status === "Order Confirmed" || "Confirmed");;
        }
      },
      err => {

      }
    )
  }
  getCustomerById() {
 
    return new Promise((resolve, reject) => {
      let requestBody = {
        domain_name: DOMAIN_NAME,
        user_id: 1,
        extras: {
          find: {
            id: Number(this.hotelId)
          }
        }
      };
  
      this.hotelenrollmenttabviewService.getLoginCustomerById(requestBody).subscribe(
        resp => {
          this.loaderService.emitComplete();
          if (resp) {
            this.customerdata = resp.result.data[0];
           
            
  
            //console.log(this.customerdata, "RESPDATA");
            //console.log(Array.isArray(this.customerdata)); 
           
          }
        },
        err => {
          this.loaderService.emitComplete();
          if (err.error.statusCode === 403) {
            // this.alertService.error('Session Time Out! Please login Again', this.options);
            this.router.navigate([`/login`], { skipLocationChange: false });
          } else if (err.error.message) {
            // this.alertService.error(err.error.message, this.options);
          } else {
            // this.alertService.error('Something bad happened. Please try again!', this.options);
          }
          reject(err);  // Reject promise if there is an error
        }
      );
    });
  }
  

}
