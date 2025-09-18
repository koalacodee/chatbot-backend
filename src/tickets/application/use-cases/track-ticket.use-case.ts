import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnswerRepository } from 'src/tickets/domain/repositories/answer.repository';
import { TicketRepository } from 'src/tickets/domain/repositories/ticket.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

interface TrackTicketInput {
  ticketCode: string;
  guestId?: string;
}

@Injectable()
export class TrackTicketUseCase {
  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly answerRepo: AnswerRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute({ ticketCode, guestId }: TrackTicketInput) {
    const ticket = await this.ticketRepo.findByTicketCode(ticketCode);

    if (!ticket) {
      throw new NotFoundException({ ticket: 'ticket_not_found' });
    }

    if (ticket.guest?.id.toString() !== guestId) {
      throw new ForbiddenException({ ticket: 'not_owned' });
    }

    const answer = await this.answerRepo.findByTicketId(ticket.id);

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [
        ticket.id.toString(),
        ...(answer ? [answer.id.toString()] : []),
      ],
    });

    return {
      id: ticket.id.toString(),
      code: ticket.ticketCode.toString(),
      status: ticket.status.toString().toLowerCase(),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      question: ticket.question,
      answer: answer ? answer.content : undefined,
      attachments,
    };
  }
}
