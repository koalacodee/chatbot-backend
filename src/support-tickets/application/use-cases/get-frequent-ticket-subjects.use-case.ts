import { Injectable } from '@nestjs/common';
import {
  FrequentTicketSubject,
  SupportTicketRepository,
} from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface GetFrequentTicketSubjectsInput {
  limit?: number;
}

@Injectable()
export class GetFrequentTicketSubjectsUseCase {
  constructor(private readonly supportTicketRepo: SupportTicketRepository) {}

  async execute(
    input: GetFrequentTicketSubjectsInput,
  ): Promise<FrequentTicketSubject[]> {
    return this.supportTicketRepo.getFrequentTicketSubjects(input.limit);
  }
}
