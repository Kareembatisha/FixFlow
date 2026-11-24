import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { isApiRequest, isPublicRequest } from '../utils/http-url';

/**
 * Adds `Authorization: Bearer <token>` to FixFlow API requests when a session exists.
 * Skipped for public endpoints (login/register) and for any non-API URL so the token
 * can never leak to another origin. AuthService is resolved per request (not at
 * construction), which avoids a circular dependency with HttpClient.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  const token = inject(AuthService).token();

  if (!token || !isApiRequest(req.url, apiUrl) || isPublicRequest(req.url, apiUrl)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
