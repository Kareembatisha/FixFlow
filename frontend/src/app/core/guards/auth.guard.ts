import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Lets authenticated users through; others go to /login with the intended URL as `returnUrl`. */
export const authGuard: CanActivateFn & CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(
    ['/login'],
    state.url && state.url !== '/' ? { queryParams: { returnUrl: state.url } } : {},
  );
};

/** Keeps signed-in users away from /login and /register. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree([auth.homePath()]) : true;
};
