import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API, envelope, errorEnvelope } from '../../../../testing/test-utils';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { ServiceRequest } from '../../../core/models/service-request.model';
import { RequestList } from './request-list';

const TYPES = [{ id: 'st-1', name: 'Plumbing' }];

function makeRequest(n: number, overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: `r-${n}`,
    code: `SR-000${n}`,
    serviceTypeId: 'st-1',
    title: `Request ${n}`,
    description: 'Something is broken',
    address: '1 Nile St',
    contactPhone: '01000000000',
    status: 'new',
    priority: 'medium',
    createdAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

const meta = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
  page: 1,
  limit: 10,
  total: 2,
  totalPages: 1,
  ...overrides,
});

describe('RequestList', () => {
  let fixture: ComponentFixture<RequestList>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;

  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const listUrl = (r: { url: string }) => r.url === `${API}/service-requests`;
  const buttonByText = (text: RegExp) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      text.test(b.textContent ?? ''),
    )!;

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Answers the pending list request. */
  async function flushList(items: ServiceRequest[], m: PaginationMeta = meta()) {
    ctrl.expectOne(listUrl).flush({ ...envelope(items), meta: m });
    await settle();
  }

  function chooseStatus(value: string) {
    const select = $<HTMLSelectElement>('#status')!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  function typeSearch(value: string) {
    const input = $<HTMLInputElement>('#search')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RequestList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    ctrl = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RequestList);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    ctrl.verify();
  });

  it('shows a loading state, then requests page 1 with the default page size', async () => {
    expect($('[role=status]')?.textContent).toMatch(/loading your requests/i);
    const req = ctrl.expectOne(listUrl);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ ...envelope([]), meta: meta({ total: 0, totalPages: 0 }) });
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await settle();
  });

  it('renders the rows with code, resolved service type name, priority and status badge', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([
      makeRequest(1, { status: 'in_progress', priority: 'high' }),
      makeRequest(2, { serviceTypeId: 'gone' }),
    ]);

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('SR-0001');
    expect(rows[0].textContent).toContain('Request 1');
    expect(rows[0].textContent).toContain('Plumbing');
    expect(rows[0].textContent).toContain('High');
    expect(rows[0].querySelector('app-status-badge')?.textContent).toContain('In Progress');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/my-requests/r-1');
    expect(rows[1].textContent).toContain('—'); // type no longer offered to customers
    expect($('.summary')?.textContent).toMatch(/2 requests/);
  });

  it('still lists requests when service types fail to load', async () => {
    ctrl
      .expectOne(`${API}/service-types`)
      .flush(errorEnvelope(500, 'x'), { status: 500, statusText: 'Server Error' });
    await flushList([makeRequest(1)]);
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('shows the first-time empty state with a link to create a request', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([], meta({ total: 0, totalPages: 0 }));
    expect($('.empty')?.textContent).toMatch(/haven't submitted any requests/i);
    expect($('.empty a')?.getAttribute('href')).toBe('/my-requests/new');
    expect($('table')).toBeNull();
  });

  it('shows an error with retry, and retry reloads', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    ctrl
      .expectOne(listUrl)
      .flush(errorEnvelope(500, 'Something broke'), { status: 500, statusText: 'Server Error' });
    await settle();
    expect($('.alert-error')?.textContent).toMatch(/something broke/i);

    buttonByText(/try again/i).click();
    await flushList([makeRequest(1)]);
    expect($('.alert-error')).toBeNull();
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('filters by the backend status value and returns to page 1', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([makeRequest(1)], meta({ page: 1, total: 30, totalPages: 3 }));
    buttonByText(/next/i).click();
    await flushList([makeRequest(2)], meta({ page: 2, total: 30, totalPages: 3 }));

    chooseStatus('pending_review');
    const req = ctrl.expectOne(listUrl);
    expect(req.request.params.get('status')).toBe('pending_review');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ ...envelope([]), meta: meta({ total: 0, totalPages: 0 }) });
    await settle();
  });

  it('offers exactly the seven backend statuses', () => {
    const values = Array.from(el.querySelectorAll<HTMLOptionElement>('#status option')).map(
      (o) => o.value,
    );
    expect(values).toEqual([
      '',
      'new',
      'reviewed',
      'assigned',
      'in_progress',
      'pending_review',
      'completed',
      'cancelled',
    ]);
    ctrl.expectOne(listUrl);
    ctrl.expectOne(`${API}/service-types`);
  });

  it('debounces search and sends the trimmed term', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([makeRequest(1)]);

    vi.useFakeTimers();
    typeSearch('p');
    typeSearch('pi');
    typeSearch('  pipe ');
    vi.advanceTimersByTime(299);
    ctrl.expectNone(listUrl);

    vi.advanceTimersByTime(1);
    const req = ctrl.expectOne(listUrl);
    expect(req.request.params.get('search')).toBe('pipe');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ ...envelope([makeRequest(1)]), meta: meta({ total: 1 }) });
  });

  it('shows a "no matches" state while filtering and can clear the filters', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([makeRequest(1)]);

    chooseStatus('completed');
    await flushList([], meta({ total: 0, totalPages: 0 }));
    expect($('.empty')?.textContent).toMatch(/no requests match/i);

    buttonByText(/clear filters/i).click();
    const req = ctrl.expectOne(listUrl);
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('search')).toBe(false);
    expect($<HTMLSelectElement>('#status')!.value).toBe('');
    req.flush({ ...envelope([makeRequest(1)]), meta: meta({ total: 1 }) });
    await settle();
  });

  it('pages through results using the backend meta', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([makeRequest(1)], meta({ total: 25, totalPages: 3 }));

    expect($('.pager')?.textContent).toMatch(/page 1 of 3/i);
    expect(buttonByText(/previous/i).disabled).toBe(true);

    buttonByText(/next/i).click();
    let req = ctrl.expectOne(listUrl);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ ...envelope([makeRequest(2)]), meta: meta({ page: 2, total: 25, totalPages: 3 }) });
    await settle();
    expect($('.pager')?.textContent).toMatch(/page 2 of 3/i);

    buttonByText(/next/i).click();
    req = ctrl.expectOne(listUrl);
    req.flush({ ...envelope([makeRequest(3)]), meta: meta({ page: 3, total: 25, totalPages: 3 }) });
    await settle();
    expect(buttonByText(/next/i).disabled).toBe(true);

    buttonByText(/previous/i).click();
    expect(ctrl.expectOne(listUrl).request.params.get('page')).toBe('2');
  });

  it('hides pagination when everything fits on one page', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([makeRequest(1), makeRequest(2)]);
    expect($('.pager')).toBeNull();
  });

  it('moves to the real last page when the requested page no longer exists', async () => {
    ctrl.expectOne(`${API}/service-types`).flush(envelope(TYPES));
    await flushList([makeRequest(1)], meta({ total: 25, totalPages: 3 }));
    buttonByText(/next/i).click();
    ctrl.expectOne(listUrl).flush({
      ...envelope([makeRequest(2)]),
      meta: meta({ page: 2, total: 25, totalPages: 3 }),
    });
    await settle();
    buttonByText(/next/i).click();
    // Rows were deleted meanwhile: page 3 is now past the end.
    ctrl.expectOne(listUrl).flush({
      ...envelope([]),
      meta: meta({ page: 3, total: 12, totalPages: 2 }),
    });
    await settle();

    const req = ctrl.expectOne(listUrl);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ ...envelope([makeRequest(2)]), meta: meta({ page: 2, total: 12, totalPages: 2 }) });
    await settle();
    expect($('.pager')?.textContent).toMatch(/page 2 of 2/i);
  });
});
