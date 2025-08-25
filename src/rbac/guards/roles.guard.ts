import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Roles } from '../../shared/value-objects/role.vo';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }   
    const { user } = context.switchToHttp().getRequest();
    console.log(user);

    if (!user || !user.role) {
      throw new ForbiddenException('No roles found for user');
    }
    const hasAccess = requiredRoles.includes(user.role.getRole());
    if (!hasAccess) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
