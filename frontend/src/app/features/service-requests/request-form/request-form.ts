import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CreateServiceRequestPayload } from '../../../core/models/service-request.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { ServiceRequestsService } from '../../../core/services/service-requests.service';
import { ServiceTypesService } from '../../../core/services/service-types.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { firstError } from '../../../shared/forms/form-errors';
import { maxTrimmed, notBlank } from '../../../shared/forms/validators';

/**
 * Create-request form (customer). Only constraints confirmed by the backend are enforced here
 * (required fields and the max lengths). Anything else (e.g. a minimum description length) is
 * left to the API, whose validation messages are shown in the error alert.
 */
@Component({
  selector: 'app-request-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './request-form.html',
  styleUrl: './request-form.scss',
})
export class RequestForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly requests = inject(ServiceRequestsService);
  private readonly serviceTypesApi = inject(ServiceTypesService);
  private readonly router = inject(Router);

  protected readonly form = this.fb.group({
    serviceTypeId: ['', [Validators.required]],
    title: ['', [notBlank, maxTrimmed(150)]],
    description: ['', [notBlank]],
    address: ['', [notBlank, maxTrimmed(255)]],
    contactPhone: ['', [notBlank, maxTrimmed(20)]],
    preferredDate: [''],
  });

  protected readonly serviceTypes = signal<ServiceType[]>([]);
  protected readonly typesLoading = signal(true);
  protected readonly typesError = signal<ApiErrorInfo | null>(null);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<ApiErrorInfo | null>(null);

  protected readonly serviceTypeError = () =>
    firstError(this.form.controls.serviceTypeId, { required: 'Select a service type.' });
  protected readonly titleError = () =>
    firstError(this.form.controls.title, {
      required: 'Enter a title for your request.',
      maxlength: 'Title must be 150 characters or fewer.',
    });
  protected readonly descriptionError = () =>
    firstError(this.form.controls.description, {
      required: 'Describe the problem so we can help.',
    });
  protected readonly addressError = () =>
    firstError(this.form.controls.address, {
      required: 'Enter the service address.',
      maxlength: 'Address must be 255 characters or fewer.',
    });
  protected readonly phoneError = () =>
    firstError(this.form.controls.contactPhone, {
      required: 'Enter a contact phone number.',
      maxlength: 'Phone number must be 20 characters or fewer.',
    });

  ngOnInit(): void {
    this.loadServiceTypes();
  }

  protected loadServiceTypes(): void {
    this.typesLoading.set(true);
    this.typesError.set(null);
    this.serviceTypesApi.list().subscribe({
      next: (types) => {
        this.serviceTypes.set(types);
        this.typesLoading.set(false);
      },
      error: (error: unknown) => {
        this.typesError.set(parseApiError(error));
        this.typesLoading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload: CreateServiceRequestPayload = {
      serviceTypeId: value.serviceTypeId,
      title: value.title.trim(),
      description: value.description.trim(),
      address: value.address.trim(),
      contactPhone: value.contactPhone.trim(),
      // The date input already yields YYYY-MM-DD; leave the field out when it is empty.
      ...(value.preferredDate ? { preferredDate: value.preferredDate } : {}),
    };

    this.submitting.set(true);
    this.serverError.set(null);
    this.requests.create(payload).subscribe({
      // Stay "submitting" on success so the form cannot be sent twice while navigating away.
      next: (created) =>
        void this.router.navigate(['/my-requests', created.id], { state: { created: true } }),
      error: (error: unknown) => {
        this.serverError.set(parseApiError(error));
        this.submitting.set(false);
      },
    });
  }
}
