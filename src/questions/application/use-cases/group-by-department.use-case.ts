import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

@Injectable()
export class GroupByDepartmentUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(): Promise<any[]> {
    return this.questionRepo.groupByDepartment();
  }
}
