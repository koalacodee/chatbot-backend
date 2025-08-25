import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';

interface GetAllEmployeesUseCaseOutput {
  employees: Employee[];
}

@Injectable()
export class GetAllEmployeesUseCase {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(): Promise<GetAllEmployeesUseCaseOutput> {
    const employees = await this.employeeRepository.findAll();
    return { employees };
  }
}
