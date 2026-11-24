/**
 * Reads the `exp` claim (seconds since epoch) from a JWT WITHOUT verifying it.
 * Used only to skip pointless requests with an obviously expired token; the
 * backend remains the authority on whether a token is valid.
 * Returns null when the token is malformed or has no numeric `exp`.
 */
export function getTokenExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True when the token is malformed, lacks `exp`, or `exp` is in the past. */
export function isTokenExpired(token: string, nowMs: number = Date.now()): boolean {
  const exp = getTokenExpiry(token);
  return exp === null || exp * 1000 <= nowMs;
}
