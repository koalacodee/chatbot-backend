import { Question } from '../entities/question.entity';

export abstract class QuestionRepository {
  abstract save(question: Question): Promise<Question>;
  abstract findById(id: string): Promise<Question | null>;
  abstract findAll(): Promise<Question[]>;
  abstract removeById(id: string): Promise<Question | null>;

  // Additional common repository methods:
  abstract findByIds(ids: string[]): Promise<Question[]>;
  abstract update(id: string, update: Partial<Question>): Promise<Question>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract findByCriteria(criteria: Partial<Question>): Promise<Question[]>;
}
