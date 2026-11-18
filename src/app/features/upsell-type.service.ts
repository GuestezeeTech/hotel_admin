import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';

/** One upsell name (upselltype record) of a hotel */
export interface UpsellType {
  id: any;
  name: string;
  description?: string;
  is_active?: boolean;
  member_id?: any;
  [key: string]: any;
}

/**
 * Upsell names that a hotel manages on the Upsell Names page and picks from
 * in the Upselling "Name" dropdown. Writes go to :5414, reads to :5413.
 */
@Injectable({
  providedIn: 'root'
})
export class UpsellTypeService {

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

  /** The name of a record, whatever the API calls the field */
  static nameOf(item: any): string {
    return String(item?.name ?? item?.upsell_type ?? item?.upselltype ?? item?.type_name ?? '').trim();
  }

  getAll(memberId: any): Observable<any> {
    if (!this.checkToken()) return of(null);
    const body = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: {
        find: { member_id: memberId },
        sorting: true,
        sortingDetails: { id: -1 }
      }
    };
    return this.http.post(ENDPOINTS.UPSELLTYPE_GETALL, body, { headers: this.getHeaders() });
  }

  getById(id: any, memberId: any): Observable<any> {
    if (!this.checkToken()) return of(null);
    const body = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { id, member_id: memberId } }
    };
    return this.http.post(ENDPOINTS.UPSELLTYPE_GETBYID, body, { headers: this.getHeaders() });
  }

  create(data: Partial<UpsellType>): Observable<any> {
    if (!this.checkToken()) return of(null);
    const body = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { upselltype_creation: data }
    };
    return this.http.post(ENDPOINTS.UPSELLTYPE_CREATE, body, { headers: this.getHeaders() });
  }

  update(id: any, memberId: any, data: Partial<UpsellType>): Observable<any> {
    if (!this.checkToken()) return of(null);
    const body = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { upselltype_updation: data },
      extras: { find: { id, member_id: memberId } }
    };
    return this.http.post(ENDPOINTS.UPSELLTYPE_UPDATE, body, { headers: this.getHeaders() });
  }

  delete(id: any, memberId: any): Observable<any> {
    if (!this.checkToken()) return of(null);
    const body = {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { delete_data: {}, variants: [] },
      extras: { find: { id, member_id: memberId } }
    };
    return this.http.post(ENDPOINTS.UPSELLTYPE_DELETE, body, { headers: this.getHeaders() });
  }
}
