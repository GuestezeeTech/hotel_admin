/**
 * Safe INR helpers for dashboard amounts (incl. crore-scale values).
 * Avoids NaN/undefined toLocaleString throws and keeps UI from overflowing.
 */

export function parseMoneyAmount(value: unknown): number {
  if (value == null || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const cleaned = String(value)
    .replace(/[₹Rs.\s]/gi, '')
    .replace(/,/g, '')
    .trim();
  if (!cleaned || cleaned === '—' || cleaned.toLowerCase() === 'nan') {
    return 0;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export type FormatInrOptions = {
  /** Shorter label for KPI / donut centers (L / Cr). */
  compact?: boolean;
  /** Fraction digits when not compact (default 2). */
  fractionDigits?: number;
};

/**
 * Format as Indian rupees, e.g. ₹12,00,00,000.00
 * Compact: ₹1.20 Cr / ₹12.50 L for large values in tight UI.
 */
export function formatInr(value: unknown, options: FormatInrOptions = {}): string {
  const amount = parseMoneyAmount(value);
  const abs = Math.abs(amount);

  if (options.compact) {
    if (abs >= 1_00_00_000) {
      const cr = amount / 1_00_00_000;
      return `₹${safeLocale(cr, 2)} Cr`;
    }
    if (abs >= 1_00_000) {
      const lakh = amount / 1_00_000;
      return `₹${safeLocale(lakh, 2)} L`;
    }
  }

  const digits = options.fractionDigits ?? 2;
  return `₹${safeLocale(amount, digits)}`;
}

function safeLocale(amount: number, fractionDigits: number): string {
  try {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
  } catch {
    return amount.toFixed(fractionDigits);
  }
}
