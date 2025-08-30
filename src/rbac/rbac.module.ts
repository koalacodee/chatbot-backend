import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './domain/services/access-control.service';
import { DepartmentModule } from 'src/department/department.module';

@Global()
@Module({
  providers: [AccessControlService],
  exports: [AccessControlService],
  imports: [DepartmentModule],
})
export class RbacModule {}
