import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { SupportTicketAnswerRepository } from 'src/support-tickets/domain/repositories/support-ticket-answer.repository';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';

interface ReplyToTicketInput {
  ticketId: string;
  reply: string;
  promoteToFaq?: true;
  newFawDepartmentId?: string;
  userId: string;
}

@Injectable()
export class ReplyToTicketUseCase {
  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly userRepo: UserRepository,
    private readonly adminRepo: AdminRepository,
    private readonly supervisorRepo: SupervisorRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly ticketAnswerRepo: SupportTicketAnswerRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute({
    ticketId,
    reply,
    promoteToFaq,
    newFawDepartmentId,
    userId,
  }: ReplyToTicketInput) {
    if (promoteToFaq && !newFawDepartmentId) {
      throw new BadRequestException({ newFawDepartmentId: 'required' });
    }

    const [ticket, user, newFawDepartment] = await Promise.all([
      this.ticketRepository.findById(ticketId),
      this.userRepo.findById(userId),
      promoteToFaq
        ? this.departmentRepo.findById(newFawDepartmentId)
        : undefined,
    ]);

    if (!ticket) throw new NotFoundException({ ticket: 'not_found' });
    if (!user) throw new NotFoundException({ user: 'not_found' });
    if (!newFawDepartment)
      throw new NotFoundException({ newFawDepartmentId: 'not_found' });

    const answer = SupportTicketAnswer.create({
      content: reply,
      supportTicket: ticket,
      answerer:
        user.role.getRole() == Roles.ADMIN
          ? await this.adminRepo.findByUserId(user.id)
          : Roles.SUPERVISOR
            ? await this.supervisorRepo.findByUserId(user.id)
            : await this.employeeRepo.findByUserId(user.id),
    });

    ticket.status = SupportTicketStatus.ANSWERED;

    await Promise.all([
      this.ticketRepository.save(ticket),
      this.ticketAnswerRepo.save(answer),
      newFawDepartment
        ? this.eventEmitter.emitAsync('faq.promote', {
            question: ticket.subject,
            answer: answer.content,
            departmentId: newFawDepartment.id.toString(),
            userId,
          })
        : undefined,
    ]);
  }
}
