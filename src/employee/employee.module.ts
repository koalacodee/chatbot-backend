import { Global, Module } from '@nestjs/common';
import { EmployeeRepository } from './domain/repositories/employee.repository';
import { PrismaEmployeeRepository } from './infrastructure/repositories/prisma-employee.repository';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { GetEmployeeUseCase } from './application/use-cases/get-employee.use-case';
import { GetAllEmployeesUseCase } from './application/use-cases/get-all-employees.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { DeleteEmployeeUseCase } from './application/use-cases/delete-employee.use-case';
import { GetEmployeeByUserIdUseCase } from './application/use-cases/get-employee-by-user-id.use-case';
import { EmployeeController } from './infrastructure/controllers/employee.controller';
import { DepartmentModule } from 'src/department/department.module';
import { GetEmployeesBySubDepartmentUseCase } from './application/use-cases/get-employees-by-sub-department.use-case';
import { CanDeleteEmployeeUseCase } from './application/use-cases/can-delete-employee.use-case';

@Global()
@Module({
  controllers: [EmployeeController],
  providers: [
    { provide: EmployeeRepository, useClass: PrismaEmployeeRepository },
    CreateEmployeeUseCase,
    GetEmployeeUseCase,
    GetAllEmployeesUseCase,
    UpdateEmployeeUseCase,
    DeleteEmployeeUseCase,
    GetEmployeeByUserIdUseCase,
    GetEmployeesBySubDepartmentUseCase,
    CanDeleteEmployeeUseCase,
  ],
  exports: [EmployeeRepository],
  imports: [DepartmentModule],
})
export class EmployeeModule {}
