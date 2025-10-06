import { Injectable, ForbiddenException } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetDepartmentUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, userId?: string): Promise<Department | null> {
    const department = await this.departmentRepo.findById(id, {
      includeKnowledgeChunks: true,
      includeQuestions: true,
      includeSubDepartments: true,
    });

    if (!department) {
      return null;
    }

    // Apply department access control for supervisors
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Check if supervisor has access to this department
        if (!supervisorDepartmentIds.includes(department.id.toString())) {
          throw new ForbiddenException({
            details: [
              {
                field: 'departmentId',
                message: 'You do not have access to this department',
              },
            ],
          });
        }
      }
      // Admins have full access (no restrictions)
    }

    return department;
  }
}
