import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';

interface CreateQuestionDto {
  text: string;
  departmentId: string;
  knowledgeChunkId?: string;
}

@Injectable()
export class CreateQuestionUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(dto: CreateQuestionDto): Promise<Question> {
    const question = Question.create({
      text: dto.text,
      departmentId: dto.departmentId,
      knowledgeChunkId: dto.knowledgeChunkId,
    });
    return this.questionRepo.save(question);
  }
}
