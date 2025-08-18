import { DOMAIN_NAME, USER_ID } from './../app.config';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { ENDPOINTS } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { Observable } from 'rxjs';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OutletCreationService {

  private data = new BehaviorSubject('');
  currentData = this.data.asObservable()

  constructor(
    private http: HttpClient,
      private authTokenService: AuthTokenService,
      private router: Router,
      private route: ActivatedRoute
  ) {

   }
   updateAdminFormEvent(item: any) {
    this.data.next(item);
  }

  clearAdminFormEvent() {
    this.data.observers.pop();
  }
  clearEvent() {
    this.data = new BehaviorSubject('');
    this.currentData = this.data.asObservable();
  }

   httpOptions = new HttpHeaders().set('Content-Type', 'application/json');
    // httpOptions = new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
  
    // MAKE API SERVICE CALLS HERE...
  
    // API CALLS
  
    // POST
    postApiCall(dataObj: any, api_endpoint: any): Observable<any>{
      return this.http.post(api_endpoint, dataObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    }

  
}
