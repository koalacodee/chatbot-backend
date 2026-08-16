import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY } from '../rbac.constants';

export interface SupervisorOrEmployeePermissionsConfig {
  supervisorPermissions?: SupervisorPermissionsEnum[];
  employeePermissions?: EmployeePermissionsEnum[];
}

@Injectable()
export class SupervisorOrEmployeePermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config =
      this.reflector.getAllAndOverride<SupervisorOrEmployeePermissionsConfig>(
        SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!config) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException({
        details: [{ field: 'role', message: 'No roles found for user' }],
      });
    }

    if (user.role === Roles.ADMIN) {
      return true;
    }

    // This guard always checked the role before the permission list, which is why the
    // overlap between the two enums was never exploitable through it. The other two now
    // do the same.
    const required =
      user.role === Roles.SUPERVISOR
        ? config.supervisorPermissions
        : user.role === Roles.EMPLOYEE
          ? config.employeePermissions
          : undefined;

    if (required === undefined) {
      throw new ForbiddenException({
        details: [
          {
            field: 'permissions',
            message:
              'Insufficient permissions. Requires supervisor or employee permissions.',
          },
        ],
      });
    }

    // An explicitly empty list for the caller's role asks for the role and nothing more,
    // matching `@SupervisorPermissions()`. It used to fall through to the refusal below.
    // A config that omits the caller's role entirely still refuses, above — that is a
    // route declared for the other role, not an unrestricted one.
    if (required.length === 0) {
      return true;
    }

    if (!user.permissions) {
      throw new ForbiddenException({
        details: [
          { field: 'permissions', message: 'No permissions found for user' },
        ],
      });
    }

    const hasAccess = required.every((p) => user.permissions.includes(p));

    if (!hasAccess) {
      throw new ForbiddenException({
        details: [
          {
            field: 'permissions',
            message:
              'Insufficient permissions. Requires supervisor or employee permissions.',
          },
        ],
      });
    }

    return true;
  }
}
