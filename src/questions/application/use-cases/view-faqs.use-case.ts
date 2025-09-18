import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

interface ViewQuestionsInput {
  limit?: number;
  page?: number;
  departmentId?: string;
  guestId?: string;
}

@Injectable()
export class ViewFaqsUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute(
    options?: ViewQuestionsInput,
  ): Promise<{ faqs: any[]; attachments: { [faqId: string]: string[] } }> {
    const faqs = await this.questionRepo.viewFaqs(options);

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: faqs.map((faq) => faq.id),
    });

    return { faqs, attachments };
  }
}
