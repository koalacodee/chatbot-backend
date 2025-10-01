import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { DashboardRepository } from 'src/dashboard/domain/repositories/dashboard.repository';

export interface DashboardSummary {
  totalUsers: number;
  activeTickets: number;
  completedTasks: number;
  faqSatisfaction: number;
}

export interface PerformanceSeriesPoint {
  label: string;
  tasksCompleted: number;
  ticketsClosed: number;
  avgFirstResponseSeconds: number;
}

export interface AnalyticsSummaryKpi {
  label: string;
  value: string;
}

export interface DepartmentPerformanceItem {
  name: string;
  score: number;
}

@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary(): Promise<DashboardSummary> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        totalUsers: number;
        activeTickets: number;
        completedTasks: number;
        faqSatisfaction: number;
      }>
    >`WITH users_cte AS (
        SELECT COUNT(*)::int AS total_users
        FROM "users"
      ),
      active_tickets_cte AS (
        SELECT COUNT(*)::int AS active_tickets
        FROM "support_tickets"
        WHERE status <> 'closed'
      ),
      completed_tasks_cte AS (
        SELECT COUNT(*)::int AS completed_tasks
        FROM "tasks"
        WHERE status = 'completed'
      ),
      faq_satisfaction_cte AS (
        SELECT COALESCE(
                 ROUND(
                   100.0 * COALESCE(SUM(satisfaction), 0) /
                   NULLIF(COALESCE(SUM(satisfaction), 0) + COALESCE(SUM(dissatisfaction), 0), 0)
                 ),
                 0
               )::int AS faq_satisfaction
        FROM "questions"
      )
      SELECT
        u.total_users      AS "totalUsers",
        at.active_tickets  AS "activeTickets",
        ct.completed_tasks AS "completedTasks",
        fs.faq_satisfaction AS "faqSatisfaction"
      FROM users_cte u,
           active_tickets_cte at,
           completed_tasks_cte ct,
           faq_satisfaction_cte fs;`;

    return (
      rows[0] ?? {
        totalUsers: 0,
        activeTickets: 0,
        completedTasks: 0,
        faqSatisfaction: 0,
      }
    );
  }

  async getWeeklyPerformance(
    rangeDays: number = 7,
  ): Promise<PerformanceSeriesPoint[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        day_label: string;
        tasks_completed: number;
        tickets_closed: number;
        avg_first_response_seconds: number | null;
      }>
    >`WITH days AS (
        SELECT generate_series(
                 (CURRENT_DATE - (${rangeDays}::int - 1) * INTERVAL '1 day')::date,
                 CURRENT_DATE::date,
                 INTERVAL '1 day'
               )::date AS day
      ),
      answers_per_ticket AS (
        SELECT st.id,
               st.created_at AS ticket_created_at,
               MIN(sta.created_at) AS first_answer_at
        FROM support_tickets st
        JOIN support_ticket_answers sta ON sta.support_ticket_id = st.id
        WHERE sta.created_at >= (CURRENT_DATE - (${rangeDays}::int - 1) * INTERVAL '1 day')
          AND sta.created_at <  (CURRENT_DATE + INTERVAL '1 day')
        GROUP BY st.id, st.created_at
      ),
      daily_ticket AS (
        SELECT date_trunc('day', first_answer_at)::date AS day,
               COUNT(*)::int AS tickets_closed,
               AVG(EXTRACT(EPOCH FROM (first_answer_at - ticket_created_at)))::float AS avg_first_response_seconds
        FROM answers_per_ticket
        GROUP BY 1
      ),
      completed_tasks AS (
        SELECT date_trunc('day', t.completed_at)::date AS day,
               COUNT(*)::int AS tasks_completed
        FROM tasks t
        WHERE t.completed_at IS NOT NULL
          AND t.completed_at >= (CURRENT_DATE - (${rangeDays}::int - 1) * INTERVAL '1 day')
          AND t.completed_at <  (CURRENT_DATE + INTERVAL '1 day')
        GROUP BY 1
      )
      SELECT to_char(d.day, 'Dy') AS day_label,
             COALESCE(ct.tasks_completed, 0) AS tasks_completed,
             COALESCE(dt.tickets_closed, 0) AS tickets_closed,
             COALESCE(dt.avg_first_response_seconds, 0)::float AS avg_first_response_seconds
      FROM days d
      LEFT JOIN completed_tasks ct ON ct.day = d.day
      LEFT JOIN daily_ticket dt ON dt.day = d.day
      ORDER BY d.day;`;

    return rows.map((r) => ({
      label: r.day_label,
      tasksCompleted: Number(r.tasks_completed),
      ticketsClosed: Number(r.tickets_closed),
      avgFirstResponseSeconds: Math.round(
        Number(r.avg_first_response_seconds ?? 0),
      ),
    }));
  }

  async getAnalyticsSummary(rangeDays: number = 7): Promise<{
    kpis: AnalyticsSummaryKpi[];
    departmentPerformance: DepartmentPerformanceItem[];
  }> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        avg_response_seconds: number | null;
        task_completion_rate: number | null;
        faq_satisfaction: number | null;
        active_users: number | null;
        departments: Array<{ name: string; score_raw: number }>;
      }>
    >`WITH params AS (
        SELECT (CURRENT_DATE - (${rangeDays}::int - 1) * INTERVAL '1 day')::timestamp AS start_ts,
               (CURRENT_DATE + INTERVAL '1 day')::timestamp                                                    AS end_ts
      ),
      answered_tickets AS (
        SELECT st.id,
               EXTRACT(EPOCH FROM (sta.created_at - st.created_at)) AS response_seconds,
               st.department_id
        FROM support_tickets st
        JOIN support_ticket_answers sta ON sta.support_ticket_id = st.id
        JOIN params p ON sta.created_at >= p.start_ts AND sta.created_at < p.end_ts
      ),
      avg_response AS (
        SELECT AVG(response_seconds) AS avg_response_seconds
        FROM answered_tickets
      ),
      tasks_created AS (
        SELECT id
        FROM tasks t
        JOIN params p ON t.created_at >= p.start_ts AND t.created_at < p.end_ts
      ),
      tasks_completed AS (
        SELECT id
        FROM tasks t
        JOIN params p ON t.completed_at IS NOT NULL AND t.completed_at >= p.start_ts AND t.completed_at < p.end_ts
      ),
      task_completion AS (
        SELECT CASE WHEN (SELECT COUNT(*) FROM tasks_created) = 0 THEN NULL
                    ELSE (SELECT COUNT(*) FROM tasks_completed)::float / (SELECT COUNT(*) FROM tasks_created) * 100
               END AS completion_rate
      ),
      faq_stats AS (
        SELECT SUM(q.satisfaction)::float AS sat, SUM(q.dissatisfaction)::float AS diss
        FROM questions q
      ),
      faq_rate AS (
        SELECT CASE WHEN (sat + diss) = 0 THEN NULL ELSE (sat / (sat + diss) * 100) END AS rate
        FROM faq_stats
      ),
      active_users AS (
        SELECT COUNT(DISTINCT al.user_id) AS cnt
        FROM activity_logs al
        JOIN params p ON al.occurred_at >= p.start_ts AND al.occurred_at < p.end_ts
      ),
      tickets_by_dept AS (
        SELECT at.department_id AS dept_id, COUNT(*)::int AS cnt
        FROM answered_tickets at
        GROUP BY at.department_id
      ),
      completed_tasks_by_dept AS (
        SELECT COALESCE(t.target_sub_department_id, t.target_department_id) AS dept_id, COUNT(*)::int AS cnt
        FROM tasks t
        JOIN params p ON t.completed_at IS NOT NULL AND t.completed_at >= p.start_ts AND t.completed_at < p.end_ts
        GROUP BY COALESCE(t.target_sub_department_id, t.target_department_id)
      ),
      dept_aggregate AS (
        SELECT d.id,
               d.name,
               COALESCE(tbd.cnt, 0) + COALESCE(ctbd.cnt, 0) AS score_raw
        FROM departments d
        LEFT JOIN tickets_by_dept tbd ON tbd.dept_id = d.id
        LEFT JOIN completed_tasks_by_dept ctbd ON ctbd.dept_id = d.id
      ),
      max_score AS (
        SELECT GREATEST(1, COALESCE(MAX(score_raw), 0)) AS mx FROM dept_aggregate
      )
      SELECT
        (SELECT avg_response_seconds FROM avg_response) AS avg_response_seconds,
        (SELECT completion_rate FROM task_completion)    AS task_completion_rate,
        (SELECT rate FROM faq_rate)                      AS faq_satisfaction,
        (SELECT cnt FROM active_users)                   AS active_users,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'name', da.name,
            'score_raw', da.score_raw
          ) ORDER BY da.score_raw DESC), '[]')
          FROM dept_aggregate da
        ) AS departments;`;

    const result = rows[0] ?? {
      avg_response_seconds: null,
      task_completion_rate: null,
      faq_satisfaction: null,
      active_users: 0,
      departments: [],
    };

    const avgSeconds = result.avg_response_seconds ?? 0;
    const hours = Math.floor(avgSeconds / 3600);
    const minutes = Math.floor((avgSeconds % 3600) / 60);
    const avgResponse = `${hours}h ${minutes}m`;

    const completionRate = result.task_completion_rate ?? 0;
    const faqSatisfaction = result.faq_satisfaction ?? 0;
    const activeUsers = result.active_users ?? 0;

    const kpis: AnalyticsSummaryKpi[] = [
      { label: 'Avg. Ticket Response', value: avgResponse },
      {
        label: 'Task Completion Rate',
        value: `${Math.round(completionRate)}%`,
      },
      { label: 'FAQ Satisfaction', value: `${Math.round(faqSatisfaction)}%` },
      { label: 'Active Users (7d)', value: activeUsers.toLocaleString() },
    ];

    const deptsRaw = (result.departments ?? []) as Array<{
      name: string;
      score_raw: number;
    }>;
    const maxScore =
      deptsRaw.reduce((m, r) => (r.score_raw > m ? r.score_raw : m), 0) || 1;
    const departmentPerformance: DepartmentPerformanceItem[] = deptsRaw.map(
      (r) => ({
        name: r.name,
        score: Math.round((r.score_raw / maxScore) * 100),
      }),
    );

    return { kpis, departmentPerformance };
  }
}
