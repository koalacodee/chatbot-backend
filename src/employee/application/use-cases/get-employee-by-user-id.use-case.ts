import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';

interface GetEmployeeByUserIdUseCaseInput {
  userId: string;
}

interface GetEmployeeByUserIdUseCaseOutput {
  employee: Employee | null;
}

@Injectable()
export class GetEmployeeByUserIdUseCase {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(input: GetEmployeeByUserIdUseCaseInput): Promise<GetEmployeeByUserIdUseCaseOutput> {
    const employee = await this.employeeRepository.findByUserId(input.userId);
    return { employee };
  }
}
