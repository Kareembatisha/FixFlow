import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { safeReturnUrl } from '../../../core/utils/return-url';
import { firstError } from '../../../shared/forms/form-errors';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly form = this.fb.group({
    email: [
      (this.location.getState() as { email?: string } | null)?.email ?? '',
      [Validators.required, Validators.email, Validators.maxLength(150)],
    ],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<ApiErrorInfo | null>(null);
  protected readonly showPassword = signal(false);

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** Context banner shown above the form (after sign-up, or after an expired session). */
  protected readonly notice = computed(() => {
    const q = this.query();
    if (q.get('registered'))
      return { kind: 'success', text: 'Account created. Sign in to continue.' };
    if (q.get('reason') === 'session-expired') {
      return { kind: 'info', text: 'Your session has ended. Sign in again to continue.' };
    }
    return null;
  });

  protected readonly emailError = () =>
    firstError(this.form.controls.email, {
      required: 'Enter your email address.',
      email: 'Enter a valid email address, like name@example.com.',
      maxlength: 'Email must be 150 characters or fewer.',
    });

  protected readonly passwordError = () =>
    firstError(this.form.controls.password, { required: 'Enter your password.' });

  protected onSubmit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.serverError.set(null);

    this.auth
      .login({ email: email.trim().toLowerCase(), password })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          const target = safeReturnUrl(this.query().get('returnUrl')) ?? this.auth.homePath();
          void this.router.navigateByUrl(target);
        },
        error: (error: unknown) => this.serverError.set(parseApiError(error)),
      });
  }
}
