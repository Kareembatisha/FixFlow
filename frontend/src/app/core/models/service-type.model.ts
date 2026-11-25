/** An entry of GET /service-types. */
export interface ServiceType {
  id: string;
  name: string;
  /** Not confirmed by the backend contract, so the UI must not rely on it. */
  description?: string | null;
  /** Not confirmed by the backend contract, so the UI must not rely on it. */
  isActive?: boolean;
}
