/** The superadmin has switched the hotel live (go_live = true). */
export function isGoLive(customer: any): boolean {
  const value = customer?.go_live;
  return value === true || value === 'true' || value === 1;
}

/**
 * Status the registration screens (Office, Property, Technical Info, Services, Hierarchy)
 * use to lock themselves: they become read-only for 'approved'.
 *
 * Paying hotels are approved right after payment and only then fill these screens, so
 * approval alone must not lock them. They lock once the superadmin switches the hotel live.
 */
export function registrationLockStatus(customer: any): string {
  if (isGoLive(customer)) {
    return 'approved';
  }
  const status = String(customer?.status || '');
  return status.toLowerCase() === 'approved' ? 'approved-not-live' : status;
}
