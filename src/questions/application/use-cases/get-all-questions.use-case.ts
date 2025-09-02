import { Injectable, ForbiddenException } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetAllQuestionsUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(departmentId?: string, userId?: string): Promise<Question[]> {
    // Apply department access control for supervisors and employees
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      
      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) => d.id.toString());
        
        // If departmentId is specified, validate supervisor has access to it
        if (departmentId && !supervisorDepartmentIds.includes(departmentId)) {
          throw new ForbiddenException('You do not have access to this department');
        }
        
        // If no departmentId specified, return questions from all supervisor's departments
        if (!departmentId) {
          return await this.questionRepo.findByDepartmentIds(supervisorDepartmentIds, {
            includeDepartment: true,
          });
        }
      } else if (userRole === Roles.EMPLOYEE) {
        const employee = await this.employeeRepository.findByUserId(userId);
        const employeeDepartmentIds = employee?.subDepartments.map((dep) => dep.id.toString()) ?? [];
        
        // If departmentId is specified, validate employee has access to it
        if (departmentId && !employeeDepartmentIds.includes(departmentId)) {
          throw new ForbiddenException('You do not have access to this department');
        }
        
        // If no departmentId specified, return questions from all employee's departments
        if (!departmentId) {
          return await this.questionRepo.findByDepartmentIds(employeeDepartmentIds, {
            includeDepartment: true,
          });
        }
      }
      // Admins have full access (no restrictions)
    }

    // Original logic for admins or when no userId provided
    const all = !departmentId
      ? await this.questionRepo.findAll({ includeDepartment: true })
      : await this.questionRepo.findByDepartmentId(departmentId, {
          includeDepartment: true,
        });

    return all;
  }
}
