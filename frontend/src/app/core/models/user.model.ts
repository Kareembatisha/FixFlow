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

/** Roles an admin can create from the Users page (customers register themselves). */
export const CREATABLE_ROLES = ['technician', 'supervisor'] as const;
export type CreatableRole = (typeof CREATABLE_ROLES)[number];

/** Body of POST /users (admin only). */
export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: CreatableRole;
  /** Optional. Omit it instead of sending an empty string. */
  phone?: string;
}

/** Query parameters of GET /users (admin only). */
export interface UserQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  search?: string;
}
