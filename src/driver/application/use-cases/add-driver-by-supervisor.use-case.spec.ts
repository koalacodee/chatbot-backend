import { ConflictException, NotFoundException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { FakeDriverRepository } from '../../__fixtures__/fake-driver.repository';
import { Driver } from '../../domain/entities/driver.entity';
import { AddDriverBySupervisorUseCase } from './add-driver-by-supervisor.use-case';

const SUPERVISOR_USER_ID = '018f4a1e-1c7a-7000-8000-000000000701';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000702';
const EXISTING_USER_ID = '018f4a1e-1c7a-7000-8000-000000000703';

const dto = (overrides = {}) => ({
  supervisorId: SUPERVISOR_USER_ID,
  username: 'newdriver',
  name: 'New Driver',
  email: 'driver@example.com',
  temporaryPassword: 'temp-secret',
  licensingNumber: 'LIC-1234',
  drivingLicenseExpiry: new Date('2027-06-30T00:00:00.000Z'),
  ...overrides,
});

const existingUser = () =>
  User.create(
    {
      id: EXISTING_USER_ID,
      name: 'Taken',
      email: 'taken@example.com',
      username: 'taken',
      password: 'already-a-hash',
      role: Roles.EMPLOYEE,
    },
    false,
  );

interface Options {
  supervisorExists?: boolean;
  usernameTaken?: boolean;
  emailTaken?: boolean;
  employeeIdTaken?: boolean;
  existingDriver?: Driver;
}

function build(options: Options = {}) {
  const drivers = new FakeDriverRepository();
  if (options.existingDriver) drivers.seed(options.existingDriver);

  const savedUsers: User[] = [];

  const users = stubRepository<UserRepository>('UserRepository', {
    findByUsername: async () =>
      options.usernameTaken ? await existingUser() : null,
    findByEmail: async () => (options.emailTaken ? await existingUser() : null),
    findByEmployeeId: async () =>
      options.employeeIdTaken ? await existingUser() : null,
    save: async (user: User) => {
      savedUsers.push(user);
      return user;
    },
  });

  const supervisors = stubRepository<SupervisorRepository>(
    'SupervisorRepository',
    {
      findByUserId: async () =>
        options.supervisorExists === false
          ? null
          : Supervisor.create({
              id: SUPERVISOR_ID,
              userId: SUPERVISOR_USER_ID,
              permissions: [],
              departments: [Department.create({ name: 'Fleet' })],
            }),
    },
  );

  return {
    drivers,
    savedUsers,
    useCase: new AddDriverBySupervisorUseCase(drivers, users, supervisors),
  };
}

/**
 * These exceptions carry a `{ details: [{ field, message }] }` body, so `.message` is
 * only Nest's generic "Conflict Exception". The field-level text — which is what the
 * client keys on to highlight an input — is in the response body.
 */
async function expectRejectionDetail(
  promise: Promise<unknown>,
  field: string,
  message: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    response: { details: [{ field, message }] },
  });
}

describe('AddDriverBySupervisorUseCase', () => {
  describe('preconditions, in the order they are checked', () => {
    it('rejects an unknown supervisor', async () => {
      const { useCase } = build({ supervisorExists: false });

      await expect(useCase.execute(dto())).rejects.toThrow(NotFoundException);
    });

    it('rejects a taken username', async () => {
      const { useCase } = build({ usernameTaken: true });

      await expect(useCase.execute(dto())).rejects.toThrow(ConflictException);
    });

    it('rejects a taken email', async () => {
      const { useCase } = build({ emailTaken: true });

      await expect(useCase.execute(dto())).rejects.toThrow(ConflictException);
    });

    it('rejects a licensing number already on file', async () => {
      const existing = Driver.create({
        userId: EXISTING_USER_ID,
        supervisorId: SUPERVISOR_ID,
        licensingNumber: 'LIC-1234',
        drivingLicenseExpiry: new Date(),
      });
      const { useCase } = build({ existingDriver: existing });

      await expectRejectionDetail(
        useCase.execute(dto()),
        'licensingNumber',
        'Licensing number already exists',
      );
    });

    it('rejects a taken employeeId when one is supplied', async () => {
      const { useCase } = build({ employeeIdTaken: true });

      await expectRejectionDetail(
        useCase.execute(dto({ employeeId: 'EMP-1' })),
        'employeeId',
        'Employee ID already exists',
      );
    });

    /**
     * The employeeId lookup is skipped entirely when the field is absent — the stub would
     * still answer, but the guard means an omitted employeeId can never collide.
     */
    it('skips the employeeId check when none is supplied', async () => {
      const { useCase } = build({ employeeIdTaken: true });

      await expect(useCase.execute(dto())).resolves.toBeDefined();
    });
  });

  describe('nothing is written when a precondition fails', () => {
    it.each([
      ['supervisor missing', { supervisorExists: false }],
      ['username taken', { usernameTaken: true }],
      ['email taken', { emailTaken: true }],
    ])('persists neither user nor driver (%s)', async (_label, options) => {
      const { useCase, drivers, savedUsers } = build(options);

      await expect(useCase.execute(dto())).rejects.toThrow();

      expect(savedUsers).toHaveLength(0);
      expect(drivers.saved).toHaveLength(0);
    });
  });

  describe('on success', () => {
    it('creates the user with the DRIVER role', async () => {
      const { useCase, savedUsers } = build();

      await useCase.execute(dto());

      expect(savedUsers).toHaveLength(1);
      expect(savedUsers[0].role.getRole()).toBe(Roles.DRIVER);
    });

    /**
     * The temporary password is plaintext here, so `User.create` is called with hashing
     * left on — the opposite of the repository read paths, which must not re-hash a
     * stored hash.
     */
    it('hashes the temporary password rather than storing it raw', async () => {
      const { useCase, savedUsers } = build();

      await useCase.execute(dto({ temporaryPassword: 'temp-secret' }));

      expect(JSON.stringify(savedUsers[0])).not.toContain('temp-secret');
    });

    it('carries the optional profile fields onto the user', async () => {
      const { useCase, savedUsers } = build();

      await useCase.execute(
        dto({ employeeId: 'EMP-7', jobTitle: 'Courier' }),
      );

      expect(savedUsers[0].employeeId).toBe('EMP-7');
      expect(savedUsers[0].jobTitle).toBe('Courier');
    });

    it('links the driver to the saved user', async () => {
      const { useCase, drivers, savedUsers } = build();

      await useCase.execute(dto());

      expect(drivers.saved[0].userId.value).toBe(savedUsers[0].id);
    });

    /**
     * `dto.supervisorId` is a *user* id — it is resolved through `findByUserId`, and the
     * driver is linked to the supervisor's own row id, not the id that was passed in.
     */
    it('links the driver to the supervisor row, not the supervisor’s user id', async () => {
      const { useCase, drivers } = build();

      await useCase.execute(dto());

      expect(drivers.saved[0].supervisorId.value).toBe(SUPERVISOR_ID);
      expect(drivers.saved[0].supervisorId.value).not.toBe(SUPERVISOR_USER_ID);
    });

    it('stores the licence details', async () => {
      const expiry = new Date('2028-01-01T00:00:00.000Z');
      const { useCase, drivers } = build();

      await useCase.execute(
        dto({ licensingNumber: 'LIC-777', drivingLicenseExpiry: expiry }),
      );

      expect(drivers.saved[0].licensingNumber).toBe('LIC-777');
      expect(drivers.saved[0].drivingLicenseExpiry).toEqual(expiry);
    });

    it('returns both the driver and the user', async () => {
      const { useCase, drivers, savedUsers } = build();

      const result = await useCase.execute(dto());

      expect(result.driver).toBe(drivers.saved[0]);
      expect(result.user).toBe(savedUsers[0]);
    });

    /**
     * The user is saved before the driver, and neither call is transactional — so a
     * failure creating the driver leaves an orphan user account behind.
     */
    it('leaves an orphan user if the driver write fails', async () => {
      const { useCase, drivers, savedUsers } = build();
      jest
        .spyOn(drivers, 'save')
        .mockRejectedValueOnce(new Error('constraint violation'));

      await expect(useCase.execute(dto())).rejects.toThrow(
        'constraint violation',
      );

      expect(savedUsers).toHaveLength(1);
    });
  });
});
