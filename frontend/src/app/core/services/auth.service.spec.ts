import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import {
  API,
  envelope,
  errorEnvelope,
  fakeJwt,
  makeUser,
  signInAs,
} from '../../../testing/test-utils';
import { AuthService } from './auth.service';

const TOKEN_KEY = 'fixflow.accessToken';

describe('AuthService', () => {
  let http: HttpTestingController;

  function setup(storedToken?: string): AuthService {
    localStorage.clear();
    if (storedToken) localStorage.setItem(TOKEN_KEY, storedToken);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('starts signed out', () => {
    const auth = setup();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.role()).toBeNull();
    expect(auth.initialized()).toBe(false);
  });

  it('login updates signals and persists the token', async () => {
    const auth = setup();
    await signInAs(auth, http, 'technician', 'tok-123');

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.token()).toBe('tok-123');
    expect(auth.user()?.email).toBe('technician@example.com');
    expect(auth.role()).toBe('technician');
    expect(auth.homePath()).toBe('/my-tasks');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok-123');
  });

  it('login failure leaves the state untouched and surfaces the error', async () => {
    const auth = setup();
    let status = 0;
    auth
      .login({ email: 'a@b.co', password: 'wrongpass' })
      .subscribe({ error: (e) => (status = e.status) });
    http.expectOne(`${API}/auth/login`).flush(errorEnvelope(401, 'Invalid email or password'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('register returns the new user and does NOT sign in', () => {
    const auth = setup();
    let created: unknown;
    auth
      .register({ fullName: 'New User', email: 'n@e.co', password: 'StrongPassword123' })
      .subscribe((u) => (created = u));
    const req = http.expectOne(`${API}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush(envelope(makeUser('customer'), 201), { status: 201, statusText: 'Created' });

    expect(created).toEqual(makeUser('customer'));
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
  });

  it('logout clears state and storage and navigates to /login', async () => {
    const auth = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await signInAs(auth, http);

    await auth.logout();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  describe('restoreSession', () => {
    it('with no token: no request, initialized', async () => {
      const auth = setup();
      await auth.restoreSession();
      expect(auth.initialized()).toBe(true);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('with a valid token: loads the user from /auth/me', async () => {
      const token = fakeJwt(3600);
      const auth = setup(token);
      const done = auth.restoreSession();
      const req = http.expectOne(`${API}/auth/me`);
      req.flush(envelope(makeUser('supervisor')));
      await done;

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.role()).toBe('supervisor');
      expect(auth.token()).toBe(token);
      expect(auth.initialized()).toBe(true);
    });

    it('with an expired token: clears without calling the API', async () => {
      const auth = setup(fakeJwt(-60));
      await auth.restoreSession();

      http.expectNone(`${API}/auth/me`);
      expect(auth.token()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(auth.initialized()).toBe(true);
    });

    it('with a malformed token: clears without calling the API', async () => {
      const auth = setup('garbage');
      await auth.restoreSession();
      http.expectNone(`${API}/auth/me`);
      expect(auth.token()).toBeNull();
    });

    it('when the API rejects the token (401): clears the session', async () => {
      const auth = setup(fakeJwt(3600));
      const done = auth.restoreSession();
      http
        .expectOne(`${API}/auth/me`)
        .flush(errorEnvelope(401, 'Unauthorized'), { status: 401, statusText: 'Unauthorized' });
      await done;

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(auth.initialized()).toBe(true);
    });

    it('when the API is unreachable: keeps the token for a later retry but is not authenticated', async () => {
      const token = fakeJwt(3600);
      const auth = setup(token);
      const done = auth.restoreSession();
      http.expectOne(`${API}/auth/me`).error(new ProgressEvent('error'));
      await done;

      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
      expect(auth.initialized()).toBe(true);
    });
  });
});
