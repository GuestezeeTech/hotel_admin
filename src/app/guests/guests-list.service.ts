import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ENDPOINTS } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class GuestsListService {
    constructor(
        private http: HttpClient,
        private authTokenService: AuthTokenService,
        private router: Router
    ) { }

    getAllGuests(jsonObj: any): Observable<any> {
        if (this.authTokenService.isTokenExpired()) {
            this.router.navigate([`/login`], { skipLocationChange: false });
            return new Observable();
        } else {
            return this.http.post(ENDPOINTS.GET_ALL_GUESTS, jsonObj, {
                headers: new HttpHeaders()
                    .set('Content-Type', 'application/json')
                    .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken())
            });
        }
    }
}
