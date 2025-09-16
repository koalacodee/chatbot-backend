import { Injectable } from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import { EmployeeRequest } from '../../domain/entities/employee-request.entity';
import { RequestStatus } from '../../domain/entities/employee-request.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

export interface GetEmployeeRequestsDto {
  statuses?: RequestStatus[];
  'statuses[]'?: RequestStatus[];
  supervisorId?: string;
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetEmployeeRequestsUseCase {
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    dto: GetEmployeeRequestsDto,
    userId?: string,
  ): Promise<EmployeeRequest[]> {
    const {
      statuses,
      'statuses[]': statusesArray,
      supervisorId,
      offset = 0,
      limit = 10,
    } = dto;

    // Use either statuses or statuses[] (Axios format)
    const finalStatuses = statuses || statusesArray;

    // Apply access control for supervisors - they can only see their own requests
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorEntityId = supervisor.id.toString();

        // Override supervisorId to ensure supervisor only sees their own requests
        const filteredDto = { ...dto, supervisorId: supervisorEntityId };

        if (finalStatuses) {
          return await this.employeeRequestRepository.findByStatuses(
            finalStatuses,
            offset,
            limit,
            supervisorEntityId, // Filter by supervisor's own ID
          );
        }

        return await this.employeeRequestRepository.findBySupervisorId(
          supervisorEntityId,
          offset,
          limit,
        );
      }
      // Admins have full access (no restrictions)
    }

    // Original logic for admins or when no userId provided
    if (finalStatuses) {
      return await this.employeeRequestRepository.findByStatuses(
        finalStatuses,
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
