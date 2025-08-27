import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';

interface CreateSupportTicketInputDto {
  guestId: string;
  subject: string;
  description: string;
  departmentId: string;
}

@Injectable()
export class CreateSupportTicketUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly guestRepo: GuestRepository,
  ) {}

  async execute(dto: CreateSupportTicketInputDto): Promise<SupportTicket> {
    // Validate foreign keys
    const [guest, department] = await Promise.all([
      this.guestRepo.findById(dto.guestId),
      this.departmentRepo.findById(dto.departmentId),
    ]);

    if (!guest) throw new NotFoundException({ guestId: 'guest_not_found' });
    if (!department)
      throw new NotFoundException({ departmentId: 'department_not_found' });

    const now = new Date();
    const ticket = SupportTicket.create({
      guestId: dto.guestId,
      subject: dto.subject,
      description: dto.description,
      departmentId: dto.departmentId,
      status: 'NEW' as any,
      createdAt: now,
      updatedAt: now,
    });

    await this.supportTicketRepo.save(ticket);

    return ticket;
  }
}
