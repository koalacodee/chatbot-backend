import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface ReopenTicketInput {
  ticketId: string;
}
@Injectable()
export class ReopenTicketUseCase {
  constructor(private readonly ticketRepository: SupportTicketRepository) {}

  async execute({ ticketId }: ReopenTicketInput) {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException({ ticket: 'not_found' });
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException({ticket: 'ticket_closed'})
    }

    ticket.status = SupportTicketStatus.SEEN;

    await this.ticketRepository.save(ticket);

    return null;
  }
}
