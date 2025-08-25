import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

@Injectable()
export class GroupQuestionsUseCase {
  constructor(private readonly repo: QuestionRepository) {}

  async execute() {
    return this.repo.groupQuestionsByDepartment();
  }
}
