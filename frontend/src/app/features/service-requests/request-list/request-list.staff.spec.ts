import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API, envelope } from '../../../../testing/test-utils';
import { UserRole } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { RequestList } from './request-list';

const REQUEST = {
  id: 'r-1',
  code: 'SR-0001',
  serviceTypeId: 'st-1',
  title: 'Leaking pipe',
  status: 'new',
  priority: 'high',
  createdAt: '2026-11-20T10:00:00.000Z',
};

describe('RequestList by role', () => {
  let fixture: ComponentFixture<RequestList>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;

  async function load(role: UserRole) {
    TestBed.configureTestingModule({
      imports: [RequestList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { role: signal(role) } },
      ],
    });
    ctrl = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RequestList);
    el = fixture.nativeElement;
    fixture.detectChanges();
    ctrl.expectOne(`${API}/service-types`).flush(envelope([{ id: 'st-1', name: 'Plumbing' }]));
    ctrl
      .expectOne((r) => r.url === `${API}/service-requests`)
      .flush({
        ...envelope([REQUEST]),
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => ctrl.verify());

  it('gives supervisors every request under /requests, with a priority filter and no "New request"', async () => {
    await load('supervisor');
    expect(el.querySelector('h1')?.textContent).toBe('Requests');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/requests/r-1');
    expect(el.querySelector('#priority')).not.toBeNull();
    expect(el.querySelector('header a.btn-primary')).toBeNull();
  });

  it('filters staff lists by priority on the server', async () => {
    await load('admin');
    const select = el.querySelector<HTMLSelectElement>('#priority')!;
    select.value = 'urgent';
    select.dispatchEvent(new Event('change'));
    const req = ctrl.expectOne((r) => r.url === `${API}/service-requests`);
    expect(req.request.params.get('priority')).toBe('urgent');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ ...envelope([]), meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  });

  it('keeps the customer view: own requests under /my-requests, a "New request" button, no priority filter', async () => {
    await load('customer');
    expect(el.querySelector('h1')?.textContent).toBe('My requests');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/my-requests/r-1');
    expect(el.querySelector('#priority')).toBeNull();
    expect(el.querySelector('header a.btn-primary')?.textContent).toContain('New request');
  });
});
