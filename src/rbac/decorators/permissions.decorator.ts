import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { PermissionsGuard } from '../guards/permissions.guard';

function mergeEnums<
  A extends Record<string, string>,
  B extends Record<string, string>,
>(a: A, b: B) {
  return { ...a, ...b } as A & B;
}

export type PermissionsEnum =
  | typeof EmployeePermissionsEnum
  | typeof SupervisorPermissionsEnum;

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionsEnum[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(UserJwtAuthGuard, PermissionsGuard),
  );
