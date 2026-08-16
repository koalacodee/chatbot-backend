import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EMPLOYEE_PERMISSIONS_KEY } from '../rbac.constants';

@Injectable()
export class EmployeePermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      EmployeePermissionsEnum[]
    >(EMPLOYEE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // See SupervisorPermissionsGuard: absent means no decorator, empty means role-only.
    // `[]` is truthy, so it survives this and reaches the role check below.
    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException({
        details: [{ field: 'role', message: 'No roles found for user' }],
      });
    }

    // Supervisors and admins outrank the employee grant table, so they pass without
    // holding an employee permission. This is long-standing behaviour, kept deliberately.
    if (user.role === Roles.ADMIN || user.role === Roles.SUPERVISOR) {
      return true;
    }

    if (user.role !== Roles.EMPLOYEE) {
      throw new ForbiddenException({
        details: [{ field: 'role', message: 'Insufficient role' }],
      });
    }

    if (requiredPermissions.length === 0) {
      return true;
    }

    if (!user.permissions) {
      throw new ForbiddenException({
        details: [
          { field: 'permissions', message: 'No permissions found for user' },
        ],
      });
    }

    const hasAccess = requiredPermissions.every((p) =>
      user.permissions.includes(p),
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        details: [
          {
            field: 'permissions',
            message: 'Insufficient employee permissions',
          },
        ],
      });
    }

    return true;
  }
}
