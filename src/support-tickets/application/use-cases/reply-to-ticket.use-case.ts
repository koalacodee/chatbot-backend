import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import { FilesService } from 'src/files/domain/services/files.service';

interface ReplyToTicketInput {
  ticketId: string;
  reply: string;
  promoteToFaq?: true;
  newFawDepartmentId?: string;
  userId: string;
  attach?: boolean;
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
    private readonly filesService: FilesService,
  ) {}

  async execute({
    ticketId,
    reply,
    promoteToFaq,
    newFawDepartmentId,
    userId,
    attach,
  }: ReplyToTicketInput): Promise<{ uploadKey?: string }> {
    if (promoteToFaq && !newFawDepartmentId) {
      throw new BadRequestException({
        details: [
          {
            field: 'newFawDepartmentId',
            message: 'Department ID is required when promoting to FAQ',
          },
        ],
      });
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
    if (promoteToFaq && !newFawDepartment)
      throw new NotFoundException({ newFawDepartmentId: 'not_found' });

    // Check department access
    await this.checkDepartmentAccess(
      userId,
      ticket.departmentId.toString(),
      user.role.getRole(),
    );

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

    const [uploadKey] = await Promise.all([
      attach ? this.filesService.genUploadKey(answer.id.toString()) : undefined,
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

    return { uploadKey };
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
      const supervisor = await this.supervisorRepo.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Check if supervisor has direct access to the department
      hasAccess = supervisorDepartmentIds.includes(departmentId);

      // If not direct access, check if it's a sub-department and supervisor has access to parent
      if (!hasAccess) {
        const department = await this.departmentRepo.findSubDepartmentById(
          departmentId,
          {
            includeParent: true,
          },
        );
        if (department?.parent) {
          hasAccess = supervisorDepartmentIds.includes(
            department.parent.id.toString(),
          );
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepo.findByUserId(userId);
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
