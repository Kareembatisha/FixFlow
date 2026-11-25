import { ComponentFixture, TestBed } from '@angular/core/testing';

import { REQUEST_STATUSES } from '../../core/models/service-request.model';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;

  async function render(status: string | null | undefined) {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.badge') as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StatusBadge] });
    fixture = TestBed.createComponent(StatusBadge);
  });

  it.each([
    ['new', 'New'],
    ['reviewed', 'Reviewed'],
    ['assigned', 'Assigned'],
    ['in_progress', 'In Progress'],
    ['pending_review', 'Pending Review'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
  ])('renders %s as "%s" with its own style', async (status, label) => {
    const badge = await render(status);
    expect(badge.textContent?.trim()).toBe(label);
    expect(badge.classList.contains(`status-${status}`)).toBe(true);
  });

  it('covers every backend status', async () => {
    const labels = new Set<string>();
    for (const status of REQUEST_STATUSES) {
      const badge = await render(status);
      expect(badge.classList.contains('status-unknown')).toBe(false);
      labels.add(badge.textContent!.trim());
    }
    expect(labels.size).toBe(REQUEST_STATUSES.length);
  });

  it('falls back to a readable neutral badge for an unknown status', async () => {
    const badge = await render('waiting_parts');
    expect(badge.textContent?.trim()).toBe('Waiting parts');
    expect(badge.classList.contains('status-unknown')).toBe(true);
  });

  it.each([null, undefined, ''])('shows "Unknown" for %j', async (status) => {
    const badge = await render(status);
    expect(badge.textContent?.trim()).toBe('Unknown');
    expect(badge.classList.contains('status-unknown')).toBe(true);
  });
});
