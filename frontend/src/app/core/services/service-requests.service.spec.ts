import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API, envelope, errorEnvelope } from '../../../testing/test-utils';
import { CreateServiceRequestPayload, ServiceRequest } from '../models/service-request.model';
import { ServiceRequestsService } from './service-requests.service';

const REQUEST: ServiceRequest = {
  id: 'r-1',
  code: 'SR-0001',
  serviceTypeId: 'st-1',
  title: 'Leaking pipe',
  description: 'Water under the sink',
  address: '1 Nile St',
  contactPhone: '01000000000',
  status: 'new',
  priority: 'medium',
};
const META = { page: 1, limit: 10, total: 1, totalPages: 1 };

describe('ServiceRequestsService', () => {
  let service: ServiceRequestsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServiceRequestsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list()', () => {
    it('sends no query params by default so backend defaults apply', () => {
      service.list().subscribe();
      const req = http.expectOne((r) => r.url === `${API}/service-requests`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush({ ...envelope([REQUEST]), meta: META });
    });

    it('sends page, limit, status, priority and trimmed search', () => {
      service
        .list({ page: 2, limit: 5, status: 'in_progress', priority: 'urgent', search: '  pipe ' })
        .subscribe();
      const req = http.expectOne((r) => r.url === `${API}/service-requests`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('status')).toBe('in_progress');
      expect(req.request.params.get('priority')).toBe('urgent');
      expect(req.request.params.get('search')).toBe('pipe');
      req.flush({ ...envelope([]), meta: { ...META, page: 2, limit: 5, total: 0, totalPages: 0 } });
    });

    it('omits a blank search', () => {
      service.list({ search: '   ' }).subscribe();
      const req = http.expectOne((r) => r.url === `${API}/service-requests`);
      expect(req.request.params.has('search')).toBe(false);
      req.flush({ ...envelope([]), meta: META });
    });

    it('returns items with the backend pagination meta', () => {
      let result: unknown;
      service.list().subscribe((r) => (result = r));
      http
        .expectOne((r) => r.url === `${API}/service-requests`)
        .flush({ ...envelope([REQUEST]), meta: META });
      expect(result).toEqual({ items: [REQUEST], meta: META });
    });

    it('handles an empty page', () => {
      const empty = { page: 1, limit: 10, total: 0, totalPages: 0 };
      let result: unknown;
      service.list().subscribe((r) => (result = r));
      http
        .expectOne((r) => r.url === `${API}/service-requests`)
        .flush({ ...envelope([]), meta: empty });
      expect(result).toEqual({ items: [], meta: empty });
    });

    it('errors when pagination meta is missing', () => {
      let error: unknown;
      service.list().subscribe({ error: (e) => (error = e) });
      http.expectOne((r) => r.url === `${API}/service-requests`).flush(envelope([REQUEST]));
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('getById()', () => {
    it('GETs /service-requests/:id and unwraps data', () => {
      let result: unknown;
      service.getById('r-1').subscribe((r) => (result = r));
      const req = http.expectOne(`${API}/service-requests/r-1`);
      expect(req.request.method).toBe('GET');
      req.flush(envelope(REQUEST));
      expect(result).toEqual(REQUEST);
    });

    it('propagates a 404 unchanged', () => {
      let status = 0;
      service.getById('missing').subscribe({ error: (e) => (status = e.status) });
      http
        .expectOne(`${API}/service-requests/missing`)
        .flush(errorEnvelope(404, 'Not found'), { status: 404, statusText: 'Not Found' });
      expect(status).toBe(404);
    });
  });

  describe('create()', () => {
    const payload: CreateServiceRequestPayload = {
      serviceTypeId: 'st-1',
      title: 'Leaking pipe',
      description: 'Water under the sink',
      address: '1 Nile St',
      contactPhone: '01000000000',
    };

    it('POSTs the payload as-is (no customerId) and unwraps the created request', () => {
      let result: unknown;
      service.create(payload).subscribe((r) => (result = r));
      const req = http.expectOne(`${API}/service-requests`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      expect('customerId' in req.request.body).toBe(false);
      req.flush(envelope(REQUEST, 201));
      expect(result).toEqual(REQUEST);
    });

    it('propagates validation errors so the form can show them', () => {
      let status = 0;
      service.create(payload).subscribe({ error: (e) => (status = e.status) });
      http
        .expectOne(`${API}/service-requests`)
        .flush(errorEnvelope(400, 'Validation failed', ['description is too short']), {
          status: 400,
          statusText: 'Bad Request',
        });
      expect(status).toBe(400);
    });
  });

  describe('workflow calls', () => {
    it('history() reads the request history', () => {
      let result: unknown;
      service.history('r-1').subscribe((r) => (result = r));
      const req = http.expectOne(`${API}/service-requests/r-1/history`);
      expect(req.request.method).toBe('GET');
      req.flush(envelope([{ id: 'h-1' }]));
      expect(result).toEqual([{ id: 'h-1' }]);
    });

    it('review() PATCHes the priority and note, never a status', () => {
      service.review('r-1', { priority: 'high', note: 'ok' }).subscribe();
      const req = http.expectOne(`${API}/service-requests/r-1/review`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ priority: 'high', note: 'ok' });
      expect('status' in req.request.body).toBe(false);
      req.flush(envelope(REQUEST));
    });

    it('assign() POSTs the technician and appointment', () => {
      service
        .assign('r-1', { technicianId: 't-1', scheduledAt: '2026-12-01T10:00:00.000Z' })
        .subscribe();
      const req = http.expectOne(`${API}/service-requests/r-1/assign`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        technicianId: 't-1',
        scheduledAt: '2026-12-01T10:00:00.000Z',
      });
      req.flush(envelope({}));
    });

    it('reassign() PATCHes the new technician', () => {
      service.reassign('r-1', { technicianId: 't-2' }).subscribe();
      const req = http.expectOne(`${API}/service-requests/r-1/reassign`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ technicianId: 't-2' });
      req.flush(envelope({}));
    });

    it('cancel() PATCHes the reason', () => {
      service.cancel('r-1', { reason: 'Duplicate' }).subscribe();
      const req = http.expectOne(`${API}/service-requests/r-1/cancel`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ reason: 'Duplicate' });
      req.flush(envelope(REQUEST));
    });

    it('surfaces an invalid transition message from the backend', () => {
      let message = '';
      service.review('r-1', { priority: 'low' }).subscribe({
        error: (e) => (message = e.error.message),
      });
      http
        .expectOne(`${API}/service-requests/r-1/review`)
        .flush(errorEnvelope(400, 'Cannot change request status from assigned to reviewed'), {
          status: 400,
          statusText: 'Bad Request',
        });
      expect(message).toContain('Cannot change request status');
    });
  });
});
