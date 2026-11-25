const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats an API date string for display, or returns an em dash when it is missing/invalid.
 * Date-only values ("2026-12-01") are read as local dates so the day never shifts by time zone.
 * Safe by design: a bad value from the API must not break a page the way DatePipe would.
 */
export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const dateOnly = DATE_ONLY.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    ...(withTime && !dateOnly ? { timeStyle: 'short' } : {}),
  }).format(date);
}
