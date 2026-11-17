import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../../app.config';
import { AuthTokenService } from '../../auth-services/auth-token.service';
import { PaymentHelperService } from '../../services/payment-helper.service';
import { OnboardingEmailService } from '../../services/onboarding-email.service';

export type SetupStepKey = 'onboarding' | 'departments' | 'serviceTabs' | 'services' | 'hierarchy' | 'roles';

export interface SetupStep {
  key: SetupStepKey;
  label: string;
  route: string;
  /** null when the check could not be made (API error) */
  done: boolean | null;
  detail: string;
}

/**
 * Works out how far a hotel has got with setup: the onboarding itself, then the
 * System Settings items (departments, service tabs, services, hierarchy) and
 * User Access roles. Each list is read with the same member_id filter its page uses.
 */
@Injectable({ providedIn: 'root' })
export class SetupProgressService {
  constructor(
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private paymentHelper: PaymentHelperService,
    private onboardingEmail: OnboardingEmailService
  ) {}

  private count(url: string, memberId: string): Observable<any[] | null> {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken());
    return this.http.post<any>(url, {
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      extras: { find: { member_id: memberId } }
    }, { headers }).pipe(
      map((resp) => (Array.isArray(resp?.result?.data) ? resp.result.data : [])),
      catchError(() => of(null))
    );
  }

  private async isOnboarded(customer: any): Promise<{ done: boolean | null; detail: string }> {
    const missing = [
      customer?.is_office_details_exists !== true && 'Registered Office',
      customer?.is_property_details_exists !== true && 'Property Details',
      customer?.is_technical_info_exists !== true && 'Technical Info'
    ].filter(Boolean) as string[];
    let paid: boolean | null = null;
    if (this.paymentHelper.isFreePeriodActive(customer)) {
      // Free plan: nothing to pay during the free period
      paid = true;
    } else {
      try {
        paid = (await this.paymentHelper.getConfirmedOrders(customer.id)).length > 0;
      } catch {
        paid = null;
      }
    }
    if (!paid) {
      missing.push('Payment');
    }
    if (paid === null && missing.length === 1) {
      return { done: null, detail: 'Could not check payment' };
    }
    if (missing.length) {
      return { done: false, detail: `Pending: ${missing.join(', ')}` };
    }
    // Onboarding finished: "Awaiting Final Approval" to the hotel, "Final Approval Verification" to support (once)
    this.onboardingEmail.onboardingCompleted(customer);
    return { done: true, detail: 'Office, property, technical info and payment' };
  }

  /** Whether the hotel was live (go_live) at the last load(); read by the completion message */
  lastLoadWasLive = false;

  async load(memberId: string): Promise<SetupStep[]> {
    const customer = await this.paymentHelper.getCustomerByMemberId(memberId);
    const goLive = customer?.go_live;
    this.lastLoadWasLive = goLive === true || goLive === 'true' || goLive === 1;
    const onboarding = await this.isOnboarded(customer);

    const lists = await new Promise<any>((resolve) => {
      forkJoin({
        departments: this.count(ENDPOINTS.GET_ALL_DEPARTMENT, memberId),
        serviceTabs: this.count(ENDPOINTS.GET_ALL_TABS, memberId),
        services: this.count(ENDPOINTS.GETALL_SERVICE, memberId),
        hierarchy: this.count(ENDPOINTS.GET_HIERARCHY, memberId),
        roles: this.count(ENDPOINTS.GET_ALL_ROLES, memberId)
      }).subscribe({ next: resolve, error: () => resolve({}) });
    });

    // Every hotel gets an "Admin" role automatically, so only other roles count as set up
    const customRoles = lists.roles
      ? lists.roles.filter((r: any) => String(r?.name || '').trim().toLowerCase() !== 'admin')
      : null;

    const fromList = (items: any[] | null, noun: string) =>
      items === null
        ? { done: null, detail: 'Could not check' }
        : { done: items.length > 0, detail: items.length ? `${items.length} ${noun}${items.length === 1 ? '' : 's'}` : 'None added yet' };

    return [
      { key: 'onboarding', label: 'Onboarding', route: `/edit-new-hotel/${customer?.id}`, ...onboarding },
      { key: 'departments', label: 'Departments', route: '/department-list', ...fromList(lists.departments, 'department') },
      { key: 'serviceTabs', label: 'Service Tabs', route: '/service-tab-list', ...fromList(lists.serviceTabs, 'tab') },
      { key: 'services', label: 'Services', route: '/service-list', ...fromList(lists.services, 'service') },
      { key: 'hierarchy', label: 'Hierarchy', route: '/member-hierarchy', ...fromList(lists.hierarchy, 'hierarchy') },
      { key: 'roles', label: 'User Access Roles', route: '/role-list', ...fromList(customRoles, 'role') }
    ];
  }
}
