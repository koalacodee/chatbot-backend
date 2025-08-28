import { Injectable, Inject } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';

export interface GetGuestTicketsWithDetailsInput {
  guestId: string;
  offset?: number;
  limit?: number;
}

export interface GetGuestTicketsWithDetailsOutput {
  tickets: {
    id: string;
    subject: string;
    description: string;
    answer?: string;
    isRated: boolean;
    departmentId: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  total: number;
}

@Injectable()
export class GetGuestTicketsWithDetailsUseCase {
  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
  ) {}

  async execute(
    input: GetGuestTicketsWithDetailsInput,
  ): Promise<GetGuestTicketsWithDetailsOutput> {
    const { guestId, offset = 0, limit = 10 } = input;

    const tickets =
      await this.supportTicketRepository.findGuestTicketsWithDetails(
        guestId,
        offset,
        limit,
      );

    // Get total count for pagination metadata
    const totalTickets =
      await this.supportTicketRepository.findByGuestId(guestId);
    const total = totalTickets.length;

    return {
      tickets,
      total,
    };
  }
}
