import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ApiErrorInfo, parseApiError } from '../../../core/utils/api-error';
import { firstError } from '../../../shared/forms/form-errors';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Validators mirror the backend RegisterDto so most problems are caught before the request.
  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    phone: ['', [Validators.maxLength(20), Validators.pattern(/^[0-9+()\-\s]*$/)]],
  });

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<ApiErrorInfo | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly fullNameError = () =>
    firstError(this.form.controls.fullName, {
      required: 'Enter your full name.',
      minlength: 'Full name must be at least 2 characters.',
      maxlength: 'Full name must be 150 characters or fewer.',
    });

  protected readonly emailError = () =>
    firstError(this.form.controls.email, {
      required: 'Enter your email address.',
      email: 'Enter a valid email address, like name@example.com.',
      maxlength: 'Email must be 150 characters or fewer.',
    });

  protected readonly passwordError = () =>
    firstError(this.form.controls.password, {
      required: 'Choose a password.',
      minlength: 'Password must be at least 8 characters.',
      maxlength: 'Password must be 72 characters or fewer.',
    });

  protected readonly phoneError = () =>
    firstError(this.form.controls.phone, {
      maxlength: 'Phone number must be 20 characters or fewer.',
      pattern: 'Use only digits, spaces, + ( ) and -.',
    });

  protected onSubmit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fullName, email, password, phone } = this.form.getRawValue();
    const normalizedEmail = email.trim().toLowerCase();
    this.submitting.set(true);
    this.serverError.set(null);

    this.auth
      .register({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        // Optional on the API: omit instead of sending an empty string.
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        // The API returns no token on sign-up, so send the user to sign in.
        next: () =>
          void this.router.navigate(['/login'], {
            queryParams: { registered: '1' },
            state: { email: normalizedEmail },
          }),
        error: (error: unknown) => this.serverError.set(parseApiError(error)),
      });
  }
}
