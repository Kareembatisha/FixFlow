import { Injectable, signal } from '@angular/core';

import { ApiErrorInfo } from '../utils/api-error';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Extra lines, e.g. validation messages from the API. */
  details: string[];
}

const DURATION_MS: Record<ToastKind, number> = { success: 4000, info: 5000, error: 8000 };

/** App-wide notifications. Rendered by <app-toast-outlet>. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly state = signal<Toast[]>([]);
  readonly toasts = this.state.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  /** Shows what the backend said (message + validation details) in readable form. */
  error(error: ApiErrorInfo | string): void {
    if (typeof error === 'string') {
      this.push('error', error);
    } else {
      this.push('error', error.message, error.details);
    }
  }

  dismiss(id: number): void {
    this.state.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(kind: ToastKind, message: string, details: string[] = []): void {
    const id = this.nextId++;
    this.state.update((toasts) => [...toasts, { id, kind, message, details }].slice(-4));
    setTimeout(() => this.dismiss(id), DURATION_MS[kind]);
  }
}
