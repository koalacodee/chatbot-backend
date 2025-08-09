import { Answer } from '../entities/answer.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

export abstract class AnswerRepository {
  abstract save(answer: Answer): Promise<Answer>;
  abstract findById(id: UUID): Promise<Answer | null>;
  abstract findByTicketId(ticketId: UUID): Promise<Answer | null>;
  abstract findAll(): Promise<Answer[]>;
  abstract delete(id: UUID): Promise<void>;
}
