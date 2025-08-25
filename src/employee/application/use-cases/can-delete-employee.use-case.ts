import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';

interface CanDeleteEmployeeInputDto {
  employeeId: string;
}

@Injectable()
export class CanDeleteEmployeeUseCase {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute({ employeeId }: CanDeleteEmployeeInputDto) {
    const existing = await this.employeeRepository.exists(employeeId);

    if (!existing) {
      throw new NotFoundException({ employeeId: 'not_found' });
    }

    return this.employeeRepository.canDeleteEmployee(employeeId);
  }
}
