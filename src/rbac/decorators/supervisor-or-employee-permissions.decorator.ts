import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { SupervisorOrEmployeePermissionsGuard } from '../guards/supervisor-or-employee-permissions.guard';

export const SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY =
  'supervisor_or_employee_permissions';

interface SupervisorOrEmployeePermissionsOptions {
  supervisorPermissions?: SupervisorPermissionsEnum[];
  employeePermissions?: EmployeePermissionsEnum[];
}

export const SupervisorOrEmployeePermissions = (
  options: SupervisorOrEmployeePermissionsOptions,
) =>
  applyDecorators(
    SetMetadata(SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY, options),
    UseGuards(UserJwtAuthGuard, SupervisorOrEmployeePermissionsGuard),
  );

