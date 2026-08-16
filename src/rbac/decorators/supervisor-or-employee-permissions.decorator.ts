import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import {
  SupervisorOrEmployeePermissionsConfig,
  SupervisorOrEmployeePermissionsGuard,
} from '../guards/supervisor-or-employee-permissions.guard';
import { SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY } from '../rbac.constants';

export { SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY };
export type { SupervisorOrEmployeePermissionsConfig };

/**
 * Admits a supervisor holding `supervisorPermissions` or an employee holding
 * `employeePermissions`. A role omitted from the config is refused.
 */
export const SupervisorOrEmployeePermissions = (
  options: SupervisorOrEmployeePermissionsConfig,
) =>
  applyDecorators(
    SetMetadata(SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY, options),
    UseGuards(UserJwtAuthGuard, SupervisorOrEmployeePermissionsGuard),
  );
