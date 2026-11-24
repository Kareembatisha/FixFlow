import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, map, Observable, of, tap } from 'rxjs';

import { API_URL } from '../config/api.config';
import { ROLE_HOME } from '../config/navigation.config';
import { ApiResponse } from '../models/api-response.model';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';
import { User } from '../models/user.model';
import { isTokenExpired } from '../utils/jwt';
import { TokenStorage } from './token-storage';

function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === null || response.data === undefined) {
    throw new Error('The server returned an empty response.');
  }
  return response.data;
}

/**
 * Single owner of authentication state. Signals are the in-memory source of truth;
 * localStorage (via TokenStorage) only persists the token across refreshes. The user
 * is never persisted: it is reloaded from /auth/me so role/active changes are picked up.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorage);
  private readonly apiUrl = inject(API_URL);

  private readonly tokenState = signal<string | null>(this.storage.get());
  private readonly userState = signal<User | null>(null);
  private readonly initializedState = signal(false);

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  /** True once the startup session restore has finished (successfully or not). */
  readonly initialized = this.initializedState.asReadonly();
  readonly role = computed(() => this.userState()?.role ?? null);
  /** Authenticated = we hold a token AND the backend has confirmed who it belongs to. */
  readonly isAuthenticated = computed(
    () => this.tokenState() !== null && this.userState() !== null,
  );
  readonly homePath = computed(() => {
    const role = this.role();
    return role ? ROLE_HOME[role] : '/login';
  });

  /** Creates an account. The API returns the new user but NO token, so this does not sign in. */
  register(request: RegisterRequest): Observable<User> {
    return this.http
      .post<ApiResponse<User>>(`${this.apiUrl}/auth/register`, request)
      .pipe(map(unwrap));
  }

  login(request: LoginRequest): Observable<User> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, request).pipe(
      map(unwrap),
      tap((session) => {
        this.storage.set(session.accessToken);
        this.tokenState.set(session.accessToken);
        this.userState.set(session.user);
      }),
      map((session) => session.user),
    );
  }

  /** Fetches the authenticated user from /auth/me and updates state. */
  loadCurrentUser(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/auth/me`).pipe(
      map(unwrap),
      tap((user) => this.userState.set(user)),
    );
  }

  /**
   * Called once at startup (before the first navigation) so guards see settled state.
   * - no token: nothing to do
   * - malformed/expired token: cleared without a network call
   * - token rejected by the API (401/403/...): cleared
   * - API unreachable or 5xx: token is KEPT so a later reload can recover; the user is
   *   treated as signed out for now.
   */
  async restoreSession(): Promise<void> {
    try {
      const token = this.tokenState();
      if (!token) return;
      if (isTokenExpired(token)) {
        this.clearSession();
        return;
      }
      await firstValueFrom(
        this.loadCurrentUser().pipe(
          catchError((error: unknown) => {
            const transient =
              error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
            if (!transient) this.clearSession();
            return of(null);
          }),
        ),
      );
    } finally {
      this.initializedState.set(true);
    }
  }

  /** Forgets the session locally without navigating (used by the error interceptor). */
  clearSession(): void {
    this.storage.clear();
    this.tokenState.set(null);
    this.userState.set(null);
  }

  /**
   * Signs out and goes to /login. The API is stateless JWT with no revoke endpoint, so
   * the token stays valid server-side until it expires; it is simply discarded here.
   */
  logout(): Promise<boolean> {
    this.clearSession();
    return this.router.navigate(['/login']);
  }
}
