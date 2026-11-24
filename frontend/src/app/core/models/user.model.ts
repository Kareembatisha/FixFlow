export const USER_ROLES = ['customer', 'technician', 'supervisor', 'admin'] as const;

/** Mirrors the backend `UserRole` enum values. */
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  /** Present on /auth/me and /auth/register, absent on /auth/login. */
  createdAt?: string;
}
