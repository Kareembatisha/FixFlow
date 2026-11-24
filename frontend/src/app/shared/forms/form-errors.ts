import { AbstractControl } from '@angular/forms';

/**
 * First validation message for a control, keyed by validator name. Returns null until the
 * user has interacted with the field (touched) or tried to submit (markAllAsTouched).
 */
export function firstError(
  control: AbstractControl | null,
  messages: Record<string, string>,
): string | null {
  if (!control || !control.touched || !control.errors) return null;
  const key = Object.keys(control.errors).find((k) => k in messages);
  return key ? messages[key] : 'This value is not valid.';
}
