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
      if (!currentToken) {
        console.log('[LogoutService] No token found — skipping DB removal.');
        return;
      }

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
        if (Array.isArray(customer.fcm_token)) {
          customer.fcm_token = customer.fcm_token.filter((t: string) => t !== currentToken);
          const updateBody = {
            domain_name: DOMAIN_NAME,
            user_id: USER_ID,
            payload: { customer_update: { fcm_token: customer.fcm_token } },
            extras: { find: { [customerFindKey]: userId } }
          };
          await this.hotelenrollmenttabviewService
            .updateCustomerFcm(updateBody)
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
          if (Array.isArray(staff.fcm_token)) {
            staff.fcm_token = staff.fcm_token.filter((t: string) => t !== currentToken);
            const updateBody = {
              domain_name: DOMAIN_NAME,
              user_id: USER_ID,
              payload: { staff_updation: { fcm_token: staff.fcm_token } },
              extras: { find: { id: userId } }
            };
            await this.staffService.updateStaff(updateBody).toPromise();
          }

          // Mark staff as unavailable conditionally
          const isFcmUnavailable = this.localService.get('isFcmUnavailable') === 'true';
          if (!isFcmUnavailable) {
            const remainingCount = Array.isArray(staff.fcm_token) ? staff.fcm_token.length : 0;
            const isAvailableValue = remainingCount >= 1;
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
