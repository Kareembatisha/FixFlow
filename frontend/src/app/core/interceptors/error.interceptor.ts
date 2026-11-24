import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { isApiRequest, isPublicRequest } from '../utils/http-url';
import { safeReturnUrl } from '../utils/return-url';

/**
 * Central reaction to API failures. It never swallows the error: the original
 * HttpErrorResponse is always re-thrown so forms can show the server's message
 * (see `parseApiError`).
 *
 * - 401 on a protected request  -> the session is invalid/expired: clear it and go to /login
 *   (remembering where the user was). Only acts if the failing request used the CURRENT
 *   token, so a burst of parallel 401s redirects once and a late 401 from an old token
 *   can't sign out a newer login.
 * - 403 -> the session is fine but the role isn't allowed: go to /403, keep the session.
 * - Public endpoints (login/register) are left alone: a 401 there means "wrong credentials".
 * - Nothing happens before startup restore finishes; guards handle that case.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const apiUrl = inject(API_URL);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        auth.initialized() &&
        isApiRequest(req.url, apiUrl) &&
        !isPublicRequest(req.url, apiUrl)
      ) {
        if (error.status === 401) {
          const currentToken = auth.token();
          if (currentToken && req.headers.get('Authorization') === `Bearer ${currentToken}`) {
            const returnUrl = safeReturnUrl(router.url);
            auth.clearSession();
            void router.navigate(['/login'], {
              queryParams: { reason: 'session-expired', ...(returnUrl ? { returnUrl } : {}) },
            });
          }
        } else if (
          error.status === 403 &&
          auth.isAuthenticated() &&
          !router.url.startsWith('/403')
        ) {
          void router.navigateByUrl('/403');
        }
      }
      return throwError(() => error);
    }),
  );
};
