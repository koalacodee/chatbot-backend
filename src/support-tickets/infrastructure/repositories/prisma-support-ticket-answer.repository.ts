import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';
import { SupportTicketAnswer } from '../../domain/entities/support-ticket-answer.entity';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';

@Injectable()
export class PrismaSupportTicketAnswerRepository extends SupportTicketAnswerRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {
    super();
  }

  private async toDomain(row: any): Promise<SupportTicketAnswer> {
    const ticket = SupportTicket.fromPersistence({
      id: row.supportTicket.id,
      subject: row.supportTicket.subject,
      description: row.supportTicket.description,
      departmentId: row.supportTicket.departmentId,
      status: row.supportTicket.status,
      createdAt: row.supportTicket.createdAt,
      updatedAt: row.supportTicket.updatedAt,
      code: row.supportTicket.code,
    });

    return SupportTicketAnswer.create({
      id: row.id,
      supportTicket: ticket,
      content: row.content,
      // attachment intentionally not eagerly loaded; use AttachmentRepository by targetId when needed
      answerer: row.answerer
        ? await this.getAnswererByUser(await User.create(row.answerer, false))
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rating: row.rating,
    });
  }

  private async getAnswererByUser(
    user: User,
  ): Promise<Employee | Supervisor | Admin> {
    switch (user.role.getRole()) {
      case Roles.ADMIN:
        return this.adminRepository.findByUserId(user.id);
      case Roles.SUPERVISOR:
        return this.supervisorRepository.findByUserId(user.id);
      case Roles.EMPLOYEE:
        return this.employeeRepository.findByUserId(user.id);
      default:
        throw new Error(`Unknown role: ${user.role.getRole()}`);
    }
  }

  async save(answer: SupportTicketAnswer): Promise<SupportTicketAnswer> {
    const data = {
      id: answer.id.toString(),
      supportTicketId: answer.supportTicket.id.toString(),
      content: answer.content,
      answererAdminId:
        answer.answerer instanceof Admin ? answer.answerer.id.toString() : null,
      answererEmployeeId:
        answer.answerer instanceof Employee
          ? answer.answerer.id.toString()
          : null,
      answererSupervisorId:
        answer.answerer instanceof Supervisor
          ? answer.answerer.id.toString()
          : null,
      createdAt: answer.createdAt,
      updatedAt: new Date(),
      rating: answer.rating,
    } as const;

    const upsert = await this.prisma.supportTicketAnswer.upsert({
      where: { id: data.id },
      update: {
        content: data.content,
        answererAdminId:
          answer.answerer instanceof Admin
            ? answer.answerer.id.toString()
            : null,
        answererEmployeeId:
          answer.answerer instanceof Employee
            ? answer.answerer.id.toString()
            : null,
        answererSupervisorId:
          answer.answerer instanceof Supervisor
            ? answer.answerer.id.toString()
            : null,
        updatedAt: data.updatedAt,
        rating: data.rating,
      },
      create: data,
      include: {
        supportTicket: true,
        answererAdmin: true,
        answererEmployee: true,
        answererSupervisor: true,
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<SupportTicketAnswer | null> {
    const row = await this.prisma.supportTicketAnswer.findUnique({
      where: { id },
      include: {
        supportTicket: true,
        answererAdmin: true,
        answererEmployee: true,
        answererSupervisor: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findBySupportTicketId(
    supportTicketId: string,
  ): Promise<SupportTicketAnswer[]> {
    const rows = await this.prisma.supportTicketAnswer.findMany({
      where: { supportTicketId },
      include: {
        supportTicket: true,
        answererAdmin: true,
        answererEmployee: true,
        answererSupervisor: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<SupportTicketAnswer | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.supportTicketAnswer.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.supportTicketAnswer.count({
      where: { id },
    });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.supportTicketAnswer.count();
  }

  async findByIds(ids: string[]): Promise<SupportTicketAnswer[]> {
    const rows = await this.prisma.supportTicketAnswer.findMany({
      where: { id: { in: ids } },
      include: {
        supportTicket: true,
        answererAdmin: true,
        answererEmployee: true,
        answererSupervisor: true,
      },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findBySupportTicketIds(ids: string[]): Promise<SupportTicketAnswer[]> {
    const rows = await this.prisma.supportTicketAnswer.findMany({
      where: { supportTicketId: { in: ids } },
      include: {
        supportTicket: true,
        answererAdmin: true,
        answererEmployee: true,
        answererSupervisor: true,
      },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }
}
