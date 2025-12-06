import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { SupportTicketAnswerRepository } from '../../../domain/repositories/support-ticket-answer.repository';
import { SupportTicketAnswer } from '../../../domain/entities/support-ticket-answer.entity';
import { SupportTicket } from '../../../domain/entities/support-ticket.entity';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import {
  supportTicketAnswers,
  supportTickets,
  admins,
  supervisors,
  employees,
  users,
} from 'src/common/drizzle/schema';
import { eq, inArray, or } from 'drizzle-orm';

export enum RatingMapping {
  SATISFACTION = 'satisfaction',
  DISSATISFACTION = 'dissatisfaction',
}

@Injectable()
export class DrizzleSupportTicketAnswerRepository extends SupportTicketAnswerRepository {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private async toDomain(row: any): Promise<SupportTicketAnswer> {
    const ticket = SupportTicket.fromPersistence({
      id: row.supportTicket.id,
      subject: row.supportTicket.subject,
      description: row.supportTicket.description,
      departmentId: row.supportTicket.departmentId,
      status: row.supportTicket.status.toUpperCase(),
      createdAt: new Date(row.supportTicket.createdAt),
      updatedAt: new Date(row.supportTicket.updatedAt),
      code: row.supportTicket.code,
    });

    return SupportTicketAnswer.create({
      id: row.answer.id,
      supportTicket: ticket,
      content: row.answer.content,
      answerer: row.answerer
        ? await this.getAnswererByUser(await User.create(row.answerer, false))
        : undefined,
      createdAt: new Date(row.answer.createdAt),
      updatedAt: new Date(row.answer.updatedAt),
      rating: row.answer.rating,
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
      createdAt: answer.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
      rating: RatingMapping[answer.rating],
    };

    // Check if exists
    const [existing] = await this.db
      .select()
      .from(supportTicketAnswers)
      .where(eq(supportTicketAnswers.id, data.id))
      .limit(1);

    if (existing) {
      // Update
      await this.db
        .update(supportTicketAnswers)
        .set({
          content: data.content,
          answererAdminId: data.answererAdminId,
          answererEmployeeId: data.answererEmployeeId,
          answererSupervisorId: data.answererSupervisorId,
          updatedAt: data.updatedAt,
          rating: data.rating,
        })
        .where(eq(supportTicketAnswers.id, data.id));
    } else {
      // Insert
      await this.db.insert(supportTicketAnswers).values(data);
    }

    return this.findById(data.id);
  }

  async findById(id: string): Promise<SupportTicketAnswer | null> {
    const results = await this.db
      .select({
        answer: supportTicketAnswers,
        supportTicket: supportTickets,
        answerer: users,
      })
      .from(supportTicketAnswers)
      .innerJoin(
        supportTickets,
        eq(supportTicketAnswers.supportTicketId, supportTickets.id),
      )
      .leftJoin(admins, eq(supportTicketAnswers.answererAdminId, admins.id))
      .leftJoin(
        supervisors,
        eq(supportTicketAnswers.answererSupervisorId, supervisors.id),
      )
      .leftJoin(
        employees,
        eq(supportTicketAnswers.answererEmployeeId, employees.id),
      )
      .leftJoin(
        users,
        or(
          eq(users.id, admins.userId),
          eq(users.id, supervisors.userId),
          eq(users.id, employees.userId),
        ),
      )
      .where(eq(supportTicketAnswers.id, id))
      .limit(1);

    return results.length > 0 ? this.toDomain(results[0]) : null;
  }

  async findBySupportTicketId(
    supportTicketId: string,
  ): Promise<SupportTicketAnswer[]> {
    const results = await this.db
      .select({
        answer: supportTicketAnswers,
        supportTicket: supportTickets,
        answerer: users,
      })
      .from(supportTicketAnswers)
      .innerJoin(
        supportTickets,
        eq(supportTicketAnswers.supportTicketId, supportTickets.id),
      )
      .leftJoin(admins, eq(supportTicketAnswers.answererAdminId, admins.id))
      .leftJoin(
        supervisors,
        eq(supportTicketAnswers.answererSupervisorId, supervisors.id),
      )
      .leftJoin(
        employees,
        eq(supportTicketAnswers.answererEmployeeId, employees.id),
      )
      .leftJoin(
        users,
        or(
          eq(users.id, admins.userId),
          eq(users.id, supervisors.userId),
          eq(users.id, employees.userId),
        ),
      )
      .where(eq(supportTicketAnswers.supportTicketId, supportTicketId))
      .orderBy(supportTicketAnswers.createdAt);

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<SupportTicketAnswer | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.db
      .delete(supportTicketAnswers)
      .where(eq(supportTicketAnswers.id, id));
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: supportTicketAnswers.id })
      .from(supportTicketAnswers)
      .where(eq(supportTicketAnswers.id, id))
      .limit(1);
    return !!result;
  }

  async count(): Promise<number> {
    const [result] = await this.db
      .select({ count: supportTicketAnswers.id })
      .from(supportTicketAnswers);
    return result ? Number(result.count) : 0;
  }

  async findByIds(ids: string[]): Promise<SupportTicketAnswer[]> {
    if (ids.length === 0) return [];

    const results = await this.db
      .select({
        answer: supportTicketAnswers,
        supportTicket: supportTickets,
        answerer: users,
      })
      .from(supportTicketAnswers)
      .innerJoin(
        supportTickets,
        eq(supportTicketAnswers.supportTicketId, supportTickets.id),
      )
      .leftJoin(admins, eq(supportTicketAnswers.answererAdminId, admins.id))
      .leftJoin(
        supervisors,
        eq(supportTicketAnswers.answererSupervisorId, supervisors.id),
      )
      .leftJoin(
        employees,
        eq(supportTicketAnswers.answererEmployeeId, employees.id),
      )
      .leftJoin(
        users,
        or(
          eq(users.id, admins.userId),
          eq(users.id, supervisors.userId),
          eq(users.id, employees.userId),
        ),
      )
      .where(inArray(supportTicketAnswers.id, ids));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findBySupportTicketIds(ids: string[]): Promise<SupportTicketAnswer[]> {
    if (ids.length === 0) return [];

    const results = await this.db
      .select({
        answer: supportTicketAnswers,
        supportTicket: supportTickets,
        answerer: users,
      })
      .from(supportTicketAnswers)
      .innerJoin(
        supportTickets,
        eq(supportTicketAnswers.supportTicketId, supportTickets.id),
      )
      .leftJoin(admins, eq(supportTicketAnswers.answererAdminId, admins.id))
      .leftJoin(
        supervisors,
        eq(supportTicketAnswers.answererSupervisorId, supervisors.id),
      )
      .leftJoin(
        employees,
        eq(supportTicketAnswers.answererEmployeeId, employees.id),
      )
      .leftJoin(
        users,
        or(
          eq(users.id, admins.userId),
          eq(users.id, supervisors.userId),
          eq(users.id, employees.userId),
        ),
      )
      .where(inArray(supportTicketAnswers.supportTicketId, ids));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }
}
