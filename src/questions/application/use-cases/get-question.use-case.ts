import { Injectable, ForbiddenException } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly accessControl: AccessControlService,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, userId: string): Promise<Question | null> {
    const question = await this.questionRepo.findById(id, { includeDepartment: true });
    if (!question) return null;
    
    // Check department access
    const user = await this.userRepository.findById(userId);
    const userRole = user.role.getRole();
    await this.checkDepartmentAccess(userId, question.departmentId.value, userRole, question);
    
    return question;
  }

  private async checkDepartmentAccess(
    userId: string,
    departmentId: string,
    role: Roles,
    question?: Question,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true; // Admins have access to all departments
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );
      
      // Check if supervisor has direct access to the department
      hasAccess = supervisorDepartmentIds.includes(departmentId);
      
      // If not direct access, check if it's a sub-department and supervisor has access to parent
      if (!hasAccess && question?.department?.parent) {
        hasAccess = supervisorDepartmentIds.includes(question.department.parent.id.toString());
      }
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const employeeDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];
      hasAccess = employeeDepartmentIds.includes(departmentId);
    }

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this department',
      );
    }
  }
}
