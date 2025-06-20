import { USER_ID, DOMAIN_NAME } from './../../app.config';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { of } from 'rxjs';
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENDPOINTS } from '../../app.config';
import { AuthTokenService } from '../../auth-services/auth-token.service';

@Injectable({
    providedIn: 'root'
})

export class StaffService {
    private data = new BehaviorSubject('');
    currentData = this.data.asObservable()

    constructor(
        private http: HttpClient,
        private authTokenService: AuthTokenService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    clearAdminFormEvent() {
        this.data = new BehaviorSubject('');
        this.currentData = this.data.asObservable()
    }

    //add user
    addStaff(userObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
        }
        else {
            return this.http.post(ENDPOINTS.CREATE_STAFF, userObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
        }
    }

    getStaffById(jsonObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
        }
        else {
            return this.http.post(ENDPOINTS.GET_STAFF_BYID, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
        }
    }
    
    updateStaff(jsonObj : any):Observable<any>
    {
      if(this.authTokenService.isTokenExpired()){
        this.router.navigate([`/login`], {skipLocationChange: false});
        return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
      }
      else
      {
      return this.http.post(ENDPOINTS.UPDATE_STAFF,jsonObj,{ headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())});
      }
    }


}
