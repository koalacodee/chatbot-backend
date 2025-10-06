import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { SupportTicketAnswerRepository } from 'src/support-tickets/domain/repositories/support-ticket-answer.repository';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketAnsweredEvent } from 'src/support-tickets/domain/events/ticket-answered.event';
import { FilesService } from 'src/files/domain/services/files.service';

interface AnswerTicketInput {
  ticketId: string;
  userId: string;
  userRole: Roles;
  content: string;
  attach?: boolean;
}

@Injectable()
export class AnswerTicketUseCase {
  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly adminRepository: AdminRepository,
    private readonly suprtvisorRepository: SupervisorRepository,
    private readonly ticketAnswerRepository: SupportTicketAnswerRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly fileService: FilesService,
  ) {}

  async execute({
    ticketId,
    userId,
    content,
    userRole,
    attach,
  }: AnswerTicketInput) {
    const [answerer, ticket, existingAnswer] = await Promise.all([
      this.getAnswererByRole(userRole, userId),
      this.ticketRepository.findById(ticketId),
      this.ticketAnswerRepository
        .findBySupportTicketId(ticketId)
        .then((val) => val[0]),
    ]);

    if (!ticket) {
      throw new NotFoundException({
        details: [{ field: 'ticketId', message: 'Ticket not found' }],
      });
    }

    // Check department access
    await this.checkDepartmentAccess(
      userId,
      ticket.departmentId.toString(),
      userRole,
    );

    if (
      ticket.status == SupportTicketStatus.ANSWERED ||
      ticket.status == SupportTicketStatus.CLOSED
    ) {
      throw new BadRequestException({
        details: [{ field: 'ticket', message: 'Ticket is already answered' }],
      });
    }

    if (!answerer) {
      throw new NotFoundException({
        details: [{ field: 'answererId', message: 'Answerer not found' }],
      });
    }

    ticket.status = SupportTicketStatus.ANSWERED;

    let savedAnswer: SupportTicketAnswer;
    let uploadKey: string;

    if (existingAnswer) {
      if (content) existingAnswer.content = content;
      existingAnswer.answerer = answerer;

      await Promise.all([
        attach
          ? this.fileService
              .genUploadKey(existingAnswer.id.toString())
              .then((key) => (uploadKey = key))
          : undefined,
        this.ticketAnswerRepository.save(existingAnswer),
        this.ticketRepository.save(ticket),
      ]);
      savedAnswer = existingAnswer;
    } else {
      await Promise.all([
        this.ticketAnswerRepository
          .save(
            SupportTicketAnswer.create({
              content,
              supportTicket: ticket,
              answerer,
            }),
          )
          .then((saved) => {
            savedAnswer = saved;
            attach
              ? this.fileService
                  .genUploadKey(saved.id.toString())
                  .then((key) => (uploadKey = key))
              : undefined;
          }),
        this.ticketRepository.save(ticket),
      ]);
    }
    this.eventEmitter.emitAsync(
      TicketAnsweredEvent.name,
      new TicketAnsweredEvent(
        ticket.subject,
        ticket.id.toString(),
        userId,
        new Date(),
        ticket?.code,
        ticket?.interaction?.type,
        Math.round(
          (savedAnswer.createdAt.getTime() - ticket.createdAt.getTime()) / 1000,
        ),
      ),
    );

    return { answer: savedAnswer, uploadKey };
  }

  async getAnswererByRole(role: Roles, id: string) {
    switch (role) {
      case Roles.ADMIN:
        return this.adminRepository.findByUserId(id);
      case Roles.SUPERVISOR:
        return this.suprtvisorRepository.findByUserId(id);
      case Roles.EMPLOYEE:
        return this.employeeRepository.findByUserId(id);
      default:
        break;
    }
  }

  private async checkDepartmentAccess(
    userId: string,
    departmentId: string,
    role: Roles,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true; // Admins have access to all departments
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.suprtvisorRepository.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Check if supervisor has direct access to the department
      hasAccess = supervisorDepartmentIds.includes(departmentId);

      // If not direct access, check if it's a sub-department and supervisor has access to parent
      if (!hasAccess) {
        const department =
          await this.departmentRepository.findSubDepartmentById(departmentId, {
            includeParent: true,
          });
        if (department?.parent) {
          hasAccess = supervisorDepartmentIds.includes(
            department.parent.id.toString(),
          );
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const employeeDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];
      hasAccess = employeeDepartmentIds.includes(departmentId);
    }

    if (!hasAccess) {
      throw new ForbiddenException({
        details: [
          {
            field: 'departmentId',
            message: 'You do not have access to this department',
          },
        ],
      });
    }
  }
}
