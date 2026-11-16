/** The superadmin has switched the hotel live (go_live = true). */
export function isGoLive(customer: any): boolean {
  const value = customer?.go_live;
  return value === true || value === 'true' || value === 1;
}

/**
 * Status the registration screens (Office, Property, Technical Info, Services, Hierarchy)
 * use to lock themselves. They already become read-only for 'approved'; a hotel that is live
 * is locked the same way, even if its status changes later.
 */
export function registrationLockStatus(customer: any): string {
  return isGoLive(customer) ? 'approved' : customer?.status;
}
