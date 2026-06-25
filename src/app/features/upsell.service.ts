import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { ENDPOINTS } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';

@Injectable({
  providedIn: 'root'
})
export class UpsellService {

  constructor(
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private router: Router
  ) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken());
  }

  private checkToken(): boolean {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate(['/login'], { skipLocationChange: false });
      return false;
    }
    return true;
  }

  createUpsell(payload: any): Observable<any> {
    if (!this.checkToken()) return of(null);
    return this.http.post(ENDPOINTS.UPSELL_CREATE, payload, { headers: this.getHeaders() });
  }

  updateUpsell(payload: any): Observable<any> {
    if (!this.checkToken()) return of(null);
    return this.http.post(ENDPOINTS.UPSELL_UPDATE, payload, { headers: this.getHeaders() });
  }

  getAllUpsells(payload: any): Observable<any> {
    if (!this.checkToken()) return of(null);
    return this.http.post(ENDPOINTS.UPSELL_GETALL, payload, { headers: this.getHeaders() });
  }

  deleteUpsell(payload: any): Observable<any> {
    if (!this.checkToken()) return of(null);
    return this.http.post(ENDPOINTS.UPSELL_DELETE, payload, { headers: this.getHeaders() });
  }
}
