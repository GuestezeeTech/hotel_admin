import { Injectable } from '@angular/core';

export type DashboardPeriodState = {
  selectedPeriod: string;
  customFrom: string;
  customTo: string;
};

/**
 * Shared date-period selection across Overview / F&B / FO / HK dashboards.
 * Survives route changes within the browser session.
 */
@Injectable({ providedIn: 'root' })
export class DashboardPeriodStateService {
  private readonly storageKey = 'guestezee.dashboard.period';

  selectedPeriod = 'Today';
  customFrom = '';
  customTo = '';

  constructor() {
    this.restore();
  }

  snapshot(): DashboardPeriodState {
    return {
      selectedPeriod: this.selectedPeriod,
      customFrom: this.customFrom,
      customTo: this.customTo
    };
  }

  /** Copy global period onto a dashboard component. */
  hydrate(target: DashboardPeriodState): void {
    const snap = this.snapshot();
    target.selectedPeriod = snap.selectedPeriod;
    target.customFrom = snap.customFrom;
    target.customTo = snap.customTo;
  }

  /**
   * Apply period (+ optional custom dates), normalize For Date / Date Range
   * inputs, and persist for all dashboards.
   */
  apply(period: string, customFrom = this.customFrom, customTo = this.customTo): DashboardPeriodState {
    let nextPeriod = String(period || 'Today').trim() || 'Today';
    if (nextPeriod === 'Custom Range') {
      nextPeriod = 'Date Range';
    } else if (nextPeriod === 'Particular Date') {
      nextPeriod = 'For Date';
    } else if (
      nextPeriod === 'All Dates' ||
      nextPeriod === 'All' ||
      nextPeriod === 'All Time'
    ) {
      // All Dates option temporarily hidden in period filters.
      nextPeriod = 'Today';
    }

    this.selectedPeriod = nextPeriod;
    this.customFrom = customFrom || '';
    this.customTo = customTo || '';
    this.syncDateInputs();
    this.persist();
    return this.snapshot();
  }

  setCustomRange(customFrom: string, customTo: string): DashboardPeriodState {
    this.customFrom = customFrom || '';
    this.customTo = customTo || '';
    if (this.selectedPeriod === 'For Date') {
      this.customTo = this.customFrom;
    }
    this.persist();
    return this.snapshot();
  }

  private syncDateInputs(): void {
    const now = new Date();
    if (this.selectedPeriod === 'For Date') {
      if (!this.customFrom) {
        this.customFrom = this.toInputDate(now);
      }
      this.customTo = this.customFrom;
      return;
    }
    if (this.selectedPeriod === 'Date Range' || this.selectedPeriod === 'Custom Range') {
      // Leave From/To empty until the user picks both (no auto-fill).
      return;
    }
    this.customFrom = '';
    this.customTo = '';
  }

  private toInputDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private persist(): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.snapshot()));
    } catch {
      /* ignore quota / private mode */
    }
  }

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<DashboardPeriodState>;
      if (parsed?.selectedPeriod) {
        let restored = String(parsed.selectedPeriod);
        if (
          restored === 'All Dates' ||
          restored === 'All' ||
          restored === 'All Time'
        ) {
          // All Dates option temporarily hidden in period filters.
          restored = 'Today';
        }
        this.selectedPeriod = restored;
      }
      this.customFrom = String(parsed?.customFrom ?? '');
      this.customTo = String(parsed?.customTo ?? '');
      this.syncDateInputs();
    } catch {
      /* ignore bad storage */
    }
  }
}
