import { Component, inject, output, signal } from '@angular/core';

import { ROLE_LABELS } from '../../core/config/navigation.config';
import { AuthService } from '../../core/services/auth.service';

/** Top bar: brand, current user + role, and logout. Reacts to AuthService state. */
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly auth = inject(AuthService);
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly loggingOut = signal(false);

  /** Emitted when the mobile menu button is pressed. */
  readonly menuToggle = output<void>();

  protected async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      await this.auth.logout();
    } finally {
      this.loggingOut.set(false);
    }
  }
}
