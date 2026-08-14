import { UUID } from 'src/shared/value-objects/uuid.vo';
import { resolveUserId } from './drizzle-admin.repository';

const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000a2';

/**
 * The only branching logic in the admin repository, and the only part of it testable
 * without a database. It decides both what gets written and — via the falsy check in
 * `update` — whether a write happens at all, so the empty and absent cases matter as much
 * as the happy path.
 */
describe('resolveUserId', () => {
  it('unwraps a UUID value object', () => {
    expect(resolveUserId(UUID.create(USER_ID))).toBe(USER_ID);
  });

  it('passes a plain string through', () => {
    expect(resolveUserId(USER_ID)).toBe(USER_ID);
  });

  it('returns a string in both cases, never the value object', () => {
    expect(typeof resolveUserId(UUID.create(USER_ID))).toBe('string');
    expect(typeof resolveUserId(USER_ID)).toBe('string');
  });

  describe('absent values — these make `update` skip the write entirely', () => {
    it('yields something falsy for undefined', () => {
      expect(resolveUserId(undefined)).toBeFalsy();
    });

    it('yields something falsy for null', () => {
      expect(resolveUserId(null)).toBeFalsy();
    });

    it('yields something falsy for an empty string', () => {
      expect(resolveUserId('')).toBeFalsy();
    });
  });

  /**
   * Guards the duck-typing: anything exposing `.value` wins over `.toString()`. A UUID
   * has both, and picking the wrong one would write "[object Object]" into a uuid column.
   */
  it('prefers .value over .toString()', () => {
    const decoy = {
      value: 'from-value',
      toString: () => 'from-toString',
    };

    expect(resolveUserId(decoy)).toBe('from-value');
  });

  it('falls back to .toString() when there is no .value', () => {
    expect(resolveUserId({ toString: () => 'from-toString' })).toBe(
      'from-toString',
    );
  });

  it('never yields the object-stringification of a UUID', () => {
    expect(resolveUserId(UUID.create(USER_ID))).not.toBe('[object Object]');
  });
});
