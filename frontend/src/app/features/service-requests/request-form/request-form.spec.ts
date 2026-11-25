import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API, envelope, errorEnvelope } from '../../../../testing/test-utils';
import { ServiceRequest } from '../../../core/models/service-request.model';
import { RequestForm } from './request-form';

const TYPES = [
  { id: 'st-1', name: 'Plumbing' },
  { id: 'st-2', name: 'Electrical' },
];
const CREATED: ServiceRequest = {
  id: 'r-9',
  code: 'SR-0009',
  serviceTypeId: 'st-1',
  title: 'Leaking pipe',
  description: 'Water under the sink',
  address: '1 Nile St',
  contactPhone: '01000000000',
  status: 'new',
  priority: 'medium',
};

describe('RequestForm', () => {
  let fixture: ComponentFixture<RequestForm>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const submitButton = () => $<HTMLButtonElement>('button[type=submit]')!;

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function type(selector: string, value: string) {
    const control = $<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  function choose(value: string) {
    const select = $<HTMLSelectElement>('#serviceTypeId')!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  function fillValid() {
    choose('st-1');
    type('#title', '  Leaking pipe ');
    type('#description', ' Water under the sink ');
    type('#address', '1 Nile St');
    type('#contactPhone', ' 01000000000 ');
  }

  async function flushTypes() {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await settle();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RequestForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    ctrl = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RequestForm);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => ctrl.verify());

  it('shows a loading option and blocks submit until service types arrive', async () => {
    expect($('#serviceTypeId option')?.textContent).toMatch(/loading service types/i);
    expect(submitButton().disabled).toBe(true);
    await flushTypes();
    expect(submitButton().disabled).toBe(false);
  });

  it('lists the service types from the API by name', async () => {
    await flushTypes();
    const labels = Array.from(el.querySelectorAll('#serviceTypeId option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(labels).toEqual(['Select a service type', 'Plumbing', 'Electrical']);
  });

  it('shows an error with a retry when service types fail to load', async () => {
    ctrl
      .expectOne(`${API}/service-types`)
      .flush(errorEnvelope(500, 'Server exploded'), { status: 500, statusText: 'Server Error' });
    await settle();
    expect($('.alert-error')?.textContent).toMatch(/server exploded/i);

    $<HTMLButtonElement>('.alert-error button')!.click();
    await flushTypes();
    expect($('.alert-error')).toBeNull();
    expect(el.querySelectorAll('#serviceTypeId option').length).toBe(3);
  });

  it('mentions when no service types are available', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope([]));
    await settle();
    expect(el.textContent).toMatch(/no service types are available/i);
  });

  it('blocks an empty submission and explains each required field', async () => {
    await flushTypes();
    submitButton().click();
    await settle();

    ctrl.expectNone(`${API}/service-requests`);
    expect($('#serviceTypeId-error')?.textContent).toMatch(/select a service type/i);
    expect($('#title-error')?.textContent).toMatch(/enter a title/i);
    expect($('#description-error')?.textContent).toMatch(/describe the problem/i);
    expect($('#address-error')?.textContent).toMatch(/enter the service address/i);
    expect($('#contactPhone-error')?.textContent).toMatch(/enter a contact phone/i);
    expect($('#title')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects whitespace-only text', async () => {
    await flushTypes();
    fillValid();
    type('#description', '    ');
    submitButton().click();
    await settle();

    ctrl.expectNone(`${API}/service-requests`);
    expect($('#description-error')).not.toBeNull();
  });

  it('enforces the confirmed max lengths (title 150, address 255, phone 20)', async () => {
    await flushTypes();
    fillValid();
    type('#title', 'a'.repeat(151));
    type('#address', 'a'.repeat(256));
    type('#contactPhone', '1'.repeat(21));
    submitButton().click();
    await settle();

    ctrl.expectNone(`${API}/service-requests`);
    expect($('#title-error')?.textContent).toMatch(/150/);
    expect($('#address-error')?.textContent).toMatch(/255/);
    expect($('#contactPhone-error')?.textContent).toMatch(/20/);
  });

  it('accepts values exactly at the limits and adds no stricter rules', async () => {
    await flushTypes();
    fillValid();
    type('#title', 'a'.repeat(150));
    type('#address', 'a'.repeat(255));
    type('#contactPhone', '+20 (10) 123-45'); // no phone pattern is enforced client-side
    type('#description', 'x');
    submitButton().click();
    await settle();

    expect(ctrl.expectOne(`${API}/service-requests`).request.body).toMatchObject({
      title: 'a'.repeat(150),
      description: 'x',
    });
  });

  it('posts a trimmed payload without customerId or an empty preferredDate, then opens the request', async () => {
    await flushTypes();
    fillValid();
    submitButton().click();
    await settle();

    const req = ctrl.expectOne(`${API}/service-requests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      serviceTypeId: 'st-1',
      title: 'Leaking pipe',
      description: 'Water under the sink',
      address: '1 Nile St',
      contactPhone: '01000000000',
    });
    req.flush(envelope(CREATED, 201));
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/my-requests', 'r-9'], { state: { created: true } });
  });

  it('sends preferredDate as the ISO date when one is chosen', async () => {
    await flushTypes();
    fillValid();
    type('#preferredDate', '2026-12-01');
    submitButton().click();
    await settle();

    expect(ctrl.expectOne(`${API}/service-requests`).request.body.preferredDate).toBe('2026-12-01');
  });

  it('prevents duplicate submissions while the request is in flight', async () => {
    await flushTypes();
    fillValid();
    submitButton().click();
    await settle();
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toMatch(/submitting/i);

    submitButton().click();
    $<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await settle();

    ctrl.expectOne(`${API}/service-requests`); // exactly one
  });

  it('shows the API validation errors and lets the user resubmit', async () => {
    await flushTypes();
    fillValid();
    submitButton().click();
    await settle();

    ctrl
      .expectOne(`${API}/service-requests`)
      .flush(errorEnvelope(400, 'Validation failed', ['description is too short']), {
        status: 400,
        statusText: 'Bad Request',
      });
    await settle();

    expect($('.alert-error')?.textContent).toMatch(/validation failed/i);
    expect($('.alert-error')?.textContent).toMatch(/description is too short/i);
    expect(submitButton().disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();

    submitButton().click();
    await settle();
    ctrl.expectOne(`${API}/service-requests`);
  });
});
