import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './domain/services/access-control.service';
import { DepartmentModule } from 'src/department/department.module';
import { AdminGuard } from './guards/admin.guard';
import { EmployeePermissionsGuard } from './guards/employee-permissions.guard';
import { SupervisorPermissionsGuard } from './guards/supervisor-permissions.guard';

@Global()
@Module({
  providers: [
    AccessControlService,
    AdminGuard,
    EmployeePermissionsGuard,
    SupervisorPermissionsGuard,
  ],
  exports: [
    AccessControlService,
    AdminGuard,
    EmployeePermissionsGuard,
    SupervisorPermissionsGuard,
  ],
  imports: [DepartmentModule],
})
export class RbacModule {}
