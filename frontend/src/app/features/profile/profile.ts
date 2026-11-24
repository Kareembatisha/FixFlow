import { Component, inject, OnInit, signal } from '@angular/core';

import { ROLE_LABELS } from '../../core/config/navigation.config';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorInfo, parseApiError } from '../../core/utils/api-error';

/** Shows the signed-in user and re-validates the session against GET /auth/me. */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiErrorInfo | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.loadCurrentUser().subscribe({
      next: () => this.loading.set(false),
      error: (error: unknown) => {
        this.error.set(parseApiError(error));
        this.loading.set(false);
      },
    });
  }
}
