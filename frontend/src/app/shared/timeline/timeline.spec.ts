import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusHistoryEntry } from '../../core/models/service-request.model';
import { Timeline } from './timeline';

const entry = (over: Partial<StatusHistoryEntry>): StatusHistoryEntry => ({
  id: 'h',
  oldStatus: null,
  newStatus: 'new',
  reason: null,
  createdAt: '2026-11-20T10:00:00.000Z',
  changedById: 'u',
  changedBy: { id: 'u', fullName: 'Carl Customer', role: 'customer' },
  ...over,
});

describe('Timeline', () => {
  let fixture: ComponentFixture<Timeline>;
  let el: HTMLElement;

  function render(entries: StatusHistoryEntry[]) {
    fixture = TestBed.createComponent(Timeline);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const steps = () => Array.from(el.querySelectorAll('li.step'));

  it('lists every step oldest first (the API sends newest first), with who, when and why', () => {
    render([
      entry({
        id: '3',
        oldStatus: 'reviewed',
        newStatus: 'assigned',
        createdAt: '2026-11-22T08:30:00.000Z',
        changedBy: { id: 's', fullName: 'Sara Supervisor', role: 'supervisor' },
      }),
      entry({
        id: '2',
        oldStatus: 'new',
        newStatus: 'reviewed',
        reason: 'High impact',
        createdAt: '2026-11-21T09:00:00.000Z',
        changedBy: { id: 's', fullName: 'Sara Supervisor', role: 'supervisor' },
      }),
      entry({ id: '1' }),
    ]);

    expect(steps()).toHaveLength(3);
    expect(steps()[0].textContent).toContain('Request created');
    expect(steps()[0].textContent).toContain('Carl Customer');
    expect(steps()[0].textContent).toContain('Customer');
    expect(steps()[1].textContent).toContain('Reviewed');
    expect(steps()[1].textContent).toContain('from New');
    expect(steps()[1].textContent).toContain('Sara Supervisor');
    expect(steps()[1].textContent).toContain('High impact');
    expect(steps()[2].textContent).toContain('Assigned');
    expect(steps()[1].querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-11-21T09:00:00.000Z',
    );
  });

  it('shows a reassignment (same status) as its own step with the reason', () => {
    render([
      entry({
        id: '2',
        oldStatus: 'assigned',
        newStatus: 'assigned',
        reason: 'Reassigned to Omar Tech',
        createdAt: '2026-11-23T10:00:00.000Z',
      }),
      entry({
        id: '1',
        oldStatus: 'reviewed',
        newStatus: 'assigned',
        createdAt: '2026-11-22T10:00:00.000Z',
      }),
    ]);
    expect(steps()[1].textContent).toContain('Technician reassigned');
    expect(steps()[1].textContent).toContain('Reassigned to Omar Tech');
  });

  it('copes with a missing author and an empty history', () => {
    render([entry({ changedBy: null })]);
    expect(steps()[0].textContent).toContain('Unknown user');

    fixture.componentRef.setInput('entries', []);
    fixture.detectChanges();
    expect(el.textContent).toContain('No history yet');
  });
});
