import { ApiResponse } from '../models/api-response.model';
import { Paginated, PaginationMeta } from '../models/pagination.model';

/** Returns `data` of a single-resource response; an empty payload is an error. */
export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === null || response.data === undefined) {
    throw new Error('The server returned an empty response.');
  }
  return response.data;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Narrows the loosely typed envelope `meta` to the pagination shape the API promises. */
export function isPaginationMeta(meta: unknown): meta is PaginationMeta {
  if (meta === null || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  return (
    isCount(m['page']) && isCount(m['limit']) && isCount(m['total']) && isCount(m['totalPages'])
  );
}

/**
 * Splits a paginated response into `items` + `meta`. An empty page is a normal result
 * (`data: []`). A non-array `data` or missing/invalid `meta` means the contract was broken,
 * so it fails loudly instead of guessing pagination values.
 */
export function unwrapPage<T>(response: ApiResponse<T[]>): Paginated<T> {
  if (!Array.isArray(response.data)) {
    throw new Error('The server returned an invalid list response.');
  }
  if (!isPaginationMeta(response.meta)) {
    throw new Error('The server returned invalid pagination information.');
  }
  return { items: response.data, meta: response.meta };
}
