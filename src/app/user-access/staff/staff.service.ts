import { USER_ID, DOMAIN_NAME } from './../../app.config';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { of } from 'rxjs';
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENDPOINTS } from '../../app.config';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { LocalStorageService } from '../../auth-services/local-storage.service';

@Injectable({
    providedIn: 'root'
})

export class StaffService {
    private data = new BehaviorSubject('');
    currentData = this.data.asObservable();
    // First time staff creation(top level hierarchy)
    defaultHierarchy: any = null;
    isFirstStaff: boolean = false;

    constructor(
        private http: HttpClient,
        private authTokenService: AuthTokenService,
        private router: Router,
        private route: ActivatedRoute,
        private hierarchyService: HierarchyService,
        private localStorageService: LocalStorageService
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

    updateStaff(jsonObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return of({ success: 0, result: { data: [] }, message: "Session Expired" }); // Return empty response
        }
        else {
            return this.http.post(ENDPOINTS.UPDATE_STAFF, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
        }
    }

    // First time staff creation(top level hierarchy)
    async getDefaultHierarchyForFirstStaff(): Promise<any> {
        return new Promise((resolve) => {
            const requestBody = {
                domain_name: DOMAIN_NAME,
                user_id: USER_ID,
                extras: { find: { customer_id: this.localStorageService.get('CustomerId') } }
            };
            this.hierarchyService.apiCall(requestBody, ENDPOINTS.GET_HIERARCHY)
                .subscribe({
                    next: (resp: any) => {
                        if (resp?.success && Array.isArray(resp.result?.data) && resp.result.data.length) {
                            // pick only items without parentId
                            const withoutParent = resp.result.data[0].hierarchy.filter((h: any) =>
                                !h.parentId && h.parentId !== 0
                            );
                            // find the lowest by id
                            const lowest = withoutParent.length
                                ? withoutParent.reduce((min: any, h: any) => (h.id < min.id ? h : min), withoutParent[0])
                                : null;
                            this.defaultHierarchy = lowest;
                            this.isFirstStaff = !!lowest; // true if found
                            console.log('Lowest hierarchy set:', withoutParent, lowest);
                            resolve(lowest);
                        } else {
                            this.defaultHierarchy = null;
                            this.isFirstStaff = false;
                            resolve(null);
                        }
                    },
                    error: () => {
                        this.defaultHierarchy = null;
                        this.isFirstStaff = false;
                        resolve(null);
                    }
                });
        });
    }

}
