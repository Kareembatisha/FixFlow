import { RequestStatus } from '../service-requests/enums/request-status.enum';

export const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  [RequestStatus.NEW]: [RequestStatus.REVIEWED, RequestStatus.CANCELLED],

  [RequestStatus.REVIEWED]: [RequestStatus.ASSIGNED, RequestStatus.CANCELLED],

  [RequestStatus.ASSIGNED]: [
    RequestStatus.IN_PROGRESS,
    RequestStatus.CANCELLED,
  ],

  [RequestStatus.IN_PROGRESS]: [
    RequestStatus.PENDING_REVIEW,
    RequestStatus.CANCELLED,
  ],

  [RequestStatus.PENDING_REVIEW]: [
    RequestStatus.COMPLETED,
    RequestStatus.IN_PROGRESS,
  ],

  [RequestStatus.COMPLETED]: [],

  [RequestStatus.CANCELLED]: [],
};
