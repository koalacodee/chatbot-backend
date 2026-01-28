import { Injectable, Inject } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';
import { CursorInput, CursorMeta } from 'src/common/drizzle/helpers/cursor';

export interface GetGuestTicketsWithDetailsInput {
  phone: string;
  cursor?: CursorInput;
}

export interface GetGuestTicketsWithDetailsOutput {
  tickets: {
    id: string;
    subject: string;
    description: string;
    answer?: string;
    isRated: boolean;
    departmentId: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  attachments: { [ticketId: string]: string[] };
  answerAttachments: { [ticketId: string]: string[] };
  meta: CursorMeta;
}

@Injectable()
export class GetGuestTicketsWithDetailsUseCase {
  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportTicketAnswerRepository: SupportTicketAnswerRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) { }

  async execute(
    input: GetGuestTicketsWithDetailsInput,
  ): Promise<GetGuestTicketsWithDetailsOutput> {
    const { phone, cursor } = input;

    const { data: tickets, meta } =
      await this.supportTicketRepository.findByPhoneNumber({
        phone,
        cursor,
      });

    const ticketIds = tickets.map((ticket) => ticket.id);

    // Get ticket answers for all tickets
    const ticketAnswers =
      await this.supportTicketAnswerRepository.findBySupportTicketIds(
        ticketIds,
      );

    // Get answer IDs for attachment retrieval
    const answerIds = ticketAnswers.map((answer) => answer.id.toString());

    // Get attachments for tickets and answers in parallel
    const [ticketAttachments, answerAttachments] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: ticketIds,
      }),
      answerIds.length > 0
        ? this.getAttachmentsUseCase.execute({
          targetIds: answerIds,
        })
        : Promise.resolve({}),
    ]);

    // Group answer attachments by ticket ID
    const answerAttachmentsByTicket: { [ticketId: string]: string[] } = {};

    ticketAnswers.forEach((answer) => {
      const ticketId = answer.supportTicket.id.toString();
      if (!answerAttachmentsByTicket[ticketId]) {
        answerAttachmentsByTicket[ticketId] = [];
      }

      // Get attachments for this specific answer
      const answerAttachmentIds =
        answerAttachments[answer.id.toString()] || [];
      answerAttachmentsByTicket[ticketId].push(...answerAttachmentIds);
    });

    return {
      tickets,
      attachments: ticketAttachments,
      answerAttachments: answerAttachmentsByTicket,
      meta,
    };
  }
}
