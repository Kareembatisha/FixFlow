import { ApiErrorInfo } from '../../../core/utils/api-error';

/**
 * Decides what a dialog does after the API refused an action.
 *
 * - `stay`: the input was invalid (400 with validation messages): keep the dialog open so the
 *   user can fix it.
 * - `refresh`: the request is no longer in the state the dialog assumed (invalid transition,
 *   already handled by someone else, deleted...): close it and reload the page so the buttons
 *   and the timeline show the truth.
 */
export function errorOutcome(error: ApiErrorInfo): 'stay' | 'refresh' {
  if (error.status === 0 || error.status === -1) return 'stay';
  if (error.status === 400 && error.details.length > 0) return 'stay';
  if (error.status === 400 || error.status === 404 || error.status === 409) return 'refresh';
  return 'stay';
}
