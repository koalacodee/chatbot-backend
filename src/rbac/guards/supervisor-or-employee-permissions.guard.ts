import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

export const SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY =
  'supervisor_or_employee_permissions';

interface SupervisorOrEmployeePermissions {
  supervisorPermissions?: SupervisorPermissionsEnum[];
  employeePermissions?: EmployeePermissionsEnum[];
}

@Injectable()
export class SupervisorOrEmployeePermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const permissionsConfig = this.reflector.getAllAndOverride<
      SupervisorOrEmployeePermissions
    >(SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No decorator → allow
    if (!permissionsConfig) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Admin always has access
    if (user.role === Roles.ADMIN || user.role === 'ADMIN') {
      return true;
    }

    if (!user?.permissions) {
      throw new ForbiddenException({
        details: [
          { field: 'permissions', message: 'No permissions found for user' },
        ],
      });
    }

    const userRole = user.role;

    // Check if user is supervisor with required supervisor permissions
    if (userRole === Roles.SUPERVISOR || userRole === 'SUPERVISOR') {
      const requiredSupervisorPermissions =
        permissionsConfig.supervisorPermissions;
      if (requiredSupervisorPermissions?.length) {
        const hasAccess = requiredSupervisorPermissions.every((p) =>
          user.permissions.includes(p),
        );
        if (hasAccess) {
          return true;
        }
      }
    }

    // Check if user is employee with required employee permissions
    if (userRole === Roles.EMPLOYEE || userRole === 'EMPLOYEE') {
      const requiredEmployeePermissions = permissionsConfig.employeePermissions;
      if (requiredEmployeePermissions?.length) {
        const hasAccess = requiredEmployeePermissions.every((p) =>
          user.permissions.includes(p),
        );
        if (hasAccess) {
          return true;
        }
      }
    }

    // User doesn't have required permissions
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
}

