import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetAllDepartmentsUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId?: string): Promise<any[]> {
    let departments = await this.departmentRepo.findAllDepartments({});

    // Apply department filtering for supervisors
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Filter departments to only those assigned to the supervisor
        departments = departments.filter((dept) =>
          supervisorDepartmentIds.includes(dept.id.toString()),
        );
      }
      // Admins see all departments (no filtering)
    }

    return departments.map((dept) => dept.toJSON());
  }
}
