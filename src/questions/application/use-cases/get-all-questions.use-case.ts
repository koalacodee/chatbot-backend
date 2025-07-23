import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';

@Injectable()
export class GetAllQuestionsUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(): Promise<Question[]> {
    return this.questionRepo.findAll();
  }
}
