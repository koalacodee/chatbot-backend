import { Question } from '../../../domain/entities/question.entity';

export class GetAllQuestionsOutputDto extends Array<
  typeof Question.prototype.toJSON
> {}
