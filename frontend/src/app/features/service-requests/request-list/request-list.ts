import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, filter, map, of, Subject, switchMap } from 'rxjs';

import {
  REQUEST_PRIORITY_LABELS,
  REQUEST_STATUS_LABELS,
} from '../../../core/config/request-labels.config';
import { Paginated } from '../../../core/models/pagination.model';
import {
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  RequestPriority,
  RequestStatus,
  ServiceRequest,
  ServiceRequestQuery,
} from '../../../core/models/service-request.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceRequestsService } from '../../../core/services/service-requests.service';
import { ServiceTypesService } from '../../../core/services/service-types.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { StatusBadge } from '../../../shared/status-badge/status-badge';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

type StatusFilter = RequestStatus | '';
type PriorityFilter = RequestPriority | '';
interface Filters {
  status: StatusFilter;
  priority: PriorityFilter;
  search: string;
  page: number;
}

/**
 * The request list. A customer sees their own requests (/my-requests); supervisors and admins see
 * every request (/requests) and can also filter by priority. Filtering, search and paging are all server-side: the
 * component only holds the current filters and shows whatever page + meta the API returns.
 * (Ownership is enforced by the backend, so no user id is ever sent.)
 */
@Component({
  selector: 'app-request-list',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge],
  templateUrl: './request-list.html',
  styleUrl: './request-list.scss',
})
export class RequestList implements OnInit {
  private readonly api = inject(ServiceRequestsService);
  private readonly serviceTypesApi = inject(ServiceTypesService);
  private readonly auth = inject(AuthService);

  /** Staff work from /requests and see everyone's requests; customers only their own. */
  protected readonly isStaff = computed(() => {
    const role = this.auth.role();
    return role === 'supervisor' || role === 'admin';
  });
  protected readonly basePath = computed(() => (this.isStaff() ? '/requests' : '/my-requests'));

  protected readonly priorityOptions = REQUEST_PRIORITIES.map((value) => ({
    value,
    label: REQUEST_PRIORITY_LABELS[value],
  }));

  protected readonly statusOptions = REQUEST_STATUSES.map((value) => ({
    value,
    label: REQUEST_STATUS_LABELS[value],
  }));
  protected readonly priorityLabel = (priority: string): string =>
    (REQUEST_PRIORITY_LABELS as Record<string, string>)[priority] ?? priority;
  protected readonly formatDate = formatDate;

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly statusControl = new FormControl<StatusFilter>('', { nonNullable: true });
  protected readonly priorityControl = new FormControl<PriorityFilter>('', { nonNullable: true });

  private readonly filters = signal<Filters>({ status: '', priority: '', search: '', page: 1 });
  protected readonly hasFilters = computed(
    () => !!this.filters().status || !!this.filters().priority || !!this.filters().search,
  );

  protected readonly loading = signal(true);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly result = signal<Paginated<ServiceRequest> | null>(null);

  /** Requests only carry `serviceTypeId`, so names come from the (active) service types. */
  private readonly serviceTypes = signal<ServiceType[]>([]);
  private readonly typeNames = computed(
    () => new Map(this.serviceTypes().map((type) => [type.id, type.name])),
  );

  /** Each emission replaces the previous in-flight request (switchMap), so stale replies are dropped. */
  private readonly queries = new Subject<ServiceRequestQuery>();

  constructor() {
    this.queries
      .pipe(
        switchMap((query) =>
          this.api.list(query).pipe(
            map((page) => ({ page, error: null })),
            catchError((error: unknown) => of({ page: null, error: parseApiError(error) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.show(outcome));

    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((value) => value.trim()),
        filter((search) => search !== this.filters().search),
        takeUntilDestroyed(),
      )
      .subscribe((search) => this.update({ search }));

    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.update({ status }));

    this.priorityControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((priority) => this.update({ priority }));
  }

  ngOnInit(): void {
    this.fetch();
    this.serviceTypesApi
      .list()
      .pipe(catchError(() => of([] as ServiceType[])))
      .subscribe((types) => this.serviceTypes.set(types));
  }

  protected typeName(serviceTypeId: string): string {
    return this.typeNames().get(serviceTypeId) ?? '—';
  }

  protected retry(): void {
    this.fetch();
  }

  protected clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.priorityControl.setValue('', { emitEvent: false });
    this.update({ status: '', priority: '', search: '' });
  }

  protected previousPage(): void {
    const meta = this.result()?.meta;
    if (meta && meta.page > 1) this.update({ page: meta.page - 1 });
  }

  protected nextPage(): void {
    const meta = this.result()?.meta;
    if (meta && meta.page < meta.totalPages) this.update({ page: meta.page + 1 });
  }

  /** Any filter change goes back to page 1 unless the patch sets the page itself. */
  private update(patch: Partial<Filters>): void {
    this.filters.update((current) => ({ ...current, page: 1, ...patch }));
    this.fetch();
  }

  private fetch(): void {
    const { status, priority, search, page } = this.filters();
    this.loading.set(true);
    this.error.set(null);
    this.queries.next({
      page,
      limit: PAGE_SIZE,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(search ? { search } : {}),
    });
  }

  private show(outcome: { page: Paginated<ServiceRequest> | null; error: ApiErrorInfo | null }) {
    if (!outcome.page) {
      this.result.set(null);
      this.error.set(outcome.error);
      this.loading.set(false);
      return;
    }
    const { items, meta } = outcome.page;
    // The last page can disappear between requests; fall back to the real last page.
    if (items.length === 0 && meta.totalPages > 0 && meta.page > meta.totalPages) {
      this.update({ page: meta.totalPages });
      return;
    }
    this.result.set(outcome.page);
    this.loading.set(false);
  }
}
