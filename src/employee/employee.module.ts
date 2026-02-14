import { Global, Module } from '@nestjs/common';
import { EmployeeRepository } from './domain/repositories/employee.repository';
import { EmployeeController } from './infrastructure/controllers/employee.controller';
import { EmployeeInvitationService } from './infrastructure/services/employee-invitation.service';
import { DepartmentModule } from 'src/department/department.module';
import { SupervisorModule } from 'src/supervisor/supervisor.module';
import { ProfileModule } from 'src/profile/profile.module';
import { AuthModule } from 'src/auth/auth.module';
import * as UseCases from './application/use-cases';
import { DrizzleEmployeeRepository } from './infrastructure/repositories/drizzle-employees.repository';
import { DrizzleModule } from '@/common/drizzle/drizzle.module';
@Global()
@Module({
  controllers: [EmployeeController],
  providers: [
    { provide: EmployeeRepository, useClass: DrizzleEmployeeRepository },
    EmployeeInvitationService,
    ...Object.values(UseCases),
  ],
  exports: [EmployeeRepository, EmployeeInvitationService],
  imports: [
    DepartmentModule,
    SupervisorModule,
    ProfileModule,
    AuthModule,
    DrizzleModule,
  ],
})
export class EmployeeModule {}
