import { REQUEST_STATUSES } from '../models/service-request.model';
import { USER_ROLES, UserRole } from '../models/user.model';
import { availableActions, canDo, RequestAction } from './request-actions';

describe('canDo (role x status)', () => {
  const matrix: [UserRole, string, RequestAction[]][] = [
    // Customers: cancel their own request, only before it is reviewed.
    ['customer', 'new', ['cancel']],
    ['customer', 'reviewed', []],
    ['customer', 'assigned', []],
    ['customer', 'in_progress', []],
    // Supervisors run the workflow.
    ['supervisor', 'new', ['review', 'cancel']],
    ['supervisor', 'reviewed', ['assign', 'cancel']],
    ['supervisor', 'assigned', ['reassign', 'cancel']],
    ['supervisor', 'in_progress', ['cancel']],
    ['supervisor', 'pending_review', []],
    ['supervisor', 'completed', []],
    ['supervisor', 'cancelled', []],
    // Admins can do what supervisors can.
    ['admin', 'new', ['review', 'cancel']],
    ['admin', 'reviewed', ['assign', 'cancel']],
    ['admin', 'assigned', ['reassign', 'cancel']],
    ['admin', 'completed', []],
    // Technicians have no workflow actions on the request page.
    ['technician', 'new', []],
    ['technician', 'assigned', []],
    ['technician', 'in_progress', []],
  ];

  it.each(matrix)('%s on a %s request may: %j', (role, status, expected) => {
    expect(availableActions(role, status)).toEqual(expected);
  });

  it('never offers an action once a request is closed, for any role', () => {
    for (const role of USER_ROLES) {
      for (const status of ['completed', 'cancelled']) {
        expect(availableActions(role, status)).toEqual([]);
      }
    }
  });

  it('only staff can review, assign or reassign', () => {
    for (const status of REQUEST_STATUSES) {
      for (const role of ['customer', 'technician'] as UserRole[]) {
        expect(canDo('review', role, status)).toBe(false);
        expect(canDo('assign', role, status)).toBe(false);
        expect(canDo('reassign', role, status)).toBe(false);
      }
    }
  });

  it('does not let a customer cancel a request they do not own', () => {
    expect(canDo('cancel', 'customer', 'new', { isOwner: false })).toBe(false);
    expect(canDo('cancel', 'customer', 'new', { isOwner: true })).toBe(true);
  });

  it('offers nothing without a role or a status, or for unknown values', () => {
    expect(canDo('review', null, 'new')).toBe(false);
    expect(canDo('review', 'supervisor', undefined)).toBe(false);
    expect(canDo('review', 'supervisor', 'waiting_parts')).toBe(false);
    expect(availableActions(undefined, null)).toEqual([]);
  });
});
