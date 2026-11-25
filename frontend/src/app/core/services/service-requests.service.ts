import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { Paginated } from '../models/pagination.model';
import {
  CreateServiceRequestPayload,
  ServiceRequest,
  ServiceRequestQuery,
} from '../models/service-request.model';
import { unwrap, unwrapPage } from '../utils/api-response';

/** Builds HttpParams, skipping undefined/blank values so the API's defaults apply. */
function toParams(query: ServiceRequestQuery): HttpParams {
  let params = new HttpParams();
  const search = query.search?.trim();
  if (query.page !== undefined) params = params.set('page', query.page);
  if (query.limit !== undefined) params = params.set('limit', query.limit);
  if (query.status) params = params.set('status', query.status);
  if (query.priority) params = params.set('priority', query.priority);
  if (search) params = params.set('search', search);
  return params;
}

/**
 * Service requests API. Role and ownership filtering is done by the backend: a customer's
 * list only contains their own requests, and another customer's id answers 404.
 */
@Injectable({ providedIn: 'root' })
export class ServiceRequestsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** GET /service-requests: one page of requests plus its pagination meta. */
  list(query: ServiceRequestQuery = {}): Observable<Paginated<ServiceRequest>> {
    return this.http
      .get<ApiResponse<ServiceRequest[]>>(`${this.apiUrl}/service-requests`, {
        params: toParams(query),
      })
      .pipe(map(unwrapPage));
  }

  /** GET /service-requests/:id */
  getById(id: string): Observable<ServiceRequest> {
    return this.http
      .get<ApiResponse<ServiceRequest>>(`${this.apiUrl}/service-requests/${encodeURIComponent(id)}`)
      .pipe(map(unwrap));
  }

  /** POST /service-requests (customer only). */
  create(payload: CreateServiceRequestPayload): Observable<ServiceRequest> {
    return this.http
      .post<ApiResponse<ServiceRequest>>(`${this.apiUrl}/service-requests`, payload)
      .pipe(map(unwrap));
  }
}
