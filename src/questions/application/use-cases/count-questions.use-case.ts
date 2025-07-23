import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';

@Injectable()
export class CountQuestionsUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(): Promise<number> {
    return this.questionRepo.count();
  }
}
