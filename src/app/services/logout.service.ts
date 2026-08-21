import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DOMAIN_NAME, USER_ID } from '../app.config';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { PushService } from './push.service';
import { HotelListService } from '../hotel-list/hotel-list.service';
import { HotelEnrollmentTabviewService } from '../hotel-enrollment-tabview/hotel-enrollment-tabview.service';
import { TaskManagementService } from '../task-management/task-management.service';
import { StaffService } from '../user-access/staff/staff.service';

@Injectable({
  providedIn: 'root'
})
export class LogoutService {

  // Chain of pending cleanups. New calls await the previous one and then run
  // sequentially, instead of being silently dropped when one is already in flight.
  // Silent drops caused permission-toggle cleanups to be lost when they collided
  // with a manual/auto/inactive logout attempt or with a rapid re-toggle.
  private _cleanupChain: Promise<void> = Promise.resolve();

  constructor(
    private localService: LocalStorageService,
    private pushService: PushService,
    private hotellistService: HotelListService,
    private hotelenrollmenttabviewService: HotelEnrollmentTabviewService,
    private taskManagementService: TaskManagementService,
    private staffService: StaffService,
    private router: Router
  ) { }

  /**
   * Removes the current device's FCM token from the DB for the logged-in user/staff.
   * Safe to call on both intentional logout and auto-logout (session expiry / 403).
   * Skips if no userId is in localStorage (already logged out).
   */
  async removeFcmToken(passedUserId?: number, passedCustomerType?: string | null, passedToken?: string | null): Promise<void> {
    console.log('[LogoutService] removeFcmToken() called');
    // Queue: each call awaits the previous one to complete, then runs. Callers
    // get a promise that resolves when THEIR cleanup is done. No cleanups are
    // silently dropped (as they were with the old `_isCleaningUp` boolean mutex).
    const run = async () => {
      const userId = passedUserId || Number(this.localService.get('UserId'));
      const customerType = passedCustomerType || this.localService.get('CustomerType');
      console.log('[LogoutService] userId:', userId, '| customerType:', customerType);
      if (!userId) {
        return; // already logged out, nothing to clean
      }

      const currentToken = passedToken || sessionStorage.getItem('CurrentTabFcmToken') || await this.pushService.getCurrentToken();
      console.log('[LogoutService] currentToken:', currentToken);

      // ── Customer / Staff table ──
      // For Staff, prefer the Customer document's own primary key (localStorage
      // CustomerId, set at login and backfilled by registerFcmTokenOnLoad) instead
      // of a staff_id filter — id is an unambiguous direct lookup, whereas staff_id
      // as a filter field had no other proven-working precedent anywhere in the
      // codebase and was silently matching zero rows (Staff table cleared fine,
      // Customer-document mirror never did). Falls back to staff_id only if
      // CustomerId genuinely isn't cached for this session.
      const cachedCustomerId = customerType === 'Staff' ? this.localService.get('CustomerId') : null;
      const customerFindKey = customerType === 'Staff'
        ? (cachedCustomerId ? 'id' : 'staff_id')
        : 'id';
      const customerFindValue = customerType === 'Staff' && cachedCustomerId
        ? Number(cachedCustomerId)
        : userId;
      const customerFetchBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { [customerFindKey]: customerFindValue } }
      };
      console.log('[LogoutService] customer lookup:', customerFetchBody.extras.find);

      const customerResp: any = await this.hotelenrollmenttabviewService
        .getLoginCustomerById(customerFetchBody)
        .toPromise();
      console.log('[LogoutService] customer lookup result:', customerResp?.success, customerResp?.result?.data?.length);

      if (customerResp?.success === 1 && customerResp.result?.data?.length > 0) {
        const customer = customerResp.result.data[0];
        let hasTokenChanged = false;
        let updatedTokens = customer.fcm_token || [];
        if (currentToken && Array.isArray(customer.fcm_token)) {
          const initialLength = customer.fcm_token.length;
          updatedTokens = customer.fcm_token.filter((t: string) => t !== currentToken);
          if (updatedTokens.length !== initialLength) {
            hasTokenChanged = true;
          }
        }
        const remainingCount = updatedTokens.length;
        const isAvailableValue = remainingCount >= 1;
        const customerUpdatePayload: any = {
          fcm_token: updatedTokens
        };
        if (customerType === 'Staff') {
          customerUpdatePayload.is_available = isAvailableValue;
        }

        if (hasTokenChanged) {
          const updateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { customer_update: customerUpdatePayload },
            extras: { find: { [customerFindKey]: customerFindValue } }
          };
          await this.hotelenrollmenttabviewService
            .updateCustomerFcm(updateBody)
            .toPromise();
        } else if (customerType === 'Staff') {
          // Token list did not change, but still sync is_available in case it drifted
          const availBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { customer_update: { is_available: isAvailableValue } },
            extras: { find: { [customerFindKey]: customerFindValue } }
          };
          await this.hotelenrollmenttabviewService
            .updateCustomerFcm(availBody)
            .toPromise();
        }
      }

      // ── Staff table (only for Staff users) ──
      if (customerType === 'Staff') {
        const staffFetchBody = {
          domain_name: DOMAIN_NAME,
          user_id: USER_ID,
          extras: { find: { id: userId } }
        };

        const staffResp: any = await this.taskManagementService
          .getAllStaves(staffFetchBody)
          .toPromise();

        if (staffResp?.success === 1 && staffResp.result?.data?.length > 0) {
          const staff = staffResp.result.data[0];
          let hasTokenChanged = false;
          let updatedTokens = staff.fcm_token || [];
          if (currentToken && Array.isArray(staff.fcm_token)) {
            const initialLength = staff.fcm_token.length;
            updatedTokens = staff.fcm_token.filter((t: string) => t !== currentToken);
            if (updatedTokens.length !== initialLength) {
              hasTokenChanged = true;
            }
          }
          const remainingCount = updatedTokens.length;
          const isAvailableValue = remainingCount >= 1;
          const staffUpdationPayload: any = {
            fcm_token: updatedTokens,
            is_available: isAvailableValue
          };
          if (hasTokenChanged) {
            const updateBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: {
                staff_updation: staffUpdationPayload
              },
              extras: { find: { id: userId } }
            };
            await this.staffService.updateStaff(updateBody).toPromise();
          } else {
            // Token list did not change, but still sync is_available in case it drifted
            const availBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: { staff_updation: { is_available: isAvailableValue } },
              extras: { find: { id: userId } }
            };
            await this.staffService.updateStaff(availBody).toPromise();
          }
        }
      }

    };
    const next = this._cleanupChain.then(run, run).catch(err => {
      console.error('[LogoutService] Error removing FCM token:', err);
    });
    this._cleanupChain = next;
    return next;
  }
}
