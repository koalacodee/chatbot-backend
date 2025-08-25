import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import { EmployeeRequest } from '../../domain/entities/employee-request.entity';

@Injectable()
export class GetEmployeeRequestByIdUseCase {
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
  ) {}

  async execute(id: string): Promise<EmployeeRequest> {
    const employeeRequest = await this.employeeRequestRepository.findById(id);
    
    if (!employeeRequest) {
      throw new NotFoundException('Employee request not found');
    }

    return employeeRequest;
  }
}
