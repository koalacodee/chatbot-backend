import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import { EmployeeRequest } from '../../domain/entities/employee-request.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetEmployeeRequestByIdUseCase {
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, userId?: string): Promise<EmployeeRequest> {
    const employeeRequest = await this.employeeRequestRepository.findById(id);

    if (!employeeRequest) {
      throw new NotFoundException({
        details: [{ field: 'id', message: 'Employee request not found' }],
      });
    }

    // Apply access control for supervisors - they can only see requests they created
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorEntityId = supervisor.id.toString();

        // Check if the supervisor created this request
        if (
          employeeRequest.requestedBySupervisor.id.toString() !==
          supervisorEntityId
        ) {
          throw new ForbiddenException(
            'You do not have access to this employee request',
          );
        }
      }
      // Admins have full access (no restrictions)
    }

    return employeeRequest;
  }
}
