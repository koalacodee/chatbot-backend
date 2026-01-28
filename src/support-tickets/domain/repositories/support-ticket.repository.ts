import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../entities/support-ticket.entity';
import { SupportTicketAnswer } from '../entities/support-ticket-answer.entity';
import { CursorInput, PaginatedArrayResult, PaginatedObjectResult } from 'src/common/drizzle/helpers/cursor';

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
  cursor?: CursorInput;
  status?: SupportTicketStatus;
  search?: string;
  departmentIds?: string[];
}

export interface GetAllTicketsAndMetricsOutput {
  metrics: SupportTicketMetrics;
  tickets: SupportTicket[];
  attachments: Attachment[];
}

export interface GetByCodeResponse {
  ticket: SupportTicket;
  answers: SupportTicketAnswer[];
  fileHubAttachments: Attachment[];
  isRated: boolean;
}

export abstract class SupportTicketRepository {
  abstract save(ticket: SupportTicket): Promise<SupportTicket>;
  abstract findById(id: string): Promise<SupportTicket | null>;
  abstract findAll(
    options?: {
      cursor?: CursorInput,
      departmentIds?: string[],
      start?: Date,
      end?: Date,
      status?: SupportTicketStatus,
      search?: string,
    }
  ): Promise<PaginatedArrayResult<SupportTicket>>;
  abstract removeById(id: string): Promise<SupportTicket | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract countOpenTickets(): Promise<number>;
  abstract countAnsweredPendingClosure(): Promise<number>;

  abstract findByDepartment(
    options: {
      departmentId: string,
      cursor?: CursorInput,
      status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
    }
  ): Promise<PaginatedArrayResult<SupportTicket>>;
  abstract search(options: {
    query: string,
    cursor?: CursorInput,
  }): Promise<PaginatedArrayResult<SupportTicket>>;
  abstract getFrequentTicketSubjects(
    limit?: number,
  ): Promise<FrequentTicketSubject[]>;
  abstract findByCode(code: string): Promise<GetByCodeResponse | null>;

  abstract findByPhoneNumber(
    options: {
      phone: string,
      cursor?: CursorInput,
    }
  ): Promise<
    PaginatedArrayResult<{
      id: string;
      subject: string;
      description: string;
      answer?: string;
      isRated: boolean;
      departmentId: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;

  abstract getMetrics(
    departmentIds?: string[],
    status?: SupportTicketStatus,
    search?: string,
  ): Promise<SupportTicketMetrics>;

  abstract getAllTicketsAndMetricsForSupervisor(
    options: GetAllTicketsOptions & { supervisorUserId: string },
  ): Promise<PaginatedObjectResult<GetAllTicketsAndMetricsOutput>>;
  abstract getAllTicketsAndMetricsForEmployee(
    options: GetAllTicketsOptions & { employeeUserId: string },
  ): Promise<PaginatedObjectResult<GetAllTicketsAndMetricsOutput>>;
  abstract getAllTicketsAndMetricsForAdmin(
    options: GetAllTicketsOptions,
  ): Promise<PaginatedObjectResult<GetAllTicketsAndMetricsOutput>>;
}
