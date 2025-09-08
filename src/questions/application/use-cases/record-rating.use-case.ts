import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

interface RecordRatingInput {
  guestId: string;
  faqId: string;
  satisfactionType: 'satisfied' | 'dissatisfied';
}

@Injectable()
export class RecordRatingUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
  ) {}

  async execute({ guestId, faqId, satisfactionType }: RecordRatingInput) {
    // Accept both authenticated user IDs and guest IDs without validation
    // The guestId can be either a real user ID or a generated guest ID from cookies
    
    const faq = await this.questionRepo.exists(faqId);

    if (!faq) {
      throw new Error('FAQ not found');
    }

    await this.questionRepo.recordRating({
      guestId,
      faqId,
      satisfactionType:
        satisfactionType === 'satisfied' ? 'SATISFACTION' : 'DISSATISFACTION',
    });

    return null;
  }
}
