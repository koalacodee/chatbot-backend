import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface CloseTicketInput {
  ticketId: string;
}
@Injectable()
export class CloseTicketUseCase {
  constructor(private readonly ticketRepository: SupportTicketRepository) {}

  async execute({ ticketId }: CloseTicketInput) {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException({ ticket: 'not_found' });
    }

    ticket.status = SupportTicketStatus.CLOSED;

    await this.ticketRepository.save(ticket);

    return null;
  }
}
