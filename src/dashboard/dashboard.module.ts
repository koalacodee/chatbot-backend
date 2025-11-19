import { Module } from '@nestjs/common';
import { DashboardController } from './interface/http/dashboard.controller';
import { DashboardRepository } from './domain/repositories/dashboard.repository';
import * as UseCases from './application/use-cases';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { EmployeeRequestModule } from 'src/employee-request/employee-request.module';
import { PrismaDashboardRepository } from './infrastructure/repositories/prisma-dashboard.repository';
import { SupervisorModule } from 'src/supervisor/supervisor.module';
import { EmployeeModule } from 'src/employee/employee.module';
import { SharedModule } from 'src/shared/shared.module';
import { DepartmentModule } from 'src/department/department.module';
import { DrizzleDashboardRepository } from './infrastructure/repositories/drizzle-dashboard.repository';

@Module({
  controllers: [DashboardController],
  providers: [
    { provide: DashboardRepository, useClass: DrizzleDashboardRepository },
    ...Object.values(UseCases),
  ],
  exports: [DashboardRepository],
  imports: [
    PrismaModule,
    ActivityLogModule,
    EmployeeRequestModule,
    SupervisorModule,
    EmployeeModule,
    SharedModule,
    DepartmentModule,
  ],
})
export class DashboardModule { }
