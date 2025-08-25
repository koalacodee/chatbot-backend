import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';

interface GetEmployeeUseCaseInput {
  id: string;
}

interface GetEmployeeUseCaseOutput {
  employee: Employee | null;
}

@Injectable()
export class GetEmployeeUseCase {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(input: GetEmployeeUseCaseInput): Promise<GetEmployeeUseCaseOutput> {
    const employee = await this.employeeRepository.findById(input.id);
    return { employee };
  }
}
