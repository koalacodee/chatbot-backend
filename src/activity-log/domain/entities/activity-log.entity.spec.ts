import { BadRequestException } from '@nestjs/common';
import { ActivityLog, ActivityLogType } from './activity-log.entity';

const VALID_UUID = '018f4a1e-1c7a-7000-8000-000000000001';
const VALID_USER_ID = '018f4a1e-1c7a-7000-8000-000000000002';

const buildOptions = (overrides = {}) => ({
  type: ActivityLogType.TICKET_ANSWERED,
  title: 'Ticket #42',
  itemId: 'item-42',
  meta: { ticketId: '42' },
  userId: VALID_USER_ID,
  occurredAt: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

describe('ActivityLog', () => {
  describe('identity', () => {
    it('generates an id when none is supplied', () => {
      const log = ActivityLog.create(buildOptions());

      // uuidv7, so the canonical 8-4-4-4-12 form.
      expect(log.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('keeps a supplied id', () => {
      const log = ActivityLog.create(buildOptions({ id: VALID_UUID }));

      expect(log.id).toBe(VALID_UUID);
    });

    it('rejects a malformed id', () => {
      expect(() => ActivityLog.create(buildOptions({ id: 'not-a-uuid' }))).toThrow(
        BadRequestException,
      );
    });

    it('gives two logs built from the same options distinct ids', () => {
      const first = ActivityLog.create(buildOptions());
      const second = ActivityLog.create(buildOptions());

      expect(first.id).not.toBe(second.id);
    });
  });

  describe('timestamps', () => {
    it('defaults createdAt and updatedAt to now when omitted', () => {
      const before = Date.now();
      const log = ActivityLog.create(buildOptions());
      const after = Date.now();

      expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(log.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(log.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(log.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('keeps supplied createdAt and updatedAt', () => {
      const createdAt = new Date('2025-06-01T00:00:00.000Z');
      const updatedAt = new Date('2025-06-02T00:00:00.000Z');

      const log = ActivityLog.create(buildOptions({ createdAt, updatedAt }));

      expect(log.createdAt).toEqual(createdAt);
      expect(log.updatedAt).toEqual(updatedAt);
    });

    it('never defaults occurredAt — it is the caller-supplied event time', () => {
      const occurredAt = new Date('2024-03-04T05:06:07.000Z');

      const log = ActivityLog.create(buildOptions({ occurredAt }));

      expect(log.occurredAt).toEqual(occurredAt);
    });
  });

  describe('field exposure', () => {
    it('exposes every constructor field through its getter', () => {
      const options = buildOptions({ id: VALID_UUID });
      const log = ActivityLog.create(options);

      expect(log.type).toBe(ActivityLogType.TICKET_ANSWERED);
      expect(log.title).toBe(options.title);
      expect(log.itemId).toBe(options.itemId);
      expect(log.meta).toEqual(options.meta);
      expect(log.userId).toBe(options.userId);
      expect(log.occurredAt).toEqual(options.occurredAt);
    });

    it('replaces meta wholesale through the setter', () => {
      const log = ActivityLog.create(buildOptions());

      log.meta = { replaced: true };

      expect(log.meta).toEqual({ replaced: true });
    });
  });

  describe('toJSON', () => {
    /**
     * Despite the name, this is the persistence shape: the repository's `fromDomain`
     * spreads it directly into a Drizzle insert. The activity_logs timestamp columns use
     * Drizzle's default `mode: 'date'`, so these must stay Date objects — serialising
     * them to ISO strings here would break every write.
     */
    it('emits Date objects for timestamps, as the insert expects', () => {
      const createdAt = new Date('2025-06-01T00:00:00.000Z');
      const updatedAt = new Date('2025-06-02T00:00:00.000Z');
      const occurredAt = new Date('2026-01-01T10:00:00.000Z');

      const log = ActivityLog.create(
        buildOptions({ id: VALID_UUID, createdAt, updatedAt, occurredAt }),
      );

      expect(log.toJSON()).toEqual({
        id: VALID_UUID,
        type: ActivityLogType.TICKET_ANSWERED,
        title: 'Ticket #42',
        itemId: 'item-42',
        meta: { ticketId: '42' },
        createdAt,
        updatedAt,
        userId: VALID_USER_ID,
        occurredAt,
      });

      expect(log.toJSON().createdAt).toBeInstanceOf(Date);
      expect(log.toJSON().occurredAt).toBeInstanceOf(Date);
    });

    /**
     * The repository's `fromDomain` spreads `toJSON()` straight into a Drizzle insert, so
     * toJSON must not leak a key the activity_logs table does not have.
     */
    it('emits exactly the columns the repository writes', () => {
      const log = ActivityLog.create(buildOptions());

      expect(Object.keys(log.toJSON()).sort()).toEqual(
        [
          'createdAt',
          'id',
          'itemId',
          'meta',
          'occurredAt',
          'title',
          'type',
          'updatedAt',
          'userId',
        ].sort(),
      );
    });
  });

  describe('ActivityLogType', () => {
    it('holds the seven kinds the repository maps', () => {
      expect(Object.values(ActivityLogType).sort()).toEqual(
        [
          'TICKET_ANSWERED',
          'TASK_PERFORMED',
          'TASK_APPROVED',
          'FAQ_CREATED',
          'FAQ_UPDATED',
          'PROMOTION_CREATED',
          'STAFF_REQUEST_CREATED',
        ].sort(),
      );
    });
  });
});
