import { Component, computed, input } from '@angular/core';

import { REQUEST_STATUS_LABELS } from '../../core/config/request-labels.config';
import { ROLE_LABELS } from '../../core/config/navigation.config';
import { RequestStatus, StatusHistoryEntry } from '../../core/models/service-request.model';
import { UserRole } from '../../core/models/user.model';
import { formatDate } from '../../core/utils/format-date';
import { StatusBadge } from '../status-badge/status-badge';

interface TimelineStep {
  id: string;
  kind: 'created' | 'change' | 'update';
  title: string;
  status: RequestStatus;
  from: string | null;
  by: string;
  role: string | null;
  at: string;
  reason: string | null;
}

const statusLabel = (status: string): string =>
  (REQUEST_STATUS_LABELS as Record<string, string>)[status] ?? status;

function toStep(entry: StatusHistoryEntry): TimelineStep {
  const sameStatus = entry.oldStatus === entry.newStatus;
  const kind: TimelineStep['kind'] =
    entry.oldStatus === null ? 'created' : sameStatus ? 'update' : 'change';
  const title =
    kind === 'created'
      ? 'Request created'
      : kind === 'update'
        ? entry.newStatus === 'assigned'
          ? 'Technician reassigned'
          : 'Request updated'
        : statusLabel(entry.newStatus);
  const role = entry.changedBy?.role;
  return {
    id: entry.id,
    kind,
    title,
    status: entry.newStatus,
    from: kind === 'change' && entry.oldStatus ? statusLabel(entry.oldStatus) : null,
    by: entry.changedBy?.fullName ?? 'Unknown user',
    role: role ? ((ROLE_LABELS as Record<string, string>)[role as UserRole] ?? role) : null,
    at: entry.createdAt,
    reason: entry.reason?.trim() || null,
  };
}

/**
 * Chronological history of a request: every step with who did it, when and why. The API
 * returns newest first; the timeline reads oldest to newest like a story.
 */
@Component({
  selector: 'app-timeline',
  imports: [StatusBadge],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline {
  readonly entries = input.required<StatusHistoryEntry[]>();

  protected readonly formatDate = formatDate;

  protected readonly steps = computed<TimelineStep[]>(() =>
    this.entries()
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => {
        const diff = Date.parse(a.entry.createdAt) - Date.parse(b.entry.createdAt);
        // Same-millisecond entries (rare): keep the API order reversed, i.e. oldest first.
        return Number.isNaN(diff) || diff === 0 ? b.index - a.index : diff;
      })
      .map(({ entry }) => toStep(entry)),
  );
}
