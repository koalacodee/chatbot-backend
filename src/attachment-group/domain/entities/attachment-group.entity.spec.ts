import { BadRequestException } from '@nestjs/common';
import { AttachmentGroup } from './attachment-group.entity';

const GROUP_ID = '018f4a1e-1c7a-7000-8000-0000000000c1';
const CREATOR_ID = '018f4a1e-1c7a-7000-8000-0000000000c2';
const ATTACHMENT_A = '018f4a1e-1c7a-7000-8000-0000000000d1';
const ATTACHMENT_B = '018f4a1e-1c7a-7000-8000-0000000000d2';

const build = (overrides: Partial<Parameters<typeof AttachmentGroup.create>[0]> = {}) =>
  AttachmentGroup.create({
    createdById: CREATOR_ID,
    key: '1234567890',
    ...overrides,
  });

describe('AttachmentGroup', () => {
  describe('construction', () => {
    it('exposes ids as plain strings, not value objects', () => {
      const group = build({ id: GROUP_ID });

      expect(group.id).toBe(GROUP_ID);
      expect(group.createdById).toBe(CREATOR_ID);
    });

    it('rejects a malformed attachment id', () => {
      expect(() => build({ attachmentIds: ['not-a-uuid'] })).toThrow(
        BadRequestException,
      );
    });

    it('defaults ips and attachmentIds to empty arrays', () => {
      const group = build();

      expect(group.ips).toEqual([]);
      expect(group.attachmentIds).toEqual([]);
    });

    it('leaves expiresAt undefined when not supplied', () => {
      expect(build().expiresAt).toBeUndefined();
    });
  });

  describe('encapsulation', () => {
    it('hands out a copy of ips, so callers cannot mutate internals', () => {
      const group = build({ ips: ['10.0.0.1'] });

      group.ips.push('10.0.0.2');

      expect(group.ips).toEqual(['10.0.0.1']);
    });

    it('hands out attachment ids as strings', () => {
      const group = build({ attachmentIds: [ATTACHMENT_A] });

      expect(group.attachmentIds).toEqual([ATTACHMENT_A]);
    });
  });

  describe('addIp', () => {
    it('appends an unseen ip', () => {
      const group = build();

      group.addIp('10.0.0.1');

      expect(group.ips).toEqual(['10.0.0.1']);
    });

    it('ignores an ip that is already recorded', () => {
      const group = build({ ips: ['10.0.0.1'] });

      group.addIp('10.0.0.1');

      expect(group.ips).toEqual(['10.0.0.1']);
    });

    it('bumps updatedAt only when the ip was new', () => {
      const updatedAt = new Date('2025-01-01T00:00:00.000Z');
      const group = build({ ips: ['10.0.0.1'], updatedAt });

      group.addIp('10.0.0.1');
      expect(group.updatedAt).toEqual(updatedAt);

      group.addIp('10.0.0.2');
      expect(group.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
    });
  });

  describe('updateAttachments', () => {
    it('replaces the whole set rather than merging', () => {
      const group = build({ attachmentIds: [ATTACHMENT_A] });

      group.updateAttachments([ATTACHMENT_B]);

      expect(group.attachmentIds).toEqual([ATTACHMENT_B]);
    });

    it('accepts an empty list', () => {
      const group = build({ attachmentIds: [ATTACHMENT_A] });

      group.updateAttachments([]);

      expect(group.attachmentIds).toEqual([]);
    });

    it('validates the incoming ids', () => {
      const group = build();

      expect(() => group.updateAttachments(['nope'])).toThrow(
        BadRequestException,
      );
    });

    it('bumps updatedAt', () => {
      const updatedAt = new Date('2025-01-01T00:00:00.000Z');
      const group = build({ updatedAt });

      group.updateAttachments([ATTACHMENT_A]);

      expect(group.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
    });
  });

  describe('isExpired', () => {
    const expiresAt = new Date('2026-06-01T12:00:00.000Z');

    it('is true once the reference time has passed expiry', () => {
      const group = build({ expiresAt });

      expect(group.isExpired(new Date('2026-06-01T12:00:01.000Z'))).toBe(true);
    });

    it('is false before expiry', () => {
      const group = build({ expiresAt });

      expect(group.isExpired(new Date('2026-06-01T11:59:59.000Z'))).toBe(false);
    });

    // The comparison is `<=`, so the exact expiry instant counts as expired.
    it('treats the exact expiry instant as expired', () => {
      const group = build({ expiresAt });

      expect(group.isExpired(new Date(expiresAt))).toBe(true);
    });

    it('defaults the reference time to now', () => {
      expect(build({ expiresAt: new Date(Date.now() - 1000) }).isExpired()).toBe(
        true,
      );
      expect(build({ expiresAt: new Date(Date.now() + 60_000) }).isExpired()).toBe(
        false,
      );
    });

    /**
     * A group with no expiry never expires — but note the method short-circuits on
     * `this._expiresAt`, so it returns `undefined` rather than `false` despite declaring
     * `boolean`. Callers only ever use it in a boolean position, which is why this has
     * never bitten; asserted as falsy rather than `false` to record what it really does.
     */
    it('is falsy — not strictly false — when no expiry is set', () => {
      const group = build();

      expect(group.isExpired()).toBeFalsy();
      expect(group.isExpired()).not.toBe(false);
    });
  });

  describe('toJSON', () => {
    it('emits ids as strings and dates as Date objects', () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');
      const expiresAt = new Date('2025-02-01T00:00:00.000Z');

      const group = build({
        id: GROUP_ID,
        ips: ['10.0.0.1'],
        attachmentIds: [ATTACHMENT_A],
        createdAt,
        updatedAt,
        expiresAt,
      });

      expect(group.toJSON()).toEqual({
        id: GROUP_ID,
        createdById: CREATOR_ID,
        key: '1234567890',
        ips: ['10.0.0.1'],
        attachmentIds: [ATTACHMENT_A],
        createdAt,
        updatedAt,
        expiresAt,
      });
    });
  });
});
