import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API, errorEnvelope, fakeJwt, signInAs } from '../../../testing/test-utils';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

@Component({ template: '' })
class Blank {}

describe('HTTP interceptors', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let navigate: ReturnType<typeof vi.spyOn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'profile', component: Blank },
          { path: 'login', component: Blank },
          { path: '403', component: Blank },
        ]),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    ctrl.verify();
    localStorage.clear();
  });

  describe('authInterceptor', () => {
    it('attaches the Bearer token to protected API requests', async () => {
      await signInAs(auth, ctrl, 'customer', 'jwt-abc');
      http.get(`${API}/auth/me`).subscribe();
      const req = ctrl.expectOne(`${API}/auth/me`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-abc');
      req.flush({});
    });

    it('does not attach a token to public endpoints', async () => {
      await signInAs(auth, ctrl);
      http.post(`${API}/auth/login`, {}).subscribe();
      expect(ctrl.expectOne(`${API}/auth/login`).request.headers.has('Authorization')).toBe(false);
    });

    it('never sends the token to another origin', async () => {
      await signInAs(auth, ctrl);
      http.get('https://third-party.example/data').subscribe();
      const req = ctrl.expectOne('https://third-party.example/data');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('sends no header when signed out', async () => {
      await auth.restoreSession();
      http.get(`${API}/auth/me`).subscribe({ error: () => undefined });
      const req = ctrl.expectOne(`${API}/auth/me`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('errorInterceptor', () => {
    const unauthorized = { status: 401, statusText: 'Unauthorized' };

    it('401 on a protected request clears the session and redirects to /login with returnUrl', async () => {
      // Really navigate so router.url is '/profile', then stub navigation again.
      navigateByUrl.mockRestore();
      await router.navigateByUrl('/profile');
      navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      await signInAs(auth, ctrl);

      let caught: unknown;
      http.get(`${API}/auth/me`).subscribe({ error: (e) => (caught = e) });
      ctrl.expectOne(`${API}/auth/me`).flush(errorEnvelope(401, 'Unauthorized'), unauthorized);

      expect(auth.token()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('fixflow.accessToken')).toBeNull();
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { reason: 'session-expired', returnUrl: '/profile' },
      });
      // The component still receives the original error.
      expect((caught as { status: number }).status).toBe(401);
    });

    it('parallel 401s redirect only once', async () => {
      await signInAs(auth, ctrl);
      http.get(`${API}/a`).subscribe({ error: () => undefined });
      http.get(`${API}/b`).subscribe({ error: () => undefined });
      const [a, b] = [ctrl.expectOne(`${API}/a`), ctrl.expectOne(`${API}/b`)];
      a.flush({}, unauthorized);
      b.flush({}, unauthorized);
      expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('a late 401 from an OLD token does not sign out a newer session', async () => {
      await signInAs(auth, ctrl, 'customer', 'old-token');
      http.get(`${API}/slow`).subscribe({ error: () => undefined });
      const slow = ctrl.expectOne(`${API}/slow`);

      auth.login({ email: 'a@b.co', password: 'StrongPassword123' }).subscribe();
      ctrl.expectOne(`${API}/auth/login`).flush({
        data: {
          accessToken: 'new-token',
          tokenType: 'Bearer',
          expiresIn: '1d',
          user: {
            id: '1',
            fullName: 'N',
            email: 'n@e.co',
            phone: null,
            role: 'customer',
            isActive: true,
          },
        },
      });

      slow.flush({}, unauthorized);
      expect(auth.token()).toBe('new-token');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('401 on login (wrong credentials) is not a session expiry', async () => {
      await auth.restoreSession();
      let caught: { status: number } | undefined;
      http.post(`${API}/auth/login`, {}).subscribe({ error: (e) => (caught = e) });
      ctrl
        .expectOne(`${API}/auth/login`)
        .flush(errorEnvelope(401, 'Invalid email or password'), unauthorized);

      expect(navigate).not.toHaveBeenCalled();
      expect(caught?.status).toBe(401);
    });

    it('does nothing before startup restore finishes (avoids redirect loops)', () => {
      localStorage.setItem('fixflow.accessToken', fakeJwt());
      // fresh instances are created lazily; initialized() is still false here
      expect(auth.initialized()).toBe(false);
      http.get(`${API}/auth/me`).subscribe({ error: () => undefined });
      ctrl.expectOne(`${API}/auth/me`).flush({}, unauthorized);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('403 goes to /403, keeps the session, and still surfaces the error', async () => {
      await signInAs(auth, ctrl);
      let caught: { status: number } | undefined;
      http.get(`${API}/auth/admin-only`).subscribe({ error: (e) => (caught = e) });
      ctrl
        .expectOne(`${API}/auth/admin-only`)
        .flush(errorEnvelope(403, 'You do not have permission to access this resource'), {
          status: 403,
          statusText: 'Forbidden',
        });

      expect(navigateByUrl).toHaveBeenCalledWith('/403');
      expect(auth.isAuthenticated()).toBe(true);
      expect(caught?.status).toBe(403);
    });

    it('other errors (e.g. 409, 500) pass through untouched', async () => {
      await signInAs(auth, ctrl);
      let caught: { status: number } | undefined;
      http.get(`${API}/x`).subscribe({ error: (e) => (caught = e) });
      ctrl.expectOne(`${API}/x`).flush({}, { status: 500, statusText: 'Server Error' });
      expect(caught?.status).toBe(500);
      expect(navigate).not.toHaveBeenCalled();
      expect(auth.isAuthenticated()).toBe(true);
    });
  });
});
