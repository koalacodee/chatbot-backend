import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';

interface GetEmployeesBySubDepartmentUseCaseOutput {
  employees: Employee[];
}

interface GetEmployeesBySubDepartmentInput {
  subDepartmentId: string
}

@Injectable()
export class GetEmployeesBySubDepartmentUseCase {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(dto: GetEmployeesBySubDepartmentInput): Promise<GetEmployeesBySubDepartmentUseCaseOutput> {
    const employees = await this.employeeRepository.findBySubDepartment(dto.subDepartmentId);
    return { employees };
  }
}