import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';

interface UpdateQuestionDto {
  text?: string;
  departmentId?: string;
  knowledgeChunkId?: string;
}

@Injectable()
export class UpdateQuestionUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const update: any = { ...dto };
    if (dto.departmentId) update.departmentId = { value: dto.departmentId };
    if (dto.knowledgeChunkId)
      update.knowledgeChunkId = { value: dto.knowledgeChunkId };
    return this.questionRepo.update(id, update);
  }
}
