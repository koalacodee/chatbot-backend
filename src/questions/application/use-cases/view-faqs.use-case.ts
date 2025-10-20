import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';
import { SupportedLanguage } from 'src/translation/domain/services/translation.service';
import { GetTranslationsByTargetIdsUseCase } from 'src/translation/application/use-cases/get-translations-by-target-ids.use-case';

interface ViewQuestionsInput {
  limit?: number;
  page?: number;
  departmentId?: string;
  guestId?: string;
}

type FAqTranslation = {
  lang: SupportedLanguage;
  content: string;
  type: 'question' | 'answer';
};

@Injectable()
export class ViewFaqsUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
    private readonly getTranslationsUseCase: GetTranslationsByTargetIdsUseCase,
  ) {}

  async execute(
    options?: ViewQuestionsInput,
  ): Promise<{
    faqs: any[];
    attachments: { [faqId: string]: string[] };
    translations: Record<string, FAqTranslation[]>;
  }> {
    const faqs = await this.questionRepo.viewFaqs(options);

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: faqs.map((faq) => faq.id),
    });
    const translations = await this.getTranslationsUseCase.execute(
      faqs.map((faq) => faq.id),
    );

    const mappedTranslations: Record<string, FAqTranslation[]> = {};
    translations.forEach((translation) => {
      if (!mappedTranslations[translation.targetId.toString()]) {
        mappedTranslations[translation.targetId.toString()] = [];
      }
      mappedTranslations[translation.targetId.toString()].push({
        lang: translation.lang,
        content: translation.content,
        type: translation.subTarget === 'question' ? 'question' : 'answer',
      });
    });

    return { faqs, attachments, translations: mappedTranslations };
  }
}
