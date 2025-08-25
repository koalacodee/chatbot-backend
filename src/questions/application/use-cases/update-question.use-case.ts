import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

interface UpdateQuestionDto {
  text?: string;
  departmentId?: string;
  knowledgeChunkId?: string;
  userId: string;
  answer?: string;
}

@Injectable()
export class UpdateQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(id: string, dto: UpdateQuestionDto): Promise<Question> {
    // Fetch the question to get departmentId
    const question = await this.questionRepo.findById(id);
    const departmentId = dto.departmentId || question.departmentId.value;
    const update: any = { ...dto };
    if (dto.departmentId) update.departmentId = { value: dto.departmentId };
    if (dto.knowledgeChunkId)
      update.knowledgeChunkId = { value: dto.knowledgeChunkId };
    if (dto.answer) update.answer = dto.answer;
    return this.questionRepo.update(id, update);
  }
}
