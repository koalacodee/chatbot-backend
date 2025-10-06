import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface CanDeleteEmployeeInputDto {
  employeeId: string;
}

@Injectable()
export class CanDeleteEmployeeUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute({ employeeId }: CanDeleteEmployeeInputDto, userId?: string) {
    const existing = await this.employeeRepository.exists(employeeId);

    if (!existing) {
      throw new NotFoundException({ employeeId: 'not_found' });
    }

    // Apply supervisor-based access control
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const employee = await this.employeeRepository.findById(employeeId);
        const supervisor = await this.supervisorRepository.findByUserId(userId);

        // Check if employee is directly supervised by this supervisor
        if (employee.supervisorId.toString() !== supervisor.id.toString()) {
          throw new ForbiddenException({
            details: [
              {
                field: 'employeeId',
                message: 'You do not have access to this employee',
              },
            ],
          });
        }
      }
      // Admins have full access (no restrictions)
    }

    return this.employeeRepository.canDeleteEmployee(employeeId);
  }
}
