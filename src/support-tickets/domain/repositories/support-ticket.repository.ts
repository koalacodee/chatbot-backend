import { SupportTicket } from '../entities/support-ticket.entity';

export abstract class SupportTicketRepository {
  abstract save(ticket: SupportTicket): Promise<SupportTicket>;
  abstract findById(id: string): Promise<SupportTicket | null>;
  abstract findAll(offset?: number, limit?: number): Promise<SupportTicket[]>;
  abstract removeById(id: string): Promise<SupportTicket | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByGuestId(guestId: string): Promise<SupportTicket[]>;
  abstract findByDepartment(
    departmentId: string,
    status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
  ): Promise<SupportTicket[]>;
}
