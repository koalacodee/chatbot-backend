import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

@Injectable()
export class GetQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(id: string, userId: string): Promise<Question | null> {
    const question = await this.questionRepo.findById(id);
    if (!question) return null;
    await this.accessControl.canAccessDepartment(
      userId,
      question.departmentId.value,
    );
    return question;
  }
}
