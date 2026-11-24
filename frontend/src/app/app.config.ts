import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Order matters: authInterceptor adds the token first, so errorInterceptor can tell
    // whether a failing request used the current session's token.
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Restore the session (token -> /auth/me) before the first navigation so guards see real state.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
