import { Global, Module } from '@nestjs/common';
import { EmployeeRepository } from './domain/repositories/employee.repository';
import { PrismaEmployeeRepository } from './infrastructure/repositories/prisma-employee.repository';
import { EmployeeController } from './infrastructure/controllers/employee.controller';
import { DepartmentModule } from 'src/department/department.module';
import * as UseCases from './application/use-cases';
@Global()
@Module({
  controllers: [EmployeeController],
  providers: [
    { provide: EmployeeRepository, useClass: PrismaEmployeeRepository },
    ...Object.values(UseCases),
  ],
  exports: [EmployeeRepository],
  imports: [DepartmentModule],
})
export class EmployeeModule {}
