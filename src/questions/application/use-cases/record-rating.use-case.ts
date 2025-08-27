import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';

interface RecordRatingInput {
  guestId: string;
  faqId: string;
  satisfactionType: 'satisfied' | 'dissatisfied';
}

@Injectable()
export class RecordRatingUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly guestRepo: GuestRepository,
  ) {}

  async execute({ guestId, faqId, satisfactionType }: RecordRatingInput) {
    const guest = await this.guestRepo.exists(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

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
