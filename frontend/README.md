# FixFlow – Frontend

Angular 21 (standalone components, signals, zoneless) client for the FixFlow API.

## Run

```bash
npm install
npm start          # http://localhost:4200  (needs the API on http://localhost:3000)
npm run build      # production build
npm test           # unit + component tests (Vitest)
```

API base URL: `src/environments/environment.development.ts` (dev) and `src/environments/environment.ts`
(production build; set the real API origin before deploying). The backend must allow the frontend origin via
CORS (`CORS_ORIGINS`, default `http://localhost:4200`).

## Structure

```
src/app/
  core/        models, config (API_URL, navigation), services (AuthService, TokenStorage),
               interceptors (auth, error), guards (auth, guest, role), utils
  layout/      shell (signed-in frame), navbar, sidebar, auth-layout (signed-out frame)
  features/    auth (login, register), profile, errors/forbidden, placeholder (future modules)
  shared/      forms helpers
```

## Authentication

- `AuthService` owns the state as signals: `token`, `user`, `role`, `isAuthenticated`, `initialized`.
- Only the access token is persisted (localStorage, key `fixflow.accessToken`). The user is re-fetched from
  `GET /auth/me` on every page load via `provideAppInitializer`, so guards always see confirmed state.
- **Security note:** the API issues Bearer tokens in the response body, so the frontend has to store the token.
  localStorage is readable by any script on the page (no HttpOnly protection); an XSS flaw could leak it. Keep
  third-party scripts out, never log tokens, and consider HttpOnly cookies (a backend change) for production.
- `authInterceptor` adds the header only to FixFlow API calls (never other origins, never login/register).
  `errorInterceptor` handles 401 (clear session, go to `/login?returnUrl=...`) and 403 (go to `/403`) and always
  re-throws the original error so forms can show the server message.
- Route guards (`authGuard`, `roleGuard`) are UX only. The API enforces authorization.

## Roles and navigation

Navigation and route access come from one table: `src/app/core/config/navigation.config.ts`.
Add a page there (`NAV_ITEMS`) and derive route roles with `rolesFor('/path')`.
