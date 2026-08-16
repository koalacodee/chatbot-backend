import { BadRequestException } from '@nestjs/common';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { AudienceType, Promotion } from './promotion.entity';

const PROMOTION_ID = '018f4a1e-1c7a-7000-8000-0000000000f1';
const ADMIN_ID = '018f4a1e-1c7a-7000-8000-0000000000f2';
const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000f3';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-0000000000f4';

type Options = Parameters<typeof Promotion.create>[0];

const build = (overrides: Partial<Options> = {}) =>
  Promotion.create({
    title: 'Summer sale',
    audience: AudienceType.ALL,
    isActive: true,
    ...overrides,
  });

describe('Promotion', () => {
  describe('construction', () => {
    it('keeps a supplied id', () => {
      expect(build({ id: PROMOTION_ID }).id.value).toBe(PROMOTION_ID);
    });

    it('generates an id when none is given', () => {
      expect(build().id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('rejects a malformed id', () => {
      expect(() => build({ id: 'nope' })).toThrow(BadRequestException);
    });

    it('defaults the timestamps and the start date to now', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-16T10:00:00.000Z'));

      try {
        const promotion = build();

        expect(promotion.createdAt).toEqual(new Date('2026-08-16T10:00:00.000Z'));
        expect(promotion.updatedAt).toEqual(promotion.createdAt);
        expect(promotion.startDate).toEqual(promotion.createdAt);
      } finally {
        jest.useRealTimers();
      }
    });

    /**
     * `startDate` falls back to now but `endDate` does not, so a promotion created
     * without one runs forever. That is the intended open-ended case — the repository's
     * schedule predicate treats a null end as "no end".
     */
    it('leaves endDate unset rather than defaulting it', () => {
      expect(build().endDate).toBeUndefined();
    });

    it('keeps supplied dates', () => {
      const startDate = new Date('2026-09-01T00:00:00.000Z');
      const endDate = new Date('2026-09-30T00:00:00.000Z');

      const promotion = build({ startDate, endDate });

      expect(promotion.startDate).toEqual(startDate);
      expect(promotion.endDate).toEqual(endDate);
    });

    /**
     * The window is deliberately *not* a constructor invariant — see
     * `assertCoherentSchedule` below. Rows written before that check existed may already
     * be inverted, and the repository's `toDomain` builds through this same path, so
     * enforcing it here would make those promotions unreadable rather than uneditable.
     */
    it('accepts a window that ends before it starts', () => {
      const promotion = build({
        startDate: new Date('2026-09-30T00:00:00.000Z'),
        endDate: new Date('2026-09-01T00:00:00.000Z'),
      });

      expect(promotion.endDate.getTime()).toBeLessThan(
        promotion.startDate.getTime(),
      );
    });

    /**
     * `audience` arrives as `any` from both use-cases. Unchecked, an unrecognised value
     * reached the repository, where `AUDIENCE_TO_DB[audience]` yields undefined against
     * a NOT NULL enum column. Rejecting it here covers every caller at once.
     */
    it('rejects an audience outside the enum', () => {
      expect(() => build({ audience: 'MARKETING_TEAM' as AudienceType })).toThrow(
        BadRequestException,
      );
    });

    it('rejects a missing audience', () => {
      expect(() => build({ audience: undefined })).toThrow(BadRequestException);
    });

    it.each(Object.values(AudienceType))('accepts %s', (audience) => {
      expect(build({ audience }).audience).toBe(audience);
    });

    /** The Postgres enum only yields these four, so reads never trip the check. */
    it('accepts every value the repository can produce', () => {
      for (const audience of ['CUSTOMER', 'SUPERVISOR', 'EMPLOYEE', 'ALL']) {
        expect(() => build({ audience: audience as AudienceType })).not.toThrow();
      }
    });

    it('records the creating admin when there is one', () => {
      const admin = Admin.create({ id: ADMIN_ID, userId: USER_ID });

      const promotion = build({ createdByAdmin: admin });

      expect(promotion.createdByAdmin.id.value).toBe(ADMIN_ID);
      expect(promotion.createdBySupervisor).toBeUndefined();
    });

    it('records the creating supervisor when there is one', () => {
      const supervisor = Supervisor.create({
        id: SUPERVISOR_ID,
        userId: USER_ID,
        permissions: [],
      });

      const promotion = build({ createdBySupervisor: supervisor });

      expect(promotion.createdBySupervisor.id.value).toBe(SUPERVISOR_ID);
    });

    /**
     * Both creator getters are typed as non-optional, but a promotion created by
     * neither — or loaded from a row with both columns null — returns undefined from
     * both. Callers that trust the type dereference nothing.
     */
    it('returns undefined from creator getters typed as non-optional', () => {
      const promotion = build();

      expect(promotion.createdByAdmin).toBeUndefined();
      expect(promotion.createdBySupervisor).toBeUndefined();
    });

    /** Nothing prevents a promotion carrying both creators at once. */
    it('accepts an admin and a supervisor together', () => {
      const promotion = build({
        createdByAdmin: Admin.create({ id: ADMIN_ID, userId: USER_ID }),
        createdBySupervisor: Supervisor.create({
          id: SUPERVISOR_ID,
          userId: USER_ID,
          permissions: [],
        }),
      });

      expect(promotion.createdByAdmin).toBeDefined();
      expect(promotion.createdBySupervisor).toBeDefined();
    });
  });

  describe('mutation', () => {
    /**
     * There is no `updatedAt` setter and no setter touches it, so the entity's own
     * `updatedAt` is stale the moment anything changes. The repository stamps
     * `new Date()` on every write, which is the only reason the column is correct — a
     * caller reading `updatedAt` off a mutated-but-unsaved entity gets the old value.
     */
    it('does not track its own updatedAt', () => {
      const updatedAt = new Date('2026-01-01T00:00:00.000Z');
      const promotion = build({ updatedAt });

      promotion.title = 'Winter sale';
      promotion.isActive = false;
      promotion.audience = AudienceType.CUSTOMER;

      expect(promotion.updatedAt).toEqual(updatedAt);
    });

    it('lets the mutable fields be reassigned', () => {
      const promotion = build();
      const startDate = new Date('2026-09-01T00:00:00.000Z');
      const endDate = new Date('2026-09-30T00:00:00.000Z');

      promotion.title = 'Winter sale';
      promotion.audience = AudienceType.EMPLOYEE;
      promotion.isActive = false;
      promotion.startDate = startDate;
      promotion.endDate = endDate;

      expect(promotion.title).toBe('Winter sale');
      expect(promotion.audience).toBe(AudienceType.EMPLOYEE);
      expect(promotion.isActive).toBe(false);
      expect(promotion.startDate).toEqual(startDate);
      expect(promotion.endDate).toEqual(endDate);
    });

    it('exposes no setter for id, createdAt or the creators', () => {
      for (const property of [
        'id',
        'createdAt',
        'updatedAt',
        'createdByAdmin',
        'createdBySupervisor',
      ]) {
        expect(
          Object.getOwnPropertyDescriptor(Promotion.prototype, property)?.set,
        ).toBeUndefined();
      }
    });

    /**
     * The `endDate` setter is typed `Date` while the getter is `Date | undefined`, so
     * clearing an end date is not expressible in the type — `UpdatePromotionUseCase`
     * only gets away with `existing.endDate = dto.endDate ?? undefined` because
     * `strictNullChecks` is off.
     */
    it('clears the end date when assigned undefined', () => {
      const promotion = build({ endDate: new Date('2026-09-30T00:00:00.000Z') });

      promotion.endDate = undefined;

      expect(promotion.endDate).toBeUndefined();
    });
  });

  describe('assertCoherentSchedule', () => {
    it('accepts a window that opens before it closes', () => {
      const promotion = build({
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
      });

      expect(() => promotion.assertCoherentSchedule()).not.toThrow();
    });

    it('accepts an open-ended promotion', () => {
      const promotion = build({ startDate: new Date('2026-09-01T00:00:00.000Z') });

      expect(() => promotion.assertCoherentSchedule()).not.toThrow();
    });

    it('rejects a window that closes before it opens', () => {
      const promotion = build({
        startDate: new Date('2026-09-30T00:00:00.000Z'),
        endDate: new Date('2026-09-01T00:00:00.000Z'),
      });

      expect(() => promotion.assertCoherentSchedule()).toThrow(
        BadRequestException,
      );
    });

    /** Equal bounds are a same-instant promotion, not an inverted one. */
    it('accepts a window whose bounds are equal', () => {
      const at = new Date('2026-09-01T00:00:00.000Z');
      const promotion = build({ startDate: at, endDate: new Date(at) });

      expect(() => promotion.assertCoherentSchedule()).not.toThrow();
    });

    /** It reads the current state, so it catches an inversion introduced by a patch. */
    it('sees a window inverted after construction', () => {
      const promotion = build({
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
      });

      promotion.startDate = new Date('2026-12-01T00:00:00.000Z');

      expect(() => promotion.assertCoherentSchedule()).toThrow(
        BadRequestException,
      );
    });
  });

  describe('toJSON', () => {
    it('emits the id as a string while the getter returns a UUID', () => {
      const promotion = build({ id: PROMOTION_ID });

      expect(promotion.toJSON().id).toBe(PROMOTION_ID);
      expect(promotion.id.value).toBe(PROMOTION_ID);
    });

    it('round-trips through create', () => {
      const promotion = build({
        id: PROMOTION_ID,
        title: 'Summer sale',
        audience: AudienceType.CUSTOMER,
        isActive: false,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
      });

      const rebuilt = Promotion.create(promotion.toJSON());

      expect(rebuilt.toJSON()).toEqual(promotion.toJSON());
    });

    /**
     * Timestamps stay as `Date`s and the creators stay as entity instances, so this is
     * not a serialised payload — it relies on the HTTP layer to finish the job. Anything
     * that caches or compares the result is holding live domain objects.
     */
    it('hands back live Dates and entity instances', () => {
      const admin = Admin.create({ id: ADMIN_ID, userId: USER_ID });
      const promotion = build({ createdByAdmin: admin });

      const json = promotion.toJSON();

      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.createdByAdmin).toBe(admin);
    });
  });
});
