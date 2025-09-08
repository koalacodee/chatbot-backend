import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';

interface TrackTicketInputDto {
  code: string;
  guestId: string;
}

@Injectable()
export class TrackTicketUseCase {
  constructor(private readonly supportTicketRepo: SupportTicketRepository) {}

  async execute(dto: TrackTicketInputDto): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepo.findByCode(dto.code);
    if (!ticket) throw new NotFoundException({ code: 'ticket_not_found' });
    // if (ticket.guestId.toString() !== dto.guestId)
    //   throw new NotFoundException({ guestId: 'ticket_not_owned' });
    return ticket;
  }
}
