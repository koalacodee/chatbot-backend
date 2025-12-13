import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../entities/support-ticket.entity';

export interface FrequentTicketSubject {
  subject_original: string; // The exact subject text as written by the user
  count: number; // How many times this subject appeared
  category_id: string | number; // The category ID linked to the subject
  category_name: string; // The human-readable name of the category (or "Unknown")
  [key: string]: unknown; // Index signature to satisfy Record<string, unknown> constraint
}

export interface SupportTicketMetrics {
  totalTickets: number;
  pendingTickets: number; // NEW + SEEN statuses
  answeredTickets: number; // ANSWERED status
  closedTickets: number; // CLOSED status
}

export interface GetAllTicketsOptions {
  limit?: number;
  offset?: number;
  status?: SupportTicketStatus;
  search?: string;
  departmentIds?: string[];
}

export interface GetAllTicketsAndMetricsOutput {
  metrics: SupportTicketMetrics;
  tickets: SupportTicket[];
  attachments: Attachment[];
}

export abstract class SupportTicketRepository {
  abstract save(ticket: SupportTicket): Promise<SupportTicket>;
  abstract findById(id: string): Promise<SupportTicket | null>;
  abstract findAll(
    offset?: number,
    limit?: number,
    departmentIds?: string[],
    start?: Date,
    end?: Date,
    status?: SupportTicketStatus,
    search?: string,
  ): Promise<SupportTicket[]>;
  abstract removeById(id: string): Promise<SupportTicket | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract countOpenTickets(): Promise<number>;
  abstract countAnsweredPendingClosure(): Promise<number>;

  abstract findByDepartment(
    departmentId: string,
    status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
  ): Promise<SupportTicket[]>;
  abstract search(query: string): Promise<SupportTicket[]>;
  abstract getFrequentTicketSubjects(
    limit?: number,
  ): Promise<FrequentTicketSubject[]>;
  abstract findByCode(code: string): Promise<SupportTicket | null>;

  abstract findByPhoneNumber(
    phone: string,
    offset?: number,
    limit?: number,
  ): Promise<
    {
      id: string;
      subject: string;
      description: string;
      answer?: string;
      isRated: boolean;
      departmentId: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >;

  abstract getMetrics(
    departmentIds?: string[],
    status?: SupportTicketStatus,
    search?: string,
  ): Promise<SupportTicketMetrics>;

  abstract getAllTicketsAndMetricsForSupervisor(
    options: GetAllTicketsOptions & { supervisorUserId: string },
  ): Promise<GetAllTicketsAndMetricsOutput>;
  abstract getAllTicketsAndMetricsForEmployee(
    options: GetAllTicketsOptions & { employeeUserId: string },
  ): Promise<GetAllTicketsAndMetricsOutput>;
  abstract getAllTicketsAndMetricsForAdmin(
    options: GetAllTicketsOptions,
  ): Promise<GetAllTicketsAndMetricsOutput>;
}
