import { SupportTicketAnswer } from '../entities/support-ticket-answer.entity';

export abstract class SupportTicketAnswerRepository {
  abstract save(answer: SupportTicketAnswer): Promise<SupportTicketAnswer>;
  abstract findById(id: string): Promise<SupportTicketAnswer | null>;
  abstract findBySupportTicketId(
    supportTicketId: string,
  ): Promise<SupportTicketAnswer[]>;
  abstract removeById(id: string): Promise<SupportTicketAnswer | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
}
