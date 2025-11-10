import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './domain/services/access-control.service';
import { DepartmentModule } from 'src/department/department.module';
import { AdminGuard } from './guards/admin.guard';
import { EmployeePermissionsGuard } from './guards/employee-permissions.guard';
import { SupervisorPermissionsGuard } from './guards/supervisor-permissions.guard';
import { SupervisorOrEmployeePermissionsGuard } from './guards/supervisor-or-employee-permissions.guard';

@Global()
@Module({
  providers: [
    AccessControlService,
    AdminGuard,
    EmployeePermissionsGuard,
    SupervisorPermissionsGuard,
    SupervisorOrEmployeePermissionsGuard,
  ],
  exports: [
    AccessControlService,
    AdminGuard,
    EmployeePermissionsGuard,
    SupervisorPermissionsGuard,
    SupervisorOrEmployeePermissionsGuard,
  ],
  imports: [DepartmentModule],
})
export class RbacModule {}
