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

export class RoleService {
    private data = new BehaviorSubject('');
    currentData = this.data.asObservable()

    constructor(
        private http: HttpClient,
        private authTokenService: AuthTokenService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    updateAdminFormEvent(item: any) {
        this.data.next(item);
    }

    clearAdminFormEvent() {
        this.data = new BehaviorSubject('');
        this.currentData = this.data.asObservable()
    }

    postApiCall(dataObj: any, api_endpoint: any): Observable<any> {
        return this.http.post(api_endpoint, dataObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }

    getAllRoles(): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate(['/login'], { skipLocationChange: false });
            return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
        }
        return this.http.post(ENDPOINTS.GET_ALL_ROLES, {
            "domain_name": DOMAIN_NAME,
            "user_id": USER_ID,
            "extras": {
                "find": {},
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

    deleteRecurringProfiles(deleteRecurringProfiles: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return of({ success: 0, result: { data: [] }, message: "Session Expired" });
        }
        else {
            return this.http.post(ENDPOINTS.DELETE_RECURRING_PROFILES, deleteRecurringProfiles, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) })
        }
    }
}
