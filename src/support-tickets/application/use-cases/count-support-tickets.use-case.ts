import { Injectable } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';

@Injectable()
export class CountSupportTicketsUseCase {
  constructor(private readonly supportTicketRepo: SupportTicketRepository) {}

  async execute(): Promise<number> {
    return this.supportTicketRepo.count();
  }
}
