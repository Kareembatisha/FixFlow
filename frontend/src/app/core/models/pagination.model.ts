/** Pagination info the API puts in `meta` of paginated responses. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A page of items together with its (validated) pagination metadata. */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
