import { inject } from '@angular/core';
import { Route, Routes } from '@angular/router';

import { NAV_ITEMS, rolesFor } from './core/config/navigation.config';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuthService } from './core/services/auth.service';
import { AuthLayout } from './layout/auth-layout/auth-layout';
import { Shell } from './layout/shell/shell';

/** Copy for pages whose real module lands in a later sprint. Access comes from NAV_ITEMS. */
const PLACEHOLDER_PAGES: Record<string, string> = {
  '/my-requests': 'Follow the repair requests you have submitted.',
  '/my-tasks': 'See the jobs assigned to you.',
  '/team': 'Keep an eye on your technicians and open work.',
  '/dashboard': 'Operations summary for administrators.',
  '/users': 'Manage accounts and roles.',
};

const placeholderRoutes: Route[] = Object.entries(PLACEHOLDER_PAGES).map(([path, description]) => {
  const heading = NAV_ITEMS.find((item) => item.path === path)?.label ?? 'Coming soon';
  return {
    path: path.slice(1),
    title: `${heading} - FixFlow`,
    canActivate: [roleGuard],
    data: { roles: rolesFor(path), heading, description },
    loadComponent: () => import('./features/placeholder/placeholder').then((m) => m.Placeholder),
  };
});

export const routes: Routes = [
  // Order matters: the signed-in shell owns the '' path (redirect to the role home), so it must be
  // matched first. Otherwise AuthLayout would match '/' and render an empty frame.
  // Signed-in pages
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).homePath() },
      ...placeholderRoutes,
      {
        path: 'profile',
        title: 'Profile - FixFlow',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: '403',
        title: 'Access denied - FixFlow',
        loadComponent: () =>
          import('./features/errors/forbidden/forbidden').then((m) => m.Forbidden),
      },
    ],
  },

  // Signed-out pages
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        title: 'Sign in - FixFlow',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        title: 'Create account - FixFlow',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
