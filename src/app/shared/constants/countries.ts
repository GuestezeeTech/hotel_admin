export interface CountryState {
  country: string;
  states: string[];
}

export interface CountryCode {
  country: string;
  code: string;
}

/**
 * Filled from the countries-states API by CountryListService (managed in superadmin).
 * They start empty on purpose: there is no built-in country list in the admin app.
 */
export const COUNTRY_CODES: CountryCode[] = [];

export const COUNTRY_STATES: CountryState[] = [];
