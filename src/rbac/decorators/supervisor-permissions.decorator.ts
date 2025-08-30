import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { SupervisorPermissionsEnum as Enum } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorPermissionsGuard } from '../guards/supervisor-permissions.guard';

export const SUPERVISOR_PERMISSIONS_KEY = 'supervisor_permissions';

export const SupervisorPermissions = (...permissions: Enum[]) =>
  applyDecorators(
    SetMetadata(SUPERVISOR_PERMISSIONS_KEY, permissions),
    UseGuards(UserJwtAuthGuard, SupervisorPermissionsGuard),
  );
