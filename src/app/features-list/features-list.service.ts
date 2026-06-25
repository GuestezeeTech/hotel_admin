import { USER_ID, DOMAIN_NAME } from '../app.config';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Observable } from "rxjs";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthTokenService } from '../auth-services/auth-token.service';

@Injectable({
    providedIn: 'root'
})

export class FeaturesListService {
    private data = new BehaviorSubject('');
    currentData = this.data.asObservable()

    constructor(
        private http: HttpClient,
        private authTokenService: AuthTokenService
    ) { }

    postApiCall(dataObj: any, api_endpoint: any): Observable<any> {
        return this.http.post(api_endpoint, dataObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }

}
