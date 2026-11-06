/** Format clock strings / Date values as 12-hour AM/PM (e.g. 1:15:13 PM). */

export function formatAmPmTime(
  value: string | Date | null | undefined,
  options: { includeSeconds?: boolean } = {}
): string {
  const includeSeconds = options.includeSeconds === true;
  if (value == null || value === '') {
    return '';
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    return value.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {})
    });
  }

  const raw = String(value).trim();
  if (!raw || raw === '—') {
    return raw === '—' ? '—' : '';
  }

  // Already AM/PM
  if (/\b(am|pm)\b/i.test(raw)) {
    return raw.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  }

  // Standalone HH:mm[:ss]
  const clockMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (clockMatch) {
    return toAmPm(+clockMatch[1], +clockMatch[2], clockMatch[3] != null ? +clockMatch[3] : null, includeSeconds);
  }

  // Trailing clock in a longer string (e.g. "2026-11-03 13:15:13" or "03 Nov 13:15:13")
  const trailing = raw.match(/(.*?)(?:\s+|T)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i);
  if (trailing) {
    const prefix = trailing[1].trim();
    const ampm = toAmPm(+trailing[2], +trailing[3], trailing[4] != null ? +trailing[4] : null, includeSeconds);
    // If prefix looks like an ISO date, format it more readably when possible
    const isoDate = prefix.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDate) {
      const d = new Date(+isoDate[1], +isoDate[2] - 1, +isoDate[3]);
      if (!Number.isNaN(d.getTime())) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleString('en-GB', { month: 'short' });
        return `${day} ${month} ${isoDate[1]} ${ampm}`;
      }
    }
    return prefix ? `${prefix} ${ampm}` : ampm;
  }

  // Full ISO / parseable datetime
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && /[T\-]/.test(raw)) {
    return parsed.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {})
    });
  }

  return raw;
}

function toAmPm(
  hour24: number,
  minute: number,
  second: number | null,
  includeSeconds: boolean
): string {
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return '';
  }
  const period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  const mm = String(minute).padStart(2, '0');
  if (includeSeconds && second != null && Number.isFinite(second)) {
    return `${hour12}:${mm}:${String(second).padStart(2, '0')} ${period}`;
  }
  return `${hour12}:${mm} ${period}`;
}
