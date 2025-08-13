import { Module } from '@nestjs/common';
import { EmployeeRequestRepository } from './domain/repositories/employee-request.repository';
import { PrismaEmployeeRequestRepository } from './infrastructure/repositories/prisma-employee-request.repository';

@Module({
  providers: [
    { provide: EmployeeRequestRepository, useClass: PrismaEmployeeRequestRepository },
  ],
  exports: [EmployeeRequestRepository],
})
export class EmployeeRequestModule {}
