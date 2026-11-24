import { Injectable } from '@angular/core';

const TOKEN_KEY = 'fixflow.accessToken';

/**
 * Persists the access token in localStorage so a browser refresh keeps the session.
 *
 * SECURITY NOTE: the backend only issues Bearer tokens in the response body, so the
 * frontend must store the token itself. Unlike an HttpOnly cookie, localStorage is
 * readable by any JavaScript on the page, so an XSS bug could steal the token. Mitigations:
 * Angular's template escaping, no third-party scripts, a 1-day token lifetime, and never
 * logging the token. Moving to HttpOnly cookies would require backend changes.
 * Storage can throw (private mode, quota, disabled); every access is guarded.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* Session simply won't survive a refresh. */
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
}
