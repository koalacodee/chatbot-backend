import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  ActivityLogRepository,
  ActivityTypePayload,
  DashboardAggregatedResult,
  QueryOutput,
  UserPerformanceArgs,
} from '../../domain/repositories/activity-log.repository';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import { $Enums, Prisma } from '@prisma/client';

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

  async saveMany(logs: ActivityLog[]): Promise<ActivityLog[]> {
    const promises = logs.map((log) => {
      const data = {
        id: log.id,
        title: log.title,
        meta: { ...log.meta },
        itemId: log.itemId,
        type: log.type,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        occurredAt: log.occurredAt,
        user: { connect: { id: log.userId } },
      };

      return this.prisma.activityLog.upsert({
        where: { id: log.id },
        update: data,
        create: data,
        include: { user: true },
      });
    });

    const result = await this.prisma.$transaction(promises);
    return Promise.all(result.map((r) => this.toDomain(r)));
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
    supervisorId?: string;
  }) {
    let supervisor: {
      id: string;
      permissions: $Enums.AdminPermissions[];
      departments: { id: string }[];
    };

    if (options.supervisorId) {
      supervisor = await this.prisma.supervisor.findUnique({
        where: { userId: options.supervisorId },
        select: {
          permissions: true,
          id: true,
          departments: { select: { id: true } },
        },
      });
    }

    if (!supervisor && options.supervisorId) {
      return { data: [], nextCursor: null };
    }

    const userIdFilter = options.userId
      ? Prisma.sql`al.user_id = ${options.userId}::uuid`
      : Prisma.sql`TRUE`;

    const supervisorFilter = supervisor
      ? Prisma.sql`u.id IN (SELECT user_id FROM employees WHERE supervisor_id = ${supervisor.id}::uuid)`
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
          AND ${supervisorFilter}
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
      SELECT COALESCE(json_agg(payload), '[]') AS data,
            CASE
              WHEN COALESCE(min(last_occurred_at), NULL) IS NULL THEN NULL
              ELSE COALESCE(min(last_occurred_at), NULL)
            END AS nextCursor
      FROM grouped;

    `;

    return result[0];
  }

  async getAgentPerformance(
    options: UserPerformanceArgs,
  ): Promise<QueryOutput> {
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

    let supervisor: {
      id: string;
      permissions: $Enums.AdminPermissions[];
      departments: { id: string }[];
    };

    if (options.supervisorId) {
      supervisor = await this.prisma.supervisor.findUnique({
        where: { userId: options.supervisorId },
        select: {
          permissions: true,
          id: true,
          departments: { select: { id: true } },
        },
      });
    }

    if (!supervisor && options.supervisorId) {
      return null;
    }

    const deptIds = supervisor?.departments.map((d) => d.id) ?? [];

    let query;
    if (supervisor && deptIds.length > 0) {
      query = Prisma.sql`
        WITH
        user_rows AS (
            SELECT
                u.id::text          AS id,
                u.name,
                LOWER(u.role::text) AS role
            FROM users u
            JOIN employees e ON e.user_id = u.id
            WHERE e.supervisor_id = ${supervisor.id}::uuid
        ),
        ticket_rows AS (
            SELECT
                st.id::text                                           AS id,
                COALESCE(
                    emp.user_id::text,
                    sup.user_id::text,
                    adm.user_id::text
                )                                                     AS "answeredByUserId",
                LOWER(sti.type::text)                               AS "customerRating",
                ROUND(EXTRACT(EPOCH FROM (sta.created_at - st.created_at))) AS "repliedInSeconds"
            FROM support_tickets st
            JOIN departments d ON d.id = st.department_id
            JOIN support_ticket_answers sta
              ON sta.support_ticket_id = st.id
            JOIN support_ticket_interactions sti
              ON sti.support_ticket_id = st.id
            LEFT JOIN employees   emp ON emp.id  = sta.answerer_employee_id
            LEFT JOIN supervisors sup ON sup.id = sta.answerer_supervisor_id
            LEFT JOIN admins      adm ON adm.id  = sta.answerer_admin_id
            WHERE sti.type IS NOT NULL
              AND ((d.parent_id IS NULL AND d.id::text IN (${Prisma.join(deptIds.map((id) => id))})) OR (d.parent_id IS NOT NULL AND d.parent_id::text IN (${Prisma.join(deptIds.map((id) => id))})))
        )
        SELECT
            COALESCE((SELECT json_agg(u.*) FROM user_rows  u), '[]') AS users,
            COALESCE((SELECT json_agg(t.*) FROM ticket_rows t), '[]') AS tickets;
      `;
    } else {
      query = Prisma.sql`
        WITH
        user_rows AS (
            SELECT
                u.id::text          AS id,
                u.name,
                LOWER(u.role::text) AS role
            FROM users u
        ),
        ticket_rows AS (
            SELECT
                st.id::text                                           AS id,
                COALESCE(
                    emp.user_id::text,
                    sup.user_id::text,
                    adm.user_id::text
                )                                                     AS "answeredByUserId",
                LOWER(sti.type::text)                               AS "customerRating",
                ROUND(EXTRACT(EPOCH FROM (sta.created_at - st.created_at))) AS "repliedInSeconds"
            FROM support_tickets st
            JOIN support_ticket_answers sta
              ON sta.support_ticket_id = st.id
            JOIN support_ticket_interactions sti
              ON sti.support_ticket_id = st.id
            LEFT JOIN employees   emp ON emp.id  = sta.answerer_employee_id
            LEFT JOIN supervisors sup ON sup.id = sta.answerer_supervisor_id
            LEFT JOIN admins      adm ON adm.id  = sta.answerer_admin_id
            WHERE sti.type IS NOT NULL
        )
        SELECT
            COALESCE((SELECT json_agg(u.*) FROM user_rows  u), '[]') AS users,
            COALESCE((SELECT json_agg(t.*) FROM ticket_rows t), '[]') AS tickets;
      `;
    }

    const sqlRows = await this.prisma.$queryRaw<[QueryOutput]>(query);

    // strip internal row_num before returning
    return sqlRows[0];
  }

  async getAnalyticsOverview(supervisorId?: string) {
    let supervisor: {
      id: string;
      permissions: $Enums.AdminPermissions[];
      departments: { id: string }[];
    };

    if (supervisorId) {
      supervisor = await this.prisma.supervisor.findUnique({
        where: { userId: supervisorId },
        select: {
          permissions: true,
          id: true,
          departments: { select: { id: true } },
        },
      });
    }

    if (!supervisor && supervisorId) {
      return null;
    }

    const deptIds = supervisor?.departments.map((d) => d.id) ?? [];

    let query;
    if (supervisor && deptIds.length > 0) {
      query = Prisma.sql`
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
          WHERE (d.parent_id IS NULL AND d.id::text IN (${Prisma.join(deptIds)})) OR (d.parent_id IS NOT NULL AND d.parent_id::text IN (${Prisma.join(deptIds)}))
        ),

        /* ---------- 2. Ticket counts by status ---------- */
        ticket_counts AS (
          SELECT
            (COUNT(*) FILTER (WHERE st.status IN ('new', 'seen')))::int AS open_tickets,
            (COUNT(*) FILTER (WHERE st.status = 'answered'))::int AS answered_pending_closure
          FROM support_tickets st
          JOIN departments d ON d.id = st.department_id
          WHERE (d.parent_id IS NULL AND d.id::text IN (${Prisma.join(deptIds)})) OR (d.parent_id IS NOT NULL AND d.parent_id::text IN (${Prisma.join(deptIds)}))
        ),

        /* ---------- 3. Top 5 FAQs ---------- */
        top_faqs AS (
          SELECT *
          FROM faq_stats
          ORDER BY view_count DESC
          LIMIT 5
        ),

        /* ---------- 4. Category performance ---------- */
        category_views AS (
          SELECT
            d.name  AS category_name,
            COALESCE(SUM(q.views)::int, 0) AS total_views
          FROM departments d
          LEFT JOIN questions q ON q.department_id = d.id
          WHERE (d.parent_id IS NULL AND d.id::text IN (${Prisma.join(deptIds)})) OR (d.parent_id IS NOT NULL AND d.parent_id::text IN (${Prisma.join(deptIds)}))
          GROUP BY d.id, d.name
          ORDER BY total_views DESC
        ),

        /* ---------- 5. Improvement opportunities ---------- */
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
          WHERE ((d.parent_id IS NULL AND d.id::text IN (${Prisma.join(deptIds.map((id) => id))})) OR (d.parent_id IS NOT NULL AND d.parent_id::text IN (${Prisma.join(deptIds.map((id) => id))})))
            AND LOWER(TRIM(st.subject)) NOT IN (SELECT q_low FROM faq_questions)
          GROUP BY st.subject, st.department_id, d.name
          HAVING COUNT(*) > 1
          ORDER BY asked_times DESC
          LIMIT 5
        ),

        /* ---------- 6. Active promotion ---------- */
        ${
          supervisor.permissions.includes('MANAGE_PROMOTIONS')
            ? Prisma.sql`
        active_promo AS (
          SELECT p.*
          FROM promotions p
          WHERE p.is_active = TRUE
            AND (p.start_date IS NULL OR p.start_date <= NOW())
            AND (p.end_date   IS NULL OR p.end_date   >= NOW())
          ORDER BY p.created_at DESC
          LIMIT 1
        ),
        `
            : Prisma.empty
        }

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
          COALESCE((SELECT total_views FROM global_totals), 0) AS "totalViews",
          COALESCE((SELECT open_tickets FROM ticket_counts), 0) AS "openTicketsCount",
          COALESCE((SELECT answered_pending_closure FROM ticket_counts), 0) AS "answeredPendingClosureCount",
          COALESCE((SELECT faq_satisfaction_rate FROM global_totals), 0) AS "faqSatisfactionRate",
          
          COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object(
              'categoryName', category_name,
              'views',        total_views
            ))
          FROM category_views
          ), '[]') AS "categoryViews",

          COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'id',           id,
              'question',     question,
              'viewCount',    view_count,
              'categoryName', category_name
            ))
          FROM top_faqs
          ), '[]') AS "topFaqs",

          COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'originalCasing', subject,
              'categoryId',     category_id,
              'categoryName',   category_name,
              'count',          asked_times
            ))
          FROM opportunities
          ), '[]') AS "faqOpportunities",

          ${
            supervisor.permissions.includes('MANAGE_PROMOTIONS')
              ? Prisma.sql`
          COALESCE((SELECT row_to_json(ap.*) FROM active_promo ap LIMIT 1), '{}') AS "activePromotion"
          `
              : Prisma.empty
          }
      `;
    } else {
      query = Prisma.sql`
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
          JOIN departments d ON d.id = st.department_id
        ),

        /* ---------- 3. Top 5 FAQs ---------- */
        top_faqs AS (
          SELECT *
          FROM faq_stats
          ORDER BY view_count DESC
          LIMIT 5
        ),

        /* ---------- 4. Category performance ---------- */
        category_views AS (
          SELECT
            d.name  AS category_name,
            COALESCE(SUM(q.views)::int, 0) AS total_views
          FROM departments d
          LEFT JOIN questions q ON q.department_id = d.id
          GROUP BY d.id, d.name
          ORDER BY total_views DESC
        ),

        /* ---------- 5. Improvement opportunities ---------- */
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

        /* ---------- 6. Global totals ---------- */
        global_totals AS (
          SELECT
            SUM(view_count)::int AS total_views,
            SUM(satisfaction)::float /
              NULLIF(SUM(satisfaction) + SUM(dissatisfaction), 0) * 100 AS faq_satisfaction_rate
          FROM faq_stats
        )

        /* ---------- Final projection ---------- */
        SELECT
          COALESCE((SELECT total_views FROM global_totals), 0) AS "totalViews",
          COALESCE((SELECT open_tickets FROM ticket_counts), 0) AS "openTicketsCount",
          COALESCE((SELECT answered_pending_closure FROM ticket_counts), 0) AS "answeredPendingClosureCount",
          COALESCE((SELECT faq_satisfaction_rate FROM global_totals), 0) AS "faqSatisfactionRate",
          
          COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object(
              'categoryName', category_name,
              'views',        total_views
            ))
          FROM category_views
          ), '[]') AS "categoryViews",

          COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'id',           id,
              'question',     question,
              'viewCount',    view_count,
              'categoryName', category_name
            ))
          FROM top_faqs
          ), '[]') AS "topFaqs",

          COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'originalCasing', subject,
              'categoryId',     category_id,
              'categoryName',   category_name,
              'count',          asked_times
            ))
          FROM opportunities
          ), '[]') AS "faqOpportunities",

          '{}'::jsonb AS "activePromotion"
      `;
    }
    const result =
      await this.prisma.$queryRaw<DashboardAggregatedResult[]>(query);

    const data = result[0];

    return data;
  }
}
