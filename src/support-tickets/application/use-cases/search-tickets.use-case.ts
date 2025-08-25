import { Injectable } from '@nestjs/common';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface SearchTicketsQuery {
  name?: string;
  id?: string;
  phone?: string;
  employeeId?: string;
}

@Injectable()
export class SearchTicketsUseCase {
  constructor(private readonly ticketsRepository: SupportTicketRepository) {}

  async execute({ name, id, phone, employeeId }: SearchTicketsQuery) {}
}
