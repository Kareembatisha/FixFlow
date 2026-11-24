import { UserRole } from '../models/user.model';

export interface NavItem {
  label: string;
  path: string;
  /** Roles allowed to see AND open this page. Single source of truth for both. */
  roles: readonly UserRole[];
}

export const ALL_ROLES: readonly UserRole[] = ['customer', 'technician', 'supervisor', 'admin'];

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Customer',
  technician: 'Technician',
  supervisor: 'Supervisor',
  admin: 'Admin',
};

/** Where each role lands after login and when visiting "/". */
export const ROLE_HOME: Record<UserRole, string> = {
  customer: '/my-requests',
  technician: '/my-tasks',
  supervisor: '/team',
  admin: '/dashboard',
};

/**
 * Navigation + route access, defined once. The sidebar renders from this list and
 * route `data.roles` is derived from it via `rolesFor`, so a role check never has
 * to be repeated in a component. Frontend gating is UX only: the API enforces access.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'My requests', path: '/my-requests', roles: ['customer'] },
  { label: 'My tasks', path: '/my-tasks', roles: ['technician'] },
  { label: 'Team overview', path: '/team', roles: ['supervisor'] },
  { label: 'Dashboard', path: '/dashboard', roles: ['admin'] },
  { label: 'Users', path: '/users', roles: ['admin'] },
  { label: 'Profile', path: '/profile', roles: ALL_ROLES },
];

export function navItemsFor(role: UserRole | null): NavItem[] {
  return role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];
}

/** Roles allowed on a nav path, for use in route `data.roles`. */
export function rolesFor(path: string): UserRole[] {
  const item = NAV_ITEMS.find((i) => i.path === path);
  if (!item) throw new Error(`No navigation entry for path "${path}"`);
  return [...item.roles];
}
