import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { EmployeePermissionsEnum as Enum } from 'src/employee/domain/entities/employee.entity';
import { EmployeePermissionsGuard } from '../guards/employee-permissions.guard';
import { EMPLOYEE_PERMISSIONS_KEY } from '../rbac.constants';

export { EMPLOYEE_PERMISSIONS_KEY };

/**
 * Requires the caller to be an employee, a supervisor or an admin. Listing permissions
 * narrows that for employees; supervisors and admins outrank the employee grant table.
 */
export const EmployeePermissions = (...permissions: Enum[]) =>
  applyDecorators(
    SetMetadata(EMPLOYEE_PERMISSIONS_KEY, permissions),
    UseGuards(UserJwtAuthGuard, EmployeePermissionsGuard),
  );
