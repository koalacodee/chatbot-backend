import { Question } from '../entities/question.entity';

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
  abstract groupByDepartment(): Promise<any[]>;
}
