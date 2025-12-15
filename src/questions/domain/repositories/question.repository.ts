import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { Question } from '../entities/question.entity';
import { SupportedLanguage } from 'src/translation/domain/services/translation.service';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';

export interface QuestionQueryDto {
  includeDepartment?: boolean;
}

export interface FaqStats {
  totalViews: number;
  categoryViews: {
    department_id: string;
    department_name: string;
    total_views: number;
  }[];
  topFaqs: {
    id: string;
    text: string;
    answer: string | null;
    view_count: number;
    department_name: string;
  }[];
  faqSatisfactionRate: number | null;
}

export interface ViewdFaqDto {
  id: string;
  text: string;
  answer: string | null;
  department_id: string;
  isRated: boolean;
  isViewed: boolean;
}

export type FAqTranslation = {
  lang: SupportedLanguage;
  content: string;
  type: 'question' | 'answer';
};

export interface ViewedFaqsResponse {
  faqs: Array<ViewdFaqDto>;
  fileHubAttachments: Attachment[];
  translations: Record<string, FAqTranslation[]>;
}

export abstract class QuestionRepository {
  abstract save(question: Question): Promise<Question>;
  abstract findById(
    id: string,
    queryDto?: QuestionQueryDto,
  ): Promise<Question | null>;
  abstract findAll(queryDto?: QuestionQueryDto): Promise<Question[]>;
  abstract removeById(id: string): Promise<Question | null>;

  // Additional common repository methods:
  abstract findByIds(
    ids: string[],
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]>;
  abstract update(
    id: string,
    update: Partial<Question>,
    queryDto?: QuestionQueryDto,
  ): Promise<Question>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(queryDto?: QuestionQueryDto): Promise<number>;
  abstract findByCriteria(
    criteria: Partial<Question>,
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]>;
  abstract findByDepartmentId(
    departmentId: string,
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]>;
  abstract groupQuestionsByDepartment(
    queryDto?: QuestionQueryDto,
  ): Promise<any[]>;
  abstract faqStats(
    limit?: number,
    queryDto?: QuestionQueryDto,
  ): Promise<FaqStats>;
  abstract groupByDepartment(options: {
    departmentIds?: string[];
  }): Promise<any[]>;
  abstract viewFaqs(options?: {
    limit?: number;
    page?: number;
    departmentId?: string;
    viewPrivate?: boolean;
  }): Promise<ViewedFaqsResponse>;

  abstract recordRating(options: {
    guestId: string;
    faqId: string;
    satisfactionType: 'SATISFACTION' | 'DISSATISFACTION';
  }): Promise<void>;

  abstract recordView(options: {
    guestId: string;
    faqId: string;
  }): Promise<void>;

  /**
   * Find questions by multiple department IDs.
   * Returns questions that belong to any of the provided department IDs.
   */
  abstract findByDepartmentIds(
    departmentIds: string[],
    queryDto?: QuestionQueryDto,
  ): Promise<Question[]>;
}
