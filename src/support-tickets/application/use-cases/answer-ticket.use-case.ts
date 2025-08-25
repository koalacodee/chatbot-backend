import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Role, Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { SupportTicketAnswerRepository } from 'src/support-tickets/domain/repositories/support-ticket-answer.repository';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface AnswerTicketInput {
  ticketId: string;
  userId: string;
  userRole: Role,
  content: string;
}

@Injectable()
export class AnswerTicketUseCase {
  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly adminRepository: AdminRepository,
    private readonly suprtvisorRepository: SupervisorRepository,
    private readonly ticketAnswerRepository: SupportTicketAnswerRepository
  ) {}

  async execute({ ticketId, userId, content, userRole }: AnswerTicketInput) {
    const [answerer, ticket, existingAnswer] = await Promise.all([
      this.getAnswererByRole(userRole.getRole(), userId),
      this.ticketRepository.findById(ticketId),
      this.ticketAnswerRepository.findBySupportTicketId(ticketId).then((val) => val[0]),
    ]);

    if (ticket.status == SupportTicketStatus.ANSWERED || ticket.status == SupportTicketStatus.CLOSED) {
      throw new BadRequestException({ ticket: "ticket_answered" })
    }

    if (!answerer) {
      throw new NotFoundException({ answerer: 'not_found' });
    }

    if (!ticket) {
      throw new NotFoundException({ ticket: 'not_found' });
    }

    ticket.status = SupportTicketStatus.ANSWERED;

    let savedAnswer;

    if (existingAnswer) {
      if (content) existingAnswer.content = content;
      existingAnswer.answerer = answerer;

      savedAnswer = this.ticketAnswerRepository.save(existingAnswer);

      return savedAnswer;
    }

    await Promise.all([
      this.ticketAnswerRepository.save(SupportTicketAnswer.create({
        content,
        supportTicket: ticket,
        answerer
      })).then((saved) => savedAnswer = saved),
      this.ticketRepository.save(ticket)
    ])
    
    return savedAnswer;
  }

  async getAnswererByRole(role: Roles, id: string) {
    switch (role) {
      case Roles.ADMIN:
        return this.adminRepository.findByUserId(id)    
      case Roles.SUPERVISOR:
        return this.suprtvisorRepository.findByUserId(id)    
      case Roles.EMPLOYEE:
        return this.employeeRepository.findByUserId(id)    
      default:
        break;
    }
  }
}
