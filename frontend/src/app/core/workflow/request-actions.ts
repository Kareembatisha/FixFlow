import { RequestStatus } from '../models/service-request.model';
import { UserRole } from '../models/user.model';

/** Workflow actions a user can trigger from the request details page. */
export const REQUEST_ACTIONS = ['review', 'assign', 'reassign', 'cancel'] as const;
export type RequestAction = (typeof REQUEST_ACTIONS)[number];

const STAFF: readonly UserRole[] = ['supervisor', 'admin'];

/** Statuses a supervisor/admin may cancel from (mirrors the backend transition table). */
const STAFF_CANCELLABLE: readonly RequestStatus[] = ['new', 'reviewed', 'assigned', 'in_progress'];

export interface ActionContext {
  /** Whether the signed-in user owns the request. Customers only ever receive their own. */
  isOwner?: boolean;
}

/**
 * The single place that decides which workflow buttons exist for a (role x status) pair.
 * Templates call this instead of repeating `@if (role === ... && status === ...)`.
 *
 * It mirrors the backend rules (WorkflowService + ServiceRequestsService) so users never see a
 * button the API would refuse. It is UX only: the API remains the authority.
 */
export function canDo(
  action: RequestAction,
  role: UserRole | null | undefined,
  status: RequestStatus | string | null | undefined,
  context: ActionContext = {},
): boolean {
  if (!role || !status) return false;

  switch (action) {
    case 'review':
      return STAFF.includes(role) && status === 'new';
    case 'assign':
      return STAFF.includes(role) && status === 'reviewed';
    case 'reassign':
      return STAFF.includes(role) && status === 'assigned';
    case 'cancel':
      if (STAFF.includes(role)) {
        return (STAFF_CANCELLABLE as readonly string[]).includes(status);
      }
      // A customer may only cancel their own request, and only before it is reviewed.
      return role === 'customer' && status === 'new' && context.isOwner !== false;
    default:
      return false;
  }
}

/** Every action available for a (role x status) pair, in display order. */
export function availableActions(
  role: UserRole | null | undefined,
  status: RequestStatus | string | null | undefined,
  context: ActionContext = {},
): RequestAction[] {
  return REQUEST_ACTIONS.filter((action) => canDo(action, role, status, context));
}
