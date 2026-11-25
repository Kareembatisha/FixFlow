import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API, envelope, errorEnvelope } from '../../../testing/test-utils';
import { ServiceTypesService } from './service-types.service';

describe('ServiceTypesService', () => {
  let service: ServiceTypesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServiceTypesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() GETs /service-types and unwraps the array', () => {
    let result: unknown;
    service.list().subscribe((r) => (result = r));

    const req = http.expectOne(`${API}/service-types`);
    expect(req.request.method).toBe('GET');
    req.flush(envelope([{ id: 'st-1' }, { id: 'st-2' }]));

    expect(result).toEqual([{ id: 'st-1' }, { id: 'st-2' }]);
  });

  it('list() accepts an empty array', () => {
    let result: unknown;
    service.list().subscribe((r) => (result = r));
    http.expectOne(`${API}/service-types`).flush(envelope([]));
    expect(result).toEqual([]);
  });

  it('getById() GETs /service-types/:id', () => {
    let result: unknown;
    service.getById('st-1').subscribe((r) => (result = r));
    http.expectOne(`${API}/service-types/st-1`).flush(envelope({ id: 'st-1' }));
    expect(result).toEqual({ id: 'st-1' });
  });

  it('propagates HTTP errors unchanged', () => {
    let status = 0;
    service.list().subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne(`${API}/service-types`)
      .flush(errorEnvelope(500, 'Boom'), { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
  });
});
