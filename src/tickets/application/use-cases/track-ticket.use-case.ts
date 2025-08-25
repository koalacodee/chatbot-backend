import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnswerRepository } from 'src/tickets/domain/repositories/answer.repository';
import { TicketRepository } from 'src/tickets/domain/repositories/ticket.repository';

interface TrackTicketInput {
  ticketCode: string;
  guestId?: string;
}

@Injectable()
export class TrackTicketUseCase {
  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly answerRepo: AnswerRepository,
  ) {}

  async execute({ ticketCode, guestId }: TrackTicketInput) {
    const ticket = await this.ticketRepo.findByTicketCode(ticketCode);

    console.log(ticket);

    if (!ticket) {
      throw new NotFoundException({ ticket: 'ticket_not_found' });
    }

    if (ticket.guest?.id.toString() !== guestId) {
      throw new ForbiddenException({ ticket: 'not_owned' });
    }

    return {
      id: ticket.id.toString(),
      code: ticket.ticketCode.toString(),
      status: ticket.status.toString().toLowerCase(),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      question: ticket.question,
      answer: await this.answerRepo.findByTicketId(ticket.id).then((ans) => {
        console.log(ans);

        return ans ? ans.content : undefined;
      }),
    };
  }
}
