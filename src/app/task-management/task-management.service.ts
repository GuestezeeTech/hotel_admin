import { DOMAIN_NAME, USER_ID } from './../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENDPOINTS } from '../app.config';
import { of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class TaskManagementService {
    constructor(
        private authTokenService: AuthTokenService,
        private router: Router,
        private http: HttpClient
    ) { }

    // addCustomerService(AddCustomerObj: any): Observable<any> {
    //     if (this.authTokenService.isTokenExpired()) {
    //         this.router.navigate([`/login`], { skipLocationChange: false });
    //         return new Observable();
    //     }
    //     else {
    //         return this.http.post(ENDPOINTS.CREATE_SERVICE, AddCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    //     }
    // }

    getAllTask(requestBody: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate(['/login'], { skipLocationChange: false });
            return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
        }
        return this.http.post(ENDPOINTS.GET_ALL_TASK, requestBody, {
            headers: new HttpHeaders()
                .set('Content-Type', 'application/json')
                .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
        });
    }

    updateTaskStatus(UpdateCustomerObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return new Observable();
        }
        else {
            return this.http.post(ENDPOINTS.UPDATE_TASK, UpdateCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
        }
    }

    // getAllTask2(): Observable<any> {
    //     if (this.authTokenService.isTokenExpired()) {
    //         this.router.navigate(['/login'], { skipLocationChange: false });
    //         return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
    //     }
    //     return this.http.post(ENDPOINTS.GET_ALL_TASK, {
    //         "domain_name": DOMAIN_NAME,
    //         "user_id": USER_ID,
    //         "extras": {
    //             "find": {
    //                 "status": "Escalated"
    //             },
    //             "pagination": true,
    //             "paginationDetails": {
    //                 "limit": 0,
    //                 "pageSize": 1
    //             },
    //             "sorting": true,
    //             "sortingDetails": {
    //                 "id": -1
    //             }
    //         }
    //     }, {
    //         headers: new HttpHeaders()
    //             .set('Content-Type', 'application/json')
    //             .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
    //     });
    // }

    getAllStaves(jsonObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return new Observable();
        }
        else {
            return this.http.post(ENDPOINTS.GET_All_STAVES, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
        }
    }

    getAllRatings(requestBody: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate(['/login'], { skipLocationChange: false });
            return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
        }
        return this.http.post(ENDPOINTS.GET_TASK_RATINGS, requestBody, {
            headers: new HttpHeaders()
                .set('Content-Type', 'application/json')
                .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
        });
    }

}
