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
export class HotelListService {
  private data = new BehaviorSubject('');
  currentData = this.data.asObservable()

  constructor(
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private router: Router,
    private route: ActivatedRoute
  ) {

   }
   getAllCustomers(jsonObj: any): Observable<any> {
    if(this.authTokenService.isTokenExpired()){
      this.router.navigate([`/login`], {skipLocationChange: false});
      return new Observable(); 
    }
    else{
    return this.http.post(ENDPOINTS.GETALLCUSTOMER, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    }
  }

  getSignupAllCustomers(jsonObj: any): Observable<any> {
    //console.log("11")
    // if(this.authTokenService.isTokenExpired()){
    //   this.router.navigate([`/login`], {skipLocationChange: false});
    //   return new Observable(); 
    // }
    // else{
      
    return this.http.post(ENDPOINTS.GETSIGNUPALLCUSTOMER, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    // }
  }

  getCustomerByName(jsonObj: any): Observable<any> {
    if(this.authTokenService.isTokenExpired()){
      this.router.navigate([`/login`], {skipLocationChange: false});
      return new Observable(); 
    }
    else
    {
    return this.http.post(ENDPOINTS.GET_CUSTOMER_BY_NAME , jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    }
  }
  deleteCustomer(jsonObj: any): Observable<any> {
    if(this.authTokenService.isTokenExpired()){
      this.router.navigate([`/login`], {skipLocationChange: false});
      return new Observable(); 
    }
    else
    {
    return this.http.post(ENDPOINTS.DELETE_CUSTOMER , jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    }
  }
  updateCustomer(UpdateCustomerObj: any): Observable<any> {
    if(this.authTokenService.isTokenExpired()){
      this.router.navigate([`/login`], {skipLocationChange: false});
      return new Observable(); 
    }
    else{
    return this.http.post(ENDPOINTS.UPDATE_CUSTOMER, UpdateCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
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
  postApiCall(dataObj: any, api_endpoint: any): Observable<any>{
    return this.http.post(api_endpoint, dataObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
  }
}

