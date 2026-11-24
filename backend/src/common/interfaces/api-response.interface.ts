export interface ApiResponse<T = unknown> {
  status: boolean;
  statusCode: number;
  meta: Record<string, unknown> | null;
  message: string;
  errors: string[] | null;
  data: T | null;
}
