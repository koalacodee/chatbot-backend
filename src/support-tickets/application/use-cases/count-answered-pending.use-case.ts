import { Injectable } from '@nestjs/common';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

@Injectable()
export class CountAnsweredPendingUseCase {
  constructor(private readonly ticketRepository: SupportTicketRepository) {}

  async execute() {
    return this.ticketRepository.countAnsweredPendingClosure();
  }
}
