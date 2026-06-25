import { AuthTokenService } from './../../auth-services/auth-token.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENDPOINTS } from '../../app.config';



@Injectable({
    providedIn: 'root'
})

export class ServiceDetailService {
    constructor(
        private authTokenService: AuthTokenService,
        private router: Router,
        private http: HttpClient
    ) { }


    addCustomerService(AddCustomerObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return new Observable();
        }
        else {
            return this.http.post(ENDPOINTS.CREATE_SERVICE, AddCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
        }
    }

    getAllServices(jsonObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return new Observable();
        }
        else {
            return this.http.post(ENDPOINTS.GET_ALL_SERVICES, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
        }
    }

    updateService(UpdateCustomerObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return new Observable();
        }
        else {
            return this.http.post(ENDPOINTS.UPDATE_SERVICES, UpdateCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
        }
    }
}
