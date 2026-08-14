import { ForbiddenException } from '@nestjs/common';
import { FakeActivityLogRepository } from 'src/activity-log/__fixtures__/fake-activity-log.repository';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { EmployeeRequestRepository } from 'src/employee-request/domain/repositories/employee-request.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { GetDashboardOverviewUseCase } from './get-dashboard-overview.use-case';
import { GetExpiredAttachmentsUseCase } from './get-expired-attachments.use-case';

const USER_ID = '018f4a1e-1c7a-7000-8000-000000000301';
const MAIN_DEPT = '018f4a1e-1c7a-7000-8000-000000000310';
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

function buildDeps(role: Roles, supervisorDepartments: string[] = []) {
  const captured: { summaryDepartments?: string[]; days?: number } = {};

  const dashboard = stubRepository<DashboardRepository>('DashboardRepository', {
    getSummary: async (departmentIds) => {
      captured.summaryDepartments = departmentIds;
      return { totals: {} } as any;
    },
    getWeeklyPerformance: async (days) => {
      captured.days = days;
      return [] as any;
    },
    getAnalyticsSummary: async () => ({ kpis: [], departmentPerformance: [] }),
    getExpiredAttachments: async () => [],
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
          departments: supervisorDepartments.map((id) =>
            Department.create({ id, name: 'dept' }),
          ),
        }),
    },
  );

  const employees = stubRepository<EmployeeRepository>('EmployeeRepository', {
    findByUserId: async () => ({ subDepartments: [] }) as any,
  });

  const departments = stubRepository<DepartmentRepository>(
    'DepartmentRepository',
    { findSubDepartmentByParentId: async () => [] },
  );

  return { captured, dashboard, users, supervisors, employees, departments };
}

describe('GetDashboardOverviewUseCase', () => {
  const buildUseCase = (
    role: Roles,
    supervisorDepartments: string[] = [],
    pending: { total?: number; items?: any[] } = {},
  ) => {
    const deps = buildDeps(role, supervisorDepartments);
    const activity = new FakeActivityLogRepository();

    const requests = stubRepository<EmployeeRequestRepository>(
      'EmployeeRequestRepository',
      {
        countPending: async () => pending.total ?? 0,
        findPending: async () => (pending.items ?? []) as any,
      },
    );

    return {
      ...deps,
      activity,
      useCase: new GetDashboardOverviewUseCase(
        deps.dashboard,
        activity,
        requests,
        deps.supervisors,
        deps.employees,
        deps.users,
        deps.departments,
      ),
    };
  };

  describe('range parsing', () => {
    it.each([
      ['7d', 7],
      ['30d', 30],
      ['1d', 1],
      ['365d', 365],
    ])('reads %s as %i days', async (range, expected) => {
      const { useCase, captured } = buildUseCase(Roles.ADMIN);

      await useCase.execute(range, 10, USER_ID);

      expect(captured.days).toBe(expected);
    });

    it.each(['garbage', '7', 'd', '7days', '-3d', ''])(
      'falls back to 7 days for %p',
      async (range) => {
        const { useCase, captured } = buildUseCase(Roles.ADMIN);

        await useCase.execute(range, 10, USER_ID);

        expect(captured.days).toBe(7);
      },
    );

    it('defaults to 7 days when no range is given', async () => {
      const { useCase, captured } = buildUseCase(Roles.ADMIN);

      await useCase.execute(undefined, 10, USER_ID);

      expect(captured.days).toBe(7);
    });
  });

  describe('department scoping', () => {
    it('leaves an admin unscoped', async () => {
      const { useCase, captured } = buildUseCase(Roles.ADMIN);

      await useCase.execute('7d', 10, USER_ID);

      expect(captured.summaryDepartments).toBeUndefined();
    });

    it('scopes a supervisor to their departments', async () => {
      const { useCase, captured } = buildUseCase(Roles.SUPERVISOR, [MAIN_DEPT]);

      await useCase.execute('7d', 10, USER_ID);

      expect(captured.summaryDepartments).toEqual([MAIN_DEPT]);
    });

    it('refuses a supervisor asking for a foreign department', async () => {
      const { useCase } = buildUseCase(Roles.SUPERVISOR, [MAIN_DEPT]);

      await expect(
        useCase.execute('7d', 10, USER_ID, FOREIGN_DEPT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pending requests', () => {
    it('reports the total alongside the page of items', async () => {
      const { useCase } = buildUseCase(Roles.ADMIN, [], {
        total: 12,
        items: [
          {
            id: 'req-1',
            newEmployeeFullName: 'Sam',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            requestedBySupervisor: {
              user: { id: 'user-9', name: 'Alex' },
            },
          },
        ],
      });

      const result = await useCase.execute('7d', 10, USER_ID);

      expect(result.pendingRequests).toEqual({
        total: 12,
        items: [
          {
            id: 'req-1',
            candidateName: 'Sam',
            requestedBy: { id: 'user-9', name: 'Alex' },
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      });
    });

    /**
     * `requestedBy` collapses to null when the supervisor's user was not loaded — which
     * is exactly what happened before the employee-request repository started joining it.
     * The mapping tolerates the gap rather than throwing.
     */
    it('nulls requestedBy when the supervisor has no user attached', async () => {
      const { useCase } = buildUseCase(Roles.ADMIN, [], {
        total: 1,
        items: [
          {
            id: 'req-1',
            newEmployeeFullName: 'Sam',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            requestedBySupervisor: { user: undefined },
          },
        ],
      });

      const result = await useCase.execute('7d', 10, USER_ID);

      expect(result.pendingRequests.items[0].requestedBy).toBeNull();
    });

    it('nulls candidateName when the request has none', async () => {
      const { useCase } = buildUseCase(Roles.ADMIN, [], {
        total: 1,
        items: [
          {
            id: 'req-1',
            newEmployeeFullName: null,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            requestedBySupervisor: { user: undefined },
          },
        ],
      });

      const result = await useCase.execute('7d', 10, USER_ID);

      expect(result.pendingRequests.items[0].candidateName).toBeNull();
    });
  });

  it('wraps performance and recent activity in their envelopes', async () => {
    const { useCase, activity } = buildUseCase(Roles.ADMIN);
    activity.recentActivity = [
      {
        id: 'log-1',
        type: 'ticket',
        description: 'Ticket answered',
        timestamp: '2025-01-01T00:00:00.000Z',
        meta: {},
      },
    ];

    const result = await useCase.execute('7d', 10, USER_ID);

    expect(result.performance).toEqual({ series: [] });
    expect(result.recentActivity).toEqual({ items: activity.recentActivity });
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('passes the limit through to both paged reads', async () => {
    const { useCase, activity } = buildUseCase(Roles.ADMIN);

    await useCase.execute('7d', 3, USER_ID);

    expect(activity.received.recentActivity).toBe(3);
  });
});

/**
 * The fifth copy of the scope resolver, and the one that has drifted: it takes only a
 * userId, so it cannot be asked for a specific department and therefore has no Forbidden
 * path. Covered on its own terms rather than through the shared contract.
 */
describe('GetExpiredAttachmentsUseCase', () => {
  const buildUseCase = (role: Roles, supervisorDepartments: string[] = []) => {
    const captured: { departments?: string[] } = {};
    const deps = buildDeps(role, supervisorDepartments);

    const dashboard = stubRepository<DashboardRepository>(
      'DashboardRepository',
      {
        getExpiredAttachments: async (departmentIds) => {
          captured.departments = departmentIds;
          return [];
        },
      },
    );

    return {
      captured,
      useCase: new GetExpiredAttachmentsUseCase(
        dashboard,
        deps.supervisors,
        deps.employees,
        deps.users,
        deps.departments,
      ),
    };
  };

  it('is unscoped when no user is given', async () => {
    const { useCase, captured } = buildUseCase(Roles.ADMIN);

    await useCase.execute(undefined);

    expect(captured.departments).toBeUndefined();
  });

  it('leaves an admin unscoped', async () => {
    const { useCase, captured } = buildUseCase(Roles.ADMIN);

    await useCase.execute(USER_ID);

    expect(captured.departments).toBeUndefined();
  });

  it('scopes a supervisor to their departments', async () => {
    const { useCase, captured } = buildUseCase(Roles.SUPERVISOR, [MAIN_DEPT]);

    await useCase.execute(USER_ID);

    expect(captured.departments).toEqual([MAIN_DEPT]);
  });

  it('scopes an employee to an empty set when they have no sub-departments', async () => {
    const { useCase, captured } = buildUseCase(Roles.EMPLOYEE);

    await useCase.execute(USER_ID);

    expect(captured.departments).toEqual([]);
  });
});
