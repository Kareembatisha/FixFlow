import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows an API error with its message and validation details', () => {
    toast.error({
      status: 400,
      message: 'Validation failed',
      details: ['reason must not be empty'],
    });
    expect(toast.toasts()).toMatchObject([
      { kind: 'error', message: 'Validation failed', details: ['reason must not be empty'] },
    ]);
  });

  it('accepts plain text and dismisses on demand', () => {
    toast.error('Cannot change request status from new to assigned');
    const [first] = toast.toasts();
    expect(first.message).toContain('Cannot change request status');
    toast.dismiss(first.id);
    expect(toast.toasts()).toEqual([]);
  });

  it('removes a toast by itself after a while', () => {
    toast.success('Saved');
    expect(toast.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(10_000);
    expect(toast.toasts()).toEqual([]);
  });

  it('keeps at most four toasts on screen', () => {
    for (let i = 0; i < 6; i++) toast.info(`n${i}`);
    expect(toast.toasts().map((t) => t.message)).toEqual(['n2', 'n3', 'n4', 'n5']);
  });
});
