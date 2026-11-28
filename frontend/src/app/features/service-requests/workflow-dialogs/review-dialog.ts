import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { REQUEST_PRIORITY_LABELS } from '../../../core/config/request-labels.config';
import { REQUEST_PRIORITIES, RequestPriority } from '../../../core/models/service-request.model';
import { ServiceRequestsService } from '../../../core/services/service-requests.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { firstError } from '../../../shared/forms/form-errors';
import { maxTrimmed } from '../../../shared/forms/validators';
import { Modal } from '../../../shared/modal/modal';
import { errorOutcome } from './workflow-errors';

/** Review: the supervisor confirms the request and sets its priority (New -> Reviewed). */
@Component({
  selector: 'app-review-dialog',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './review-dialog.html',
})
export class ReviewDialog implements OnInit {
  private readonly api = inject(ServiceRequestsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly requestId = input.required<string>();
  readonly requestCode = input('');
  readonly currentPriority = input<RequestPriority>('medium');
  /** `true` when the request may have changed (success or stale state), so the page reloads. */
  readonly closed = output<boolean>();

  protected readonly priorities = REQUEST_PRIORITIES.map((value) => ({
    value,
    label: REQUEST_PRIORITY_LABELS[value],
  }));

  protected readonly form = this.fb.group({
    priority: ['medium' as RequestPriority, Validators.required],
    note: ['', maxTrimmed(500)],
  });

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<ApiErrorInfo | null>(null);

  protected readonly noteError = () =>
    firstError(this.form.controls.note, { maxlength: 'The note must be 500 characters or fewer.' });

  ngOnInit(): void {
    this.form.controls.priority.setValue(this.currentPriority());
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { priority, note } = this.form.getRawValue();
    const trimmed = note.trim();
    this.submitting.set(true);
    this.serverError.set(null);

    this.api
      .review(this.requestId(), { priority, ...(trimmed ? { note: trimmed } : {}) })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(`${this.requestCode() || 'Request'} reviewed.`);
          this.closed.emit(true);
        },
        error: (error: unknown) => {
          const info = parseApiError(error);
          this.toast.error(info);
          if (errorOutcome(info) === 'refresh') this.closed.emit(true);
          else this.serverError.set(info);
        },
      });
  }
}
