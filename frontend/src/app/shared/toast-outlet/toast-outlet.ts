import { Component, inject } from '@angular/core';

import { ToastService } from '../../core/services/toast.service';

/** Renders the active toasts. Errors use role="alert", the rest a polite live region. */
@Component({
  selector: 'app-toast-outlet',
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  protected readonly toastService = inject(ToastService);
}
