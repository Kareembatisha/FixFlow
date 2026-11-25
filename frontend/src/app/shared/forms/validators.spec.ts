import { FormControl } from '@angular/forms';

import { maxTrimmed, notBlank } from './validators';

describe('notBlank', () => {
  it.each(['', '   ', '\n\t'])('rejects %j as required', (value) => {
    expect(notBlank(new FormControl(value))).toEqual({ required: true });
  });

  it('accepts text with content', () => {
    expect(notBlank(new FormControl(' a '))).toBeNull();
  });
});

describe('maxTrimmed', () => {
  it('counts the trimmed value', () => {
    expect(maxTrimmed(3)(new FormControl('abc   '))).toBeNull();
  });

  it('reports a maxlength error past the limit', () => {
    expect(maxTrimmed(3)(new FormControl('abcd'))).toEqual({
      maxlength: { requiredLength: 3, actualLength: 4 },
    });
  });
});
