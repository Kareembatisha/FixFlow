import { Component, computed, input } from '@angular/core';

import { REQUEST_STATUS_LABELS } from '../../core/config/request-labels.config';
import { REQUEST_STATUSES, RequestStatus } from '../../core/models/service-request.model';

function isKnownStatus(value: unknown): value is RequestStatus {
  return (REQUEST_STATUSES as readonly unknown[]).includes(value);
}

/** "waiting_parts" -> "Waiting parts": readable text for a status this app doesn't know yet. */
function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unknown';
}

/**
 * Colored pill for a request status. The text label always carries the meaning, color is only
 * reinforcement. Unknown values render neutrally with a readable label instead of failing.
 */
@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  readonly status = input<string | null | undefined>();

  protected readonly view = computed(() => {
    const status = this.status();
    if (isKnownStatus(status)) {
      return { cssClass: `status-${status}`, label: REQUEST_STATUS_LABELS[status] };
    }
    return { cssClass: 'status-unknown', label: humanize(status ?? '') };
  });
}
