import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ROLE_LABELS } from '../../../core/config/navigation.config';
import { AuthService } from '../../../core/services/auth.service';

/** Shown (inside the shell) when a signed-in user opens a page their role cannot access. */
@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
})
export class Forbidden {
  protected readonly auth = inject(AuthService);
  protected readonly roleLabels = ROLE_LABELS;
}
