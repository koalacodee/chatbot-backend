import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

interface TrackTicketInputDto {
  code: string;
  guestId: string;
}

export interface TrackTicketOutput {
  ticket: SupportTicket;
  attachments: { [ticketId: string]: string[] };
  answerAttachments: { [ticketId: string]: string[] };
  isRated: boolean;
}

@Injectable()
export class TrackTicketUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly supportTicketAnswerRepository: SupportTicketAnswerRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) { }

  async execute(dto: TrackTicketInputDto): Promise<TrackTicketOutput> {
    const ticket = await this.supportTicketRepo.findByCode(dto.code);
    if (!ticket) throw new NotFoundException({ code: 'ticket_not_found' });
    // if (ticket.guestId.toString() !== dto.guestId)
    //   throw new NotFoundException({ guestId: 'ticket_not_owned' });

    const ticketId = ticket.id.toString();

    // Get ticket answers for this ticket
    const ticketAnswers =
      await this.supportTicketAnswerRepository.findBySupportTicketIds([
        ticketId,
      ]);

    // Get answer IDs for attachment retrieval
    const answerIds = ticketAnswers.map((answer) => answer.id.toString());

    // Get attachments for ticket and answer in parallel
    const [ticketAttachments, answerAttachments] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: [ticketId],
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
      const answerTicketId = answer.supportTicket.id.toString();
      if (!answerAttachmentsByTicket[answerTicketId]) {
        answerAttachmentsByTicket[answerTicketId] = [];
      }

      // Get attachments for this specific answer
      const answerAttachmentIds =
        answerAttachments[answer.id.toString()] || [];
      answerAttachmentsByTicket[answerTicketId].push(...answerAttachmentIds);
    });

    return {
      ticket,
      attachments: ticketAttachments,
      answerAttachments: answerAttachmentsByTicket,
      isRated: !!ticket.interaction,
    };
  }
}
