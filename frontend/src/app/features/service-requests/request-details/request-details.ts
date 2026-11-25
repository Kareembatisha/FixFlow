import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';

import { REQUEST_PRIORITY_LABELS } from '../../../core/config/request-labels.config';
import { ServiceRequest } from '../../../core/models/service-request.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { ServiceRequestsService } from '../../../core/services/service-requests.service';
import { ServiceTypesService } from '../../../core/services/service-types.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { StatusBadge } from '../../../shared/status-badge/status-badge';

/** Read-only view of one request. Ownership is enforced by the backend (404 for others'). */
@Component({
  selector: 'app-request-details',
  imports: [RouterLink, StatusBadge],
  templateUrl: './request-details.html',
  styleUrl: './request-details.scss',
})
export class RequestDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ServiceRequestsService);
  private readonly serviceTypesApi = inject(ServiceTypesService);
  private readonly location = inject(Location);

  protected readonly priorityLabel = (priority: string): string =>
    (REQUEST_PRIORITY_LABELS as Record<string, string>)[priority] ?? priority;
  protected readonly formatDate = formatDate;

  protected readonly loading = signal(true);
  protected readonly request = signal<ServiceRequest | null>(null);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  /** 404 (not yours / missing) and 400 (malformed id) both mean "no such request" to the user. */
  protected readonly notFound = computed(() => {
    const status = this.error()?.status;
    return status === 404 || status === 400;
  });

  /** Set by the create form through router state, so a fresh submit shows a confirmation. */
  protected readonly justCreated =
    (this.location.getState() as { created?: boolean } | null)?.created === true;

  private readonly serviceTypes = signal<ServiceType[]>([]);
  protected readonly serviceTypeName = computed(() => {
    const id = this.request()?.serviceTypeId;
    return this.serviceTypes().find((type) => type.id === id)?.name ?? 'Not available';
  });

  private readonly reload$ = new BehaviorSubject<void>(undefined);

  constructor() {
    combineLatest([this.route.paramMap, this.reload$])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(([params]) =>
          this.api.getById(params.get('id') ?? '').pipe(
            map((request) => ({ request, error: null })),
            catchError((error: unknown) => of({ request: null, error: parseApiError(error) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ request, error }) => {
        this.request.set(request);
        this.error.set(error);
        this.loading.set(false);
      });

    this.serviceTypesApi
      .list()
      .pipe(catchError(() => of([] as ServiceType[])))
      .subscribe((types) => this.serviceTypes.set(types));
  }

  protected retry(): void {
    this.reload$.next();
  }
}
