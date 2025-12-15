import { Injectable } from '@nestjs/common';
import {
  FAqTranslation,
  QuestionRepository,
  ViewdFaqDto,
} from 'src/questions/domain/repositories/question.repository';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

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
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(options?: ViewQuestionsInput): Promise<{
    faqs: Array<ViewdFaqDto>;
    attachments: { [faqId: string]: string[] };
    fileHubAttachments: FilehubAttachmentMessage[];
    translations: Record<string, FAqTranslation[]>;
  }> {
    const faqs = await this.questionRepo.viewFaqs(options);

    const uniqueFileNames = Array.from(
      new Set(faqs.fileHubAttachments.map((a) => a.filename)),
    );

    const fileHubAttachments: FilehubAttachmentMessage[] =
      uniqueFileNames.length > 0
        ? await this.fileHubService
            .getSignedUrlBatch(uniqueFileNames, 7 * 24 * 60 * 60 * 1000)
            .then((batch) => {
              return batch.map((b) => {
                return {
                  ...faqs.fileHubAttachments
                    .find((a) => a.filename === b.filename)
                    ?.toJSON(),
                  signedUrl: b.signedUrl,
                };
              });
            })
        : [];

    return {
      faqs: faqs.faqs,
      attachments: {},
      translations: faqs.translations,
      fileHubAttachments,
    };
  }
}
