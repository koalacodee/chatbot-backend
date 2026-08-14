import { BadRequestException } from '@nestjs/common';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Admin } from './admin.entity';

const ADMIN_ID = '018f4a1e-1c7a-7000-8000-0000000000a1';
const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000a2';

describe('Admin', () => {
  describe('identity', () => {
    it('wraps id and userId as UUID value objects', () => {
      const admin = Admin.create({ id: ADMIN_ID, userId: USER_ID });

      expect(admin.id.value).toBe(ADMIN_ID);
      expect(admin.userId.value).toBe(USER_ID);
    });

    it('generates an id when none is supplied', () => {
      const admin = Admin.create({ userId: USER_ID });

      expect(admin.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('rejects a malformed id', () => {
      expect(() => Admin.create({ id: 'nope', userId: USER_ID })).toThrow(
        BadRequestException,
      );
    });

    it('rejects a malformed userId', () => {
      expect(() => Admin.create({ id: ADMIN_ID, userId: 'nope' })).toThrow(
        BadRequestException,
      );
    });

    /**
     * `userId` has a setter and it takes a UUID, not a string. The repository's
     * `resolveUserId` exists precisely because callers do not always honour that.
     */
    it('accepts a replacement userId through the setter', () => {
      const admin = Admin.create({ id: ADMIN_ID, userId: USER_ID });
      const replacement = Admin.create({ userId: ADMIN_ID }).userId;

      admin.userId = replacement;

      expect(admin.userId.value).toBe(ADMIN_ID);
    });
  });

  describe('timestamps', () => {
    it('defaults createdAt and updatedAt to now', () => {
      const before = Date.now();
      const admin = Admin.create({ userId: USER_ID });
      const after = Date.now();

      expect(admin.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(admin.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(admin.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(admin.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('keeps supplied timestamps', () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');

      const admin = Admin.create({ userId: USER_ID, createdAt, updatedAt });

      expect(admin.createdAt).toEqual(createdAt);
      expect(admin.updatedAt).toEqual(updatedAt);
    });

    /**
     * The admins table has no created_at / updated_at columns, so these are always
     * fabricated at construction time and never round-trip through the database. Pinned
     * so nobody later reads them as real audit data.
     */
    it('fabricates timestamps the admins table does not store', () => {
      const first = Admin.create({ userId: USER_ID });
      const second = Admin.create({ userId: USER_ID });

      expect(first.createdAt).not.toBe(second.createdAt);
    });
  });

  describe('optional relations', () => {
    it('leaves every relation undefined when not supplied', () => {
      const admin = Admin.create({ userId: USER_ID });

      expect(admin.user).toBeUndefined();
      expect(admin.promotions).toBeUndefined();
      expect(admin.approvedTasks).toBeUndefined();
      expect(admin.adminResolutions).toBeUndefined();
      expect(admin.questions).toBeUndefined();
      expect(admin.supportTicketAnswersAuthored).toBeUndefined();
      expect(admin.performerTasks).toBeUndefined();
    });

    it('exposes relations set through their setters', () => {
      const admin = Admin.create({ userId: USER_ID });

      admin.promotions = [];
      admin.approvedTasks = [];

      expect(admin.promotions).toEqual([]);
      expect(admin.approvedTasks).toEqual([]);
    });
  });

  describe('toJSON', () => {
    it('serialises ids as strings and timestamps as ISO strings', async () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');

      const admin = Admin.create({
        id: ADMIN_ID,
        userId: USER_ID,
        createdAt,
        updatedAt,
      });

      expect(admin.toJSON()).toEqual({
        id: ADMIN_ID,
        userId: USER_ID,
        user: undefined,
        promotions: undefined,
        approvedTasks: undefined,
        adminResolutions: undefined,
        questions: undefined,
        supportTicketAnswersAuthored: undefined,
        performerTasks: undefined,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });
    });

    it('survives absent relations rather than throwing on them', () => {
      const admin = Admin.create({ userId: USER_ID });

      expect(() => admin.toJSON()).not.toThrow();
    });

    /**
     * The repository never loads `user`, but when something does attach one, toJSON must
     * strip the password hash rather than leak it into a response.
     */
    it('drops the password when a user is attached', async () => {
      const user = await User.create(
        {
          id: USER_ID,
          name: 'Dana',
          email: 'dana@example.com',
          username: 'dana',
          password: 'hashed-value',
          role: Roles.ADMIN,
        },
        false,
      );

      const admin = Admin.create({ id: ADMIN_ID, userId: USER_ID, user });
      const json = admin.toJSON();

      expect(json.user).toBeDefined();
      expect(JSON.stringify(json)).not.toContain('hashed-value');
    });
  });

  describe('fromJSON', () => {
    it('round-trips id and userId', () => {
      const admin = Admin.fromJSON({ id: ADMIN_ID, userId: USER_ID });

      expect(admin.id.value).toBe(ADMIN_ID);
      expect(admin.userId.value).toBe(USER_ID);
    });
  });
});
