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
});
