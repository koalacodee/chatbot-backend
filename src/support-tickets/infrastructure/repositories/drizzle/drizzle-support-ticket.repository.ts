import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  FrequentTicketSubject,
  SupportTicketRepository,
  SupportTicketMetrics,
} from '../../../domain/repositories/support-ticket.repository';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../../domain/entities/support-ticket.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { User } from 'src/shared/entities/user.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { SupportTicketInteraction } from 'src/support-tickets/domain/entities/support-ticket-interaction.entity';
import {
  supportTickets,
  employees,
  users,
  departments,
  supportTicketInteractions,
  supportTicketAnswers,
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
} from 'drizzle-orm';

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

    if (status.length > 0) {
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
}
