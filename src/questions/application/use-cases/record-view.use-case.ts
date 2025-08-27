import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

@Injectable()
export class RecordViewUseCase {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async execute({ guestId, faqId }: { guestId: string; faqId: string }) {
    const faq = await this.questionRepo.exists(faqId);

    if (!faq) {
      throw new Error('FAQ not found');
    }

    await this.questionRepo.recordView({ guestId, faqId });

    return null;
  }
}
