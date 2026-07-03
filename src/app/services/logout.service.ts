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

  private _isCleaningUp = false; // prevent duplicate concurrent cleanups

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
  async removeFcmToken(passedUserId?: number, passedCustomerType?: string | null): Promise<void> {
    console.log('[LogoutService] removeFcmToken() called');
    if (this._isCleaningUp) {
      console.log('[LogoutService] Already cleaning up, skipping.');
      return;
    }
    this._isCleaningUp = true;

    try {
      const userId = passedUserId || Number(this.localService.get('UserId'));
      const customerType = passedCustomerType || this.localService.get('CustomerType');
      console.log('[LogoutService] userId:', userId, '| customerType:', customerType);
      if (!userId) {
        this._isCleaningUp = false; // Reset so next login/logout cycles can clean up
        return; // already logged out, nothing to clean
      }

      const currentToken = await this.pushService.getCurrentToken();
      console.log('[LogoutService] currentToken:', currentToken);

      // ── Customer / Staff table ──
      const customerFindKey = customerType === 'Staff' ? 'staff_id' : 'id';
      const customerFetchBody = {
        domain_name: DOMAIN_NAME,
        user_id: USER_ID,
        extras: { find: { [customerFindKey]: userId } }
      };

      const customerResp: any = await this.hotellistService
        .getSignupAllCustomers(customerFetchBody)
        .toPromise();

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
        const isFcmUnavailable = this.localService.get('isFcmUnavailable') === 'true';
        const customerUpdatePayload: any = {
          fcm_token: updatedTokens
        };
        if (customerType === 'Staff' && !isFcmUnavailable) {
          customerUpdatePayload.is_available = isAvailableValue;
        }

        if (hasTokenChanged) {
          const updateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { customer_update: customerUpdatePayload },
            extras: { find: { [customerFindKey]: userId } }
          };
          await this.hotelenrollmenttabviewService
            .updateCustomerFcm(updateBody)
            .toPromise();
        } else if (customerType === 'Staff' && !isFcmUnavailable) {
          // Token list did not change, but still sync is_available in case it drifted
          const availBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { customer_update: { is_available: isAvailableValue } },
            extras: { find: { [customerFindKey]: userId } }
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
          // Combine fcm_token removal and is_available into ONE call to avoid out-of-order writes
          const isFcmUnavailable = this.localService.get('isFcmUnavailable') === 'true';
          const remainingCount = updatedTokens.length;
          const isAvailableValue = remainingCount >= 1;
          const staffUpdationPayload: any = {
            fcm_token: updatedTokens
          };
          if (!isFcmUnavailable) {
            staffUpdationPayload.is_available = isAvailableValue;
          }
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
          } else if (!isFcmUnavailable) {
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

    } catch (err) {
      console.error('[LogoutService] Error removing FCM token:', err);
    } finally {
      this._isCleaningUp = false;
    }
  }
}
