import { errorOutcome } from './workflow-errors';

const info = (status: number, details: string[] = []) => ({ status, message: 'x', details });

describe('errorOutcome', () => {
  it('keeps the dialog open for validation problems and network failures', () => {
    expect(errorOutcome(info(400, ['reason should not be empty']))).toBe('stay');
    expect(errorOutcome(info(0))).toBe('stay');
    expect(errorOutcome(info(500))).toBe('stay');
  });

  it('reloads the page when the request is no longer in the expected state', () => {
    expect(errorOutcome(info(400))).toBe('refresh'); // invalid transition
    expect(errorOutcome(info(404))).toBe('refresh');
    expect(errorOutcome(info(409))).toBe('refresh');
  });
});
