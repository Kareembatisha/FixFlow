import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API, envelope, errorEnvelope } from '../../../../testing/test-utils';
import { ToastService } from '../../../core/services/toast.service';
import { AssignDialog } from './assign-dialog';
import { CancelDialog } from './cancel-dialog';
import { ReviewDialog } from './review-dialog';

const URL = `${API}/service-requests/r-1`;

describe('workflow dialogs', () => {
  let ctrl: HttpTestingController;
  let toast: ToastService;
  let closed: boolean[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    ctrl = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    closed = [];
  });

  afterEach(() => ctrl.verify());

  async function mount<T extends { closed: { subscribe: (fn: (v: boolean) => void) => unknown } }>(
    type: new () => T,
    inputs: Record<string, unknown>,
  ): Promise<{ fixture: ComponentFixture<T>; el: HTMLElement }> {
    const fixture = TestBed.createComponent(type);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.componentInstance.closed.subscribe((v) => closed.push(v));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement };
  }

  function type(el: HTMLElement, selector: string, value: string, event = 'input') {
    const field = el.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event(event));
  }

  const submitButton = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>('button[type=submit]')!;

  describe('ReviewDialog', () => {
    const inputs = { requestId: 'r-1', requestCode: 'SR-0001', currentPriority: 'medium' };

    it('sends the chosen priority and an optional note, then reports a change', async () => {
      const { fixture, el } = await mount(ReviewDialog, inputs);
      expect(el.querySelector<HTMLSelectElement>('#review-priority')!.value).toBe('medium');

      type(el, '#review-priority', 'urgent', 'change');
      type(el, '#review-note', '  Water is leaking  ');
      submitButton(el).click();

      const req = ctrl.expectOne(`${URL}/review`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ priority: 'urgent', note: 'Water is leaking' });
      req.flush(envelope({ id: 'r-1', status: 'reviewed' }));
      fixture.detectChanges();

      expect(closed).toEqual([true]);
      expect(toast.toasts()[0]).toMatchObject({ kind: 'success' });
    });

    it('omits an empty note', async () => {
      const { el } = await mount(ReviewDialog, inputs);
      submitButton(el).click();
      expect(ctrl.expectOne(`${URL}/review`).request.body).toEqual({ priority: 'medium' });
    });

    it('closes without changes when dismissed', async () => {
      const { el } = await mount(ReviewDialog, inputs);
      el.querySelector<HTMLButtonElement>('button[type=button].btn-outline')!.click();
      expect(closed).toEqual([false]);
      ctrl.expectNone(`${URL}/review`);
    });

    it('shows a toast and reloads when the request was already reviewed (invalid transition)', async () => {
      const { el } = await mount(ReviewDialog, inputs);
      submitButton(el).click();
      ctrl
        .expectOne(`${URL}/review`)
        .flush(errorEnvelope(400, 'Cannot change request status from reviewed to reviewed'), {
          status: 400,
          statusText: 'Bad Request',
        });
      expect(toast.toasts()[0]).toMatchObject({
        kind: 'error',
        message: 'Cannot change request status from reviewed to reviewed',
      });
      expect(closed).toEqual([true]);
    });
  });

  describe('AssignDialog', () => {
    const technicians = [
      {
        id: 't-1',
        fullName: 'Omar Tech',
        email: 'o@x.com',
        phone: null,
        role: 'technician',
        isActive: true,
      },
      {
        id: 't-2',
        fullName: 'Nour Tech',
        email: 'n@x.com',
        phone: null,
        role: 'technician',
        isActive: true,
      },
    ];

    it('lists technicians from /users/technicians and assigns the chosen one', async () => {
      const { fixture, el } = await mount(AssignDialog, {
        requestId: 'r-1',
        requestCode: 'SR-0001',
      });
      ctrl.expectOne(`${API}/users/technicians`).flush(envelope(technicians));
      fixture.detectChanges();

      const options = Array.from(el.querySelectorAll('#assign-technician option')).map((o) =>
        o.textContent?.trim(),
      );
      expect(options).toEqual(['Select a technician', 'Omar Tech', 'Nour Tech']);

      // Nothing is chosen yet: submitting shows the error and sends nothing.
      submitButton(el).click();
      fixture.detectChanges();
      expect(el.querySelector('#assign-technician-error')?.textContent).toMatch(
        /choose a technician/i,
      );
      ctrl.expectNone(`${URL}/assign`);

      type(el, '#assign-technician', 't-2', 'change');
      type(el, '#assign-when', '2026-12-01T10:30');
      submitButton(el).click();

      const req = ctrl.expectOne(`${URL}/assign`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.technicianId).toBe('t-2');
      expect(req.request.body.scheduledAt).toBe(new Date('2026-12-01T10:30').toISOString());
      req.flush(envelope({ serviceRequest: {}, workOrder: {} }));

      expect(closed).toEqual([true]);
      expect(toast.toasts()[0].message).toContain('Nour Tech');
    });

    it('sends no appointment when none is set', async () => {
      const { fixture, el } = await mount(AssignDialog, { requestId: 'r-1' });
      ctrl.expectOne(`${API}/users/technicians`).flush(envelope(technicians));
      fixture.detectChanges();
      type(el, '#assign-technician', 't-1', 'change');
      submitButton(el).click();
      expect(ctrl.expectOne(`${URL}/assign`).request.body).toEqual({ technicianId: 't-1' });
    });

    it('reassigns through PATCH and leaves the current technician out of the list', async () => {
      const { fixture, el } = await mount(AssignDialog, {
        requestId: 'r-1',
        mode: 'reassign',
        currentTechnicianId: 't-1',
      });
      ctrl.expectOne(`${API}/users/technicians`).flush(envelope(technicians));
      fixture.detectChanges();

      const names = Array.from(el.querySelectorAll('#assign-technician option')).map((o) =>
        o.textContent?.trim(),
      );
      expect(names).toEqual(['Select a technician', 'Nour Tech']);

      type(el, '#assign-technician', 't-2', 'change');
      submitButton(el).click();
      const req = ctrl.expectOne(`${URL}/reassign`);
      expect(req.request.method).toBe('PATCH');
      req.flush(envelope({}));
      expect(closed).toEqual([true]);
    });

    it('tells the user when there are no technicians and disables the button', async () => {
      const { fixture, el } = await mount(AssignDialog, { requestId: 'r-1' });
      ctrl.expectOne(`${API}/users/technicians`).flush(envelope([]));
      fixture.detectChanges();
      expect(el.textContent).toMatch(/no other active technicians/i);
      expect(submitButton(el).disabled).toBe(true);
    });

    it('offers a retry when the technician list fails to load', async () => {
      const { fixture, el } = await mount(AssignDialog, { requestId: 'r-1' });
      ctrl
        .expectOne(`${API}/users/technicians`)
        .flush(errorEnvelope(500, 'Server down'), { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(el.querySelector('.alert-error')?.textContent).toMatch(/server down/i);

      el.querySelector<HTMLButtonElement>('.alert-error button')!.click();
      ctrl.expectOne(`${API}/users/technicians`).flush(envelope(technicians));
      fixture.detectChanges();
      expect(el.querySelector('#assign-technician')).not.toBeNull();
    });
  });

  describe('CancelDialog', () => {
    const inputs = { requestId: 'r-1', requestCode: 'SR-0001' };

    it('keeps the confirm button disabled until a real reason is typed', async () => {
      const { fixture, el } = await mount(CancelDialog, inputs);
      expect(submitButton(el).disabled).toBe(true);

      type(el, '#cancel-reason', '    ');
      fixture.detectChanges();
      expect(submitButton(el).disabled).toBe(true);

      type(el, '#cancel-reason', 'Customer called to cancel');
      fixture.detectChanges();
      expect(submitButton(el).disabled).toBe(false);
    });

    it('sends the trimmed reason and reports a change', async () => {
      const { fixture, el } = await mount(CancelDialog, inputs);
      type(el, '#cancel-reason', '  Duplicate request  ');
      fixture.detectChanges();
      submitButton(el).click();

      const req = ctrl.expectOne(`${URL}/cancel`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ reason: 'Duplicate request' });
      req.flush(envelope({ id: 'r-1', status: 'cancelled' }));

      expect(closed).toEqual([true]);
      expect(toast.toasts()[0]).toMatchObject({ kind: 'success' });
    });

    it('keeps the dialog open and shows the server messages on a validation error', async () => {
      const { fixture, el } = await mount(CancelDialog, inputs);
      type(el, '#cancel-reason', 'x');
      fixture.detectChanges();
      submitButton(el).click();
      ctrl
        .expectOne(`${URL}/cancel`)
        .flush(errorEnvelope(400, 'Validation failed', ['reason is too long']), {
          status: 400,
          statusText: 'Bad Request',
        });
      fixture.detectChanges();

      expect(closed).toEqual([]);
      expect(el.querySelector('.alert-error')?.textContent).toContain('reason is too long');
      expect(toast.toasts()[0]).toMatchObject({ kind: 'error', details: ['reason is too long'] });
    });
  });
});
