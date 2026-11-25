import { formatDate } from './format-date';

describe('formatDate', () => {
  it.each([null, undefined, '', 'not-a-date'])('returns a dash for %j', (value) => {
    expect(formatDate(value)).toBe('—');
  });

  it('keeps a date-only value on the same calendar day', () => {
    expect(formatDate('2026-12-01')).toBe('1 Dec 2026');
  });

  it('formats a timestamp, adding the time only when asked', () => {
    expect(formatDate('2026-12-01T10:30:00.000Z')).toMatch(/^\d{1,2} Dec 2026$/);
    expect(formatDate('2026-12-01T10:30:00.000Z', true)).toMatch(/Dec 2026.*\d{2}:\d{2}/);
  });
});
