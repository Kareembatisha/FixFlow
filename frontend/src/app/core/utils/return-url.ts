/**
 * Accepts only in-app absolute paths ("/foo?bar=1"). Rejects protocol-relative
 * ("//evil.com"), backslash tricks and full URLs so `returnUrl` can't be used
 * as an open redirect. Auth pages themselves are never valid return targets.
 */
export function safeReturnUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (/^\/(login|register)(\/|\?|#|$)/.test(value)) return null;
  return value;
}
