import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';

interface DeleteEmployeeUseCaseInput {
  id: string;
}

interface DeleteEmployeeUseCaseOutput {
  employee: Employee | null;
}

@Injectable()
export class DeleteEmployeeUseCase {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(input: DeleteEmployeeUseCaseInput): Promise<DeleteEmployeeUseCaseOutput> {
    const employee = await this.employeeRepository.removeById(input.id);
    return { employee };
  }
}
