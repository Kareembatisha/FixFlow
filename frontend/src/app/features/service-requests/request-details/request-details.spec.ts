import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { API, envelope, errorEnvelope } from '../../../../testing/test-utils';
import { ServiceRequest } from '../../../core/models/service-request.model';
import { RequestDetails } from './request-details';

const REQUEST: ServiceRequest = {
  id: 'r-1',
  code: 'SR-0001',
  serviceTypeId: 'st-1',
  title: 'Leaking pipe',
  description: 'Water under the sink\nStarted yesterday',
  address: '1 Nile St',
  contactPhone: '01000000000',
  preferredDate: '2026-12-01',
  status: 'in_progress',
  priority: 'urgent',
  createdAt: '2026-11-20T10:00:00.000Z',
};

describe('RequestDetails', () => {
  let fixture: ComponentFixture<RequestDetails>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;

  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** `navState` stands in for the router state the create form passes on. */
  function create(id = 'r-1', navState: object | null = null) {
    TestBed.configureTestingModule({
      imports: [RequestDetails],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
        { provide: Location, useValue: { getState: () => navState } },
      ],
    });
    ctrl = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RequestDetails);
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  const flushTypes = () =>
    ctrl.expectOne(`${API}/service-types`).flush(envelope([{ id: 'st-1', name: 'Plumbing' }]));

  const HISTORY = [
    {
      id: 'h-2',
      oldStatus: 'new',
      newStatus: 'reviewed',
      reason: 'Looks urgent',
      createdAt: '2026-11-21T09:00:00.000Z',
      changedById: 's-1',
      changedBy: { id: 's-1', fullName: 'Sara Supervisor', role: 'supervisor' },
    },
    {
      id: 'h-1',
      oldStatus: null,
      newStatus: 'new',
      reason: null,
      createdAt: '2026-11-20T10:00:00.000Z',
      changedById: 'c-1',
      changedBy: { id: 'c-1', fullName: 'Carl Customer', role: 'customer' },
    },
  ];

  /** Answers the history request that accompanies every load of the page. */
  const flushHistory = (id = 'r-1', entries: object[] = HISTORY) =>
    ctrl.expectOne(`${API}/service-requests/${id}/history`).flush(envelope(entries));

  afterEach(() => ctrl.verify());

  it('loads the request by the route id and shows all its information', async () => {
    create('r-1');
    expect($('[role=status]')?.textContent).toMatch(/loading request/i);
    flushTypes();
    ctrl.expectOne(`${API}/service-requests/r-1`).flush(envelope(REQUEST));
    flushHistory();
    await settle();

    expect($('h1')?.textContent).toContain('SR-0001');
    expect($('app-status-badge')?.textContent).toContain('In Progress');
    const text = $('.details')!.textContent!;
    expect(text).toContain('Leaking pipe');
    expect(text).toContain('Plumbing');
    expect(text).toContain('Urgent');
    expect(text).toContain('Water under the sink');
    expect(text).toContain('1 Nile St');
    expect(text).toContain('01000000000');
    expect(text).toContain('1 Dec 2026');
  });

  it('has no workflow buttons for a customer once the request is past New', async () => {
    create();
    flushTypes();
    ctrl.expectOne(`${API}/service-requests/r-1`).flush(envelope(REQUEST));
    flushHistory();
    await settle();
    expect(el.querySelector('input, textarea, select, button, form')).toBeNull();
    expect($('.actions')).toBeNull();
  });

  it('copes with a missing preferred date and an unavailable service type', async () => {
    create();
    ctrl.expectOne(`${API}/service-types`).flush(envelope([]));
    ctrl
      .expectOne(`${API}/service-requests/r-1`)
      .flush(envelope({ ...REQUEST, preferredDate: null }));
    flushHistory();
    await settle();
    const text = $('.details')!.textContent!;
    expect(text).toContain('Not available');
    expect(text).toMatch(/Preferred date\s*—/);
  });

  it('shows a confirmation only right after creating the request', async () => {
    create('r-1', { created: true });
    flushTypes();
    ctrl.expectOne(`${API}/service-requests/r-1`).flush(envelope(REQUEST));
    flushHistory();
    await settle();
    expect($('.alert-success')?.textContent).toMatch(/your request was submitted/i);
  });

  it('shows no confirmation on a normal visit', async () => {
    create();
    flushTypes();
    ctrl.expectOne(`${API}/service-requests/r-1`).flush(envelope(REQUEST));
    flushHistory();
    await settle();
    expect($('.alert-success')).toBeNull();
  });

  it.each([404, 400])('treats HTTP %s as "request not found"', async (status) => {
    create('nope');
    flushTypes();
    ctrl
      .expectOne(`${API}/service-requests/nope`)
      .flush(errorEnvelope(status, 'Not found'), { status, statusText: 'Error' });
    flushHistory('nope', []);
    await settle();

    expect($('h1')?.textContent).toMatch(/request not found/i);
    expect($('.details')).toBeNull();
    expect($('a.back')?.getAttribute('href')).toBe('/my-requests');
  });

  it('shows other errors with a retry that reloads the request', async () => {
    create();
    flushTypes();
    ctrl
      .expectOne(`${API}/service-requests/r-1`)
      .flush(errorEnvelope(500, 'Server down'), { status: 500, statusText: 'Server Error' });
    flushHistory();
    await settle();
    expect($('.alert-error')?.textContent).toMatch(/server down/i);

    $<HTMLButtonElement>('.alert-error button')!.click();
    ctrl.expectOne(`${API}/service-requests/r-1`).flush(envelope(REQUEST));
    flushHistory();
    await settle();
    expect($('.alert-error')).toBeNull();
    expect($('h1')?.textContent).toContain('SR-0001');
  });
});
