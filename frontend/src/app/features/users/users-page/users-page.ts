import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { catchError, debounceTime, filter, finalize, map, of, Subject, switchMap } from 'rxjs';

import { ROLE_LABELS } from '../../../core/config/navigation.config';
import { Paginated } from '../../../core/models/pagination.model';
import {
  CREATABLE_ROLES,
  CreatableRole,
  User,
  USER_ROLES,
  UserQuery,
  UserRole,
} from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';
import { UsersService } from '../../../core/services/users.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { firstError } from '../../../shared/forms/form-errors';
import { notBlank } from '../../../shared/forms/validators';
import { Modal } from '../../../shared/modal/modal';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

type RoleFilter = UserRole | '';
interface Filters {
  role: RoleFilter;
  search: string;
  page: number;
}

/**
 * Admin user management: browse accounts and create technicians and supervisors. A new
 * technician immediately appears in the assignment dialog (it reads /users/technicians).
 * Filtering, search and paging are server-side, like the request list.
 */
@Component({
  selector: 'app-users-page',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly api = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly roleLabel = (role: string): string =>
    (ROLE_LABELS as Record<string, string>)[role] ?? role;
  protected readonly formatDate = formatDate;
  protected readonly roleFilterOptions = USER_ROLES.map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));
  protected readonly creatableRoles = CREATABLE_ROLES.map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly roleControl = new FormControl<RoleFilter>('', { nonNullable: true });

  private readonly filters = signal<Filters>({ role: '', search: '', page: 1 });
  protected readonly hasFilters = computed(() => !!this.filters().role || !!this.filters().search);

  protected readonly loading = signal(true);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly result = signal<Paginated<User> | null>(null);

  private readonly queries = new Subject<UserQuery>();

  // ---- create dialog ----
  protected readonly creating = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<ApiErrorInfo | null>(null);
  protected readonly showPassword = signal(false);

  // Validators mirror the backend CreateUserDto.
  protected readonly form = this.fb.group({
    fullName: ['', [notBlank, Validators.minLength(2), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    phone: ['', [Validators.maxLength(20), Validators.pattern(/^[0-9+()\-\s]*$/)]],
    role: ['technician' as CreatableRole, Validators.required],
  });

  protected readonly fullNameError = () =>
    firstError(this.form.controls.fullName, {
      required: 'Enter the full name.',
      minlength: 'Full name must be at least 2 characters.',
      maxlength: 'Full name must be 150 characters or fewer.',
    });

  protected readonly emailError = () =>
    firstError(this.form.controls.email, {
      required: 'Enter an email address.',
      email: 'Enter a valid email address, like name@example.com.',
      maxlength: 'Email must be 150 characters or fewer.',
    });

  protected readonly passwordError = () =>
    firstError(this.form.controls.password, {
      required: 'Set a temporary password.',
      minlength: 'Password must be at least 8 characters.',
      maxlength: 'Password must be 72 characters or fewer.',
    });

  protected readonly phoneError = () =>
    firstError(this.form.controls.phone, {
      maxlength: 'Phone number must be 20 characters or fewer.',
      pattern: 'Use only digits, spaces, + ( ) and -.',
    });

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

    this.roleControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((role) => this.update({ role }));
  }

  ngOnInit(): void {
    this.fetch();
  }

  protected retry(): void {
    this.fetch();
  }

  protected clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.roleControl.setValue('', { emitEvent: false });
    this.update({ role: '', search: '' });
  }

  protected previousPage(): void {
    const meta = this.result()?.meta;
    if (meta && meta.page > 1) this.update({ page: meta.page - 1 });
  }

  protected nextPage(): void {
    const meta = this.result()?.meta;
    if (meta && meta.page < meta.totalPages) this.update({ page: meta.page + 1 });
  }

  protected openCreate(): void {
    this.form.reset({ fullName: '', email: '', password: '', phone: '', role: 'technician' });
    this.serverError.set(null);
    this.showPassword.set(false);
    this.creating.set(true);
  }

  protected closeCreate(): void {
    if (!this.submitting()) this.creating.set(false);
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, email, password, phone, role } = this.form.getRawValue();
    this.submitting.set(true);
    this.serverError.set(null);

    this.api
      .create({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        // Optional on the API: omit instead of sending an empty string.
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (user) => {
          this.creating.set(false);
          this.toast.success(
            `${user.fullName} was added as ${this.roleLabel(user.role).toLowerCase()}.`,
          );
          // Show the new account: newest first on page 1 with no filters in the way.
          this.searchControl.setValue('', { emitEvent: false });
          this.roleControl.setValue('', { emitEvent: false });
          this.update({ role: '', search: '', page: 1 });
        },
        error: (error: unknown) => {
          const info = parseApiError(error);
          this.serverError.set(info);
          this.toast.error(info);
        },
      });
  }

  /** Any filter change goes back to page 1 unless the patch sets the page itself. */
  private update(patch: Partial<Filters>): void {
    this.filters.update((current) => ({ ...current, page: 1, ...patch }));
    this.fetch();
  }

  private fetch(): void {
    const { role, search, page } = this.filters();
    this.loading.set(true);
    this.error.set(null);
    this.queries.next({
      page,
      limit: PAGE_SIZE,
      ...(role ? { role } : {}),
      ...(search ? { search } : {}),
    });
  }

  private show(outcome: { page: Paginated<User> | null; error: ApiErrorInfo | null }) {
    if (!outcome.page) {
      this.result.set(null);
      this.error.set(outcome.error);
      this.loading.set(false);
      return;
    }
    const { items, meta } = outcome.page;
    if (items.length === 0 && meta.totalPages > 0 && meta.page > meta.totalPages) {
      this.update({ page: meta.totalPages });
      return;
    }
    this.result.set(outcome.page);
    this.loading.set(false);
  }
}
