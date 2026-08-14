import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { User } from 'src/shared/entities/user.entity';
import { RedisService } from 'src/shared/infrastructure/redis';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Department } from '../../domain/entities/department.entity';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { GenerateShareKeyUseCase } from './generate-share-key.use-case';

const USER_ID = '018f4a1e-1c7a-7000-8000-000000000501';
const DEPT = '018f4a1e-1c7a-7000-8000-000000000510';
const PARENT = '018f4a1e-1c7a-7000-8000-000000000511';
const FOREIGN = '018f4a1e-1c7a-7000-8000-000000000599';

const buildUser = (role: Roles) =>
  User.create(
    {
      id: USER_ID,
      name: 'Dana',
      email: 'dana@example.com',
      username: 'dana',
      password: 'already-a-hash',
      role,
    },
    false,
  );

const dept = (id: string, parentId?: string) =>
  Department.create({
    id,
    name: 'dept',
    parentId,
    parent: parentId ? Department.create({ id: parentId, name: 'p' }) : undefined,
  });

interface Options {
  role?: Roles;
  departmentExists?: boolean;
  supervisorDepartments?: string[];
  employeeSubDepartments?: string[];
  /** The department returned by findSubDepartmentById, for the parent-access path. */
  subDepartment?: Department | null;
  keyLength?: number;
  expiry?: number;
}

function build(options: Options = {}) {
  const stored: Array<{ key: string; value: string; expiry?: number }> = [];

  const departments = stubRepository<DepartmentRepository>(
    'DepartmentRepository',
    {
      findById: async () =>
        options.departmentExists === false ? null : dept(DEPT),
      findSubDepartmentById: async () => options.subDepartment ?? null,
    },
  );

  const config = {
    get: (key: string, fallback?: unknown) =>
      key === 'SHARE_LINK_KEY_LENGTH'
        ? (options.keyLength ?? fallback)
        : (options.expiry ?? fallback),
  } as unknown as ConfigService;

  const redis = {
    set: async (key: string, value: string, expiry?: number) => {
      stored.push({ key, value, expiry });
    },
  } as unknown as RedisService;

  const supervisors = stubRepository<SupervisorRepository>(
    'SupervisorRepository',
    {
      findByUserId: async () =>
        Supervisor.create({
          id: '018f4a1e-1c7a-7000-8000-000000000502',
          userId: USER_ID,
          permissions: [],
          departments: (options.supervisorDepartments ?? []).map((id) =>
            Department.create({ id, name: 'd' }),
          ),
        }),
    },
  );

  const employees = stubRepository<EmployeeRepository>('EmployeeRepository', {
    findByUserId: async () =>
      ({
        subDepartments: (options.employeeSubDepartments ?? []).map((id) =>
          Department.create({ id, name: 'd' }),
        ),
        supervisor: undefined,
      }) as any,
  });

  const users = stubRepository<UserRepository>('UserRepository', {
    findById: async () => buildUser(options.role ?? Roles.ADMIN),
  });

  return {
    stored,
    useCase: new GenerateShareKeyUseCase(
      departments,
      config,
      redis,
      supervisors,
      employees,
      users,
    ),
  };
}

describe('GenerateShareKeyUseCase', () => {
  it('rejects an unknown department before checking access', async () => {
    const { useCase } = build({ departmentExists: false });

    await expect(useCase.execute({ departmentId: DEPT })).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('access control', () => {
    it('skips the check entirely when no userId is given', async () => {
      // No user is stubbed to be reachable — getting here would mean the check ran.
      const { useCase, stored } = build();

      await useCase.execute({ departmentId: DEPT });

      expect(stored).toHaveLength(1);
    });

    it('lets an admin share any department', async () => {
      const { useCase } = build({ role: Roles.ADMIN });

      await expect(
        useCase.execute({ departmentId: FOREIGN, userId: USER_ID }),
      ).resolves.toEqual({ key: expect.any(String) });
    });

    describe('supervisor', () => {
      it('may share a department they own directly', async () => {
        const { useCase } = build({
          role: Roles.SUPERVISOR,
          supervisorDepartments: [DEPT],
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).resolves.toEqual({ key: expect.any(String) });
      });

      it('may share a sub-department of one they own', async () => {
        const { useCase } = build({
          role: Roles.SUPERVISOR,
          supervisorDepartments: [PARENT],
          subDepartment: dept(DEPT, PARENT),
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).resolves.toEqual({ key: expect.any(String) });
      });

      it('is refused a department unrelated to theirs', async () => {
        const { useCase } = build({
          role: Roles.SUPERVISOR,
          supervisorDepartments: [PARENT],
          subDepartment: dept(DEPT, FOREIGN),
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('is refused when the department has no parent to inherit from', async () => {
        const { useCase } = build({
          role: Roles.SUPERVISOR,
          supervisorDepartments: [PARENT],
          subDepartment: null,
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('writes nothing to redis when refused', async () => {
        const { useCase, stored } = build({
          role: Roles.SUPERVISOR,
          supervisorDepartments: [PARENT],
          subDepartment: null,
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).rejects.toThrow();

        expect(stored).toHaveLength(0);
      });
    });

    describe('employee', () => {
      it('may share one of their own sub-departments', async () => {
        const { useCase } = build({
          role: Roles.EMPLOYEE,
          employeeSubDepartments: [DEPT],
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).resolves.toEqual({ key: expect.any(String) });
      });

      it('is refused any other department', async () => {
        const { useCase } = build({
          role: Roles.EMPLOYEE,
          employeeSubDepartments: [FOREIGN],
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).rejects.toThrow(ForbiddenException);
      });

      /**
       * Unlike a supervisor, an employee gets no parent-inheritance path — membership
       * must be exact.
       */
      it('is refused a sub-department of a department they hold', async () => {
        const { useCase } = build({
          role: Roles.EMPLOYEE,
          employeeSubDepartments: [PARENT],
          subDepartment: dept(DEPT, PARENT),
        });

        await expect(
          useCase.execute({ departmentId: DEPT, userId: USER_ID }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    it('refuses a driver, who matches no branch', async () => {
      const { useCase } = build({ role: Roles.DRIVER });

      await expect(
        useCase.execute({ departmentId: DEPT, userId: USER_ID }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('the generated key', () => {
    it('is hex, two characters per configured byte', async () => {
      const { useCase } = build({ keyLength: 8 });

      const { key } = await useCase.execute({ departmentId: DEPT });

      expect(key).toMatch(/^[0-9a-f]{16}$/);
    });

    it('defaults to 64 bytes when unconfigured', async () => {
      const { useCase } = build();

      const { key } = await useCase.execute({ departmentId: DEPT });

      expect(key).toHaveLength(128);
    });

    it('differs on every call', async () => {
      const { useCase } = build({ keyLength: 8 });

      const first = await useCase.execute({ departmentId: DEPT });
      const second = await useCase.execute({ departmentId: DEPT });

      expect(first.key).not.toBe(second.key);
    });
  });

  describe('what is stored', () => {
    it('maps the key to the department id', async () => {
      const { useCase, stored } = build();

      const { key } = await useCase.execute({ departmentId: DEPT });

      expect(stored).toEqual([
        { key, value: DEPT, expiry: undefined },
      ]);
    });

    it('passes the configured expiry through', async () => {
      const { useCase, stored } = build({ expiry: 3600 });

      await useCase.execute({ departmentId: DEPT });

      expect(stored[0].expiry).toBe(3600);
    });
  });
});
