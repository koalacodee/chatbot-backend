import { Injectable, ForbiddenException } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

@Injectable()
export class GetQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    id: string,
    userId: string,
  ): Promise<{
    question: Question | null;
    attachments: { [questionId: string]: string[] };
  }> {
    const question = await this.questionRepo.findById(id, {
      includeDepartment: true,
    });
    if (!question) return { question: null, attachments: {} };

    // Check department access
    const user = await this.userRepository.findById(userId);
    const userRole = user.role.getRole();
    await this.checkDepartmentAccess(
      userId,
      question.departmentId.value,
      userRole,
      question,
    );

    // Get attachments for this question
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [question.id.toString()],
    });

    return { question, attachments };
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
        hasAccess = supervisorDepartmentIds.includes(
          question.department.parent.id.toString(),
        );
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
      throw new ForbiddenException('You do not have access to this department');
    }
  }
}
