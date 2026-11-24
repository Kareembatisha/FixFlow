import { HttpTestingController } from '@angular/common/http/testing';

import { ApiResponse } from '../app/core/models/api-response.model';
import { LoginResponse } from '../app/core/models/auth.model';
import { User, UserRole } from '../app/core/models/user.model';
import { AuthService } from '../app/core/services/auth.service';

export const API = 'http://localhost:3000';

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Unsigned fake JWT; only the `exp` claim matters to the frontend. */
export function fakeJwt(expiresInSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ sub: 'u1', exp })}.signature`;
}

export function makeUser(role: UserRole = 'customer'): User {
  return {
    id: `id-${role}`,
    fullName: `Test ${role}`,
    email: `${role}@example.com`,
    phone: '01000000000',
    role,
    isActive: true,
  };
}

export function envelope<T>(data: T, statusCode = 200): ApiResponse<T> {
  return {
    status: true,
    statusCode,
    meta: null,
    message: 'Request successful',
    errors: null,
    data,
  };
}

export function errorEnvelope(statusCode: number, message: string, errors: string[] | null = null) {
  return { status: false, statusCode, meta: null, message, errors, data: null };
}

/** Completes startup restore (no stored token) then signs in through the mocked API. */
export async function signInAs(
  auth: AuthService,
  http: HttpTestingController,
  role: UserRole = 'customer',
  token = fakeJwt(),
): Promise<void> {
  await auth.restoreSession();
  auth.login({ email: `${role}@example.com`, password: 'StrongPassword123' }).subscribe();
  const payload: LoginResponse = {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: '1d',
    user: makeUser(role),
  };
  http.expectOne(`${API}/auth/login`).flush(envelope(payload));
}
