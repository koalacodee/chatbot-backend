import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';

@Injectable()
export class GetAllQuestionsUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(departmentId?: string): Promise<Question[]> {
    const all = !departmentId
      ? await this.questionRepo.findAll()
      : await this.questionRepo.findByDepartmentId(departmentId);

    return all;
  }
}
