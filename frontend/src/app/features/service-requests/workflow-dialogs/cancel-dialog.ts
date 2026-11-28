import { Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ServiceRequestsService } from '../../../core/services/service-requests.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { firstError } from '../../../shared/forms/form-errors';
import { maxTrimmed, notBlank } from '../../../shared/forms/validators';
import { Modal } from '../../../shared/modal/modal';
import { errorOutcome } from './workflow-errors';

/** Cancel: a reason is mandatory, so the confirm button stays disabled until one is written. */
@Component({
  selector: 'app-cancel-dialog',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './cancel-dialog.html',
})
export class CancelDialog {
  private readonly api = inject(ServiceRequestsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly requestId = input.required<string>();
  readonly requestCode = input('');
  readonly closed = output<boolean>();

  protected readonly form = this.fb.group({
    reason: ['', [notBlank, maxTrimmed(1000)]],
  });

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<ApiErrorInfo | null>(null);

  protected readonly reasonError = () =>
    firstError(this.form.controls.reason, {
      required: 'Tell us why the request is being cancelled.',
      maxlength: 'The reason must be 1000 characters or fewer.',
    });

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.serverError.set(null);

    this.api
      .cancel(this.requestId(), { reason: this.form.controls.reason.value.trim() })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(`${this.requestCode() || 'Request'} cancelled.`);
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
