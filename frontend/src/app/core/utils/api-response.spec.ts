import { ApiResponse } from '../models/api-response.model';
import { envelope } from '../../../testing/test-utils';
import { isPaginationMeta, unwrap, unwrapPage } from './api-response';

const META = { page: 1, limit: 10, total: 2, totalPages: 1 };

function page<T>(data: T[] | null, meta: Record<string, unknown> | null): ApiResponse<T[]> {
  return { ...envelope<T[]>([]), data, meta };
}

describe('unwrap', () => {
  it('returns data', () => {
    expect(unwrap(envelope({ id: 'a' }))).toEqual({ id: 'a' });
  });

  it('throws on null data', () => {
    expect(() => unwrap({ ...envelope(null as unknown as string), data: null })).toThrow(
      /empty response/,
    );
  });
});

describe('isPaginationMeta', () => {
  it('accepts the documented shape', () => {
    expect(isPaginationMeta(META)).toBe(true);
  });

  it.each([null, undefined, 'x', {}, { ...META, page: '1' }, { ...META, total: -1 }, { page: 1 }])(
    'rejects %j',
    (value) => {
      expect(isPaginationMeta(value)).toBe(false);
    },
  );
});

describe('unwrapPage', () => {
  it('returns items and meta', () => {
    const result = unwrapPage(page([{ id: '1' }, { id: '2' }], META));
    expect(result.items).toHaveLength(2);
    expect(result.meta).toEqual(META);
  });

  it('treats an empty array as a normal empty page', () => {
    const empty = { ...META, total: 0, totalPages: 0 };
    expect(unwrapPage(page([], empty))).toEqual({ items: [], meta: empty });
  });

  it('throws when data is not an array', () => {
    expect(() => unwrapPage(page(null, META))).toThrow(/invalid list/);
  });

  it('throws when meta is missing or malformed', () => {
    expect(() => unwrapPage(page([], null))).toThrow(/pagination/);
    expect(() => unwrapPage(page([], { page: 1 }))).toThrow(/pagination/);
  });
});
