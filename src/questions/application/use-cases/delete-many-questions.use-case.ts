import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

@Injectable()
export class DeleteManyQuestionsUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(ids: string[], userId: string): Promise<Question[]> {
    const found = await this.questionRepo.findByIds(ids);
    // Check access for each question
    await Promise.all(
      found.map((question) =>
        this.accessControl.canAccessDepartment(
          userId,
          question.departmentId.value,
        ),
      ),
    );
    await Promise.all(ids.map((id) => this.questionRepo.removeById(id)));
    return found;
  }
}
