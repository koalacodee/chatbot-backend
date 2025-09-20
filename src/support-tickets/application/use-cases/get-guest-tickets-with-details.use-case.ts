import { Injectable, Inject } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

export interface GetGuestTicketsWithDetailsInput {
  phone: string;
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
  attachments: { [ticketId: string]: string[] };
}

@Injectable()
export class GetGuestTicketsWithDetailsUseCase {
  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute(
    input: GetGuestTicketsWithDetailsInput,
  ): Promise<GetGuestTicketsWithDetailsOutput> {
    const { phone, offset = 0, limit = 10 } = input;

    const tickets = await this.supportTicketRepository.findByPhoneNumber(
      phone,
      offset,
      limit,
    );

    // Get attachments for tickets
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: tickets.map((ticket) => ticket.id),
    });

    // // Get total count for pagination metadata
    // const totalTickets =
    //   await this.supportTicketRepository.findByGuestId(guestId);
    // const total = totalTickets.length;

    return {
      tickets,
      attachments,
    };
  }
}
