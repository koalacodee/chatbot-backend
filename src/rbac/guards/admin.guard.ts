import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Roles } from '../../shared/value-objects/role.vo';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException({
        details: [{ field: 'role', message: 'No roles found for user' }],
      });
    }
    const hasAccess = user.role === Roles.ADMIN;
    if (!hasAccess) {
      throw new ForbiddenException({
        details: [{ field: 'role', message: 'Insufficient role' }],
      });
    }
    return true;
  }
}
