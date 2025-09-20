import { Injectable } from '@nestjs/common';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface GroupByDepartmentInput {
  userId: string;
  role: Roles;
}

@Injectable()
export class GroupByDepartmentUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute({ userId, role }: GroupByDepartmentInput): Promise<{
    questions: any[];
    attachments: { [questionId: string]: string[] };
  }> {
    let departmentIds: string[] | undefined = undefined;
    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      departmentIds = supervisor.departments.map((d) => d.id.toString());
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      departmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString());
    }

    const groupedQuestions = await this.questionRepo.groupByDepartment({
      departmentIds,
    });

    // Extract all question IDs from the grouped data
    const allQuestionIds: string[] = [];
    groupedQuestions.forEach((group: any) => {
      if (group.questions && Array.isArray(group.questions)) {
        group.questions.forEach((question: any) => {
          if (question.id) {
            allQuestionIds.push(question.id.toString());
          }
        });
      }
    });

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: allQuestionIds,
    });

    return { questions: groupedQuestions, attachments };
  }
}
