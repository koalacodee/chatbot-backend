import { CanActivate, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { buildContext, RequestUser } from '../__fixtures__/execution-context';
import {
  EMPLOYEE_PERMISSIONS_KEY,
  SHARED_PERMISSIONS,
  SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY,
  SUPERVISOR_PERMISSIONS_KEY,
} from '../rbac.constants';
import { EmployeePermissionsGuard } from './employee-permissions.guard';
import { SupervisorOrEmployeePermissionsGuard } from './supervisor-or-employee-permissions.guard';
import { SupervisorPermissionsGuard } from './supervisor-permissions.guard';

/**
 * The two guards that read a flat list of required permissions from metadata, each with
 * the role its decorator exists to assert.
 */
const LIST_GUARDS = {
  supervisor: {
    key: SUPERVISOR_PERMISSIONS_KEY,
    make: (reflector: Reflector) => new SupervisorPermissionsGuard(reflector),
    sample: SupervisorPermissionsEnum.MANAGE_PROMOTIONS,
    role: Roles.SUPERVISOR,
  },
  employee: {
    key: EMPLOYEE_PERMISSIONS_KEY,
    make: (reflector: Reflector) => new EmployeePermissionsGuard(reflector),
    sample: EmployeePermissionsEnum.HANDLE_TICKETS,
    role: Roles.EMPLOYEE,
  },
} as const;

const GUARD_NAMES = Object.keys(LIST_GUARDS) as Array<keyof typeof LIST_GUARDS>;

/** Runs one of the list guards against a request, returning whether it admitted it. */
function run(
  name: keyof typeof LIST_GUARDS,
  options: { user?: RequestUser | null; required?: unknown },
): boolean {
  const { key, make } = LIST_GUARDS[name];
  const { context, reflector } = buildContext({
    user: options.user,
    metadata:
      options.required === undefined ? {} : { [key]: options.required },
  });

  return (make(reflector) as CanActivate).canActivate(context) as boolean;
}

const admits = (
  name: keyof typeof LIST_GUARDS,
  options: { user?: RequestUser | null; required?: unknown },
): boolean => {
  try {
    return run(name, options);
  } catch (error) {
    if (error instanceof ForbiddenException) return false;
    throw error;
  }
};

describe('permission guards', () => {
  /**
   * The guards used to open with `if (!requiredPermissions?.length) return true`, which
   * collapsed three different states into "allow": no decorator, a decorator with no
   * arguments, and a metadata key the guard could not find. Absent metadata still means
   * allow — the guard was applied without the decorator that declares its requirement —
   * but an empty list no longer does.
   */
  describe('absent metadata', () => {
    it.each(GUARD_NAMES)('%s admits a request with no metadata at all', (name) => {
      expect(
        admits(name, { user: { role: Roles.DRIVER, permissions: [] } }),
      ).toBe(true);
    });

    it.each(GUARD_NAMES)('%s admits when the metadata is null', (name) => {
      expect(
        admits(name, {
          user: { role: Roles.DRIVER, permissions: [] },
          required: null,
        }),
      ).toBe(true);
    });

    /**
     * A key the guard cannot find is still indistinguishable from no decorator, which is
     * why the keys now live in one place — `rbac.constants.ts` — rather than being
     * declared separately in each decorator and each guard.
     */
    it('cannot tell a mistyped key from an undecorated route', () => {
      const { context, reflector } = buildContext({
        user: { role: Roles.DRIVER, permissions: [] },
        metadata: {
          supervisor_permissions_v2: [SupervisorPermissionsEnum.MANAGE_PROMOTIONS],
        },
      });

      expect(new SupervisorPermissionsGuard(reflector).canActivate(context)).toBe(
        true,
      );
    });
  });

  /**
   * `@SupervisorPermissions()` with no arguments sets `[]`, which now means "the role,
   * and no particular permission" rather than "allow anyone". This is what closed the
   * 54 supervisor routes and 5 employee routes that were previously authenticated-only.
   */
  describe('the no-argument decorator', () => {
    it.each(GUARD_NAMES)('%s admits the role it names', (name) => {
      const { role } = LIST_GUARDS[name];

      expect(admits(name, { user: { role, permissions: [] }, required: [] })).toBe(
        true,
      );
    });

    it.each(GUARD_NAMES)('%s admits an admin', (name) => {
      expect(
        admits(name, { user: { role: Roles.ADMIN, permissions: [] }, required: [] }),
      ).toBe(true);
    });

    it('refuses an employee on a bare @SupervisorPermissions() route', () => {
      expect(
        admits('supervisor', {
          user: { role: Roles.EMPLOYEE, permissions: [] },
          required: [],
        }),
      ).toBe(false);
    });

    it.each([Roles.DRIVER, Roles.GUEST])(
      'refuses a %s on a bare @SupervisorPermissions() route',
      (role) => {
        expect(admits('supervisor', { user: { role, permissions: [] }, required: [] })).toBe(
          false,
        );
      },
    );

    it.each([Roles.DRIVER, Roles.GUEST])(
      'refuses a %s on a bare @EmployeePermissions() route',
      (role) => {
        expect(admits('employee', { user: { role, permissions: [] }, required: [] })).toBe(
          false,
        );
      },
    );

    /** The decorator is no longer equivalent to leaving the route undecorated. */
    it.each(GUARD_NAMES)('%s now differs from having no decorator', (name) => {
      const user = { role: Roles.DRIVER, permissions: [] };

      expect(admits(name, { user, required: [] })).toBe(false);
      expect(admits(name, { user })).toBe(true);
    });

    it('admits a supervisor carrying no permissions claim', () => {
      expect(
        admits('supervisor', { user: { role: Roles.SUPERVISOR }, required: [] }),
      ).toBe(true);
    });
  });

  describe('checking a real requirement', () => {
    it.each(GUARD_NAMES)('%s admits the right role holding the permission', (name) => {
      const { sample, role } = LIST_GUARDS[name];

      expect(
        admits(name, { user: { role, permissions: [sample] }, required: [sample] }),
      ).toBe(true);
    });

    it.each(GUARD_NAMES)('%s refuses the right role without it', (name) => {
      const { sample, role } = LIST_GUARDS[name];

      expect(
        admits(name, { user: { role, permissions: [] }, required: [sample] }),
      ).toBe(false);
    });

    it.each(GUARD_NAMES)('%s requires every listed permission, not any', (name) => {
      const { role } = LIST_GUARDS[name];

      expect(
        admits(name, {
          user: { role, permissions: [EmployeePermissionsEnum.HANDLE_TICKETS] },
          required: [
            EmployeePermissionsEnum.HANDLE_TICKETS,
            EmployeePermissionsEnum.CLOSE_TICKETS,
          ],
        }),
      ).toBe(false);
    });

    it.each(GUARD_NAMES)('%s refuses the right role with no permissions claim', (name) => {
      const { sample, role } = LIST_GUARDS[name];

      expect(admits(name, { user: { role }, required: [sample] })).toBe(false);
    });

    it.each(GUARD_NAMES)('%s refuses a request with no user', (name) => {
      const { sample } = LIST_GUARDS[name];

      expect(admits(name, { user: null, required: [sample] })).toBe(false);
    });
  });

  describe('role bypasses', () => {
    it('supervisor guard lets an admin through without the permission', () => {
      expect(
        admits('supervisor', {
          user: { role: Roles.ADMIN, permissions: [] },
          required: [SupervisorPermissionsEnum.MANAGE_PROMOTIONS],
        }),
      ).toBe(true);
    });

    /** Deliberate and unchanged: both outrank the employee grant table. */
    it.each([Roles.ADMIN, Roles.SUPERVISOR])(
      'employee guard lets a %s through',
      (role) => {
        expect(
          admits('employee', {
            user: { role, permissions: [] },
            required: [EmployeePermissionsEnum.HANDLE_TICKETS],
          }),
        ).toBe(true);
      },
    );

    /** The reverse does not hold — an employee never outranks a supervisor route. */
    it('supervisor guard does not let an employee through', () => {
      expect(
        admits('supervisor', {
          user: {
            role: Roles.EMPLOYEE,
            permissions: [SupervisorPermissionsEnum.MANAGE_PROMOTIONS],
          },
          required: [SupervisorPermissionsEnum.MANAGE_PROMOTIONS],
        }),
      ).toBe(false);
    });

    it.each([Roles.DRIVER, Roles.GUEST])(
      'both guards refuse a %s holding the permission string',
      (role) => {
        for (const name of GUARD_NAMES) {
          const { sample } = LIST_GUARDS[name];
          expect(
            admits(name, { user: { role, permissions: [sample] }, required: [sample] }),
          ).toBe(false);
        }
      },
    );
  });

  /**
   * `user.permissions` is still a flat list of strings with nothing recording which role
   * granted them, and the two enums still overlap. What changed is that the role is now
   * established before the list is consulted, so a shared value can no longer be spent
   * on the wrong table.
   */
  describe('cross-role permission collision', () => {
    it('the two enums still share values', () => {
      expect(SHARED_PERMISSIONS).toEqual([
        'VIEW_ANALYTICS',
        'MANAGE_ATTACHMENT_GROUPS',
      ]);
    });

    it.each([...SHARED_PERMISSIONS])(
      'an employee holding %s no longer satisfies the supervisor requirement',
      (permission) => {
        expect(
          admits('supervisor', {
            user: { role: Roles.EMPLOYEE, permissions: [permission] },
            required: [permission],
          }),
        ).toBe(false);
      },
    );

    /**
     * The case that was live: `DashboardController` requires
     * `SupervisorPermissionsEnum.VIEW_ANALYTICS` on four endpoints, and `VIEW_ANALYTICS`
     * is also an employee permission.
     */
    it('an employee with VIEW_ANALYTICS no longer passes the dashboard guard', () => {
      expect(
        admits('supervisor', {
          user: {
            role: Roles.EMPLOYEE,
            permissions: [EmployeePermissionsEnum.VIEW_ANALYTICS],
          },
          required: [SupervisorPermissionsEnum.VIEW_ANALYTICS],
        }),
      ).toBe(false);
    });

    it('a supervisor with VIEW_ANALYTICS still passes it', () => {
      expect(
        admits('supervisor', {
          user: {
            role: Roles.SUPERVISOR,
            permissions: [SupervisorPermissionsEnum.VIEW_ANALYTICS],
          },
          required: [SupervisorPermissionsEnum.VIEW_ANALYTICS],
        }),
      ).toBe(true);
    });
  });

  describe('SupervisorOrEmployeePermissionsGuard', () => {
    const guard = (options: {
      user?: RequestUser | null;
      config?: unknown;
    }): boolean => {
      const { context, reflector } = buildContext({
        user: options.user,
        metadata:
          options.config === undefined
            ? {}
            : { [SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY]: options.config },
      });

      try {
        return new SupervisorOrEmployeePermissionsGuard(reflector).canActivate(
          context,
        ) as boolean;
      } catch (error) {
        if (error instanceof ForbiddenException) return false;
        throw error;
      }
    };

    const BOTH = {
      supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
      employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    };

    it('admits when there is no metadata', () => {
      expect(guard({ user: { role: Roles.DRIVER, permissions: [] } })).toBe(true);
    });

    it('admits an admin regardless', () => {
      expect(guard({ user: { role: Roles.ADMIN, permissions: [] }, config: {} })).toBe(
        true,
      );
    });

    it('admits a supervisor holding the supervisor permission', () => {
      expect(
        guard({
          user: {
            role: Roles.SUPERVISOR,
            permissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
          },
          config: BOTH,
        }),
      ).toBe(true);
    });

    it('admits an employee holding the employee permission', () => {
      expect(
        guard({
          user: {
            role: Roles.EMPLOYEE,
            permissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
          },
          config: BOTH,
        }),
      ).toBe(true);
    });

    /** This guard always checked the role first, so the collision never applied to it. */
    it('refuses a driver holding the permission string', () => {
      expect(
        guard({
          user: {
            role: Roles.DRIVER,
            permissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
          },
          config: BOTH,
        }),
      ).toBe(false);
    });

    it('refuses a role the config does not mention', () => {
      expect(
        guard({
          user: {
            role: Roles.SUPERVISOR,
            permissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
          },
          config: {
            employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
          },
        }),
      ).toBe(false);
    });

    /**
     * An explicitly empty list for the caller's role now asks for the role alone,
     * matching the other two guards. It used to fall through to the refusal.
     */
    it('admits the role when its list is explicitly empty', () => {
      expect(
        guard({
          user: { role: Roles.SUPERVISOR, permissions: [] },
          config: { supervisorPermissions: [] },
        }),
      ).toBe(true);
    });

    /** A config naming neither role is still a closed door for everyone but an admin. */
    it('refuses everyone when the config names no role', () => {
      expect(
        guard({ user: { role: Roles.SUPERVISOR, permissions: [] }, config: {} }),
      ).toBe(false);
      expect(
        guard({ user: { role: Roles.EMPLOYEE, permissions: [] }, config: {} }),
      ).toBe(false);
    });

    it('refuses a user with no permissions claim', () => {
      expect(
        guard({
          user: { role: Roles.SUPERVISOR },
          config: {
            supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_TASKS],
          },
        }),
      ).toBe(false);
    });

    it('refuses a request with no user', () => {
      expect(guard({ user: null, config: BOTH })).toBe(false);
    });
  });
});
