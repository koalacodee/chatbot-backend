import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

@Injectable()
export class GetAllQuestionsUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(userId: string): Promise<Question[]> {
    const all = await this.questionRepo.findAll();
    // Filter by department access
    return (
      await Promise.all(
        all.map(async (question) => {
          try {
            await this.accessControl.canAccessDepartment(
              userId,
              question.departmentId.value,
            );
            return question;
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean) as Question[];
  }
}
