import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

interface ViewQuestionsInput {
  limit?: number;
  page?: number;
  departmentId?: string;
  guestId?: string;
}

@Injectable()
export class ViewFaqsUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute(options?: ViewQuestionsInput) {
    return this.questionRepo.viewFaqs(options);
  }
}
