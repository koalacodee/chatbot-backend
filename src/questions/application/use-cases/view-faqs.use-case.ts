import { Injectable, NotFoundException } from '@nestjs/common';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

interface ViewQuestionsInput {
  limit?: number;
  page?: number;
  departmentId?: string;
  guestId: string;
}

@Injectable()
export class ViewFaqsUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly guestRepo: GuestRepository,
  ) {}

  async execute(options?: ViewQuestionsInput) {
    const guestExists = await this.guestRepo.exists(options.guestId);

    if (!guestExists) {
      throw new NotFoundException({ guest: 'not_found' });
    }

    return this.questionRepo.viewFaqs(options);
  }
}
