import { NotFoundException } from '@nestjs/common';
import { Admin } from '../domain/entities/admin.entity';
import { FakeAdminRepository } from './fake-admin.repository';

const ADMIN_ID = '018f4a1e-1c7a-7000-8000-0000000000a1';
const OTHER_ID = '018f4a1e-1c7a-7000-8000-0000000000b1';
const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000a2';
const OTHER_USER_ID = '018f4a1e-1c7a-7000-8000-0000000000b2';

/**
 * The fake is about to be depended on by the auth, employee-request, promotion and
 * notification test suites, so its own behaviour is worth pinning — a fixture that
 * quietly diverges from the real repository makes every test built on it lie.
 */
describe('FakeAdminRepository', () => {
  let repository: FakeAdminRepository;
  let admin: Admin;

  beforeEach(() => {
    repository = new FakeAdminRepository();
    admin = Admin.create({ id: ADMIN_ID, userId: USER_ID });
  });

  it('saves and reads back by id', async () => {
    await repository.save(admin);

    await expect(repository.findById(ADMIN_ID)).resolves.toBe(admin);
  });

  it('returns null for an unknown id', async () => {
    await expect(repository.findById(ADMIN_ID)).resolves.toBeNull();
  });

  it('finds by userId', async () => {
    await repository.save(admin);

    await expect(repository.findByUserId(USER_ID)).resolves.toBe(admin);
    await expect(repository.findByUserId(OTHER_USER_ID)).resolves.toBeNull();
  });

  it('treats save as an upsert keyed on id', async () => {
    await repository.save(admin);
    await repository.save(Admin.create({ id: ADMIN_ID, userId: OTHER_USER_ID }));

    await expect(repository.count()).resolves.toBe(1);
    await expect(repository.findByUserId(OTHER_USER_ID)).resolves.not.toBeNull();
  });

  it('returns the removed admin, then nothing on a second removal', async () => {
    await repository.save(admin);

    await expect(repository.removeById(ADMIN_ID)).resolves.toBe(admin);
    await expect(repository.removeById(ADMIN_ID)).resolves.toBeNull();
    await expect(repository.exists(ADMIN_ID)).resolves.toBe(false);
  });

  describe('findByIds', () => {
    it('skips ids that are not present rather than yielding holes', async () => {
      await repository.save(admin);

      await expect(repository.findByIds([ADMIN_ID, OTHER_ID])).resolves.toEqual(
        [admin],
      );
    });

    it('returns an empty array for an empty input', async () => {
      await expect(repository.findByIds([])).resolves.toEqual([]);
    });
  });

  describe('update', () => {
    it('replaces the userId', async () => {
      await repository.save(admin);

      const updated = await repository.update(ADMIN_ID, {
        userId: Admin.create({ userId: OTHER_USER_ID }).userId,
      });

      expect(updated.userId.value).toBe(OTHER_USER_ID);
      await expect(repository.findById(ADMIN_ID)).resolves.toBe(updated);
    });

    it('is a no-op that still returns the row when nothing is supplied', async () => {
      await repository.save(admin);

      await expect(repository.update(ADMIN_ID, {})).resolves.toBe(admin);
    });

    it('throws when the admin does not exist', async () => {
      await expect(repository.update(ADMIN_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('seeds without going through save', async () => {
    repository.seed(admin, Admin.create({ id: OTHER_ID, userId: OTHER_USER_ID }));

    await expect(repository.count()).resolves.toBe(2);
    await expect(repository.findAll()).resolves.toHaveLength(2);
  });
});
