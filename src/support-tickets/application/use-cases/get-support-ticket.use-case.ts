import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';

@Injectable()
export class GetSupportTicketUseCase {
  constructor(private readonly supportTicketRepo: SupportTicketRepository) {}

  async execute(id: string): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepo.findById(id);
    if (!ticket) throw new NotFoundException({ id: 'support_ticket_not_found' });
    return ticket;
  }
}
