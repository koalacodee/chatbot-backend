import { Injectable, ForbiddenException } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GetAllSubDepartmentsInput {
  departmentId?: string;
}

@Injectable()
export class GetAllSubDepartmentsUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute({ departmentId }: GetAllSubDepartmentsInput, userId?: string): Promise<any[]> {
    // Apply department access control for supervisors
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      
      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) => d.id.toString());
        
        // If departmentId is specified, validate supervisor has access to it
        if (departmentId && !supervisorDepartmentIds.includes(departmentId)) {
          throw new ForbiddenException('You do not have access to sub-departments of this department');
        }
        
        // If no departmentId specified, only return sub-departments from supervisor's departments
        if (!departmentId) {
          const filteredSubDepartments = await this.departmentRepo.findAllSubDepartmentsByParentIds(
            supervisorDepartmentIds,
            { includeQuestions: true, includeParent: true }
          );
          
          return filteredSubDepartments.map((dept) => dept.toJSON());
        }
      }
      // Admins have full access (no restrictions)
    }

    return this.departmentRepo
      .findAllSubDepartments(
        {
          includeQuestions: true,
        },
        departmentId,
      )
      .then((depts) => depts.map((dept) => dept.toJSON()));
  }
}
