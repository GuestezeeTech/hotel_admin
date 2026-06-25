import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Injectable } from '@angular/core';
import { Observable, throwError } from "rxjs";
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { ENDPOINTS } from '../../app.config';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { BehaviorSubject, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient,
    private authTokenService: AuthTokenService,
    private router: Router,
    private route: ActivatedRoute) { }

  // SET HEADERS
  httpOptions = new HttpHeaders().set('Content-Type', 'application/json');
  // httpOptions = new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())

  // MAKE API SERVICE CALLS HERE...

  // API CALLS

  // POST
  postApiCall(dataObj: any, api_endpoint: any): Observable<any> {
    return this.http.post(api_endpoint, dataObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
  }

  // GET
  getApiCall(jsonObj: any, api_endpoint: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      //console.log(api_endpoint)
      return this.http.post(api_endpoint, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }


  // LOGIN SERVICE
  login(loginObj: any): Observable<any> {
    return this.http.post(ENDPOINTS.LOGIN_TWO, loginObj, { headers: new HttpHeaders().set('Content-Type', 'application/json') });
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

  private data = new BehaviorSubject('');
  currentData = this.data.asObservable()
  clearAdminFormEvent() {
    this.data.observers.pop();
  }

  clearEvent() {
    this.data = new BehaviorSubject('');
    this.currentData = this.data.asObservable();
  }

  updateAdminFormEvent(item: any) {
    this.data.next(item);
  }

  //add user
  addUser(userObj: any): Observable<any> {
    if(this.authTokenService.isTokenExpired()){
      this.router.navigate([`/login`], {skipLocationChange: false});
      return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
    }
    else
    {
    return this.http.post(ENDPOINTS.ADD_USERS, userObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
    }
  }

   //update user
   updateUser(jsonObj : any):Observable<any>
   {
     if(this.authTokenService.isTokenExpired()){
       this.router.navigate([`/login`], {skipLocationChange: false});
       return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
     }
     else
     {
     return this.http.post(ENDPOINTS.UPDATE_USER,jsonObj,{ headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
     }
   }
 

  getAllRoles(memberId: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate(['/login'], { skipLocationChange: false });
      return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
    }
    return this.http.post(ENDPOINTS.GET_ALL_ROLES, {
      "domain_name": DOMAIN_NAME,
      "user_id": USER_ID,
      "extras": {
        "find": {
          "member_id": memberId
        },
        "pagination": true,
        "paginationDetails": {
          "limit": 0,
          "pageSize": 1
        },
        "sorting": true,
        "sortingDetails": {
          "id": -1
        }
      }
    }, {
      headers: new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
    });
  }


  // get users by id
  getUserById(jsonObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
    }
    else {
      return this.http.post(ENDPOINTS.GET_USERS_BY_ID, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
    }

  }

}
