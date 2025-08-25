import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface AssignTicketInput {
  ticketId: string;
  userId: string;
}

@Injectable()
export class AssignTicketUseCase {
  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute({ ticketId, userId }: AssignTicketInput) {
    const [employee, ticket] = await Promise.all([
      this.employeeRepository.findByUserId(userId),
      this.ticketRepository.findById(ticketId),
    ]);

    if (!employee) {
      throw new NotFoundException({ employee: 'not_found' });
    }

    if (!ticket) {
      throw new NotFoundException({ ticket: 'not_found' });
    }

    ticket.assignee = employee;

    await this.ticketRepository.save(ticket);

    return null;
  }
}
