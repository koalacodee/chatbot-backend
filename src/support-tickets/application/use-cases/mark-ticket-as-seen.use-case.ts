import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface MarkTicketAsSeenInput {
  ticketId: string;
}
@Injectable()
export class MarkTicketAsSeenUseCase {
  constructor(private readonly ticketRepository: SupportTicketRepository) {}

  async execute({ ticketId }: MarkTicketAsSeenInput) {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException({ ticket: 'not_found' });
    }

    ticket.status = SupportTicketStatus.SEEN;

    await this.ticketRepository.save(ticket);

    return null;
  }
}
