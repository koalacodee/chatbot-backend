import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { SUPERVISOR_PERMISSIONS_KEY } from '../rbac.constants';

@Injectable()
export class SupervisorPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      SupervisorPermissionsEnum[]
    >(SUPERVISOR_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // Absent metadata means the guard was wired up without the decorator that declares
    // its requirement — there is nothing to enforce. An *empty* list is different: it is
    // `@SupervisorPermissions()`, which asks for the role and no particular permission.
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

    if (user.role === Roles.ADMIN) {
      return true;
    }

    // The role check has to come first. `user.permissions` is a flat list of strings
    // shared by both grant tables, and the two enums overlap, so matching the string
    // alone would let an employee holding VIEW_ANALYTICS through a supervisor route.
    if (user.role !== Roles.SUPERVISOR) {
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
            message: 'Insufficient supervisor permissions',
          },
        ],
      });
    }

    return true;
  }
}
