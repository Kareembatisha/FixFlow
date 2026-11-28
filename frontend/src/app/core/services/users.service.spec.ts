import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API, envelope, makeUser } from '../../../testing/test-utils';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('loads active technicians', () => {
    let result: unknown;
    service.technicians().subscribe((r) => (result = r));
    const req = ctrl.expectOne(`${API}/users/technicians`);
    expect(req.request.method).toBe('GET');
    req.flush(envelope([makeUser('technician')]));
    expect(result).toEqual([makeUser('technician')]);
  });

  it('lists users with only the filters that are set', () => {
    let page: unknown;
    service
      .list({ page: 2, limit: 10, role: 'technician', search: '  omar ' })
      .subscribe((r) => (page = r));
    const req = ctrl.expectOne((r) => r.url === `${API}/users`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('role')).toBe('technician');
    expect(req.request.params.get('search')).toBe('omar');
    req.flush({
      ...envelope([makeUser('technician')]),
      meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });
    expect(page).toMatchObject({ meta: { page: 2, totalPages: 2 } });
  });

  it('skips blank filters', () => {
    service.list({ search: '   ' }).subscribe();
    const req = ctrl.expectOne((r) => r.url === `${API}/users`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ ...envelope([]), meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  });

  it('creates a user', () => {
    const payload = {
      fullName: 'Omar',
      email: 'o@x.com',
      password: 'Passw0rd!',
      role: 'technician' as const,
    };
    service.create(payload).subscribe();
    const req = ctrl.expectOne(`${API}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(envelope(makeUser('technician'), 201));
  });
});
