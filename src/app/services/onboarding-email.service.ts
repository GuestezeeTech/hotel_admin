import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DOMAIN_NAME, ENDPOINTS, USER_ID } from '../app.config';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';

/** GuestEzee support inbox: gets the "needs action" emails */
export const SUPPORT_EMAIL = 'support@guestezee.com';

export type OnboardingTemplate =
  | 'Awaiting Approval'
  | 'New Registration Approval'
  | 'Subscription Request'
  | 'Subscription Approval'
  | 'Subscription Verification'
  | 'Complete Onboarding'
  | 'Awaiting Final Approval'
  | 'Final Approval Verification'
  | 'Go live Approved';

/**
 * Sends the onboarding stage emails (:9430/onboardingemail).
 * Fire-and-forget: a failed email is logged and never blocks the user's action.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingEmailService {
  constructor(
    private http: HttpClient,
    private hotelEnrollmentService: HotelEnrollmentTabviewService
  ) {}

  hotelNameOf(customer: any): string {
    return String(customer?.name || customer?.property_details?.property_name || customer?.first_name || '').trim();
  }

  send(templateName: OnboardingTemplate, to: string | null | undefined, hotelName: string): void {
    const email = String(to || '').trim();
    if (!email) {
      console.warn(`Onboarding email "${templateName}" skipped: no recipient`);
      return;
    }
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('x-api-key', ENDPOINTS.ONBOARDING_EMAIL_API_KEY);
    this.http.post(ENDPOINTS.ONBOARDING_EMAIL, {
      templateName,
      to: email,
      variables: { hotelName }
    }, { headers }).subscribe({
      error: (err) => console.error(`Onboarding email "${templateName}" failed`, err)
    });
  }

  /** Customer email for templateA, support inbox for templateB */
  sendPair(customer: any, toCustomer: OnboardingTemplate, toSupport: OnboardingTemplate): void {
    const hotelName = this.hotelNameOf(customer);
    this.send(toCustomer, customer?.email, hotelName);
    this.send(toSupport, SUPPORT_EMAIL, hotelName);
  }

  /** Customer just submitted the first (registration) popup */
  registrationSubmitted(customer: any): void {
    this.sendPair(customer, 'Awaiting Approval', 'New Registration Approval');
  }

  /**
   * A subscription payment was confirmed. Sent once per order (remembered in this browser),
   * so reloading the confirmation page does not send it again.
   */
  paymentConfirmed(customer: any, orderId: string | number): void {
    const key = `onboardingPaymentEmail_${orderId}`;
    try {
      if (localStorage.getItem(key)) {
        return;
      }
      localStorage.setItem(key, '1');
    } catch {
      // storage unavailable: still send
    }
    this.sendPair(customer, 'Subscription Approval', 'Subscription Verification');
  }

  /**
   * Onboarding finished (office, property, technical info and payment all done).
   * Sent once per hotel: the customer is marked onboarding_complete_email_sent.
   */
  onboardingCompleted(customer: any): void {
    if (!customer?.id || customer.onboarding_complete_email_sent === true) {
      return;
    }
    // Already approved or live (e.g. hotels onboarded before these emails existed): nothing to await
    if (String(customer.status || '').toLowerCase() === 'approved' || customer.go_live === true) {
      return;
    }
    customer.onboarding_complete_email_sent = true;
    this.hotelEnrollmentService.updateCustomer({
      domain_name: DOMAIN_NAME,
      user_id: USER_ID,
      payload: { customer_update: { onboarding_complete_email_sent: true } },
      extras: { find: { id: Number(customer.id) } }
    }).subscribe({
      next: (resp: any) => {
        if (resp?.success === 1) {
          this.sendPair(customer, 'Awaiting Final Approval', 'Final Approval Verification');
        } else {
          customer.onboarding_complete_email_sent = false;
        }
      },
      error: () => {
        customer.onboarding_complete_email_sent = false;
      }
    });
  }
}
