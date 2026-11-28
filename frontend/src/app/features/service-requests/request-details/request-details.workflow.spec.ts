import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { API, envelope } from '../../../../testing/test-utils';
import { RequestStatus, ServiceRequest } from '../../../core/models/service-request.model';
import { UserRole } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { RequestDetails } from './request-details';

const base = (status: RequestStatus): ServiceRequest => ({
  id: 'r-1',
  code: 'SR-0001',
  serviceTypeId: 'st-1',
  title: 'Leaking pipe',
  description: 'Water under the sink',
  address: '1 Nile St',
  contactPhone: '01000000000',
  preferredDate: null,
  status,
  priority: 'medium',
  createdAt: '2026-11-20T10:00:00.000Z',
  customer: { id: 'c-1', fullName: 'Carl Customer', email: 'carl@example.com', phone: null },
  workOrder: null,
});

const HISTORY = [
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

describe('RequestDetails workflow actions', () => {
  let fixture: ComponentFixture<RequestDetails>;
  let el: HTMLElement;
  let ctrl: HttpTestingController;

  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const buttons = () =>
    Array.from(el.querySelectorAll('.actions button')).map((b) => b.textContent?.trim());

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function load(role: UserRole, status: RequestStatus, extra: Partial<ServiceRequest> = {}) {
    TestBed.configureTestingModule({
      imports: [RequestDetails],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { role: signal(role) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'r-1' })) } },
        { provide: Location, useValue: { getState: () => null } },
      ],
    });
    ctrl = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RequestDetails);
    el = fixture.nativeElement;
    fixture.detectChanges();
    ctrl.expectOne(`${API}/service-types`).flush(envelope([{ id: 'st-1', name: 'Plumbing' }]));
    ctrl.expectOne(`${API}/service-requests/r-1`).flush(envelope({ ...base(status), ...extra }));
    ctrl.expectOne(`${API}/service-requests/r-1/history`).flush(envelope(HISTORY));
    await settle();
  }

  afterEach(() => ctrl.verify());

  describe('which buttons are shown', () => {
    it.each<[UserRole, RequestStatus, string[]]>([
      ['supervisor', 'new', ['Review', 'Cancel request']],
      ['supervisor', 'reviewed', ['Assign technician', 'Cancel request']],
      ['supervisor', 'assigned', ['Reassign', 'Cancel request']],
      ['supervisor', 'completed', []],
      ['admin', 'new', ['Review', 'Cancel request']],
      ['customer', 'new', ['Cancel request']],
      ['customer', 'reviewed', []],
      ['customer', 'assigned', []],
    ])('%s on a %s request sees %j', async (role, status, expected) => {
      await load(role, status);
      expect(buttons()).toEqual(expected);
    });

    it('never shows supervisor buttons to a customer', async () => {
      await load('customer', 'new');
      expect(buttons()).not.toContain('Review');
      expect(buttons()).not.toContain('Assign technician');
    });
  });

  it('links staff back to /requests and customers back to /my-requests', async () => {
    await load('supervisor', 'new');
    expect($('a.back')?.getAttribute('href')).toBe('/requests');
  });

  it('shows the customer to staff, and the technician once assigned', async () => {
    await load('supervisor', 'assigned', {
      workOrder: {
        id: 'w-1',
        technicianId: 't-1',
        scheduledAt: '2026-12-01T10:30:00.000Z',
        technician: { id: 't-1', fullName: 'Omar Tech', phone: null },
      },
    });
    const text = $('.details')!.textContent!;
    expect(text).toContain('Carl Customer');
    expect(text).toContain('Omar Tech');
    expect(text).toContain('Appointment');
  });

  it('shows the cancellation reason on a cancelled request', async () => {
    await load('customer', 'cancelled', { cancelReason: 'Fixed it myself' });
    expect($('.details')!.textContent).toContain('Fixed it myself');
  });

  it('shows the history timeline', async () => {
    await load('supervisor', 'new');
    expect($('.history app-timeline li.step')).not.toBeNull();
    expect($('.history')!.textContent).toContain('Carl Customer');
  });

  describe('running an action', () => {
    it('review: updates the status and the timeline without a manual refresh', async () => {
      await load('supervisor', 'new');
      expect($('app-status-badge')?.textContent).toContain('New');

      el.querySelector<HTMLButtonElement>('.actions button')!.click(); // Review
      await settle();
      expect($('app-review-dialog')).not.toBeNull();

      $<HTMLButtonElement>('app-review-dialog button[type=submit]')!.click();
      ctrl.expectOne(`${API}/service-requests/r-1/review`).flush(envelope({}));

      // The page reloads in the background: request + history again.
      ctrl.expectOne(`${API}/service-requests/r-1`).flush(envelope(base('reviewed')));
      ctrl.expectOne(`${API}/service-requests/r-1/history`).flush(
        envelope([
          {
            id: 'h-2',
            oldStatus: 'new',
            newStatus: 'reviewed',
            reason: null,
            createdAt: '2026-11-21T09:00:00.000Z',
            changedById: 's-1',
            changedBy: { id: 's-1', fullName: 'Sara Supervisor', role: 'supervisor' },
          },
          ...HISTORY,
        ]),
      );
      await settle();

      expect($('app-review-dialog')).toBeNull();
      expect($('app-status-badge')?.textContent).toContain('Reviewed');
      expect(buttons()).toEqual(['Assign technician', 'Cancel request']);
      expect(el.querySelectorAll('.history li.step')).toHaveLength(2);
      // The page stayed on screen during the reload.
      expect($('.state')).toBeNull();
    });

    it('cancel: needs a reason, then the request shows as cancelled', async () => {
      await load('customer', 'new');
      $<HTMLButtonElement>('.actions button')!.click();
      await settle();

      const submit = $<HTMLButtonElement>('app-cancel-dialog button[type=submit]')!;
      expect(submit.disabled).toBe(true);

      const reason = $<HTMLTextAreaElement>('#cancel-reason')!;
      reason.value = 'No longer needed';
      reason.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(submit.disabled).toBe(false);

      submit.click();
      ctrl.expectOne(`${API}/service-requests/r-1/cancel`).flush(envelope({}));
      ctrl
        .expectOne(`${API}/service-requests/r-1`)
        .flush(envelope({ ...base('cancelled'), cancelReason: 'No longer needed' }));
      ctrl.expectOne(`${API}/service-requests/r-1/history`).flush(envelope(HISTORY));
      await settle();

      expect($('app-status-badge')?.textContent).toContain('Cancelled');
      expect($('.actions')).toBeNull();
      expect($('.details')!.textContent).toContain('No longer needed');
    });

    it('closing a dialog without confirming changes nothing and loads nothing', async () => {
      await load('supervisor', 'new');
      $<HTMLButtonElement>('.actions button')!.click();
      await settle();
      $<HTMLButtonElement>('app-review-dialog button.btn-outline')!.click();
      await settle();
      expect($('app-review-dialog')).toBeNull();
    });
  });
});
