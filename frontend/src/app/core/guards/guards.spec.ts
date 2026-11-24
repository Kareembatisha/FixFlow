import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { signInAs } from '../../../testing/test-utils';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('route guards', () => {
  let auth: AuthService;
  let ctrl: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    ctrl = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  function run(guard: CanActivateFn, url = '/dashboard', roles?: UserRole[]) {
    const route = { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => guard(route, state));
  }

  const asString = (result: unknown) => router.serializeUrl(result as UrlTree);

  describe('authGuard', () => {
    it('redirects anonymous users to /login and keeps the intended URL', async () => {
      await auth.restoreSession();
      expect(asString(run(authGuard, '/dashboard'))).toBe('/login?returnUrl=%2Fdashboard');
    });

    it('omits returnUrl for the root path', async () => {
      await auth.restoreSession();
      expect(asString(run(authGuard, '/'))).toBe('/login');
    });

    it('lets authenticated users through', async () => {
      await signInAs(auth, ctrl, 'customer');
      expect(run(authGuard)).toBe(true);
    });
  });

  describe('guestGuard', () => {
    it('allows anonymous users', async () => {
      await auth.restoreSession();
      expect(run(guestGuard, '/login')).toBe(true);
    });

    it('sends signed-in users to their role home', async () => {
      await signInAs(auth, ctrl, 'supervisor');
      expect(asString(run(guestGuard, '/login'))).toBe('/team');
    });
  });

  describe('roleGuard', () => {
    it('redirects anonymous users to /login', async () => {
      await auth.restoreSession();
      expect(asString(run(roleGuard, '/dashboard', ['admin']))).toBe(
        '/login?returnUrl=%2Fdashboard',
      );
    });

    it('redirects a customer away from an admin route to /403', async () => {
      await signInAs(auth, ctrl, 'customer');
      expect(asString(run(roleGuard, '/dashboard', ['admin']))).toBe('/403');
    });

    it('allows an admin on an admin route', async () => {
      await signInAs(auth, ctrl, 'admin');
      expect(run(roleGuard, '/dashboard', ['admin'])).toBe(true);
    });

    it('allows any listed role', async () => {
      await signInAs(auth, ctrl, 'technician');
      expect(run(roleGuard, '/x', ['technician', 'supervisor'])).toBe(true);
    });

    it('fails closed when the route declares no roles', async () => {
      await signInAs(auth, ctrl, 'admin');
      expect(asString(run(roleGuard, '/x'))).toBe('/403');
    });
  });
});
