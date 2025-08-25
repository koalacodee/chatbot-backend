import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';

@Injectable()
export class DeleteSupportTicketUseCase {
  constructor(private readonly supportTicketRepo: SupportTicketRepository) {}

  async execute(id: string): Promise<SupportTicket | null> {
    const existing = await this.supportTicketRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'support_ticket_not_found' });
    await this.supportTicketRepo.removeById(id);
    return existing;
  }
}
