import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { SupervisorPermissionsEnum as Enum } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorPermissionsGuard } from '../guards/supervisor-permissions.guard';
import { SUPERVISOR_PERMISSIONS_KEY } from '../rbac.constants';

export { SUPERVISOR_PERMISSIONS_KEY };

/**
 * Requires the caller to be a supervisor. Listing permissions narrows that further;
 * calling it bare — `@SupervisorPermissions()` — asks for the role alone.
 */
export const SupervisorPermissions = (...permissions: Enum[]) =>
  applyDecorators(
    SetMetadata(SUPERVISOR_PERMISSIONS_KEY, permissions),
    UseGuards(UserJwtAuthGuard, SupervisorPermissionsGuard),
  );
