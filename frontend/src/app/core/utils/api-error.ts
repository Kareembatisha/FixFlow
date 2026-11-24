import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';

export interface ApiErrorInfo {
  /** HTTP status; 0 means the server could not be reached, -1 a non-HTTP error. */
  status: number;
  /** Human-readable summary, taken from the server when available. */
  message: string;
  /** Individual validation messages (400 responses). */
  details: string[];
}

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Turns any thrown value into display-ready error info. Understands the FixFlow
 * envelope (`message` + `errors[]`) and falls back to safe generic text.
 */
export function parseApiError(error: unknown): ApiErrorInfo {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: -1, message: FALLBACK_MESSAGE, details: [] };
  }
  if (error.status === 0) {
    return { status: 0, message: NETWORK_MESSAGE, details: [] };
  }
  const body = error.error as Partial<ApiResponse> | null;
  const isObject = body !== null && typeof body === 'object';
  const message =
    isObject && typeof body.message === 'string' && body.message ? body.message : FALLBACK_MESSAGE;
  const details =
    isObject && Array.isArray(body.errors)
      ? body.errors.filter((e): e is string => typeof e === 'string')
      : [];
  return { status: error.status, message, details };
}
