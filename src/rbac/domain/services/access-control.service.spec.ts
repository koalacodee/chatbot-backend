import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Driver } from 'src/driver/domain/entities/driver.entity';
import { DriverRepository } from 'src/driver/domain/repositories/driver.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AccessControlService } from './access-control.service';

const USER_ID = '018f4a1e-1c7a-7000-8000-000000000101';
const DEPT_ID = '018f4a1e-1c7a-7000-8000-000000000201';
const OTHER_DEPT_ID = '018f4a1e-1c7a-7000-8000-000000000202';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000301';
const OTHER_SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000302';
const EMPLOYEE_ID = '018f4a1e-1c7a-7000-8000-000000000401';
const DRIVER_ID = '018f4a1e-1c7a-7000-8000-000000000501';

const buildUser = (role: Roles, supervisor?: Supervisor) =>
  User.create(
    {
      id: USER_ID,
      name: 'Dana',
      username: 'dana',
      email: 'dana@example.com',
      password: 'already-a-hash',
      role,
      supervisor,
    },
    false,
  );

const buildSupervisor = (departments: Department[] = []) =>
  Supervisor.create({
    id: SUPERVISOR_ID,
    userId: USER_ID,
    permissions: [],
    departments,
  });

const buildEmployee = (supervisorId: string) =>
  Employee.create({
    id: EMPLOYEE_ID,
    userId: USER_ID,
    permissions: [],
    supervisorId,
  });

const buildEmployeeWithDepartments = (departmentIds: string[]) =>
  Employee.create({
    id: EMPLOYEE_ID,
    userId: USER_ID,
    permissions: [],
    supervisorId: SUPERVISOR_ID,
    subDepartments: departmentIds.map((id) =>
      Department.create({ id, name: `dept-${id.slice(-3)}` }),
    ),
  });

const buildDriver = (supervisorId: string) =>
  Driver.create({
    id: DRIVER_ID,
    userId: USER_ID,
    supervisorId,
    licensingNumber: 'DL-1',
    drivingLicenseExpiry: new Date('2030-01-01T00:00:00.000Z'),
  });

interface Options {
  user?: User | null;
  department?: Department | null;
  supervisor?: Supervisor | null;
  /** Resolved by `findById` — the staff member being acted on. */
  employee?: Employee | null;
  /** Resolved by `findByUserId` — the caller's own employee row. */
  employeeOfUser?: Employee | null;
  driver?: Driver | null;
}

function build(options: Options = {}) {
  const lookups = { departmentIds: [] as string[] };

  const users = stubRepository<UserRepository>('UserRepository', {
    findById: async () => options.user as User,
  });

  const departments = stubRepository<DepartmentRepository>(
    'DepartmentRepository',
    {
      findById: async (id: string) => {
        lookups.departmentIds.push(id);
        return options.department as Department;
      },
    },
  );

  const supervisors = stubRepository<SupervisorRepository>(
    'SupervisorRepository',
    { findByUserId: async () => options.supervisor as Supervisor },
  );

  const employees = stubRepository<EmployeeRepository>('EmployeeRepository', {
    findById: async () => options.employee as Employee,
    findByUserId: async () => options.employeeOfUser as Employee,
  });

  const drivers = stubRepository<DriverRepository>('DriverRepository', {
    findById: async () => options.driver as Driver,
  });

  return {
    lookups,
    service: new AccessControlService(
      users,
      departments,
      employees,
      supervisors,
      drivers,
    ),
  };
}

describe('AccessControlService', () => {
  describe('canAccessDepartment', () => {
    it('lets an admin into any department', async () => {
      const { service } = build({ user: await buildUser(Roles.ADMIN) });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).resolves.toBe(true);
    });

    it('refuses an unknown user', async () => {
      const { service } = build({ user: null });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses an unknown department for a non-admin', async () => {
      const department = Department.create({ id: DEPT_ID, name: 'Support' });
      const { service } = build({
        user: await buildUser(Roles.SUPERVISOR, buildSupervisor([department])),
        department: null,
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    /** Admins short-circuit before the department is loaded, sparing the query. */
    it('does not load the department for an admin', async () => {
      const { service, lookups } = build({ user: await buildUser(Roles.ADMIN) });

      await service.canAccessDepartment(USER_ID, DEPT_ID);

      expect(lookups.departmentIds).toEqual([]);
    });

    /**
     * The defect this replaced: the membership test was
     * `user.supervisor.departments.some((d) => d.id === department.id)`, comparing two
     * `UUID` *instances* by reference. Objects loaded by separate queries are never the
     * same instance, so every non-admin was refused — including through the seven
     * knowledge-chunk use-cases that call this method.
     */
    it('admits a supervisor who holds the department', async () => {
      const held = Department.create({ id: DEPT_ID, name: 'Support' });
      // The same row, loaded separately — as two queries would return it.
      const fetched = Department.create({ id: DEPT_ID, name: 'Support' });

      const { service } = build({
        user: await buildUser(Roles.SUPERVISOR, buildSupervisor([held])),
        department: fetched,
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).resolves.toBe(true);
    });

    it('compares by value, not by instance', async () => {
      const held = Department.create({ id: DEPT_ID, name: 'Support' });
      const fetched = Department.create({ id: DEPT_ID, name: 'Support' });

      expect(held.id).not.toBe(fetched.id);
      expect(held.id.value).toBe(fetched.id.value);
    });

    it('refuses a supervisor who holds a different department', async () => {
      const held = Department.create({ id: OTHER_DEPT_ID, name: 'Billing' });

      const { service } = build({
        user: await buildUser(Roles.SUPERVISOR, buildSupervisor([held])),
        department: Department.create({ id: DEPT_ID, name: 'Support' }),
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a supervisor holding no departments', async () => {
      const { service } = build({
        user: await buildUser(Roles.SUPERVISOR, buildSupervisor([])),
        department: Department.create({ id: DEPT_ID, name: 'Support' }),
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    /**
     * `user.supervisor` used to be dereferenced unguarded, so every role without that
     * relation raised a TypeError — a 500 where a 403 belonged.
     */
    it.each([Roles.DRIVER, Roles.GUEST])(
      'refuses a %s with a Forbidden rather than crashing',
      async (role) => {
        const { service } = build({
          user: await buildUser(role),
          department: Department.create({ id: DEPT_ID, name: 'Support' }),
        });

        await expect(
          service.canAccessDepartment(USER_ID, DEPT_ID),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    /** Employees are resolved through their own row, as the rest of the codebase does. */
    it('admits an employee whose sub-departments include it', async () => {
      const { service } = build({
        user: await buildUser(Roles.EMPLOYEE),
        department: Department.create({ id: DEPT_ID, name: 'Support' }),
        employeeOfUser: await buildEmployeeWithDepartments([DEPT_ID]),
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).resolves.toBe(true);
    });

    it('refuses an employee whose sub-departments do not', async () => {
      const { service } = build({
        user: await buildUser(Roles.EMPLOYEE),
        department: Department.create({ id: DEPT_ID, name: 'Support' }),
        employeeOfUser: await buildEmployeeWithDepartments([OTHER_DEPT_ID]),
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses an employee with no row', async () => {
      const { service } = build({
        user: await buildUser(Roles.EMPLOYEE),
        department: Department.create({ id: DEPT_ID, name: 'Support' }),
        employeeOfUser: null,
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    /**
     * The supervisor relation is normally joined by `includeEntity: true`, but a user
     * loaded without it now falls back to a lookup instead of crashing.
     */
    it('looks the supervisor up when the relation was not joined', async () => {
      const { service } = build({
        user: await buildUser(Roles.SUPERVISOR),
        department: Department.create({ id: DEPT_ID, name: 'Support' }),
        supervisor: buildSupervisor([
          Department.create({ id: DEPT_ID, name: 'Support' }),
        ]),
      });

      await expect(
        service.canAccessDepartment(USER_ID, DEPT_ID),
      ).resolves.toBe(true);
    });
  });

  describe('canSupervisorAccessEmployeeOrDriver', () => {
    it('refuses an unknown employee', async () => {
      const { service } = build({
        supervisor: buildSupervisor(),
        employee: null,
      });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          EMPLOYEE_ID,
          'employee',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses when the caller has no supervisor row', async () => {
      const { service } = build({
        supervisor: null,
        employee: await buildEmployee(SUPERVISOR_ID),
      });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          EMPLOYEE_ID,
          'employee',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * The caller's own identity is settled first now, so a caller who is not a
     * supervisor is told that rather than being told the staff member does not exist.
     */
    it('names the missing supervisor when both are missing', async () => {
      const { service } = build({ supervisor: null, employee: null });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          EMPLOYEE_ID,
          'employee',
        ),
      ).rejects.toMatchObject({
        response: { supervisor: 'supervisor_not_found' },
      });
    });

    /** Same identity defect as above: `!==` on two `UUID` instances is always true. */
    it('admits a supervisor their own employee', async () => {
      const { service } = build({
        supervisor: buildSupervisor(),
        employee: await buildEmployee(SUPERVISOR_ID),
      });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          EMPLOYEE_ID,
          'employee',
        ),
      ).resolves.toBe(true);
    });

    it('admits a supervisor their own driver', async () => {
      const { service } = build({
        supervisor: buildSupervisor(),
        driver: buildDriver(SUPERVISOR_ID),
      });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          DRIVER_ID,
          'driver',
        ),
      ).resolves.toBe(true);
    });

    it('refuses staff belonging to another supervisor', async () => {
      const { service } = build({
        supervisor: buildSupervisor(),
        employee: await buildEmployee(OTHER_SUPERVISOR_ID),
      });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          EMPLOYEE_ID,
          'employee',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a driver belonging to another supervisor', async () => {
      const { service } = build({
        supervisor: buildSupervisor(),
        driver: buildDriver(OTHER_SUPERVISOR_ID),
      });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          DRIVER_ID,
          'driver',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('routes to the driver repository for the driver role', async () => {
      const { service } = build({
        supervisor: buildSupervisor(),
        driver: buildDriver(SUPERVISOR_ID),
        employee: null,
      });

      await expect(
        service.canSupervisorAccessEmployeeOrDriver(
          USER_ID,
          DRIVER_ID,
          'driver',
        ),
      ).resolves.toBe(true);
    });
  });

  /**
   * Seven knowledge-chunk use-cases call `canAccessDepartment` on every read and write.
   * Before the identity fix it refused every supervisor and crashed for every employee,
   * so the module was admin-only in practice.
   */
  it('now admits the callers that depend on it', async () => {
    const { service } = build({
      user: await buildUser(Roles.SUPERVISOR, buildSupervisor([
        Department.create({ id: DEPT_ID, name: 'Support' }),
      ])),
      department: Department.create({ id: DEPT_ID, name: 'Support' }),
      supervisor: buildSupervisor(),
      employee: await buildEmployee(SUPERVISOR_ID),
    });

    await expect(
      service.canAccessDepartment(USER_ID, DEPT_ID),
    ).resolves.toBe(true);
    await expect(
      service.canSupervisorAccessEmployeeOrDriver(
        USER_ID,
        EMPLOYEE_ID,
        'employee',
      ),
    ).resolves.toBe(true);
  });
});
