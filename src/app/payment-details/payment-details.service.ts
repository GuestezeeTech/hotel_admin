import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { ENDPOINTS } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentDetailsService {
  private data = new BehaviorSubject('');
  currentData = this.data.asObservable()

  constructor(
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private router: Router,
    private route: ActivatedRoute
  ) {

   }
   getAllOrderDetails(orderData:any) :  Observable<any>{
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable(); 
    }
    else {
      return this.http.post(ENDPOINTS.GET_ALL_ORDER_DETAILS, orderData, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
    }
    }
     // ORDER-DETAILS-GETBYID
  orderDetailsGetById(jsonObj: any): Observable<any> {
    if(this.authTokenService.isTokenExpired()){
      this.router.navigate([`/login`], {skipLocationChange: false});
      return new Observable(); 
    }
    else{
      return this.http.post(ENDPOINTS.ORDERDETAILSGETBYID, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    }
  }
  getCustomerById(getCustomerObj: any): Observable<any> {
    if(this.authTokenService.isTokenExpired()){
      this.router.navigate([`/login`], {skipLocationChange: false});
      return new Observable(); 
    }
    else{
    return this.http.post(ENDPOINTS.GET_CUSTOMER, getCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    }
  }
   
}
