import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';

import { REQUEST_PRIORITY_LABELS } from '../../../core/config/request-labels.config';
import { ServiceRequest, StatusHistoryEntry } from '../../../core/models/service-request.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceRequestsService } from '../../../core/services/service-requests.service';
import { ServiceTypesService } from '../../../core/services/service-types.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { availableActions, RequestAction } from '../../../core/workflow/request-actions';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { Timeline } from '../../../shared/timeline/timeline';
import { AssignDialog } from '../workflow-dialogs/assign-dialog';
import { CancelDialog } from '../workflow-dialogs/cancel-dialog';
import { ReviewDialog } from '../workflow-dialogs/review-dialog';

/**
 * One request: its information, the workflow actions the signed-in role may take right now, and
 * the history timeline. Which buttons exist comes only from `canDo` (see request-actions.ts).
 * After every action the page reloads in the background, so nothing needs a manual refresh.
 * Ownership/visibility is enforced by the backend (404 for requests the user can't see).
 */
@Component({
  selector: 'app-request-details',
  imports: [RouterLink, StatusBadge, Timeline, ReviewDialog, AssignDialog, CancelDialog],
  templateUrl: './request-details.html',
  styleUrl: './request-details.scss',
})
export class RequestDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ServiceRequestsService);
  private readonly serviceTypesApi = inject(ServiceTypesService);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);

  protected readonly priorityLabel = (priority: string): string =>
    (REQUEST_PRIORITY_LABELS as Record<string, string>)[priority] ?? priority;
  protected readonly formatDate = formatDate;

  /** Supervisors and admins work from /requests, customers from /my-requests. */
  protected readonly isStaff = computed(() => {
    const role = this.auth.role();
    return role === 'supervisor' || role === 'admin';
  });
  protected readonly listPath = computed(() => (this.isStaff() ? '/requests' : '/my-requests'));

  protected readonly loading = signal(true);
  protected readonly request = signal<ServiceRequest | null>(null);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  /** 404 (not yours / missing) and 400 (malformed id) both mean "no such request" to the user. */
  protected readonly notFound = computed(() => {
    const status = this.error()?.status;
    return status === 404 || status === 400;
  });

  protected readonly history = signal<StatusHistoryEntry[] | null>(null);
  protected readonly historyError = signal<ApiErrorInfo | null>(null);

  /** The only source of truth for which workflow buttons are shown. */
  protected readonly actions = computed<RequestAction[]>(() =>
    availableActions(this.auth.role(), this.request()?.status),
  );
  protected readonly has = (action: RequestAction): boolean => this.actions().includes(action);

  protected readonly dialog = signal<RequestAction | null>(null);

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
    const trigger$ = combineLatest([this.route.paramMap, this.reload$]);

    trigger$
      .pipe(
        tap(([params]) => {
          // A background reload (after an action) keeps the page on screen; only a different
          // request, or a first load, shows the loading state.
          if (this.request()?.id !== params.get('id')) {
            this.request.set(null);
            this.loading.set(true);
          }
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

    trigger$
      .pipe(
        tap(() => this.historyError.set(null)),
        switchMap(([params]) =>
          this.api.history(params.get('id') ?? '').pipe(
            map((entries) => ({ entries, error: null })),
            catchError((error: unknown) => of({ entries: null, error: parseApiError(error) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ entries, error }) => {
        // Keep the previous entries if a background refresh fails.
        if (entries) this.history.set(entries);
        this.historyError.set(error);
      });

    this.serviceTypesApi
      .list()
      .pipe(catchError(() => of([] as ServiceType[])))
      .subscribe((types) => this.serviceTypes.set(types));
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected open(action: RequestAction): void {
    this.dialog.set(action);
  }

  /** `changed` is true when the request may have changed, so the page reloads in the background. */
  protected onDialogClosed(changed: boolean): void {
    this.dialog.set(null);
    if (changed) this.reload$.next();
  }
}
