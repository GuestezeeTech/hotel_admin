import { AuthTokenService } from '../../auth-services/auth-token.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENDPOINTS } from '../../app.config';
// Newly added for payment
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class TechnicalInfoService {
  selectedTab: string = 'lock'; // Default tab
  private data = new BehaviorSubject('');
  currentData = this.data.asObservable();
  httpOptions = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(
    private authTokenService: AuthTokenService,
    private router: Router,
    private http: HttpClient
  ) { }

  addCustomerTechnicalInfo(AddCustomerObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      return this.http.post(ENDPOINTS.CREATE_TECHNICAL_INFO, AddCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }

  getAllTechnicalInfo(jsonObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      //console.log(this.authTokenService.getAccessAPIToken(),"test")
      return this.http.post(ENDPOINTS.GET_ALL_TECHNICAL_INFO, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }

  updateTechnicalInfo(UpdateCustomerObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      return this.http.post(ENDPOINTS.UPDATE_TECHNICAL_INFO, UpdateCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }
  getToken(tokenObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      return this.http.post(ENDPOINTS.GETNEWACCESSTOKEN, tokenObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
    }
  }

  apiCall(Obj: any, endpointUrl: string): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate(['/login'], { skipLocationChange: false });
      return new Observable(); // ⚠️ Consider replacing with EMPTY or throwError as noted earlier
    } else {
      const headers = new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken());

      return this.http.post(endpointUrl, Obj, { headers });
    }
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
  }

  sendImage(jsonObj: any, headers: any): Observable<any> {
    return this.http.post(ENDPOINTS.SEND_IMAGE, jsonObj, { headers: headers });
  }

  // Newly added for payment 
  // For caaling payNow function
  private payNowSubject = new Subject<void>();
  payNow$ = this.payNowSubject.asObservable();

  triggerPayNow() {
    this.payNowSubject.next();
  }

  // For calling payment type modal
  private modalTrigger = new Subject<void>();
  modalTrigger$ = this.modalTrigger.asObservable();

  openModal() {
    this.modalTrigger.next();
  }

  // For payment button enable & showing
  private payNowButtonSubject = new BehaviorSubject<any>({ show: false, enabled: false, installmentText: '' });
  payNowButton$ = this.payNowButtonSubject.asObservable();

  updatePayNowButton(show: boolean, enabled: boolean, installmentText: string = '') {
    this.payNowButtonSubject.next({ show, enabled, installmentText });
  }

}
