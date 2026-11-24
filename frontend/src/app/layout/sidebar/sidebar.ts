import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { navItemsFor } from '../../core/config/navigation.config';
import { AuthService } from '../../core/services/auth.service';

/** Role-aware navigation. The links come from the central navigation config. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly auth = inject(AuthService);

  /** Whether the off-canvas drawer is open (mobile only). */
  readonly open = input(false);
  /** Emitted when a link is chosen so the drawer can close. */
  readonly itemSelected = output<void>();

  protected readonly items = computed(() => navItemsFor(this.auth.role()));
}
