import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

export const EMPLOYEE_PERMISSIONS_KEY = 'employee_permissions';

@Injectable()
export class EmployeePermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      EmployeePermissionsEnum[]
    >(EMPLOYEE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // No decorator → allow
    if (!requiredPermissions?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Skip validation if user is supervisor or admin
    if (user.role === 'SUPERVISOR' || user.role === 'ADMIN') {
      return true;
    }

    if (!user?.permissions) {
      throw new ForbiddenException('No permissions found for user');
    }

    const hasAccess = requiredPermissions.every((p) =>
      user.permissions.includes(p),
    );

    if (!hasAccess) {
      throw new ForbiddenException('Insufficient employee permissions');
    }

    return true;
  }
}
