import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API, envelope, errorEnvelope, fakeJwt, makeUser } from '../../../../testing/test-utils';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { Login } from './login';

@Component({ template: '' })
class Blank {}

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;
  let auth: AuthService;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function type(selector: string, value: string) {
    const input = $<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit() {
    $<HTMLButtonElement>('button[type=submit]')!.click();
  }

  async function create(url = '/login') {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    // Navigate for real first so the component sees the URL's query params, then stub navigation.
    await router.navigateByUrl(url);
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await auth.restoreSession();
    fixture = TestBed.createComponent(Login);
    el = fixture.nativeElement;
    await settle();
  }

  afterEach(() => {
    ctrl.verify();
    localStorage.clear();
  });

  it('does not submit an invalid form and shows validation messages', async () => {
    await create();
    submit();
    await settle();

    ctrl.expectNone(`${API}/auth/login`);
    expect($('#email-error')?.textContent).toMatch(/enter your email/i);
    expect($('#password-error')?.textContent).toMatch(/enter your password/i);
    expect($('#email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('validates the email format', async () => {
    await create();
    type('#email', 'not-an-email');
    $<HTMLInputElement>('#email')!.dispatchEvent(new Event('blur'));
    await settle();
    expect($('#email-error')?.textContent).toMatch(/valid email/i);
  });

  it('signs in, shows a loading state, ignores double clicks and navigates to the role home', async () => {
    await create();
    type('#email', '  Customer@Example.com ');
    type('#password', 'StrongPassword123');
    submit();
    submit(); // duplicate click while in flight
    await settle();

    const btn = $<HTMLButtonElement>('button[type=submit]')!;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/signing in/i);

    const req = ctrl.expectOne(`${API}/auth/login`); // exactly one request
    expect(req.request.body).toEqual({
      email: 'customer@example.com',
      password: 'StrongPassword123',
    });
    req.flush(
      envelope({
        accessToken: fakeJwt(),
        tokenType: 'Bearer',
        expiresIn: '1d',
        user: makeUser('customer'),
      }),
    );
    await settle();

    expect(auth.isAuthenticated()).toBe(true);
    expect(navigateByUrl).toHaveBeenCalledWith('/my-requests');
    expect($<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('shows the server message for invalid credentials and re-enables the form', async () => {
    await create();
    type('#email', 'customer@example.com');
    type('#password', 'WrongPassword1');
    submit();
    ctrl.expectOne(`${API}/auth/login`).flush(errorEnvelope(401, 'Invalid email or password'), {
      status: 401,
      statusText: 'Unauthorized',
    });
    await settle();

    expect($('[role=alert]')?.textContent).toContain('Invalid email or password');
    expect($<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('lists backend validation errors', async () => {
    await create();
    type('#email', 'customer@example.com');
    type('#password', 'short');
    submit();
    ctrl
      .expectOne(`${API}/auth/login`)
      .flush(
        errorEnvelope(400, 'Validation failed', [
          'password must be longer than or equal to 8 characters',
        ]),
        {
          status: 400,
          statusText: 'Bad Request',
        },
      );
    await settle();

    const alert = $('[role=alert]')!;
    expect(alert.textContent).toContain('Validation failed');
    expect(alert.querySelectorAll('li').length).toBe(1);
    expect(alert.textContent).toContain('password must be longer');
  });

  it('explains when the server is unreachable', async () => {
    await create();
    type('#email', 'customer@example.com');
    type('#password', 'StrongPassword123');
    submit();
    ctrl.expectOne(`${API}/auth/login`).error(new ProgressEvent('error'));
    await settle();
    expect($('[role=alert]')?.textContent).toMatch(/cannot reach the server/i);
  });

  it('honours a safe returnUrl and ignores an unsafe one', async () => {
    await create('/login?returnUrl=%2Fprofile');
    type('#email', 'customer@example.com');
    type('#password', 'StrongPassword123');
    submit();
    ctrl.expectOne(`${API}/auth/login`).flush(
      envelope({
        accessToken: fakeJwt(),
        tokenType: 'Bearer',
        expiresIn: '1d',
        user: makeUser('customer'),
      }),
    );
    await settle();
    expect(navigateByUrl).toHaveBeenCalledWith('/profile');
  });

  it('ignores an external returnUrl', async () => {
    await create('/login?returnUrl=https%3A%2F%2Fevil.com');
    type('#email', 'customer@example.com');
    type('#password', 'StrongPassword123');
    submit();
    ctrl.expectOne(`${API}/auth/login`).flush(
      envelope({
        accessToken: fakeJwt(),
        tokenType: 'Bearer',
        expiresIn: '1d',
        user: makeUser('admin'),
      }),
    );
    await settle();
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a notice after sign-up and after a session expiry', async () => {
    await create('/login?registered=1');
    expect($('[role=status]')?.textContent).toMatch(/account created/i);
    TestBed.resetTestingModule();

    await create('/login?reason=session-expired');
    expect($('[role=status]')?.textContent).toMatch(/session has ended/i);
  });
});
