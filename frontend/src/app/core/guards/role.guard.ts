import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/**
 * Restricts a route to the roles listed in `data: { roles: [...] }`.
 * - not signed in            -> /login (with returnUrl)
 * - signed in, wrong role    -> /403
 * - route without `roles`    -> /403 (fail closed, a misconfiguration must not open a page)
 * UX only: the API still enforces authorization on every call.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const allowed = route.data['roles'] as readonly UserRole[] | undefined;
  const role = auth.role();
  return role !== null && !!allowed?.includes(role) ? true : router.createUrlTree(['/403']);
};
