import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { User } from '../../../core/models/user.model';
import { ServiceRequestsService } from '../../../core/services/service-requests.service';
import { ToastService } from '../../../core/services/toast.service';
import { UsersService } from '../../../core/services/users.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { firstError } from '../../../shared/forms/form-errors';
import { Modal } from '../../../shared/modal/modal';
import { errorOutcome } from './workflow-errors';

/** Assign (Reviewed -> Assigned) or reassign (change the technician of an Assigned request). */
@Component({
  selector: 'app-assign-dialog',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './assign-dialog.html',
})
export class AssignDialog implements OnInit {
  private readonly api = inject(ServiceRequestsService);
  private readonly usersApi = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly requestId = input.required<string>();
  readonly requestCode = input('');
  readonly mode = input<'assign' | 'reassign'>('assign');
  /** On reassign, this technician is left out of the list. */
  readonly currentTechnicianId = input<string | null>(null);
  readonly closed = output<boolean>();

  protected readonly form = this.fb.group({
    technicianId: ['', Validators.required],
    scheduledAt: [''],
  });

  protected readonly loadingTechnicians = signal(true);
  protected readonly technicianLoadError = signal<ApiErrorInfo | null>(null);
  private readonly technicians = signal<User[]>([]);
  protected readonly options = computed(() =>
    this.technicians().filter((user) => user.id !== this.currentTechnicianId()),
  );

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<ApiErrorInfo | null>(null);

  protected readonly heading = computed(() =>
    this.mode() === 'reassign' ? 'Reassign technician' : 'Assign technician',
  );

  protected readonly technicianError = () =>
    firstError(this.form.controls.technicianId, { required: 'Choose a technician.' });

  ngOnInit(): void {
    this.loadTechnicians();
  }

  protected loadTechnicians(): void {
    this.loadingTechnicians.set(true);
    this.technicianLoadError.set(null);
    this.usersApi
      .technicians()
      .pipe(finalize(() => this.loadingTechnicians.set(false)))
      .subscribe({
        next: (list) => this.technicians.set(list),
        error: (error: unknown) => this.technicianLoadError.set(parseApiError(error)),
      });
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { technicianId, scheduledAt } = this.form.getRawValue();
    const when = scheduledAt ? new Date(scheduledAt) : null;
    const payload = {
      technicianId,
      // <input type="datetime-local"> is local time; the API wants an ISO date-time.
      ...(when && !Number.isNaN(when.getTime()) ? { scheduledAt: when.toISOString() } : {}),
    };

    this.submitting.set(true);
    this.serverError.set(null);

    const call =
      this.mode() === 'reassign'
        ? this.api.reassign(this.requestId(), payload)
        : this.api.assign(this.requestId(), payload);

    call.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        const name = this.technicians().find((user) => user.id === technicianId)?.fullName;
        const verb = this.mode() === 'reassign' ? 'reassigned' : 'assigned';
        this.toast.success(
          `${this.requestCode() || 'Request'} ${verb}${name ? ` to ${name}` : ''}.`,
        );
        this.closed.emit(true);
      },
      error: (error: unknown) => {
        const info = parseApiError(error);
        this.toast.error(info);
        if (errorOutcome(info) === 'refresh' && info.status !== 404) this.closed.emit(true);
        else this.serverError.set(info);
      },
    });
  }
}
