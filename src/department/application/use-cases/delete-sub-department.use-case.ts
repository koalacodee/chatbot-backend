import { Injectable, ForbiddenException } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class DeleteSubDepartmentUseCase {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, userId?: string): Promise<void> {
    // Apply department access control for supervisors
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        // Get the sub-department to check its parent
        const subDepartment =
          await this.departmentRepository.findSubDepartmentById(id, {
            includeParent: true,
          });
        if (!subDepartment || !subDepartment.parent) {
          throw new Error('Sub-department not found or has no parent');
        }

        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Check if supervisor has access to the parent department
        if (
          !supervisorDepartmentIds.includes(subDepartment.parent.id.toString())
        ) {
          throw new ForbiddenException({
            details: [
              {
                field: 'subDepartmentId',
                message: 'You do not have access to delete this sub-department',
              },
            ],
          });
        }
      }
      // Admins have full access (no restrictions)
    }

    return this.departmentRepository.removeSubDepartmentById(id);
  }
}
