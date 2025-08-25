import { Module } from '@nestjs/common';
import { EmployeeRequestRepository } from './domain/repositories/employee-request.repository';
import { PrismaEmployeeRequestRepository } from './infrastructure/repositories/prisma-employee-request.repository';
import { SubmitEmployeeRequestUseCase } from './application/use-cases/submit-employee-request.use-case';
import { ApproveEmployeeRequestUseCase } from './application/use-cases/approve-employee-request.use-case';
import { RejectEmployeeRequestUseCase } from './application/use-cases/reject-employee-request.use-case';
import { GetEmployeeRequestsUseCase } from './application/use-cases/get-employee-requests.use-case';
import { GetEmployeeRequestByIdUseCase } from './application/use-cases/get-employee-request-by-id.use-case';
import { EmployeeRequestController } from './interface/http/employee-request.controller';

@Module({
  controllers: [EmployeeRequestController],
  providers: [
    SubmitEmployeeRequestUseCase,
    ApproveEmployeeRequestUseCase,
    RejectEmployeeRequestUseCase,
    GetEmployeeRequestsUseCase,
    GetEmployeeRequestByIdUseCase,
    { provide: EmployeeRequestRepository, useClass: PrismaEmployeeRequestRepository },
  ],
  exports: [EmployeeRequestRepository],
})
export class EmployeeRequestModule {}
