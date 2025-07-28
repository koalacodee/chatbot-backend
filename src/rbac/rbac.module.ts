import { Global, Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { AccessControlService } from './domain/services/access-control.service';
import { DepartmentModule } from 'src/department/department.module';

@Global()
@Module({
  providers: [RolesGuard, AccessControlService],
  exports: [RolesGuard, AccessControlService],
  imports: [DepartmentModule],
})
export class RbacModule {}
