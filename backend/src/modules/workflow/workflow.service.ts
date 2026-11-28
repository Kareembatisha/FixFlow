import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { ServiceRequest } from '../service-requests/entities/service-request.entity';
import { RequestStatus } from '../service-requests/enums/request-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

import { TRANSITIONS } from './transitions';
import { StatusHistoryService } from './status-history.service';

@Injectable()
export class WorkflowService {
  constructor(private readonly statusHistoryService: StatusHistoryService) {}

  async changeStatus(
    manager: EntityManager,
    request: ServiceRequest,
    to: RequestStatus,
    user: User,
    reason?: string,
  ): Promise<ServiceRequest> {
    // 1. Reload and lock the request inside the transaction.
    const currentRequest = await manager.findOne(ServiceRequest, {
      where: { id: request.id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!currentRequest) {
      throw new NotFoundException('Service request not found');
    }

    // 2. Validate that the requested transition is allowed.
    const allowedTransitions = TRANSITIONS[currentRequest.status];

    if (!allowedTransitions.includes(to)) {
      throw new BadRequestException(
        `Cannot change request status from ${currentRequest.status} to ${to}`,
      );
    }

    // 3. Validate the reason when required.
    const normalizedReason = reason?.trim();

    const requiresReason =
      to === RequestStatus.CANCELLED ||
      (currentRequest.status === RequestStatus.PENDING_REVIEW &&
        to === RequestStatus.IN_PROGRESS);

    if (requiresReason && !normalizedReason) {
      throw new BadRequestException(
        'A reason is required for this status transition',
      );
    }

    // 4. Identify the current user's role.
    const isAdmin = user.role === UserRole.ADMIN;
    const isSupervisor = user.role === UserRole.SUPERVISOR;
    const isCustomer = user.role === UserRole.CUSTOMER;

    // 5. Define transitions that supervisors are allowed to perform.
    const isSupervisorTransition =
      (currentRequest.status === RequestStatus.NEW &&
        to === RequestStatus.REVIEWED) ||
      (currentRequest.status === RequestStatus.REVIEWED &&
        to === RequestStatus.ASSIGNED) ||
      (currentRequest.status === RequestStatus.PENDING_REVIEW &&
        (to === RequestStatus.COMPLETED || to === RequestStatus.IN_PROGRESS)) ||
      (to === RequestStatus.CANCELLED &&
        [
          RequestStatus.NEW,
          RequestStatus.REVIEWED,
          RequestStatus.ASSIGNED,
          RequestStatus.IN_PROGRESS,
        ].includes(currentRequest.status));

    // 6. Check whether the customer owns the request and can cancel it.
    const canCustomerCancel =
      isCustomer &&
      currentRequest.customerId === user.id &&
      currentRequest.status === RequestStatus.NEW &&
      to === RequestStatus.CANCELLED;

    // 7. Authorize the transition.
    const isAuthorized =
      isAdmin || (isSupervisor && isSupervisorTransition) || canCustomerCancel;

    if (!isAuthorized) {
      throw new ForbiddenException(
        'You are not allowed to perform this status transition',
      );
    }

    // 8. Save the previous status before changing it.
    const oldStatus = currentRequest.status;

    // 9. Update the request status.
    currentRequest.status = to;

    if (to === RequestStatus.CANCELLED) {
      currentRequest.cancelReason = normalizedReason!;
    }

    // 10. Save the updated request.
    const savedRequest = await manager.save(ServiceRequest, currentRequest);

    // 11. Record the status transition using the same transaction.
    await this.statusHistoryService.record(manager, {
      entityType: 'service_request',
      entityId: savedRequest.id,
      oldStatus,
      newStatus: to,
      changedById: user.id,
      reason: normalizedReason ?? null,
    });

    return savedRequest;
  }
}
