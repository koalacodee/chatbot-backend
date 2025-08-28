import { SupportTicket } from '../entities/support-ticket.entity';

export interface FrequentTicketSubject {
  subject_original: string; // The exact subject text as written by the user
  count: number; // How many times this subject appeared
  category_id: string | number; // The category ID linked to the subject
  category_name: string; // The human-readable name of the category (or "Unknown")
}

export abstract class SupportTicketRepository {
  abstract save(ticket: SupportTicket): Promise<SupportTicket>;
  abstract findById(id: string): Promise<SupportTicket | null>;
  abstract findAll(offset?: number, limit?: number): Promise<SupportTicket[]>;
  abstract removeById(id: string): Promise<SupportTicket | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract countOpenTickets(): Promise<number>;
  abstract countAnsweredPendingClosure(): Promise<number>;

  abstract findByGuestId(guestId: string): Promise<SupportTicket[]>;
  abstract findByDepartment(
    departmentId: string,
    status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
  ): Promise<SupportTicket[]>;
  abstract search(query: string): Promise<SupportTicket[]>;
  abstract getFrequentTicketSubjects(
    limit?: number,
  ): Promise<FrequentTicketSubject[]>;
  abstract findByCode(code: string): Promise<SupportTicket | null>;
  
  abstract findGuestTicketsWithDetails(
    guestId: string,
    offset?: number,
    limit?: number,
  ): Promise<{
    id: string;
    subject: string;
    description: string;
    answer?: string;
    isRated: boolean;
    departmentId: string;
    createdAt: Date;
    updatedAt: Date;
  }[]>;
}
