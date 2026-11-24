import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API, envelope, errorEnvelope, makeUser } from '../../../../testing/test-utils';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

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

  function fillValid(phone = '') {
    type('#fullName', ' Test Customer ');
    type('#email', 'Customer@Example.com');
    type('#password', 'StrongPassword123');
    type('#phone', phone);
  }

  const submit = () => $<HTMLButtonElement>('button[type=submit]')!.click();

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await auth.restoreSession();
    fixture = TestBed.createComponent(Register);
    el = fixture.nativeElement;
    await settle();
  });

  afterEach(() => {
    ctrl.verify();
    localStorage.clear();
  });

  it('blocks submission and shows a message per invalid field', async () => {
    submit();
    await settle();

    ctrl.expectNone(`${API}/auth/register`);
    expect($('#fullName-error')?.textContent).toMatch(/enter your full name/i);
    expect($('#email-error')?.textContent).toMatch(/enter your email/i);
    expect($('#password-error')?.textContent).toMatch(/choose a password/i);
    expect($('#phone-error')).toBeNull(); // phone is optional
  });

  it('enforces password length and phone format', async () => {
    type('#fullName', 'Test Customer');
    type('#email', 'a@b.co');
    type('#password', 'short');
    type('#phone', 'abc');
    submit();
    await settle();

    ctrl.expectNone(`${API}/auth/register`);
    expect($('#password-error')?.textContent).toMatch(/at least 8/i);
    expect($('#phone-error')?.textContent).toMatch(/digits/i);
  });

  it('registers (normalised payload, no empty phone), then goes to /login with a notice', async () => {
    fillValid();
    submit();
    submit(); // duplicate click
    await settle();

    expect($<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    expect($<HTMLButtonElement>('button[type=submit]')!.textContent).toMatch(/creating account/i);

    const req = ctrl.expectOne(`${API}/auth/register`);
    expect(req.request.body).toEqual({
      fullName: 'Test Customer',
      email: 'customer@example.com',
      password: 'StrongPassword123',
    });
    req.flush(envelope(makeUser('customer'), 201), { status: 201, statusText: 'Created' });
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1' },
      state: { email: 'customer@example.com' },
    });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('sends the phone when provided', async () => {
    fillValid('01000000000');
    submit();
    const req = ctrl.expectOne(`${API}/auth/register`);
    expect((req.request.body as { phone: string }).phone).toBe('01000000000');
    req.flush(envelope(makeUser(), 201), { status: 201, statusText: 'Created' });
  });

  it('shows the duplicate-email error (409) and re-enables the form', async () => {
    fillValid();
    submit();
    ctrl.expectOne(`${API}/auth/register`).flush(errorEnvelope(409, 'Email already registered'), {
      status: 409,
      statusText: 'Conflict',
    });
    await settle();

    expect($('[role=alert]')?.textContent).toContain('Email already registered');
    expect($<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('lists backend validation errors (400)', async () => {
    fillValid();
    submit();
    ctrl
      .expectOne(`${API}/auth/register`)
      .flush(
        errorEnvelope(400, 'Validation failed', [
          'email must be an email',
          'phone must be shorter than or equal to 20 characters',
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    const alert = $('[role=alert]')!;
    expect(alert.textContent).toContain('Validation failed');
    expect(alert.querySelectorAll('li').length).toBe(2);
  });

  it('toggles password visibility', async () => {
    expect($<HTMLInputElement>('#password')!.type).toBe('password');
    $<HTMLInputElement>('.check input')!.click();
    await settle();
    expect($<HTMLInputElement>('#password')!.type).toBe('text');
  });
});
