import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY } from 'rxjs';
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
      return this.http.post(ENDPOINTS.GETALL_ORDERS, orderData, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
    }
    }
     // ORDER-DETAILS-GETBYID
  // orderDetailsGetById(jsonObj: any): Observable<any> {
  //   if(this.authTokenService.isTokenExpired()){
  //     this.router.navigate([`/login`], {skipLocationChange: false});
  //     return new Observable(); 
  //   }
  //   else{
  //     return this.http.post(ENDPOINTS.ORDERDETAILSGETBYID, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
  //   }
  // }

  orderDetailsGetById(jsonObj: any): Observable<any> {
    // If token expired, only redirect to login for normal app routes.
    // For enrollment/payment callback routes we return EMPTY so the caller can handle it.
    if (this.authTokenService.isTokenExpired()) {
      // const url = this.router?.url || window.location.pathname || '';
      // const isEnrollmentRoute = url.includes('/hotel-registration') || url.includes('/confirmation') || url.includes('/cancellation') || url.includes('/payment');
      const path = (this.router?.url || window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
      const isEnrollmentRoute = path.includes('hotel-registration') || path.includes('confirmation') || path.includes('cancellation') || path.includes('payment');
      if (isEnrollmentRoute) {
        return EMPTY;
      } else {
        this.router.navigate([`/login`], { skipLocationChange: false });
        return EMPTY;
      }
    } else {
      const headers = new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken());
      return this.http.post(ENDPOINTS.ORDERDETAILSGETBYID, jsonObj, { headers });
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
