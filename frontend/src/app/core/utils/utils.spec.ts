import { HttpErrorResponse } from '@angular/common/http';

import { fakeJwt } from '../../../testing/test-utils';
import { parseApiError } from './api-error';
import { isApiRequest, isPublicRequest } from './http-url';
import { getTokenExpiry, isTokenExpired } from './jwt';
import { safeReturnUrl } from './return-url';

describe('parseApiError', () => {
  it('uses the server message and validation details', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'Validation failed', errors: ['email must be an email'] },
    });
    expect(parseApiError(err)).toEqual({
      status: 400,
      message: 'Validation failed',
      details: ['email must be an email'],
    });
  });

  it('preserves a 409 message', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { message: 'Email already registered', errors: null },
    });
    expect(parseApiError(err).message).toBe('Email already registered');
  });

  it('explains an unreachable server (status 0)', () => {
    const info = parseApiError(
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
    );
    expect(info.status).toBe(0);
    expect(info.message).toMatch(/cannot reach the server/i);
  });

  it('falls back to generic text for unexpected bodies and non-HTTP errors', () => {
    expect(parseApiError(new HttpErrorResponse({ status: 500, error: '<html>' })).message).toMatch(
      /something went wrong/i,
    );
    expect(parseApiError(new Error('boom')).message).toMatch(/something went wrong/i);
  });
});

describe('jwt helpers', () => {
  it('reads exp and detects expiry', () => {
    expect(getTokenExpiry(fakeJwt(60))).toBeGreaterThan(Date.now() / 1000);
    expect(isTokenExpired(fakeJwt(60))).toBe(false);
    expect(isTokenExpired(fakeJwt(-60))).toBe(true);
  });

  it('treats malformed tokens as expired', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
    expect(isTokenExpired('a.b.c')).toBe(true);
    expect(getTokenExpiry('a.%%%.c')).toBeNull();
  });
});

describe('safeReturnUrl', () => {
  it('accepts in-app paths', () => {
    expect(safeReturnUrl('/profile')).toBe('/profile');
    expect(safeReturnUrl('/team?x=1')).toBe('/team?x=1');
  });

  it('rejects open-redirect attempts and auth pages', () => {
    for (const bad of [
      '//evil.com',
      'https://evil.com',
      '/\\evil.com',
      'profile',
      '/login',
      '/login?x=1',
      '/register',
      null,
      42,
    ]) {
      expect(safeReturnUrl(bad)).toBeNull();
    }
  });
});

describe('http-url helpers', () => {
  const api = 'http://localhost:3000';

  it('recognises API requests only for the configured origin', () => {
    expect(isApiRequest(`${api}/auth/me`, api)).toBe(true);
    expect(isApiRequest('https://evil.com/auth/me', api)).toBe(false);
    expect(isApiRequest('http://localhost:30001/x', api)).toBe(false);
  });

  it('recognises public endpoints', () => {
    expect(isPublicRequest(`${api}/auth/login`, api)).toBe(true);
    expect(isPublicRequest(`${api}/auth/register?x=1`, api)).toBe(true);
    expect(isPublicRequest(`${api}/auth/me`, api)).toBe(false);
    expect(isPublicRequest('https://evil.com/auth/login', api)).toBe(false);
  });
});
