import { Injectable } from '@angular/core';

/** Free daily USD rates, no account key needed (ExchangeRate-API open access). */
const LIVE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'usdInrRate';
/** The source updates once a day; re-check every 6 hours */
const CACHE_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;

export interface UsdInrRate {
  /** Rupees per US dollar */
  rate: number;
  /** true when it is today's market rate, false when the saved plan rate was used */
  live: boolean;
}

/**
 * Today's USD -> INR rate for CCAvenue charges. Falls back to the rate saved on the plan
 * (inr_per_usd, set in the superadmin) when the live rate cannot be loaded.
 */
@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private pending: Promise<number | null> | null = null;

  async getInrPerUsd(fallback: number): Promise<UsdInrRate> {
    const live = await this.liveRate();
    return live ? { rate: live, live: true } : { rate: fallback, live: false };
  }

  private liveRate(): Promise<number | null> {
    const cached = this.readCache();
    if (cached) {
      return Promise.resolve(cached);
    }
    if (!this.pending) {
      this.pending = this.fetchRate().finally(() => (this.pending = null));
    }
    return this.pending;
  }

  private async fetchRate(): Promise<number | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(LIVE_RATE_URL, { signal: controller.signal });
      const data = await resp.json();
      const rate = Number(data?.rates?.INR);
      if (data?.result !== 'success' || !Number.isFinite(rate) || rate <= 0) {
        return null;
      }
      const rounded = Number(rate.toFixed(2));
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rate: rounded, at: Date.now() }));
      } catch {
        // storage unavailable: just do not cache
      }
      return rounded;
    } catch (err) {
      console.warn('Live USD-INR rate unavailable, using the saved plan rate', err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private readCache(): number | null {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      const rate = Number(saved?.rate);
      return Number.isFinite(rate) && rate > 0 && Date.now() - Number(saved?.at) < CACHE_MS ? rate : null;
    } catch {
      return null;
    }
  }
}
