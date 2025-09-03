import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  ActivityLogRepository,
  ActivityTypePayload,
  AllGroupedActivities,
  DashboardAggregatedResult,
  PaginatedResult,
  UserPerformanceArgs,
  UserPerformanceRow,
} from '../../domain/repositories/activity-log.repository';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaActivityLogRepository extends ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<ActivityLog> {
    return ActivityLog.create({
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: row.type,
      title: row.title,
      meta: row.meta,
      itemId: row.itemId,
      occurredAt: row.occurredAt,
      userId: row.userId,
    });
  }

  async save(log: ActivityLog): Promise<ActivityLog> {
    const upsert = await this.prisma.activityLog.upsert({
      where: { id: log.id },
      update: {
        id: log.id,
        title: log.title,
        meta: {
          ...log.meta,
        },
        itemId: log.itemId,
        type: log.type,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        occurredAt: log.occurredAt,
        user: { connect: { id: log.userId } },
      },
      create: {
        id: log.id,
        title: log.title,
        meta: {
          ...log.meta,
        },
        itemId: log.itemId,
        type: log.type,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        occurredAt: log.occurredAt,
        user: { connect: { id: log.userId } },
      },
      include: { user: true },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<ActivityLog | null> {
    const row = await this.prisma.activityLog.findUnique({
      where: { id },
      include: { user: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<ActivityLog[]> {
    const rows = await this.prisma.activityLog.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<ActivityLog | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.activityLog.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.activityLog.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.activityLog.count();
  }

  async findByUserId(
    userId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]> {
    const rows = await this.prisma.activityLog.findMany({
      where: { userId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findByItemId(
    itemId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]> {
    const rows = await this.prisma.activityLog.findMany({
      where: { itemId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async getAggregatedActivityFeed(options: {
    userId?: string;
    limit?: number;
    cursor?: string;
  }) {
    const userIdFilter = options.userId
      ? Prisma.sql`al.user_id = ${options.userId}::uuid`
      : Prisma.sql`TRUE`;
    const cursorFilter = options.cursor
      ? Prisma.sql`al.occurred_at < ${options.cursor}`
      : Prisma.sql`TRUE`;

    const result = await this.prisma.$queryRaw<
      [{ data: ActivityTypePayload[]; nextCursor: string | null }]
    >`
      WITH filtered AS (
        SELECT al.*, u.name, u.employee_id
        FROM activity_logs al
        JOIN users u ON u.id = al.user_id
        WHERE ${userIdFilter}
          AND ${cursorFilter}
      ),
      grouped AS (
        SELECT
          type,
          json_build_object(
            'type', type,
            'activities', (
              SELECT json_agg(
                      json_build_object(
                        'id', id,
                        'title', title,
                        'itemId', item_id,
                        'meta', meta,
                        'createdAt', created_at,
                        'updatedAt', updated_at,
                        'occurredAt', occurred_at,
                        'userId', user_id,
                        'user', json_build_object(
                                  'id', user_id,
                                  'name', name,
                                  'employeeId', employee_id
                                )
                      )
                    ORDER BY occurred_at DESC
                    )
              FROM filtered f2
              WHERE f2.type = f1.type
              LIMIT ${options.limit ?? 10}
            )
          ) AS payload,
          -- last occurred_at of this type slice
          (SELECT max(occurred_at)
          FROM (
            SELECT occurred_at
            FROM filtered f2
            WHERE f2.type = f1.type
            ORDER BY occurred_at DESC
            LIMIT ${options.limit ?? 10}
          ) x) AS last_occurred_at
        FROM (SELECT DISTINCT type FROM filtered) AS f1
      )
      SELECT json_agg(payload) AS data,
            CASE
              WHEN min(last_occurred_at) IS NULL THEN NULL
              ELSE min(last_occurred_at)
            END AS nextCursor
      FROM grouped;

    `;

    return { data: result[0].data, nextCursor: result[0].nextCursor };
  }

  async getAgentPerformance(
    options: UserPerformanceArgs,
  ): Promise<PaginatedResult> {
    // decode cursor
    let cursorRow: number | null = null;
    if (options.cursor) {
      try {
        cursorRow = Number.parseInt(
          Buffer.from(options.cursor, 'base64').toString('utf8'),
          10,
        );
      } catch {
        cursorRow = null;
      }
    }

    const sqlRows = await this.prisma.$queryRaw<
      readonly (UserPerformanceRow & { row_num: bigint })[]
    >`
        WITH ranked AS (
          SELECT
            u.id,
            u.username,
            u.role,
            COALESCE(stats.answered, 0)      AS answered,
            COALESCE(stats.satisfied, 0)     AS satisfied,
            COALESCE(stats.dissatisfied, 0)  AS dissatisfied,
            COALESCE(
              ROUND(
                100.0 * stats.satisfied
                / NULLIF(stats.satisfied + stats.dissatisfied, 0)
              ),
              0
            )                                AS satisfaction_rate,
            ROW_NUMBER() OVER (ORDER BY stats.answered DESC, u.id ASC) AS row_num
          FROM users u
          JOIN (
            SELECT
              COALESCE(
                a.answerer_employee_id,
                a.answerer_supervisor_id,
                a.answerer_admin_id
              ) AS user_id,
              COUNT(*) FILTER (WHERE st.id IS NOT NULL) AS answered,
              SUM(CASE WHEN sti.type = 'satisfaction'    THEN 1 ELSE 0 END) AS satisfied,
              SUM(CASE WHEN sti.type = 'dissatisfaction' THEN 1 ELSE 0 END) AS dissatisfied
            FROM support_ticket_answers a
            LEFT JOIN support_tickets st
                   ON st.id = a.support_ticket_id
            LEFT JOIN support_ticket_interactions sti
                   ON sti.support_ticket_id = st.id
                  AND sti.type IN ('satisfaction', 'dissatisfaction')
            GROUP BY user_id
          ) stats ON stats.user_id = u.id
          WHERE ${options.userId ? Prisma.sql`u.id = ${options.userId}` : Prisma.sql`TRUE`}
        )
        SELECT *
        FROM ranked
        WHERE
          ${
            cursorRow !== null
              ? options.direction === 'forward'
                ? Prisma.sql`row_num > ${cursorRow}`
                : Prisma.sql`row_num < ${cursorRow}`
              : Prisma.sql`TRUE`
          }
        ORDER BY
          ${
            options.direction === 'forward'
              ? Prisma.sql`row_num ASC`
              : Prisma.sql`row_num DESC`
          }
        LIMIT ${options.limit + 1};   -- fetch one extra to determine nextCursor
      `;

    console.log(sqlRows);

    // re-order if we went backwards
    const ordered =
      options.direction === 'backward'
        ? sqlRows.slice().reverse()
        : [...sqlRows];

    const hasMore = ordered.length > options.limit;
    const rows = hasMore ? ordered.slice(0, options.limit) : ordered;
    const lastRow = rows[rows.length - 1];

    let nextCursor: string | null = null;
    if (hasMore && lastRow) {
      nextCursor = Buffer.from(String(lastRow.row_num)).toString('base64');
    }

    // strip internal row_num before returning
    return {
      rows: rows.map(({ row_num: _rn, ...r }) => r),
      nextCursor,
    };
  }

  async getAnalyticsOverview() {
    const result = await this.prisma.$queryRaw<DashboardAggregatedResult[]>`
      WITH
      /* ---------- 1. FAQ-level aggregates ---------- */
      faq_stats AS (
        SELECT
          q.id,
          q.text AS question,
          q.views::int AS view_count,
          q.satisfaction::int,
          q.dissatisfaction::int,
          q.department_id AS category_id,
          d.name          AS category_name
        FROM questions q
        JOIN departments d ON d.id = q.department_id
      ),

      /* ---------- 2. Ticket counts by status ---------- */
      ticket_counts AS (
        SELECT
          (COUNT(*) FILTER (WHERE st.status IN ('new', 'seen')))::int AS open_tickets,
          (COUNT(*) FILTER (WHERE st.status = 'answered'))::int AS answered_pending_closure
        FROM support_tickets st
      ),

      /* ---------- 3. Top 5 FAQs (already ordered by view_count) ---------- */
      top_faqs AS (
        SELECT *
        FROM faq_stats
        ORDER BY view_count DESC
        LIMIT 5
      ),

      /* ---------- 4. Category performance (total views per department) ---------- */
      category_views AS (
        SELECT
          d.name  AS category_name,
          COALESCE(SUM(q.views)::int, 0) AS total_views
        FROM departments d
        LEFT JOIN questions q ON q.department_id = d.id
        GROUP BY d.id, d.name
        ORDER BY total_views DESC
      ),

      /* ---------- 5. Improvement opportunities (ticket subjects not yet FAQs) ---------- */
      faq_questions AS (
        SELECT LOWER(TRIM(question)) AS q_low
        FROM faq_stats
      ),
      opportunities AS (
        SELECT
          st.subject,
          st.department_id AS category_id,
          d.name           AS category_name,
          COUNT(*)::int         AS asked_times
        FROM support_tickets st
        JOIN departments d ON d.id = st.department_id
        WHERE LOWER(TRIM(st.subject)) NOT IN (SELECT q_low FROM faq_questions)
        GROUP BY st.subject, st.department_id, d.name
        HAVING COUNT(*) > 1
        ORDER BY asked_times DESC
        LIMIT 5
      ),

      /* ---------- 6. Active promotion for the logged-in user ---------- */
      active_promo AS (
        SELECT p.*
        FROM promotions p
        WHERE p.is_active = TRUE
          AND (p.start_date IS NULL OR p.start_date <= NOW())
          AND (p.end_date   IS NULL OR p.end_date   >= NOW())
        ORDER BY p.created_at DESC
        LIMIT 1
      ),

      /* ---------- 7. Global totals ---------- */
      global_totals AS (
        SELECT
          SUM(view_count)::int AS total_views,
          SUM(satisfaction)::float /
            NULLIF(SUM(satisfaction) + SUM(dissatisfaction), 0) * 100 AS faq_satisfaction_rate
        FROM faq_stats
      )

      /* ---------- Final projection ---------- */
      SELECT
        (SELECT total_views FROM global_totals) AS "totalViews",
        (SELECT open_tickets FROM ticket_counts) AS "openTicketsCount",
        (SELECT answered_pending_closure FROM ticket_counts) AS "answeredPendingClosureCount",
        (SELECT faq_satisfaction_rate FROM global_totals) AS "faqSatisfactionRate",
        
        (SELECT jsonb_agg(DISTINCT jsonb_build_object(
            'categoryName', category_name,
            'views',        total_views
          ))
        FROM category_views
        ) AS "categoryViews",

        (SELECT jsonb_agg(jsonb_build_object(
            'id',           id,
            'question',     question,
            'viewCount',    view_count,
            'categoryName', category_name
          ))
        FROM top_faqs
        ) AS "topFaqs",

        (SELECT jsonb_agg(jsonb_build_object(
            'originalCasing', subject,
            'categoryId',     category_id,
            'categoryName',   category_name,
            'count',          asked_times
          ))
        FROM opportunities
        ) AS "faqOpportunities",

        (SELECT row_to_json(ap.*) FROM active_promo ap LIMIT 1) AS "activePromotion";

    `;

    const data = result[0];

    return data;
  }
}
