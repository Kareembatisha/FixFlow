import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API, envelope, errorEnvelope, makeUser } from '../../../../testing/test-utils';
import { ToastService } from '../../../core/services/toast.service';
import { UsersPage } from './users-page';

const page = (items: object[], total = items.length) => ({
  ...envelope(items),
  meta: { page: 1, limit: 10, total, totalPages: Math.max(1, Math.ceil(total / 10)) },
});

describe('UsersPage', () => {
  let fixture: ComponentFixture<UsersPage>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;
  let toast: ToastService;

  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const listCall = () => ctrl.expectOne((r) => r.method === 'GET' && r.url === `${API}/users`);

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function set(selector: string, value: string, event = 'input') {
    const field = $<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event(event));
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    ctrl = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(UsersPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
    listCall().flush(page([makeUser('technician'), makeUser('supervisor')], 2));
    await settle();
  });

  afterEach(() => ctrl.verify());

  it('lists users with their role and status', () => {
    const rows = el.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Test technician');
    expect(rows[0].textContent).toContain('Technician');
    expect(rows[0].textContent).toContain('Active');
  });

  it('filters by role on the server and returns to page 1', async () => {
    set('#user-role', 'technician', 'change');
    const req = listCall();
    expect(req.request.params.get('role')).toBe('technician');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([makeUser('technician')]));
    await settle();
    expect(el.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  describe('creating a user', () => {
    async function openForm() {
      $<HTMLButtonElement>('header button')!.click();
      await settle();
    }

    it('validates before sending anything', async () => {
      await openForm();
      $<HTMLButtonElement>('app-modal button[type=submit]')!.click();
      fixture.detectChanges();
      expect($('#new-fullName-error')).not.toBeNull();
      expect($('#new-email-error')).not.toBeNull();
      expect($('#new-password-error')).not.toBeNull();
      ctrl.expectNone((r) => r.method === 'POST');
    });

    it('creates a technician, closes the dialog and refreshes the list', async () => {
      await openForm();
      set('#new-role', 'technician', 'change');
      set('#new-fullName', '  Omar Tech ');
      set('#new-email', ' Omar@Example.com ');
      set('#new-password', 'Passw0rd!');
      $<HTMLButtonElement>('app-modal button[type=submit]')!.click();

      const req = ctrl.expectOne((r) => r.method === 'POST' && r.url === `${API}/users`);
      expect(req.request.body).toEqual({
        fullName: 'Omar Tech',
        email: 'omar@example.com',
        password: 'Passw0rd!',
        role: 'technician',
      });
      req.flush(envelope({ ...makeUser('technician'), fullName: 'Omar Tech' }, 201));
      listCall().flush(page([{ ...makeUser('technician'), fullName: 'Omar Tech' }]));
      await settle();

      expect($('app-modal')).toBeNull();
      expect(toast.toasts()[0].message).toContain('Omar Tech');
      expect($('tbody')!.textContent).toContain('Omar Tech');
    });

    it('keeps the form open and explains a duplicate email', async () => {
      await openForm();
      set('#new-fullName', 'Omar Tech');
      set('#new-email', 'taken@example.com');
      set('#new-password', 'Passw0rd!');
      $<HTMLButtonElement>('app-modal button[type=submit]')!.click();
      ctrl
        .expectOne((r) => r.method === 'POST')
        .flush(errorEnvelope(409, 'Email already registered'), {
          status: 409,
          statusText: 'Conflict',
        });
      await settle();

      expect($('app-modal')).not.toBeNull();
      expect($('app-modal .alert-error')?.textContent).toContain('Email already registered');
      expect(toast.toasts()[0]).toMatchObject({
        kind: 'error',
        message: 'Email already registered',
      });
    });
  });
});
