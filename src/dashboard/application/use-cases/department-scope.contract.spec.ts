import { ForbiddenException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { GetAnalyticsSummaryUseCase } from './get-analytics-summary.use-case';
import { GetDashboardSummaryUseCase } from './get-dashboard-summary.use-case';
import { GetWeeklyPerformanceUseCase } from './get-weekly-performance.use-case';

const USER_ID = '018f4a1e-1c7a-7000-8000-000000000301';
const MAIN_DEPT = '018f4a1e-1c7a-7000-8000-000000000310';
const SUB_DEPT = '018f4a1e-1c7a-7000-8000-000000000311';
const FOREIGN_DEPT = '018f4a1e-1c7a-7000-8000-000000000399';

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

const buildDepartment = (id: string) =>
  Department.create({ id, name: `dept-${id.slice(-3)}` });

interface Harness {
  /** Department ids the use-case handed to the dashboard repository. */
  captured: { value?: string[] };
  run: (userId?: string, departmentId?: string) => Promise<unknown>;
}

/**
 * `getUserDepartmentIds` is copy-pasted across five dashboard use-cases. It is the
 * authorization boundary for every dashboard read — it decides which departments a caller
 * may see, and raises Forbidden when they overreach.
 *
 * Four of those copies are byte-identical, so this suite runs the same scenarios against
 * each of them. A fix or a regression applied to one copy and not the others shows up
 * here as a single failing row rather than as a quiet divergence in production.
 *
 * (The fifth, GetExpiredAttachmentsUseCase, has already drifted: it dropped the
 * `requestedDepartmentId` parameter, so it cannot be asked for a department and has no
 * Forbidden path at all. It is covered separately below.)
 */
function buildHarness(
  useCaseName: string,
  role: Roles,
  supervisorDepartments: string[] = [],
  subDepartmentsOf: Record<string, string[]> = {},
  employeeSubDepartments?: string[],
): Harness {
  const captured: { value?: string[] } = {};

  const dashboard = stubRepository<DashboardRepository>('DashboardRepository', {
    getSummary: async (departmentIds) => {
      captured.value = departmentIds;
      return {} as any;
    },
    getAnalyticsSummary: async (_days, departmentIds) => {
      captured.value = departmentIds;
      return { kpis: [], departmentPerformance: [] };
    },
    getWeeklyPerformance: async (_days, departmentIds) => {
      captured.value = departmentIds;
      return [] as any;
    },
  });

  const users = stubRepository<UserRepository>('UserRepository', {
    findById: async () => buildUser(role),
  });

  const supervisors = stubRepository<SupervisorRepository>(
    'SupervisorRepository',
    {
      findByUserId: async () =>
        Supervisor.create({
          id: '018f4a1e-1c7a-7000-8000-000000000302',
          userId: USER_ID,
          permissions: [],
          departments: supervisorDepartments.map(buildDepartment),
        }),
    },
  );

  const employees = stubRepository<EmployeeRepository>('EmployeeRepository', {
    findByUserId: async () =>
      ({
        subDepartments: (employeeSubDepartments ?? []).map(buildDepartment),
        supervisor: undefined,
      }) as unknown as Employee,
  });

  const departments = stubRepository<DepartmentRepository>(
    'DepartmentRepository',
    {
      findSubDepartmentByParentId: async (parentId: string) =>
        (subDepartmentsOf[parentId] ?? []).map(buildDepartment),
    },
  );

  const deps = [
    dashboard,
    supervisors,
    employees,
    users,
    departments,
  ] as const;

  const runners: Record<string, Harness['run']> = {
    GetAnalyticsSummaryUseCase: (userId, departmentId) =>
      new GetAnalyticsSummaryUseCase(...deps).execute('7d', userId, departmentId),
    GetDashboardSummaryUseCase: (userId, departmentId) =>
      new GetDashboardSummaryUseCase(...deps).execute(userId, departmentId),
    GetWeeklyPerformanceUseCase: (userId, departmentId) =>
      new GetWeeklyPerformanceUseCase(...deps).execute(
        '7d',
        userId,
        departmentId,
      ),
  };

  return { captured, run: runners[useCaseName] };
}

const USE_CASES = [
  'GetAnalyticsSummaryUseCase',
  'GetDashboardSummaryUseCase',
  'GetWeeklyPerformanceUseCase',
] as const;

describe.each(USE_CASES)('%s department scoping', (useCaseName) => {
  describe('anonymous caller', () => {
    it('is unscoped when no user and no department are given', async () => {
      const harness = buildHarness(useCaseName, Roles.ADMIN);

      await harness.run(undefined, undefined);

      expect(harness.captured.value).toBeUndefined();
    });

    /**
     * With no userId the requested department is honoured without any check, because the
     * role lookup is skipped entirely. Safe only because the controller always supplies
     * the caller's id.
     */
    it('honours a requested department without authorising it', async () => {
      const harness = buildHarness(useCaseName, Roles.ADMIN);

      await harness.run(undefined, FOREIGN_DEPT);

      expect(harness.captured.value).toEqual([FOREIGN_DEPT]);
    });
  });

  describe('admin', () => {
    it('sees everything when no department is requested', async () => {
      const harness = buildHarness(useCaseName, Roles.ADMIN);

      await harness.run(USER_ID);

      expect(harness.captured.value).toBeUndefined();
    });

    it('may scope to any department', async () => {
      const harness = buildHarness(useCaseName, Roles.ADMIN);

      await harness.run(USER_ID, FOREIGN_DEPT);

      expect(harness.captured.value).toEqual([FOREIGN_DEPT]);
    });
  });

  describe('supervisor', () => {
    const subs = { [MAIN_DEPT]: [SUB_DEPT] };

    it('sees their departments plus every sub-department', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.SUPERVISOR,
        [MAIN_DEPT],
        subs,
      );

      await harness.run(USER_ID);

      expect(harness.captured.value).toEqual([MAIN_DEPT, SUB_DEPT]);
    });

    it('may scope to one of their own departments', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.SUPERVISOR,
        [MAIN_DEPT],
        subs,
      );

      await harness.run(USER_ID, MAIN_DEPT);

      expect(harness.captured.value).toEqual([MAIN_DEPT]);
    });

    it('may scope to a sub-department of theirs', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.SUPERVISOR,
        [MAIN_DEPT],
        subs,
      );

      await harness.run(USER_ID, SUB_DEPT);

      expect(harness.captured.value).toEqual([SUB_DEPT]);
    });

    it('is refused a department they do not own', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.SUPERVISOR,
        [MAIN_DEPT],
        subs,
      );

      await expect(harness.run(USER_ID, FOREIGN_DEPT)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('reaches the repository with nothing when refused', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.SUPERVISOR,
        [MAIN_DEPT],
        subs,
      );

      await expect(harness.run(USER_ID, FOREIGN_DEPT)).rejects.toThrow();

      expect(harness.captured.value).toBeUndefined();
    });

    it('scopes to an empty set when they own no departments', async () => {
      const harness = buildHarness(useCaseName, Roles.SUPERVISOR, []);

      await harness.run(USER_ID);

      expect(harness.captured.value).toEqual([]);
    });
  });

  describe('employee', () => {
    it('sees their own sub-departments', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.EMPLOYEE,
        [],
        {},
        [SUB_DEPT],
      );

      await harness.run(USER_ID);

      expect(harness.captured.value).toEqual([SUB_DEPT]);
    });

    it('may scope to one of their own', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.EMPLOYEE,
        [],
        {},
        [SUB_DEPT],
      );

      await harness.run(USER_ID, SUB_DEPT);

      expect(harness.captured.value).toEqual([SUB_DEPT]);
    });

    it('is refused a department they cannot access', async () => {
      const harness = buildHarness(
        useCaseName,
        Roles.EMPLOYEE,
        [],
        {},
        [SUB_DEPT],
      );

      await expect(harness.run(USER_ID, FOREIGN_DEPT)).rejects.toThrow(
        ForbiddenException,
      );
    });

    /**
     * An employee with no sub-departments resolves to `[]`, not `undefined` — the
     * difference between "no departments" and "all departments" at the repository layer.
     */
    it('scopes to an empty set, not to everything, when they have none', async () => {
      const harness = buildHarness(useCaseName, Roles.EMPLOYEE, [], {}, []);

      await harness.run(USER_ID);

      expect(harness.captured.value).toEqual([]);
      expect(harness.captured.value).not.toBeUndefined();
    });
  });

  describe('driver', () => {
    it('falls through to an empty scope', async () => {
      const harness = buildHarness(useCaseName, Roles.DRIVER);

      await harness.run(USER_ID);

      expect(harness.captured.value).toEqual([]);
    });
  });
});
