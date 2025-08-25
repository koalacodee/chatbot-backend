import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';

interface UpdateSupportTicketInputDto {
  subject?: string;
  description?: string;
  departmentId?: string;
  status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED';
}

@Injectable()
export class UpdateSupportTicketUseCase {
  constructor(private readonly supportTicketRepo: SupportTicketRepository) {}

  async execute(id: string, dto: UpdateSupportTicketInputDto): Promise<SupportTicket> {
    const existing = await this.supportTicketRepo.findById(id);
    if (!existing)
      throw new NotFoundException({ id: 'support_ticket_not_found' });

    if (dto.subject !== undefined) existing.subject = dto.subject;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.departmentId !== undefined)
      existing.departmentId = UUID.create(dto.departmentId);
    if (dto.status !== undefined) existing.status = dto.status as any;

    existing.updatedAt = new Date();

    return this.supportTicketRepo.save(existing);
  }
}
