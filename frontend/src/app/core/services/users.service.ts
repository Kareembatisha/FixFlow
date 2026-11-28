import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { Paginated } from '../models/pagination.model';
import { CreateUserPayload, User, UserQuery } from '../models/user.model';
import { unwrap, unwrapPage } from '../utils/api-response';

/** Users API. Technician listing is for staff; list/create are admin only (enforced by the API). */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** GET /users/technicians: active technicians, for the assignment dialog. */
  technicians(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users/technicians`).pipe(map(unwrap));
  }

  /** GET /users (admin): one page of users plus its pagination meta. */
  list(query: UserQuery = {}): Observable<Paginated<User>> {
    let params = new HttpParams();
    const search = query.search?.trim();
    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.limit !== undefined) params = params.set('limit', query.limit);
    if (query.role) params = params.set('role', query.role);
    if (search) params = params.set('search', search);
    return this.http
      .get<ApiResponse<User[]>>(`${this.apiUrl}/users`, { params })
      .pipe(map(unwrapPage));
  }

  /** POST /users (admin): creates a technician or supervisor. */
  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/users`, payload).pipe(map(unwrap));
  }
}
