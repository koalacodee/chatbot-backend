import { Injectable } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';

@Injectable()
export class GetAllSupportTicketsUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly supportTicketAnswerRepo: SupportTicketAnswerRepository,
  ) {}

  async execute(offset?: number, limit?: number): Promise<any[]> {
    const toReturn = await this.supportTicketRepo.findAll(offset, limit);
    const answers = await this.supportTicketAnswerRepo.findBySupportTicketIds(
      toReturn.map((t) => t.id.toString()),
    );

    return toReturn.map((ticket) => {
      const answer = answers.find(
        (a) => a.supportTicket.id.toString() === ticket.id.toString(),
      );
      return {
        ...ticket.toJSON(),
        answer: answer?.content,
      };
    });
  }
}
