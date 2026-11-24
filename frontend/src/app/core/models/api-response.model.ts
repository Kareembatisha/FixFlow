/** Envelope returned by every FixFlow API response (success and error). */
export interface ApiResponse<T = unknown> {
  status: boolean;
  statusCode: number;
  meta: Record<string, unknown> | null;
  message: string;
  /** Validation messages (class-validator), present on 400 responses. */
  errors: string[] | null;
  data: T | null;
}
