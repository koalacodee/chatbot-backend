import { Injectable } from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import { EmployeeRequest } from '../../domain/entities/employee-request.entity';
import { RequestStatus } from '../../domain/entities/employee-request.entity';

export interface GetEmployeeRequestsDto {
  statuses?: RequestStatus[];
  supervisorId?: string;
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetEmployeeRequestsUseCase {
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
  ) {}

  async execute(dto: GetEmployeeRequestsDto): Promise<EmployeeRequest[]> {
    const { statuses, supervisorId, offset = 0, limit = 10 } = dto;

    if (statuses) {
      return await this.employeeRequestRepository.findByStatuses(
        statuses,
        offset,
        limit,
      );
    }

    if (supervisorId) {
      return await this.employeeRequestRepository.findBySupervisorId(
        supervisorId,
        offset,
        limit,
      );
    }

    return await this.employeeRequestRepository.findAll(offset, limit);
  }
}
