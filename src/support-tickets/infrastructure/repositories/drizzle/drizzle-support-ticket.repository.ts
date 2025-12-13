import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  FrequentTicketSubject,
  SupportTicketRepository,
  SupportTicketMetrics,
  GetAllTicketsAndMetricsOutput,
  GetAllTicketsOptions,
} from '../../../domain/repositories/support-ticket.repository';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../../domain/entities/support-ticket.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { User } from 'src/shared/entities/user.entity';
import {
  Department,
  DepartmentVisibility,
} from 'src/department/domain/entities/department.entity';
import { SupportTicketInteraction } from 'src/support-tickets/domain/entities/support-ticket-interaction.entity';
import {
  supportTickets,
  employees,
  users,
  departments,
  supportTicketInteractions,
  supportTicketAnswers,
  supervisors,
  departmentToSupervisor,
  attachments,
  employeeSubDepartments,
} from 'src/common/drizzle/schema';
import {
  eq,
  inArray,
  and,
  or,
  gte,
  lte,
  ilike,
  desc,
  sql,
  count,
  SQL,
} from 'drizzle-orm';
import { TicketCode } from 'src/tickets/domain/value-objects/ticket-code.vo';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';

export enum SupportTicketStatusMapping {
  NEW = 'new',
  SEEN = 'seen',
  ANSWERED = 'answered',
  CLOSED = 'closed',
}

@Injectable()
export class DrizzleSupportTicketRepository extends SupportTicketRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private async toDomain(rec: any): Promise<SupportTicket> {
    return SupportTicket.fromPersistence({
      id: rec.ticket.id,
      subject: rec.ticket.subject,
      description: rec.ticket.description,
      departmentId: rec.ticket.departmentId,
      department: rec.department
        ? Department.create(rec.department)
        : undefined,
      assignee: rec.assignee
        ? await Employee.create({
            ...rec.assignee,
            user: await User.create(rec.user),
          })
        : undefined,
      status: SupportTicketStatus[rec.ticket.status.toUpperCase()],
      createdAt: new Date(rec.ticket.createdAt),
      updatedAt: new Date(rec.ticket.updatedAt),
      code: rec.ticket.code,
      interaction: rec.interaction
        ? SupportTicketInteraction.create(rec.interaction)
        : undefined,
      guestName: rec.ticket.guestName,
      guestPhone: rec.ticket.guestPhone,
      guestEmail: rec.ticket.guestEmail,
      answer: rec?.answer?.content || undefined,
    });
  }

  async save(ticket: SupportTicket): Promise<SupportTicket> {
    const data = {
      id: ticket.id.toString(),
      subject: ticket.subject,
      description: ticket.description,
      departmentId: ticket.departmentId.toString(),
      assigneeId: ticket.assignee?.id.toString() || null,
      status: SupportTicketStatusMapping[ticket.status],
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
      code: ticket.code.toString(),
      guestName: ticket.toJSON().guestName,
      guestPhone: ticket.toJSON().guestPhone,
      guestEmail: ticket.toJSON().guestEmail,
    };

    // Check if exists
    const [existing] = await this.db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, data.id))
      .limit(1);

    if (existing) {
      // Update
      await this.db
        .update(supportTickets)
        .set({
          subject: data.subject,
          description: data.description,
          status: data.status,
          updatedAt: data.updatedAt,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestEmail: data.guestEmail,
        })
        .where(eq(supportTickets.id, data.id));
    } else {
      // Insert
      await this.db.insert(supportTickets).values(data);
    }

    return this.findById(data.id);
  }

  async findById(id: string): Promise<SupportTicket | null> {
    const results = await this.db
      .select({
        ticket: supportTickets,
        assignee: employees,
        user: users,
        department: departments,
        interaction: supportTicketInteractions,
        answer: supportTicketAnswers,
      })
      .from(supportTickets)
      .leftJoin(employees, eq(supportTickets.assigneeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(departments, eq(supportTickets.departmentId, departments.id))
      .leftJoin(
        supportTicketInteractions,
        eq(supportTickets.id, supportTicketInteractions.supportTicketId),
      )
      .leftJoin(
        supportTicketAnswers,
        eq(supportTickets.id, supportTicketAnswers.supportTicketId),
      )
      .where(eq(supportTickets.id, id))
      .limit(1);

    return results.length > 0 ? this.toDomain(results[0]) : null;
  }

  async findAll(
    offset?: number,
    limit?: number,
    departmentIds?: string[],
    start?: Date,
    end?: Date,
    status?: SupportTicketStatus,
    search?: string,
  ): Promise<SupportTicket[]> {
    const whereConditions: any[] = [];

    if (departmentIds && departmentIds.length > 0) {
      whereConditions.push(inArray(supportTickets.departmentId, departmentIds));
    }

    if (start || end) {
      const dateConditions: any[] = [];
      if (start) {
        dateConditions.push(gte(supportTickets.createdAt, start.toISOString()));
      }
      if (end) {
        dateConditions.push(lte(supportTickets.createdAt, end.toISOString()));
      }
      if (dateConditions.length > 0) {
        whereConditions.push(and(...dateConditions));
      }
    }

    if (status) {
      whereConditions.push(
        eq(supportTickets.status, SupportTicketStatusMapping[status]),
      );
    }

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      whereConditions.push(
        or(
          ilike(supportTickets.subject, `%${normalizedSearch}%`),
          ilike(supportTickets.description, `%${normalizedSearch}%`),
          ilike(supportTickets.guestEmail, `%${normalizedSearch}%`),
          ilike(supportTickets.guestName, `%${normalizedSearch}%`),
          ilike(supportTickets.guestPhone, `%${normalizedSearch}%`),
        ),
      );
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const query = this.db
      .select({
        ticket: supportTickets,
        assignee: employees,
        user: users,
        department: departments,
        interaction: supportTicketInteractions,
        answer: supportTicketAnswers,
      })
      .from(supportTickets)
      .leftJoin(employees, eq(supportTickets.assigneeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(departments, eq(supportTickets.departmentId, departments.id))
      .leftJoin(
        supportTicketInteractions,
        eq(supportTickets.id, supportTicketInteractions.supportTicketId),
      )
      .leftJoin(
        supportTicketAnswers,
        eq(supportTickets.id, supportTicketAnswers.supportTicketId),
      )
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit || 1000)
      .offset(offset || 0);

    const results = whereClause ? await query.where(whereClause) : await query;

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<SupportTicket | null> {
    const rec = await this.findById(id);
    if (!rec) return null;
    await this.db.delete(supportTickets).where(eq(supportTickets.id, id));
    return rec;
  }

  async exists(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);
    return !!result;
  }

  async count(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(supportTickets);
    return result ? Number(result.count) : 0;
  }

  async countOpenTickets(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'new'));
    return result ? Number(result.count) : 0;
  }

  async countAnsweredPendingClosure(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'answered'));
    return result ? Number(result.count) : 0;
  }

  async findByDepartment(
    departmentId: string,
    status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
  ): Promise<SupportTicket[]> {
    const whereConditions: any[] = [
      eq(supportTickets.departmentId, departmentId),
    ];

    if (status) {
      whereConditions.push(
        eq(supportTickets.status, SupportTicketStatusMapping[status]),
      );
    }

    const results = await this.db
      .select({
        ticket: supportTickets,
        assignee: employees,
        user: users,
        department: departments,
        interaction: supportTicketInteractions,
        answer: supportTicketAnswers,
      })
      .from(supportTickets)
      .leftJoin(employees, eq(supportTickets.assigneeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(departments, eq(supportTickets.departmentId, departments.id))
      .leftJoin(
        supportTicketInteractions,
        eq(supportTickets.id, supportTicketInteractions.supportTicketId),
      )
      .leftJoin(
        supportTicketAnswers,
        eq(supportTickets.id, supportTicketAnswers.supportTicketId),
      )
      .where(and(...whereConditions))
      .orderBy(desc(supportTickets.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async search(query: string): Promise<SupportTicket[]> {
    const results = await this.db
      .select({
        ticket: supportTickets,
        assignee: employees,
        user: users,
        department: departments,
        interaction: supportTicketInteractions,
        answer: supportTicketAnswers,
      })
      .from(supportTickets)
      .leftJoin(employees, eq(supportTickets.assigneeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(departments, eq(supportTickets.departmentId, departments.id))
      .leftJoin(
        supportTicketInteractions,
        eq(supportTickets.id, supportTicketInteractions.supportTicketId),
      )
      .leftJoin(
        supportTicketAnswers,
        eq(supportTickets.id, supportTicketAnswers.supportTicketId),
      )
      .where(
        or(
          eq(supportTickets.id, query),
          ilike(supportTickets.subject, `%${query}%`),
          ilike(supportTickets.description, `%${query}%`),
          eq(supportTickets.assigneeId, query),
          ilike(supportTickets.guestName, `%${query}%`),
          ilike(supportTickets.guestPhone, `%${query}%`),
          ilike(users.name, `%${query}%`),
          ilike(departments.name, `%${query}%`),
        ),
      )
      .orderBy(desc(supportTickets.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async getFrequentTicketSubjects(
    limit: number = 5,
  ): Promise<FrequentTicketSubject[]> {
    return this.db
      .execute<FrequentTicketSubject>(
        sql`
      WITH TicketSubjects AS (
        SELECT 
          LOWER(TRIM(st.subject)) AS subject_lower,
          TRIM(st.subject) AS subject_original,
          st.department_id,
          COUNT(*) AS count
        FROM support_tickets st
        WHERE st.subject IS NOT NULL 
          AND TRIM(st.subject) <> ''
          AND LOWER(TRIM(st.subject)) NOT IN (
            SELECT LOWER(TRIM(q.text))
            FROM questions q
          )
        GROUP BY LOWER(TRIM(st.subject)), TRIM(st.subject), st.department_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        ts.subject_original,
        ts.count,
        ts.department_id AS category_id,
        COALESCE(d.name, 'Unknown') AS category_name
      FROM TicketSubjects ts
      LEFT JOIN departments d ON d.id = ts.department_id
      ORDER BY ts.count DESC
      LIMIT ${limit};
    `,
      )
      .then((result: any) => result.rows || result);
  }

  async findByCode(code: string): Promise<SupportTicket | null> {
    const results = await this.db
      .select({
        ticket: supportTickets,
        assignee: employees,
        user: users,
        department: departments,
        interaction: supportTicketInteractions,
        answer: supportTicketAnswers,
      })
      .from(supportTickets)
      .leftJoin(employees, eq(supportTickets.assigneeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(departments, eq(supportTickets.departmentId, departments.id))
      .leftJoin(
        supportTicketInteractions,
        eq(supportTickets.id, supportTicketInteractions.supportTicketId),
      )
      .leftJoin(
        supportTicketAnswers,
        eq(supportTickets.id, supportTicketAnswers.supportTicketId),
      )
      .where(eq(supportTickets.code, code))
      .limit(1);

    return results.length > 0 ? this.toDomain(results[0]) : null;
  }

  async findByPhoneNumber(
    phone: string,
    offset: number = 0,
    limit: number = 10,
  ): Promise<
    {
      id: string;
      subject: string;
      description: string;
      answer?: string;
      isRated: boolean;
      departmentId: string;
      createdAt: Date;
      updatedAt: Date;
      status: SupportTicketStatus;
    }[]
  > {
    return this.db
      .execute(
        sql`
      WITH PhoneTickets AS (
        SELECT 
          st.id,
          st.subject,
          st.description,
          st.department_id as "departmentId",
          st.created_at as "createdAt",
          st.updated_at as "updatedAt",
          st.guest_phone,
          st.status,
          st.code
        FROM support_tickets st
        WHERE st.guest_phone = ${phone}
      ),
      TicketAnswers AS (
        SELECT 
          sta.support_ticket_id,
          sta.content as answer
        FROM support_ticket_answers sta
      ),
      TicketRatings AS (
        SELECT 
          sti.support_ticket_id,
          CASE 
            WHEN sti.id IS NOT NULL THEN true 
            ELSE false 
          END as "isRated"
        FROM support_ticket_interactions sti
      )
      SELECT 
        pt.id,
        pt.subject,
        pt.description,
        ta.answer,
        COALESCE(tr."isRated", false) as "isRated",
        pt."departmentId",
        pt."createdAt",
        pt."updatedAt",
        UPPER(pt.status::text) AS status,
        pt.code
      FROM PhoneTickets pt
      LEFT JOIN TicketAnswers ta ON ta.support_ticket_id = pt.id
      LEFT JOIN TicketRatings tr ON tr.support_ticket_id = pt.id
      ORDER BY pt."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset};
    `,
      )
      .then((result: any) => result.rows || result);
  }

  async getMetrics(
    departmentIds?: string[],
    status?: SupportTicketStatus,
    search?: string,
  ): Promise<SupportTicketMetrics> {
    const whereConditions: any[] = [];

    if (departmentIds?.length) {
      whereConditions.push(inArray(supportTickets.departmentId, departmentIds));
    }

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      whereConditions.push(
        or(
          ilike(supportTickets.subject, `%${normalizedSearch}%`),
          ilike(supportTickets.description, `%${normalizedSearch}%`),
          ilike(supportTickets.guestEmail, `%${normalizedSearch}%`),
          ilike(supportTickets.guestName, `%${normalizedSearch}%`),
          ilike(supportTickets.guestPhone, `%${normalizedSearch}%`),
        ),
      );
    }

    // const statusFilter = status
    //   ? [status.toLowerCase()]
    //   : ['new', 'seen', 'answered', 'closed'];

    // whereConditions.push(inArray(supportTickets.status, statusFilter));

    if (status) {
      whereConditions.push(
        eq(supportTickets.status, SupportTicketStatusMapping[status]),
      );
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const query = this.db
      .select({
        status: supportTickets.status,
        count: count(),
      })
      .from(supportTickets)
      .groupBy(supportTickets.status);

    const grouped = whereClause ? await query.where(whereClause) : await query;

    const metrics = {
      totalTickets: 0,
      pendingTickets: 0,
      answeredTickets: 0,
      closedTickets: 0,
    };

    const pendingStatuses = ['new', 'seen'];

    for (const row of grouped) {
      const currentStatus = row.status;
      const countValue = Number(row.count);
      metrics.totalTickets += countValue;
      if (pendingStatuses.includes(currentStatus)) {
        metrics.pendingTickets += countValue;
      } else if (currentStatus === 'answered') {
        metrics.answeredTickets += countValue;
      } else if (currentStatus === 'closed') {
        metrics.closedTickets += countValue;
      }
    }

    return metrics;
  }

  /* ------------------------------------------------------------------ */
  /* public façade – keep the original signatures                         */
  /* ------------------------------------------------------------------ */
  async getAllTicketsAndMetricsForSupervisor(
    options: GetAllTicketsOptions & { supervisorUserId: string },
  ): Promise<GetAllTicketsAndMetricsOutput> {
    const departmentIds = await this._departmentIdsForSupervisor(
      options.supervisorUserId,
    );
    return this._getAllTicketsAndMetrics(departmentIds, options);
  }

  async getAllTicketsAndMetricsForEmployee(
    options: GetAllTicketsOptions & { employeeUserId: string },
  ): Promise<GetAllTicketsAndMetricsOutput> {
    const departmentIds = await this._departmentIdsForEmployee(
      options.employeeUserId,
    );
    return this._getAllTicketsAndMetrics(departmentIds, options);
  }

  async getAllTicketsAndMetricsForAdmin(
    options: GetAllTicketsOptions,
  ): Promise<GetAllTicketsAndMetricsOutput> {
    // Admin may see every department – pass undefined so no filter is injected
    return this._getAllTicketsAndMetrics(undefined, options);
  }

  /* ------------------------------------------------------------------ */
  /* private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** Returns the list of departments the supervisor is responsible for. */
  private async _departmentIdsForSupervisor(userId: string): Promise<string[]> {
    const [supervisor] = await this.db
      .select()
      .from(supervisors)
      .where(eq(supervisors.userId, userId))
      .limit(1);

    if (!supervisor) throw new Error('Supervisor not found');

    const rows = await this.db
      .select()
      .from(departmentToSupervisor)
      .innerJoin(
        departments,
        or(
          eq(departmentToSupervisor.a, departments.id),
          eq(departmentToSupervisor.a, departments.parentId),
        ),
      )
      .where(eq(departmentToSupervisor.b, supervisor.id));

    return rows.map((r) => r.departments.id);
  }

  /** Returns the list of departments the employee belongs to. */
  private async _departmentIdsForEmployee(userId: string): Promise<string[]> {
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId))
      .limit(1);

    if (!employee) throw new Error('Employee not found');

    const rows = await this.db
      .select()
      .from(employeeSubDepartments)
      .innerJoin(
        departments,
        eq(employeeSubDepartments.departmentId, departments.id),
      )
      .where(eq(employeeSubDepartments.employeeId, employee.id));

    const set = new Set<string>();
    rows.forEach((r) => {
      set.add(r.departments.id);
      if (r.departments.parentId) set.add(r.departments.parentId);
    });
    return Array.from(set);
  }

  /**
   * Shared implementation.
   * @param allowedDepartmentIds  Departments the caller may see.
   *                               undefined → admin, no extra filter.
   * @param options               Original options (may contain departmentIds override)
   */
  private async _getAllTicketsAndMetrics(
    allowedDepartmentIds: string[] | undefined,
    options: GetAllTicketsOptions,
  ): Promise<GetAllTicketsAndMetricsOutput> {
    /* ---------- department filter ----------------------------------- */
    let departmentIds = allowedDepartmentIds;

    if (options.departmentIds?.length) {
      if (
        allowedDepartmentIds &&
        !options.departmentIds.every((id) => allowedDepartmentIds.includes(id))
      ) {
        throw new Error('department_ids_inaccessible');
      }
      await this.db
        .select()
        .from(departments)
        .where(inArray(departments.parentId, options.departmentIds))
        .then((rows) => {
          departmentIds = [...options.departmentIds, ...rows.map((r) => r.id)];
        });
    }

    /* ---------- dynamic WHERE --------------------------------------- */
    const whereConditions: SQL[] = [];

    if (departmentIds) {
      whereConditions.push(inArray(supportTickets.departmentId, departmentIds));
    }

    if (options.status) {
      whereConditions.push(
        eq(supportTickets.status, SupportTicketStatusMapping[options.status]),
      );
    }

    if (options.search) {
      whereConditions.push(
        or(
          ilike(supportTickets.subject, `%${options.search}%`),
          ilike(supportTickets.description, `%${options.search}%`),
          ilike(supportTickets.guestEmail, `%${options.search}%`),
          ilike(supportTickets.guestName, `%${options.search}%`),
          ilike(supportTickets.guestPhone, `%${options.search}%`),
        ),
      );
    }

    const whereClause =
      whereConditions.length === 0
        ? undefined
        : whereConditions.length === 1
          ? whereConditions[0]
          : and(...whereConditions);

    /* ---------- queries --------------------------------------------- */
    const [tickets, metrics] = await Promise.all([
      this.db
        .select()
        .from(supportTickets)
        .leftJoin(
          supportTicketAnswers,
          eq(supportTickets.id, supportTicketAnswers.supportTicketId),
        )
        .innerJoin(departments, eq(supportTickets.departmentId, departments.id))
        .where(whereClause)
        .limit(options.limit || 10)
        .offset(options.offset || 0),
      this.getMetrics(departmentIds, options.status, options.search),
    ]);

    /* ---------- attachments ----------------------------------------- */
    const targetIds = new Set<string>();
    tickets.forEach((t) => {
      targetIds.add(t.support_tickets.id);
      if (t.support_ticket_answers) {
        targetIds.add(t.support_ticket_answers.id);
      }
    });

    const attachmentRows = await this.db
      .select()
      .from(attachments)
      .where(inArray(attachments.targetId, Array.from(targetIds)));

    /* ---------- mapping --------------------------------------------- */
    return {
      metrics,
      tickets: tickets.map((t) =>
        SupportTicket.create({
          id: t.support_tickets.id,
          subject: t.support_tickets.subject,
          description: t.support_tickets.description,
          departmentId: t.support_tickets.departmentId,
          createdAt: new Date(t.support_tickets.createdAt),
          updatedAt: new Date(t.support_tickets.updatedAt),
          status: SupportTicketStatus[t.support_tickets.status.toUpperCase()],
          code: TicketCode.create(t.support_tickets.code),
          guestName: t.support_tickets.guestName,
          guestEmail: t.support_tickets.guestEmail,
          guestPhone: t.support_tickets.guestPhone,
          answer: t.support_ticket_answers
            ? SupportTicketAnswer.create({
                id: t.support_ticket_answers.id,
                content: t.support_ticket_answers.content,
                createdAt: new Date(t.support_ticket_answers.createdAt),
                updatedAt: new Date(t.support_ticket_answers.updatedAt),
                supportTicketId: t.support_tickets.id,
              })
            : undefined,
          department: Department.create({
            id: t.departments.id,
            name: t.departments.name,
            parentId: t.departments.parentId,
            visibility:
              DepartmentVisibility[t.departments.visibility.toUpperCase()],
          }),
        }),
      ),
      attachments: attachmentRows.map((a) =>
        Attachment.create({
          ...a,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
          expirationDate: new Date(a.expirationDate),
        }),
      ),
    };
  }
}
