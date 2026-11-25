import { RequestPriority, RequestStatus } from '../models/service-request.model';

/** Display labels for backend request statuses. */
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Display labels for backend request priorities. */
export const REQUEST_PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
