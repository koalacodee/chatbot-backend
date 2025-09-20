import { Injectable } from '@nestjs/common';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

@Injectable()
export class GroupQuestionsUseCase {
  constructor(
    private readonly repo: QuestionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(): Promise<{
    groupedQuestions: any[];
    attachments: { [questionId: string]: string[] };
  }> {
    const groupedQuestions = await this.repo.groupQuestionsByDepartment();

    // Extract all question IDs from the grouped data
    const allQuestionIds: string[] = [];
    groupedQuestions.forEach((group: any) => {
      if (group.questions && Array.isArray(group.questions)) {
        group.questions.forEach((question: any) => {
          if (question.id) {
            allQuestionIds.push(question.id.toString());
          }
        });
      }
    });

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: allQuestionIds,
    });

    return { groupedQuestions, attachments };
  }
}
