import { Injectable } from '@nestjs/common';
import {
  SQL,
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notInArray,
  or,
  sql,
  sum,
} from 'drizzle-orm';
import { PgColumn, alias } from 'drizzle-orm/pg-core';
import { buildConflictUpdateColumns, DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  activityLogs,
  admins,
  departmentToSupervisor,
  departments,
  employees,
  promotions,
  questions,
  supervisors,
  supportTicketAnswers,
  supportTicketInteractions,
  supportTickets,
  taskSubmissions,
  tasks,
  users,
} from 'src/common/drizzle/schema';
import {
  ActivityLog,
  ActivityLogType,

} from '../../domain/entities/activity-log.entity';
import {
  Activity,
  ActivityLogRepository,
  ActivityTypePayload,
  AllGroupedActivities,
  DashboardAggregatedResult,
  PerformanceSummary,
  QueryOutput,
  UserPerformanceArgs,
} from '../../domain/repositories/activity-log.repository';

/**
 * Prisma declared `enum ActivityLogType { TICKET_ANSWERED @map("ticket_answered") ... }`,
 * so it silently translated between the SCREAMING_CASE names the domain uses and the
 * lowercase labels that actually live in the Postgres enum. Drizzle does no such
 * mapping — `activityLogType` is the raw DB labels — so the translation has to happen
 * here, in both directions, or every read returns an unknown type and every write
 * fails the enum check.
 */
export type ActivityLogDbType = (typeof activityLogs.type.enumValues)[number];

export const DOMAIN_TO_DB: Record<ActivityLogType, ActivityLogDbType> = {
  [ActivityLogType.TICKET_ANSWERED]: 'ticket_answered',
  [ActivityLogType.TASK_PERFORMED]: 'task_performed',
  [ActivityLogType.TASK_APPROVED]: 'task_approved',
  [ActivityLogType.FAQ_CREATED]: 'faq_created',
  [ActivityLogType.FAQ_UPDATED]: 'faq_updated',
  [ActivityLogType.PROMOTION_CREATED]: 'promotion_created',
  [ActivityLogType.STAFF_REQUEST_CREATED]: 'staff_request_created',
};

export const DB_TO_DOMAIN = Object.entries(DOMAIN_TO_DB).reduce(
  (acc, [domain, db]) => {
    acc[db] = domain as ActivityLogType;
    return acc;
  },
  {} as Record<ActivityLogDbType, ActivityLogType>,
);

/**
 * Same story for AdminPermissions: Prisma mapped MANAGE_PROMOTIONS -> "manage_promotions",
 * so a permissions array read through Drizzle holds the lowercase label.
 */
const MANAGE_PROMOTIONS = 'manage_promotions';

/**
 * The two CASE ladders `getRecentActivity` used to run in Postgres. They are pure
 * string mapping over a 7-value enum, so they belong in TypeScript, where the compiler
 * enforces that every enum label is handled and the return type is a real union
 * instead of `string` cast to `any`.
 */
export const RECENT_ACTIVITY_KIND: Record<
  ActivityLogDbType,
  'ticket' | 'task' | 'faq' | 'user' | 'promotion'
> = {
  ticket_answered: 'ticket',
  task_performed: 'task',
  task_approved: 'task',
  faq_created: 'faq',
  faq_updated: 'faq',
  promotion_created: 'promotion',
  staff_request_created: 'user',
};

export const RECENT_ACTIVITY_DESCRIPTION: Record<
  ActivityLogDbType,
  (title: string) => string
> = {
  ticket_answered: (title) => `Ticket ${title} answered`,
  task_performed: (title) => `Task ${title} performed`,
  task_approved: (title) => `Task ${title} approved`,
  faq_created: (title) => `FAQ ${title} created`,
  faq_updated: (title) => `FAQ ${title} updated`,
  promotion_created: (title) => `Promotion ${title} created`,
  staff_request_created: (title) => `User ${title} requested`,
};

const OPEN_TICKET_STATUSES = ['new', 'seen'];

interface SupervisorScope {
  id: string;
  permissions: string[];
  departmentIds: string[];
}

type DrizzleActivityLog = typeof activityLogs.$inferSelect

@Injectable()
export class DrizzleActivityLogRepository extends ActivityLogRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(row: DrizzleActivityLog): ActivityLog {
    return ActivityLog.create({
      id: row.id,
      createdAt: row.createdAt,
      occurredAt: row.occurredAt,
      type: DB_TO_DOMAIN[row.type],
      title: row.title,
      meta: row.meta,
      itemId: row.itemId,
      userId: row.userId
    })
  }

  private fromDomain(log: ActivityLog): DrizzleActivityLog {
    return {
      ...log.toJSON(),
      type: DOMAIN_TO_DB[log.type]
    }
  }

  async save(log: ActivityLog): Promise<ActivityLog> {
    const saved = await this.db.insert(activityLogs).values(this.fromDomain(log)).onConflictDoUpdate({
      target: activityLogs.id,
      set: this.fromDomain(log)
    }).returning()

    return this.toDomain(saved[0])
  }

  async saveMany(logs: ActivityLog[]): Promise<ActivityLog[]> {
    const dbLogs = logs.map(this.fromDomain);

    const saved = await this.db.insert(activityLogs).values(dbLogs).onConflictDoUpdate({
      target: activityLogs.id,
      set: buildConflictUpdateColumns(activityLogs, ["createdAt", "itemId", "meta", "updatedAt", "userId", "type", "title", "occurredAt"])
    }).returning();

    return saved.map(this.toDomain)
  }

  async findById(id: string): Promise<ActivityLog | null> {
    const rows = await this.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<ActivityLog[]> {
    let query = this.db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map(this.toDomain);
  }

  async removeById(id: string): Promise<ActivityLog | null> {
    const deleted = await this.db
      .delete(activityLogs)
      .where(eq(activityLogs.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(activityLogs)
      .where(eq(activityLogs.id, id)).limit(1);

    return Number(rows.length) > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(activityLogs);

    return Number(rows[0].value);
  }

  async findByUserId(
    userId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]> {
    let query = this.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map(this.toDomain);
  }

  async findByItemId(
    itemId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]> {
    let query = this.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.itemId, itemId))
      .orderBy(desc(activityLogs.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map(this.toDomain);
  }

  async getAggregatedActivityFeed(options: {
    userId?: string;
    limit?: number;
    cursor?: string;
    supervisorId?: string;
  }): Promise<AllGroupedActivities> {
    const limit = options.limit ?? 10;

    let supervisorScope: SQL | undefined;

    if (options.supervisorId) {
      const [supervisor] = await this.db
        .select({ id: supervisors.id })
        .from(supervisors)
        .where(eq(supervisors.userId, options.supervisorId))
        .limit(1);

      if (!supervisor) return { data: [], nextCursor: null };

      supervisorScope = inArray(
        activityLogs.userId,
        this.db
          .select({ userId: employees.userId })
          .from(employees)
          .where(eq(employees.supervisorId, supervisor.id)),
      );
    }

    // One partitioned pass replaces the old `filtered` CTE, which materialised every
    // matching row and was then re-scanned twice per type plus once for DISTINCT.
    const ranked = this.db.$with('ranked').as(
      this.db
        .select({
          id: activityLogs.id,
          title: activityLogs.title,
          itemId: activityLogs.itemId,
          meta: activityLogs.meta,
          createdAt: activityLogs.createdAt,
          updatedAt: activityLogs.updatedAt,
          occurredAt: activityLogs.occurredAt,
          type: activityLogs.type,
          userId: activityLogs.userId,
          userName: users.name,
          employeeId: users.employeeId,
          rank: sql<number>`row_number() over (partition by ${activityLogs.type} order by ${activityLogs.occurredAt} desc)`.as(
            'rank',
          ),
        })
        .from(activityLogs)
        .innerJoin(users, eq(users.id, activityLogs.userId))
        .where(
          and(
            options.userId
              ? eq(activityLogs.userId, options.userId)
              : undefined,
            options.cursor
              ? lt(activityLogs.occurredAt, new Date(options.cursor))
              : undefined,
            supervisorScope,
          ),
        ),
    );

    const rows = await this.db
      .with(ranked)
      .select()
      .from(ranked)
      .where(lte(ranked.rank, limit))
      .orderBy(desc(ranked.occurredAt));

    // Grouping in TS instead of json_build_object/json_agg: the payload is genuinely
    // typed rather than asserted, and the DB stops building JSON it does not need to.
    const byType = new Map<ActivityLogDbType, Activity[]>();

    for (const row of rows) {
      const activities = byType.get(row.type) ?? [];

      activities.push({
        id: row.id,
        title: row.title,
        itemId: row.itemId,
        meta: row.meta as Record<string, any>,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        occurredAt: row.occurredAt.toISOString(),
        userId: row.userId,
        user: {
          id: row.userId,
          name: row.userName,
          employeeId: row.employeeId,
        },
      });

      byType.set(row.type, activities);
    }

    const data: ActivityTypePayload[] = [...byType.entries()].map(
      ([type, activities]) => ({ type, activities }),
    );

    // Replicates the old `min(last_occurred_at)` where last_occurred_at was
    // `max(occurred_at)` of each type's slice — i.e. the newest row of whichever type
    // has the oldest newest-row. Rows arrive occurred_at DESC, so index 0 is that max.
    const nextCursor = data.length
      ? data
          .map((payload) => payload.activities[0].occurredAt)
          .reduce((oldest, current) =>
            new Date(current) < new Date(oldest) ? current : oldest,
          )
      : null;

    return { data, nextCursor };
  }

  private async loadSupervisorScope(
    supervisorUserId: string,
  ): Promise<SupervisorScope | null> {
    const [supervisor] = await this.db
      .select({ id: supervisors.id, permissions: supervisors.permissions })
      .from(supervisors)
      .where(eq(supervisors.userId, supervisorUserId))
      .limit(1);

    if (!supervisor) return null;

    const owned = await this.db
      .select({ id: departmentToSupervisor.departmentId })
      .from(departmentToSupervisor)
      .where(eq(departmentToSupervisor.supervisorId, supervisor.id));

    return {
      id: supervisor.id,
      permissions: supervisor.permissions ?? [],
      departmentIds: owned.map((department) => department.id),
    };
  }

  /**
   * A supervisor sees a department if they own it outright, or if it is a sub-department
   * of one they own. The table is a parameter so the same rule can be applied to an
   * aliased copy when this needs to nest inside a subquery.
   *
   * The old SQL cast both sides to text to compare; `inArray` on a uuid column compares
   * uuid to uuid, which keeps the index usable.
   */
  private departmentScope(
    dept: { id: PgColumn; parentId: PgColumn },
    departmentIds: string[],
  ): SQL | undefined {
    if (departmentIds.length === 0) return undefined;

    return or(
      and(isNull(dept.parentId), inArray(dept.id, departmentIds)),
      and(isNotNull(dept.parentId), inArray(dept.parentId, departmentIds)),
    );
  }

  async getAgentPerformance(
    options: UserPerformanceArgs,
  ): Promise<QueryOutput> {
    let supervisor: SupervisorScope | null = null;

    if (options.supervisorId) {
      supervisor = await this.loadSupervisorScope(options.supervisorId);
      if (!supervisor) return null;
    }

    const departmentIds = supervisor?.departmentIds ?? [];
    const scoped = Boolean(supervisor && departmentIds.length > 0);

    // Two independent lists that the old query stitched together with json_agg purely to
    // return them in one round trip. Issued concurrently instead, so the cost is the
    // slower of the two rather than their sum — and each row is typed by the builder.
    const userRows = scoped
      ? this.db
          .select({ id: users.id, name: users.name, role: users.role })
          .from(users)
          .innerJoin(employees, eq(employees.userId, users.id))
          .where(eq(employees.supervisorId, supervisor.id))
      : this.db
          .select({ id: users.id, name: users.name, role: users.role })
          .from(users);

    // department_id is NOT NULL behind an FK, so this join never drops a ticket; it is
    // only here to give the supervisor scope a parent_id to filter on.
    const ticketRows = this.db
      .select({
        id: supportTickets.id,
        answeredByUserId: sql<string>`coalesce(${employees.userId}, ${supervisors.userId}, ${admins.userId})`,
        customerRating: supportTicketInteractions.type,
      })
      .from(supportTickets)
      .innerJoin(departments, eq(departments.id, supportTickets.departmentId))
      .innerJoin(
        supportTicketAnswers,
        eq(supportTicketAnswers.supportTicketId, supportTickets.id),
      )
      .innerJoin(
        supportTicketInteractions,
        eq(supportTicketInteractions.supportTicketId, supportTickets.id),
      )
      .leftJoin(
        employees,
        eq(employees.id, supportTicketAnswers.answererEmployeeId),
      )
      .leftJoin(
        supervisors,
        eq(supervisors.id, supportTicketAnswers.answererSupervisorId),
      )
      .leftJoin(admins, eq(admins.id, supportTicketAnswers.answererAdminId))
      .where(scoped ? this.departmentScope(departments, departmentIds) : undefined);

    const [resolvedUsers, resolvedTickets] = await Promise.all([
      userRows,
      ticketRows,
    ]);

    return {
      users: resolvedUsers,
      tickets: resolvedTickets,
    };
  }

  async getAnalyticsOverview(
    supervisorId?: string,
  ): Promise<DashboardAggregatedResult> {
    let supervisor: SupervisorScope | null = null;

    if (supervisorId) {
      supervisor = await this.loadSupervisorScope(supervisorId);
      if (!supervisor) return null;
    }

    const departmentIds = supervisor?.departmentIds ?? [];
    const scope = this.departmentScope(departments, departmentIds);
    const canManagePromotions =
      supervisor?.permissions.includes(MANAGE_PROMOTIONS) ?? false;

    const categoryTotalViews = sql<number>`coalesce(sum(${questions.views}), 0)::int`.as(
      'total_views',
    );
    const askedTimes = count().as('asked_times');

    // Aliased so the scope predicate inside the NOT IN subquery binds to its own copy of
    // departments rather than shadowing the outer join.
    const faqDepartments = alias(departments, 'faq_departments');

    // Six independent aggregates. The old version forced them through one query as
    // chained CTEs, which meant Postgres computed them serially and hand-built JSON for
    // each; run concurrently the wall clock is the slowest one, and every row is typed.
    const [
      faqTotals,
      statusCounts,
      topFaqs,
      categoryViews,
      opportunities,
      activePromotions,
    ] = await Promise.all([
      this.db
        .select({
          views: sum(questions.views),
          satisfaction: sum(questions.satisfaction),
          dissatisfaction: sum(questions.dissatisfaction),
        })
        .from(questions)
        .innerJoin(departments, eq(departments.id, questions.departmentId))
        .where(scope),

      this.db
        .select({ status: supportTickets.status, value: count() })
        .from(supportTickets)
        .innerJoin(departments, eq(departments.id, supportTickets.departmentId))
        .where(scope)
        .groupBy(supportTickets.status),

      this.db
        .select({
          id: questions.id,
          question: questions.text,
          viewCount: questions.views,
          categoryName: departments.name,
        })
        .from(questions)
        .innerJoin(departments, eq(departments.id, questions.departmentId))
        .where(scope)
        .orderBy(desc(questions.views))
        .limit(5),

      this.db
        .select({ categoryName: departments.name, views: categoryTotalViews })
        .from(departments)
        .leftJoin(questions, eq(questions.departmentId, departments.id))
        .where(scope)
        .groupBy(departments.id, departments.name)
        .orderBy(desc(categoryTotalViews)),

      this.db
        .select({
          originalCasing: supportTickets.subject,
          categoryId: supportTickets.departmentId,
          categoryName: departments.name,
          count: askedTimes,
        })
        .from(supportTickets)
        .innerJoin(departments, eq(departments.id, supportTickets.departmentId))
        .where(
          and(
            scope,
            notInArray(
              sql`lower(trim(${supportTickets.subject}))`,
              this.db
                .select({ text: sql`lower(trim(${questions.text}))` })
                .from(questions)
                .innerJoin(
                  faqDepartments,
                  eq(faqDepartments.id, questions.departmentId),
                )
                .where(this.departmentScope(faqDepartments, departmentIds)),
            ),
          ),
        )
        .groupBy(
          supportTickets.subject,
          supportTickets.departmentId,
          departments.name,
        )
        // count() rather than the alias: Postgres does not accept output aliases in
        // HAVING, only in GROUP BY and ORDER BY.
        .having(gt(count(), 1))
        .orderBy(desc(askedTimes))
        .limit(5),

      canManagePromotions
        ? this.db
            .select()
            .from(promotions)
            .where(
              and(
                eq(promotions.isActive, true),
                or(
                  isNull(promotions.startDate),
                  lte(promotions.startDate, sql`now()`),
                ),
                or(
                  isNull(promotions.endDate),
                  gte(promotions.endDate, sql`now()`),
                ),
              ),
            )
            .orderBy(desc(promotions.createdAt))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const satisfaction = Number(faqTotals[0]?.satisfaction ?? 0);
    const dissatisfaction = Number(faqTotals[0]?.dissatisfaction ?? 0);
    const rated = satisfaction + dissatisfaction;

    const countStatuses = (statuses: string[]) =>
      statusCounts
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + Number(row.value), 0);

    return {
      totalViews: Number(faqTotals[0]?.views ?? 0),
      openTicketsCount: countStatuses(OPEN_TICKET_STATUSES),
      answeredPendingClosureCount: countStatuses(['answered']),
      faqSatisfactionRate: rated === 0 ? 0 : (satisfaction / rated) * 100,
      categoryViews,
      topFaqs,
      faqOpportunities: opportunities,
      activePromotion: activePromotions[0] ?? null,
    };
  }

  async getRecentActivity(limit: number = 10) {
    const rows = await this.db
      .select({
        id: activityLogs.id,
        type: activityLogs.type,
        title: activityLogs.title,
        meta: activityLogs.meta,
        occurredAt: activityLogs.occurredAt,
      })
      .from(activityLogs)
      .orderBy(desc(activityLogs.occurredAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      type: RECENT_ACTIVITY_KIND[row.type],
      description: RECENT_ACTIVITY_DESCRIPTION[row.type](row.title),
      timestamp: row.occurredAt.toISOString(),
      meta: (row.meta ?? {}) as Record<string, any>,
    }));
  }

  /**
   * Moved out of PerformanceSummaryUseCase, which injected PrismaService directly.
   *
   * The counts and averages are computed in Postgres now. The original pulled every
   * matching support ticket answer and every task submission into Node — with their
   * joined ticket/interaction/task rows — purely to call `.length`, `.filter()` and a
   * manual mean over them, so the cost scaled with total history rather than with the
   * seven numbers it returns.
   *
   * NOTE: `userId` is compared against answerer/performer/reviewer columns, which hold
   * Admin/Supervisor/Employee row ids — not user ids. The controller passes `req.user.id`,
   * so these filters almost certainly match nothing today. Preserved exactly; see the
   * `coalesce(...user_id)` in getAgentPerformance for how the two are normally bridged.
   */
  async getPerformanceSummary(userId?: string): Promise<PerformanceSummary> {
    // Prisma treated `{ column: undefined }` as "no filter", so an absent userId means
    // the summary covers everyone.
    const answeredBy = userId
      ? or(
          eq(supportTicketAnswers.answererAdminId, userId),
          eq(supportTicketAnswers.answererSupervisorId, userId),
          eq(supportTicketAnswers.answererEmployeeId, userId),
        )
      : undefined;

    const performedBy = userId
      ? or(
          eq(taskSubmissions.performerAdminId, userId),
          eq(taskSubmissions.performerSupervisorId, userId),
          eq(taskSubmissions.performerEmployeeId, userId),
        )
      : undefined;

    const reviewedBy = userId
      ? or(
          eq(taskSubmissions.reviewedByAdminId, userId),
          eq(taskSubmissions.reviewedBySupervisorId, userId),
        )
      : undefined;

    const [answerStats, submissionStats, approvedRows] = await Promise.all([
      // The interaction join is LEFT: the original read `supportTicket.interaction.type`
      // with no null guard, so an answered ticket that was never rated threw. Here an
      // absent interaction simply falls outside both FILTER clauses.
      this.db
        .select({
          ticketsAnswered: count(),
          avgResponseMs: sql<
            string | null
          >`avg(extract(epoch from (${supportTicketAnswers.createdAt} - ${supportTickets.createdAt})) * 1000)`,
          satisfied: sql<string>`count(*) filter (where ${supportTicketInteractions.type} = 'satisfaction')`,
          dissatisfied: sql<string>`count(*) filter (where ${supportTicketInteractions.type} = 'dissatisfaction')`,
        })
        .from(supportTicketAnswers)
        .innerJoin(
          supportTickets,
          eq(supportTickets.id, supportTicketAnswers.supportTicketId),
        )
        .leftJoin(
          supportTicketInteractions,
          eq(supportTicketInteractions.supportTicketId, supportTickets.id),
        )
        .where(answeredBy),

      // avg() skips nulls, which is the same set the old code kept when it filtered out
      // submissions with no reviewedAt.
      this.db
        .select({
          tasksPerformed: count(),
          avgTaskMs: sql<
            string | null
          >`avg(extract(epoch from (${taskSubmissions.reviewedAt} - ${tasks.createdAt})) * 1000)`,
        })
        .from(taskSubmissions)
        .innerJoin(tasks, eq(tasks.id, taskSubmissions.taskId))
        .where(performedBy),

      this.db
        .select({ value: count() })
        .from(taskSubmissions)
        .where(and(eq(taskSubmissions.status, 'approved'), reviewedBy)),
    ]);

    const toMillis = (value: string | null | undefined) =>
      value === null || value === undefined ? null : Math.round(Number(value));

    return {
      ticketsAnswered: Number(answerStats[0]?.ticketsAnswered ?? 0),
      avgResponseTime: toMillis(answerStats[0]?.avgResponseMs),
      tasksPerformed: Number(submissionStats[0]?.tasksPerformed ?? 0),
      avgTaskTime: toMillis(submissionStats[0]?.avgTaskMs),
      tasksApproved: Number(approvedRows[0]?.value ?? 0),
      satisfiedTickets: Number(answerStats[0]?.satisfied ?? 0),
      dissatisfiedTickets: Number(answerStats[0]?.dissatisfied ?? 0),
    };
  }
}
