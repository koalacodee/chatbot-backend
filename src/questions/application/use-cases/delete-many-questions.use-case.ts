import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';

@Injectable()
export class DeleteManyQuestionsUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(ids: string[]): Promise<Question[]> {
    return this.questionRepo.findByIds(ids).then(async (found) => {
      await Promise.all(ids.map((id) => this.questionRepo.removeById(id)));
      return found;
    });
  }
}
