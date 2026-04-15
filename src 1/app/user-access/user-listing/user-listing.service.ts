import { DOMAIN_NAME, USER_ID } from './../../app.config';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENDPOINTS } from '../../app.config';
import { AuthTokenService } from '../../auth-services/auth-token.service';

@Injectable({
  providedIn: 'root'
})

export class UserListingService {

  constructor(
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private router: Router,
  ) { }

  getAllUsers(requestBody: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
    }
    else {
      return this.http.post(ENDPOINTS.GET_ALL_USERS, requestBody, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }

  //delete user
  deleteUser(jsonObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return of({ success: 0, result: { data: [] }, message: "Session Expired" });
    }
    else {
      return this.http.post(ENDPOINTS.DELETE_USER, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }
}
