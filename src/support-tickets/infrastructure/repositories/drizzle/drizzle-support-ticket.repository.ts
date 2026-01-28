import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  FrequentTicketSubject,
  SupportTicketRepository,
  SupportTicketMetrics,
  GetAllTicketsAndMetricsOutput,
  GetAllTicketsOptions,
  GetByCodeResponse,
} from '../../../domain/repositories/support-ticket.repository';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../../domain/entities/support-ticket.entity';
import {
  Department,
  DepartmentVisibility,
} from 'src/department/domain/entities/department.entity';
import {
  InteractionType,
  SupportTicketInteraction,
} from 'src/support-tickets/domain/entities/support-ticket-interaction.entity';
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
import { CursorInput, PaginatedArrayResult, createCursorPagination, PaginatedObjectResult } from 'src/common/drizzle/helpers/cursor';

export enum SupportTicketStatusMapping {
  NEW = 'new',
  SEEN = 'seen',
  ANSWERED = 'answered',
  CLOSED = 'closed',
}

type SupportTicketCursorData = { createdAt: string; id: string };

@Injectable()
export class DrizzleSupportTicketRepository extends SupportTicketRepository {
  private readonly pagination = createCursorPagination<SupportTicketCursorData>({
    table: supportTickets,
    cursorFields: [
      { column: supportTickets.createdAt, key: 'createdAt' },
      { column: supportTickets.id, key: 'id' },
    ],
    defaultPageSize: 10,
    sortDirection: 'desc',
  });

  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private async toDomain(rec: {
    ticket: typeof supportTickets.$inferSelect;
    department: typeof departments.$inferSelect;
    interaction?: typeof supportTicketInteractions.$inferSelect;
    answer: typeof supportTicketAnswers.$inferSelect;
  }): Promise<SupportTicket> {
    return SupportTicket.fromPersistence({
      id: rec.ticket.id,
      subject: rec.ticket.subject,
      description: rec.ticket.description,
      departmentId: rec.ticket.departmentId,
      department: rec.department
        ? Department.create({
          id: rec.department.id,
          name: rec.department.name,
          parentId: rec.department.parentId,
          visibility:
            DepartmentVisibility[rec.department.visibility.toUpperCase()],
        })
        : undefined,
      status: SupportTicketStatus[rec.ticket.status.toUpperCase()],
      createdAt: new Date(rec.ticket.createdAt),
      updatedAt: new Date(rec.ticket.updatedAt),
      code: rec.ticket.code,
      interaction: rec.interaction
        ? SupportTicketInteraction.create({
          id: rec.interaction.id,
          supportTicketId: rec.ticket.id,
          type: InteractionType[rec.interaction.type.toUpperCase()],
          guestId: rec.interaction.guestId,
        })
        : undefined,
      guestName: rec.ticket.guestName,
      guestPhone: rec.ticket.guestPhone,
      guestEmail: rec.ticket.guestEmail,
      answer: rec?.answer
        ? SupportTicketAnswer.create({
          id: rec.answer.id,
          supportTicketId: rec.ticket.id,
          content: rec.answer.content,
          createdAt: new Date(rec.answer.createdAt),
          updatedAt: new Date(rec.answer.updatedAt),
        })
        : undefined,
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
    options?: {
      cursor?: CursorInput,
      departmentIds?: string[],
      start?: Date,
      end?: Date,
      status?: SupportTicketStatus,
      search?: string,
    }
  ): Promise<PaginatedArrayResult<SupportTicket>> {
    const paginationParams = this.pagination.parseInput(options.cursor);
    const cursorCondition: SQL | undefined = paginationParams.cursorData ? this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    ) : undefined;

    const whereConditions: SQL[] = [];
    const { departmentIds, start, end, status, search } = options ?? {};
    if (departmentIds && departmentIds.length > 0) {
      whereConditions.push(inArray(supportTickets.departmentId, departmentIds));
    }

    if (start || end) {
      const dateConditions: SQL[] = [];
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

    if (cursorCondition) {
      whereConditions.push(cursorCondition);
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
      .limit(paginationParams.limit)

    const results = whereClause ? await query.where(whereClause) : await query;

    const { data, meta } = this.pagination.processResults(results, paginationParams, (r) => ({
      createdAt: r.ticket.createdAt,
      id: r.ticket.id,
    }));

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
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
    options: {
      departmentId: string,
      cursor?: CursorInput,
      status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
    }
  ): Promise<PaginatedArrayResult<SupportTicket>> {
    const { departmentId, cursor, status } = options;
    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = paginationParams.cursorData ? this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    ) : undefined;

    const whereConditions: SQL[] = [
      eq(supportTickets.departmentId, departmentId),
    ];

    if (status) {
      whereConditions.push(
        eq(supportTickets.status, SupportTicketStatusMapping[status]),
      );
    }

    if (cursorCondition) whereConditions.push(cursorCondition)

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
      .limit(paginationParams.limit)
      .orderBy(...this.pagination.getOrderBy());

    const { data, meta } = this.pagination.processResults(results, paginationParams, (r) => ({
      createdAt: r.ticket.createdAt,
      id: r.ticket.id,
    }));

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async search({ query, cursor }: {
    query: string,
    cursor?: CursorInput,
  }): Promise<PaginatedArrayResult<SupportTicket>> {
    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = paginationParams.cursorData ? this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    ) : undefined;

    const whereConditions: SQL[] = [
      or(
        ilike(supportTickets.subject, `%${query}%`),
        ilike(supportTickets.description, `%${query}%`),
        ilike(supportTickets.guestName, `%${query}%`),
        ilike(supportTickets.guestPhone, `%${query}%`),
        ilike(users.name, `%${query}%`),
        ilike(departments.name, `%${query}%`),
      ),
    ];

    if (cursorCondition) whereConditions.push(cursorCondition);

    const whereClause = whereConditions.length > 0 ? whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0] : undefined;

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
        whereClause
      )
      .orderBy(...this.pagination.getOrderBy())
      .limit(paginationParams.limit);

    const { data, meta } = this.pagination.processResults(results, paginationParams, (r) => ({
      createdAt: r.ticket.createdAt,
      id: r.ticket.id,
    }));

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
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

  async findByCode(code: string): Promise<GetByCodeResponse | null> {
    const results = await this.db
      .select({
        ticket: supportTickets,
        department: departments,
        // interaction: supportTicketInteractions,
        answer: supportTicketAnswers,
        isRated: sql<boolean>`EXISTS (
          SELECT 1 FROM ${supportTicketInteractions} sti
          WHERE sti.support_ticket_id = ${supportTickets.id}::uuid
        )`.as('isRated'),
      })
      .from(supportTickets)
      .leftJoin(departments, eq(supportTickets.departmentId, departments.id))
      .leftJoin(
        supportTicketAnswers,
        eq(supportTickets.id, supportTicketAnswers.supportTicketId),
      )
      .where(eq(supportTickets.code, code))
      .limit(1);

    console.log(results);

    if (results.length === 0) return null;

    const attachmentRows = await this.db
      .select()
      .from(attachments)
      .where(
        inArray(attachments.targetId, [
          results[0].ticket.id,
          ...results.map((r) => r.answer?.id),
        ]),
      );

    return results.length > 0
      ? {
        ticket: await this.toDomain({
          ticket: results[0].ticket,
          department: results[0].department,
          answer: results[0].answer,
        }),
        answers: results
          .filter((r) => r.answer !== null)
          .map((r) =>
            SupportTicketAnswer.create({
              id: r.answer.id,
              supportTicketId: r.ticket.id,
              content: r.answer.content,
              createdAt: new Date(r.answer.createdAt),
              updatedAt: new Date(r.answer.updatedAt),
            }),
          ),
        fileHubAttachments: attachmentRows.map((r) =>
          Attachment.create({
            id: r.id,
            type: r.type,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            targetId: r.targetId,
            expirationDate: r.expirationDate
              ? new Date(r.expirationDate)
              : undefined,
            filename: r.filename,
            originalName: r.originalName,
            userId: r.userId,
            guestId: r.guestId,
            isGlobal: r.isGlobal,
            size: r.size,
            cloned: r.cloned,
          }),
        ),
        isRated: results[0].isRated,
      }
      : null;
  }

  async findByPhoneNumber(
    { phone, cursor }: {
      phone: string,
      cursor?: CursorInput,
    }
  ): Promise<
    PaginatedArrayResult<{
      id: string;
      subject: string;
      description: string;
      answer?: string;
      isRated: boolean;
      departmentId: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = paginationParams.cursorData ? this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    ) : undefined;

    const whereConditions: SQL[] = [
      eq(supportTickets.guestPhone, phone),
    ];

    if (cursorCondition) whereConditions.push(cursorCondition);

    const whereClause = whereConditions.length > 0 ? whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0] : undefined;

    const rows = await this.db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        description: supportTickets.description,
        departmentId: supportTickets.departmentId,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        status: sql<string>`UPPER(${supportTickets.status}::text)`,
        code: supportTickets.code,
        answer: sql<string | null>`
          SELECT content
          FROM ${supportTicketAnswers}
          WHERE ${supportTicketAnswers.supportTicketId} = ${supportTickets.id}
          ORDER BY id
          LIMIT 1
      `,
        isRated: sql<boolean>`
        EXISTS(
          SELECT 1
          FROM ${supportTicketInteractions}
          WHERE ${supportTicketInteractions.supportTicketId} = ${supportTickets.id}
        )`,
      })
      .from(supportTickets)
      .where(whereClause)
      .orderBy(...this.pagination.getOrderBy())
      .limit(paginationParams.limit);

    const { data, meta } = this.pagination.processResults(rows, paginationParams, (r) => ({
      createdAt: r.createdAt,
      id: r.id,
    }));

    return {
      data: data.map((r) => ({
        id: r.id,
        subject: r.subject,
        description: r.description,
        answer: r.answer ?? undefined,
        isRated: r.isRated,
        departmentId: r.departmentId,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      })),
      meta,
    };
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
  ): Promise<PaginatedObjectResult<GetAllTicketsAndMetricsOutput>> {
    const departmentIds = await this._departmentIdsForSupervisor(
      options.supervisorUserId,
    );
    return this._getAllTicketsAndMetrics(departmentIds, options);
  }

  async getAllTicketsAndMetricsForEmployee(
    options: GetAllTicketsOptions & { employeeUserId: string },
  ): Promise<PaginatedObjectResult<GetAllTicketsAndMetricsOutput>> {
    const departmentIds = await this._departmentIdsForEmployee(
      options.employeeUserId,
    );
    return this._getAllTicketsAndMetrics(departmentIds, options);
  }

  async getAllTicketsAndMetricsForAdmin(
    options: GetAllTicketsOptions,
  ): Promise<PaginatedObjectResult<GetAllTicketsAndMetricsOutput>> {
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
  ): Promise<PaginatedObjectResult<GetAllTicketsAndMetricsOutput>> {
    /* ---------- department filter ----------------------------------- */
    let departmentIds = allowedDepartmentIds;

    const paginationParams = this.pagination.parseInput(options.cursor);
    const cursorCondition = paginationParams.cursorData ? this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    ) : undefined;

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

    if (cursorCondition) whereConditions.push(cursorCondition);

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
        .limit(paginationParams.limit)
      ,
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

    const { meta } = this.pagination.processResults(tickets, paginationParams, (r) => ({
      createdAt: r.support_tickets.createdAt,
      id: r.support_tickets.id,
    }));

    /* ---------- mapping --------------------------------------------- */
    return {
      data: {
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
      }, meta
    };
  }
}
