import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { EmployeePermissionsEnum as Enum } from 'src/employee/domain/entities/employee.entity';
import { EmployeePermissionsGuard } from '../guards/employee-permissions.guard';

export const EMPLOYEE_PERMISSIONS_KEY = 'employee_permissions';

export const EmployeePermissions = (...permissions: Enum[]) =>
  applyDecorators(
    SetMetadata(EMPLOYEE_PERMISSIONS_KEY, permissions),
    UseGuards(UserJwtAuthGuard, EmployeePermissionsGuard),
  );
