import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { signInAs } from '../testing/test-utils';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { UserRole } from './core/models/user.model';
import { AuthService } from './core/services/auth.service';

/** Exercises the real route table: Router -> authGuard -> roleGuard -> component. */
describe('route table', () => {
  let auth: AuthService;
  let ctrl: HttpTestingController;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    ctrl = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => localStorage.clear());

  async function go(url: string): Promise<string> {
    await harness.navigateByUrl(url);
    return router.url;
  }

  async function signIn(role: UserRole) {
    await signInAs(auth, ctrl, role);
  }

  it('sends anonymous users to /login with the intended URL', async () => {
    await auth.restoreSession();
    expect(await go('/dashboard')).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('redirects a customer who opens /dashboard to /403', async () => {
    await signIn('customer');
    expect(await go('/dashboard')).toBe('/403');
  });

  it('lets an admin open /dashboard and /users', async () => {
    await signIn('admin');
    expect(await go('/dashboard')).toBe('/dashboard');
    expect(await go('/users')).toBe('/users');
  });

  it.each<[UserRole, string, string]>([
    ['customer', '/my-requests', '/my-tasks'],
    ['technician', '/my-tasks', '/team'],
    ['supervisor', '/team', '/dashboard'],
  ])('%s may open %s but not %s', async (role, allowed, denied) => {
    await signIn(role);
    expect(await go(allowed)).toBe(allowed);
    expect(await go(denied)).toBe('/403');
  });

  it('lets a customer open the request form and a request detail page', async () => {
    await signIn('customer');
    expect(await go('/my-requests/new')).toBe('/my-requests/new');
    expect(harness.routeNativeElement?.querySelector('app-request-form')).not.toBeNull();
    expect(await go('/my-requests/123')).toBe('/my-requests/123');
    expect(harness.routeNativeElement?.querySelector('app-request-details')).not.toBeNull();
  });

  it.each<[UserRole, string]>([
    ['technician', '/my-requests/new'],
    ['supervisor', '/my-requests/123'],
    ['admin', '/my-requests'],
  ])('keeps %s out of %s', async (role, url) => {
    await signIn(role);
    expect(await go(url)).toBe('/403');
  });

  it('sends anonymous users away from the request pages', async () => {
    await auth.restoreSession();
    expect(await go('/my-requests/new')).toBe('/login?returnUrl=%2Fmy-requests%2Fnew');
  });

  it.each<[UserRole, string]>([
    ['customer', '/my-requests'],
    ['technician', '/my-tasks'],
    ['supervisor', '/team'],
    ['admin', '/dashboard'],
  ])('"/" lands %s on %s', async (role, home) => {
    await signIn(role);
    expect(await go('/')).toBe(home);
  });

  it('keeps signed-in users off /login', async () => {
    await signIn('customer');
    expect(await go('/login')).toBe('/my-requests');
  });

  it('allows every role on /profile (/auth/me is requested by the page)', async () => {
    await signIn('technician');
    expect(await go('/profile')).toBe('/profile');
    ctrl.match((r) => r.url.endsWith('/auth/me')).forEach((r) => r.flush({ data: auth.user() }));
  });

  it('shows /login to anonymous users', async () => {
    await auth.restoreSession();
    expect(await go('/login')).toBe('/login');
    expect(await go('/register')).toBe('/register');
  });

  it('unknown URLs fall back to the guarded root', async () => {
    await auth.restoreSession();
    expect(await go('/nope')).toBe('/login');
  });
});
