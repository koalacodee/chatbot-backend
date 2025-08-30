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
      throw new ForbiddenException('No roles found for user');
    }
    const hasAccess = user.role.getRole() === Roles.ADMIN;
    if (!hasAccess) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
