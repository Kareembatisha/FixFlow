import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { ServiceType } from '../models/service-type.model';
import { unwrap } from '../utils/api-response';

/**
 * Read access to service types. Customers only receive active ones (the backend filters),
 * so the UI never has to hide inactive entries itself. Admin CRUD is out of Sprint 3 scope.
 */
@Injectable({ providedIn: 'root' })
export class ServiceTypesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** GET /service-types (not paginated: `data` is the array). */
  list(): Observable<ServiceType[]> {
    return this.http
      .get<ApiResponse<ServiceType[]>>(`${this.apiUrl}/service-types`)
      .pipe(map(unwrap));
  }

  /** GET /service-types/:id */
  getById(id: string): Observable<ServiceType> {
    return this.http
      .get<ApiResponse<ServiceType>>(`${this.apiUrl}/service-types/${encodeURIComponent(id)}`)
      .pipe(map(unwrap));
  }
}
