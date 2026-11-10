import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../app.config';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { COUNTRY_CODES, COUNTRY_STATES } from './countries';

/**
 * Countries and states come only from the countries-states API (managed in superadmin:
 * one document per country with its states inside). This fills COUNTRY_CODES and
 * COUNTRY_STATES in place, so every dropdown that reads those arrays shows the API data.
 */
@Injectable({ providedIn: 'root' })
export class CountryListService {
  private loading?: Promise<void>;
  /** True once the API has delivered at least one country. */
  loaded = false;
  /** True when the last attempt failed or returned no countries; the forms show a message. */
  unavailable = false;

  constructor(private http: HttpClient, private authTokenService: AuthTokenService) {}

  /** Loads once; a failed load is retried on the next call. */
  load(force = false): Promise<void> {
    if (!this.loading || force) {
      this.loading = this.fetch().then((ok) => {
        this.loaded = this.loaded || ok;
        this.unavailable = !ok && !this.loaded;
        if (!ok) {
          this.loading = undefined;
        }
      });
    }
    return this.loading;
  }

  private async fetch(): Promise<boolean> {
    const token = this.authTokenService.getAccessAPIToken();
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    if (token) {
      headers = headers.set('authorization', 'Bearer ' + token);
    }
    try {
      const resp: any = await new Promise((resolve, reject) => {
        this.http.post(ENDPOINTS.GET_ALL_COUNTRIES_STATES, {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: { find: {} }
        }, { headers }).subscribe({ next: resolve, error: reject });
      });
      const byOrder = (a: any, b: any) =>
        (Number(a?.sort_order) || 0) - (Number(b?.sort_order) || 0) ||
        String(a?.country ?? a?.name ?? '').localeCompare(String(b?.country ?? b?.name ?? ''));
      const countries = (resp?.result?.data || [])
        .filter((c: any) => typeof c?.country === 'string' && c.country.trim() && c.is_deleted !== true && c.is_active !== false)
        .sort(byOrder);
      if (!countries.length) {
        console.warn('Countries API returned no countries.');
        return false;
      }
      COUNTRY_CODES.splice(0, COUNTRY_CODES.length,
        ...countries.filter((c: any) => c.code).map((c: any) => ({ country: c.country, code: c.code })));
      COUNTRY_STATES.splice(0, COUNTRY_STATES.length, ...countries.map((c: any) => ({
        country: c.country,
        states: (c.states || [])
          .filter((s: any) => s?.name && s.is_active !== false)
          .sort(byOrder)
          .map((s: any) => s.name)
      })));
      return true;
    } catch (err) {
      console.warn('Countries API unavailable.', err);
      return false;
    }
  }
}
