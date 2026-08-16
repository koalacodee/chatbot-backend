import 'reflect-metadata';
import { AccessControlService } from './domain/services/access-control.service';
import { AdminGuard } from './guards/admin.guard';
import { EmployeePermissionsGuard } from './guards/employee-permissions.guard';
import { SupervisorOrEmployeePermissionsGuard } from './guards/supervisor-or-employee-permissions.guard';
import { SupervisorPermissionsGuard } from './guards/supervisor-permissions.guard';
import { RbacModule } from './rbac.module';
import {
  EMPLOYEE_PERMISSIONS_KEY,
  SHARED_PERMISSIONS,
  SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY,
  SUPERVISOR_PERMISSIONS_KEY,
} from './rbac.constants';

/**
 * The metadata key is the entire contract between a decorator and its guard: the
 * decorator writes under a string and the guard reads under one, and a guard that finds
 * nothing under its key admits the request.
 *
 * Each key used to be declared twice — once in the decorator file, once in the guard —
 * with no import between them, so a one-character divergence would have silently
 * unguarded every route using that decorator with nothing failing to say so. They now
 * come from `rbac.constants.ts`, which imports neither guards nor decorators so both
 * sides can depend on it without a cycle.
 */
describe('rbac metadata keys', () => {
  it('are declared once and re-exported, not duplicated', () => {
    const constants = require('./rbac.constants');

    for (const [decoratorPath, key, value] of [
      ['./decorators/supervisor-permissions.decorator', 'SUPERVISOR_PERMISSIONS_KEY', SUPERVISOR_PERMISSIONS_KEY],
      ['./decorators/employee-permissions.decorator', 'EMPLOYEE_PERMISSIONS_KEY', EMPLOYEE_PERMISSIONS_KEY],
      ['./decorators/supervisor-or-employee-permissions.decorator', 'SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY', SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY],
    ] as const) {
      expect(require(decoratorPath)[key]).toBe(constants[key]);
      expect(constants[key]).toBe(value);
    }
  });

  it('keeps the keys distinct from one another', () => {
    const keys = [
      SUPERVISOR_PERMISSIONS_KEY,
      EMPLOYEE_PERMISSIONS_KEY,
      SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY,
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });

  /** No guard declares a key of its own any more. */
  it('are not re-declared inside the guards', () => {
    for (const path of [
      './guards/supervisor-permissions.guard',
      './guards/employee-permissions.guard',
      './guards/supervisor-or-employee-permissions.guard',
    ]) {
      const module = require(path);
      expect(module.SUPERVISOR_PERMISSIONS_KEY).toBeUndefined();
      expect(module.EMPLOYEE_PERMISSIONS_KEY).toBeUndefined();
      expect(module.SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY).toBeUndefined();
    }
  });
});

/**
 * The overlap between the two permission enums is a live property of the system, not
 * something the guards fixed — they route around it by establishing the caller's role
 * before consulting the flat permissions list. This pins the overlap so that widening it
 * is a deliberate act rather than a silent one.
 */
describe('the shared permission values', () => {
  it('are exactly the two known collisions', () => {
    expect(SHARED_PERMISSIONS).toEqual([
      'VIEW_ANALYTICS',
      'MANAGE_ATTACHMENT_GROUPS',
    ]);
  });
});

describe('the decorators barrel', () => {
  it('exports every decorator the codebase uses', () => {
    const barrel = require('./decorators');

    expect(barrel.AdminAuth).toBeDefined();
    expect(barrel.SupervisorPermissions).toBeDefined();
    expect(barrel.EmployeePermissions).toBeDefined();
    expect(barrel.SupervisorOrEmployeePermissions).toBeDefined();
  });

  /**
   * `Permissions` and its `PermissionsGuard` are gone. The decorator's parameter type
   * resolved to the enum *objects* rather than their members, so no call site could ever
   * type-check; it was absent from `RbacModule`, absent from this barrel, and was the
   * only guard with no admin bypass. Its two importers referenced it without using it.
   */
  it('no longer exports the unusable Permissions decorator', () => {
    expect(require('./decorators').Permissions).toBeUndefined();
    expect(() => require('./decorators/permissions.decorator')).toThrow();
    expect(() => require('./guards/permissions.guard')).toThrow();
  });
});

describe('RbacModule registration', () => {
  const metadata = (key: string): unknown[] =>
    (Reflect.getMetadata(key, RbacModule) as unknown[]) ?? [];

  it('provides and exports every guard', () => {
    for (const guard of [
      AdminGuard,
      SupervisorPermissionsGuard,
      EmployeePermissionsGuard,
      SupervisorOrEmployeePermissionsGuard,
    ]) {
      expect(metadata('providers')).toContain(guard);
      expect(metadata('exports')).toContain(guard);
    }
  });

  it('exports AccessControlService', () => {
    expect(metadata('providers')).toContain(AccessControlService);
    expect(metadata('exports')).toContain(AccessControlService);
  });
});
