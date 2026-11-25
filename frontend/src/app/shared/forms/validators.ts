import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Fails (as `required`) when the value is empty or only whitespace. Values are trimmed before
 * they are sent, so a whitespace-only value would reach the API as an empty string.
 */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
}

/** Like Validators.maxLength but counts the trimmed value, which is what gets sent to the API. */
export function maxTrimmed(max: number): ValidatorFn {
  return (control) => {
    const length = String(control.value ?? '').trim().length;
    return length > max ? { maxlength: { requiredLength: max, actualLength: length } } : null;
  };
}
