import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';

export const SUPERVISOR_PERMISSIONS_KEY = 'supervisor_permissions';

@Injectable()
export class SupervisorPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      SupervisorPermissionsEnum[]
    >(SUPERVISOR_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // No decorator → allow
    if (!requiredPermissions?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (user.role === Roles.ADMIN) {
      return true;
    }

    if (!user?.permissions) {
      throw new ForbiddenException('No permissions found for user');
    }

    // For supervisor guard, we don't skip validation for any role
    const hasAccess = requiredPermissions.every((p) =>
      user.permissions.includes(p),
    );

    if (!hasAccess) {
      throw new ForbiddenException('Insufficient supervisor permissions');
    }

    return true;
  }
}
