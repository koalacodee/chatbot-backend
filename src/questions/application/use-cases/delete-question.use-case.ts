import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';

@Injectable()
export class DeleteQuestionUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(id: string): Promise<Question | null> {
    return this.questionRepo.removeById(id);
  }
}
