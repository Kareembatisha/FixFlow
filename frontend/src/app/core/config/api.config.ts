import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Base URL of the FixFlow API (no trailing slash). Override in tests via providers. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl.replace(/\/+$/, ''),
});
