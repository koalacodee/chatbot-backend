import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  DashboardRepository,
  DashboardSummary,
  PerformanceSeriesPoint,
  AnalyticsSummaryKpi,
  DepartmentPerformanceItem,
  EmployeeDashboardSummary,
  EmployeeDashboardData,
  PendingTask,
  PendingTicket,
  ExpiredFile,
} from 'src/dashboard/domain/repositories/dashboard.repository';

@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary(departmentIds?: string[]): Promise<DashboardSummary> {
    const departmentArray =
      departmentIds && departmentIds.length > 0
        ? Prisma.sql`ARRAY[${Prisma.join(
          departmentIds.map((id) => Prisma.sql`${id}::uuid`),
        )}]`
        : Prisma.sql`ARRAY[]::uuid[]`;

    const query = Prisma.sql`
      WITH RECURSIVE requested_departments AS (
        SELECT unnest(${departmentArray}) AS dept_id
      ),
      root_departments AS (
        SELECT dept_id
        FROM requested_departments
        WHERE dept_id IS NOT NULL
      ),
      dept_tree AS (
        SELECT rd.dept_id
        FROM root_departments rd
        UNION ALL
        SELECT d.id
        FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.dept_id
      ),
      all_scope AS (
        SELECT DISTINCT dept_id FROM dept_tree
        UNION
        SELECT d.id
        FROM departments d
        WHERE NOT EXISTS (SELECT 1 FROM root_departments)
      ),
      child_scope AS (
        SELECT DISTINCT dt.dept_id
        FROM dept_tree dt
        WHERE EXISTS (SELECT 1 FROM root_departments)
          AND NOT EXISTS (
            SELECT 1
            FROM root_departments rd
            WHERE rd.dept_id = dt.dept_id
          )
      ),
      has_filter AS (
        SELECT EXISTS (SELECT 1 FROM root_departments) AS value
      ),
      total_users_cte AS (
        SELECT
          (
            SELECT COUNT(*)::int
            FROM users u
            WHERE u.role = 'admin'
              AND NOT (SELECT value FROM has_filter)
          )
          +
          (
            SELECT COUNT(DISTINCT u.id)::int
            FROM users u
            JOIN employees e ON e.user_id = u.id
            WHERE u.role = 'employee'
              AND (
                NOT (SELECT value FROM has_filter)
                OR EXISTS (
                  SELECT 1
                  FROM employee_sub_departments esd
                  WHERE esd.employee_id = e.id
                    AND esd.department_id IN (SELECT dept_id FROM child_scope)
                )
              )
          )
          +
          (
            SELECT COUNT(DISTINCT u.id)::int
            FROM users u
            JOIN supervisors s ON s.user_id = u.id
            WHERE u.role = 'supervisor'
              AND (
                NOT (SELECT value FROM has_filter)
                OR EXISTS (
                  SELECT 1
                  FROM "_DepartmentToSupervisor" dts
                  WHERE dts."B" = s.id
                    AND dts."A" IN (SELECT dept_id FROM root_departments)
                )
              )
          ) AS total_users
      ),
      active_tickets_cte AS (
        SELECT COUNT(*)::int AS active_tickets
        FROM support_tickets st
        WHERE st.status IN ('new', 'seen', 'answered')
          AND (
            NOT (SELECT value FROM has_filter)
            OR st.department_id IN (SELECT dept_id FROM all_scope)
          )
      ),
      completed_tickets_cte AS (
        SELECT COUNT(*)::int AS completed_tickets
        FROM support_tickets st
        WHERE st.status = 'closed'
          AND (
            NOT (SELECT value FROM has_filter)
            OR st.department_id IN (SELECT dept_id FROM all_scope)
          )
      ),
      completed_tasks_cte AS (
        SELECT COUNT(*)::int AS completed_tasks
        FROM tasks t
        WHERE t.status = 'completed'
          AND (
            NOT (SELECT value FROM has_filter)
            OR (
              t.target_department_id IN (SELECT dept_id FROM all_scope)
              OR t.target_sub_department_id IN (SELECT dept_id FROM all_scope)
            )
          )
      ),
      pending_tasks_cte AS (
        SELECT COUNT(*)::int AS pending_tasks
        FROM tasks t
        WHERE t.status <> 'completed'
          AND (
            NOT (SELECT value FROM has_filter)
            OR (
              (t.assignment_type = 'department' AND t.target_department_id IN (SELECT dept_id FROM root_departments))
              OR (t.assignment_type = 'sub_department' AND t.target_sub_department_id IN (SELECT dept_id FROM child_scope))
              OR (
                t.assignment_type = 'individual'
                AND t.assignee_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM employee_sub_departments esd
                  WHERE esd.employee_id = t.assignee_id
                    AND esd.department_id IN (SELECT dept_id FROM child_scope)
                )
              )
            )
          )
      ),
      faq_satisfaction_cte AS (
        SELECT COALESCE(
                 ROUND(
                   100.0 * COALESCE(SUM(q.satisfaction), 0) /
                   NULLIF(COALESCE(SUM(q.satisfaction), 0) + COALESCE(SUM(q.dissatisfaction), 0), 0)
                 ),
                 0
               )::int AS faq_satisfaction
        FROM questions q
        WHERE (
          NOT (SELECT value FROM has_filter)
          OR q.department_id IN (SELECT dept_id FROM all_scope)
        )
      )
      SELECT
        tu.total_users      AS "totalUsers",
        at.active_tickets   AS "activeTickets",
        ct.completed_tasks  AS "completedTasks",
        ctc.completed_tickets AS "completedTickets",
        pt.pending_tasks    AS "pendingTasks",
        fs.faq_satisfaction AS "faqSatisfaction"
      FROM total_users_cte tu,
           active_tickets_cte at,
           completed_tasks_cte ct,
           completed_tickets_cte ctc,
           pending_tasks_cte pt,
           faq_satisfaction_cte fs;
    `;

    const rows = await this.prisma.$queryRaw<
      Array<{
        totalUsers: number;
        activeTickets: number;
        completedTasks: number;
        completedTickets: number;
        pendingTasks: number;
        faqSatisfaction: number;
      }>
    >(query);

    return (
      rows[0] ?? {
        totalUsers: 0,
        activeTickets: 0,
        completedTasks: 0,
        completedTickets: 0,
        pendingTasks: 0,
        faqSatisfaction: 0,
      }
    );
  }

  async getWeeklyPerformance(
    rangeDays: number = 7,
    departmentIds?: string[],
  ): Promise<PerformanceSeriesPoint[]> {
    // Build department filter CTE
    const deptFilterArray = departmentIds && departmentIds.length > 0
      ? departmentIds.map(id => `'${id}'::uuid`).join(',')
      : 'NULL::uuid';
    const deptFilterCondition = departmentIds && departmentIds.length > 0 ? 'true' : 'false';

    const query = `WITH dept_filter AS (
        SELECT unnest(ARRAY[${deptFilterArray}]) AS dept_id
        WHERE ${deptFilterCondition}
      ),
      days AS (
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
          AND (NOT EXISTS (SELECT 1 FROM dept_filter) OR st.department_id IN (SELECT dept_id FROM dept_filter))
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
          AND (NOT EXISTS (SELECT 1 FROM dept_filter) 
               OR t.target_department_id IN (SELECT dept_id FROM dept_filter)
               OR t.target_sub_department_id IN (SELECT dept_id FROM dept_filter))
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

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        day_label: string;
        tasks_completed: number;
        tickets_closed: number;
        avg_first_response_seconds: number | null;
      }>
    >(query);

    return rows.map((r) => ({
      label: r.day_label,
      tasksCompleted: Number(r.tasks_completed),
      ticketsClosed: Number(r.tickets_closed),
      avgFirstResponseSeconds: Math.round(
        Number(r.avg_first_response_seconds ?? 0),
      ),
    }));
  }

  async getAnalyticsSummary(
    rangeDays: number = 7,
    departmentIds?: string[],
  ): Promise<{
    kpis: AnalyticsSummaryKpi[];
    departmentPerformance: DepartmentPerformanceItem[];
  }> {
    // Build department filter CTE
    const deptFilterArray = departmentIds && departmentIds.length > 0
      ? departmentIds.map(id => `'${id}'::uuid`).join(',')
      : 'NULL::uuid';
    const deptFilterCondition = departmentIds && departmentIds.length > 0 ? 'true' : 'false';

    const query = `WITH dept_filter AS (
        SELECT unnest(ARRAY[${deptFilterArray}]) AS dept_id
        WHERE ${deptFilterCondition}
      ),
      params AS (
        SELECT (CURRENT_DATE - (${rangeDays}::int - 1) * INTERVAL '1 day')::timestamp AS start_ts,
               (CURRENT_DATE + INTERVAL '1 day')::timestamp AS end_ts
      ),
      answered_tickets AS (
        SELECT st.id,
               EXTRACT(EPOCH FROM (sta.created_at - st.created_at)) AS response_seconds,
               st.department_id
        FROM support_tickets st
        JOIN support_ticket_answers sta ON sta.support_ticket_id = st.id
        JOIN params p ON sta.created_at >= p.start_ts AND sta.created_at < p.end_ts
        WHERE (NOT EXISTS (SELECT 1 FROM dept_filter) OR st.department_id IN (SELECT dept_id FROM dept_filter))
      ),
      avg_response AS (
        SELECT AVG(response_seconds) AS avg_response_seconds
        FROM answered_tickets
      ),
      tasks_created AS (
        SELECT id
        FROM tasks t
        JOIN params p ON t.created_at >= p.start_ts AND t.created_at < p.end_ts
        WHERE (NOT EXISTS (SELECT 1 FROM dept_filter) 
               OR t.target_department_id IN (SELECT dept_id FROM dept_filter)
               OR t.target_sub_department_id IN (SELECT dept_id FROM dept_filter))
      ),
      tasks_completed AS (
        SELECT id
        FROM tasks t
        JOIN params p ON t.completed_at IS NOT NULL AND t.completed_at >= p.start_ts AND t.completed_at < p.end_ts
        WHERE (NOT EXISTS (SELECT 1 FROM dept_filter) 
               OR t.target_department_id IN (SELECT dept_id FROM dept_filter)
               OR t.target_sub_department_id IN (SELECT dept_id FROM dept_filter))
      ),
      task_completion AS (
        SELECT CASE WHEN (SELECT COUNT(*) FROM tasks_created) = 0 THEN NULL
                    ELSE (SELECT COUNT(*) FROM tasks_completed)::float / (SELECT COUNT(*) FROM tasks_created) * 100
               END AS completion_rate
      ),
      faq_stats AS (
        SELECT SUM(q.satisfaction)::float AS sat, SUM(q.dissatisfaction)::float AS diss
        FROM questions q
        WHERE (NOT EXISTS (SELECT 1 FROM dept_filter) OR q.department_id IN (SELECT dept_id FROM dept_filter))
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
        WHERE (NOT EXISTS (SELECT 1 FROM dept_filter) 
               OR t.target_department_id IN (SELECT dept_id FROM dept_filter)
               OR t.target_sub_department_id IN (SELECT dept_id FROM dept_filter))
        GROUP BY COALESCE(t.target_sub_department_id, t.target_department_id)
      ),
      dept_aggregate AS (
        SELECT d.id,
               d.name,
               COALESCE(tbd.cnt, 0) + COALESCE(ctbd.cnt, 0) AS score_raw
        FROM departments d
        LEFT JOIN tickets_by_dept tbd ON tbd.dept_id = d.id
        LEFT JOIN completed_tasks_by_dept ctbd ON ctbd.dept_id = d.id
        WHERE (NOT EXISTS (SELECT 1 FROM dept_filter) OR d.id IN (SELECT dept_id FROM dept_filter))
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

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        avg_response_seconds: number | null;
        task_completion_rate: number | null;
        faq_satisfaction: number | null;
        active_users: number | null;
        departments: Array<{ name: string; score_raw: number }>;
      }>
    >(query);

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

  async getExpiredAttachments(departmentIds?: string[]): Promise<
    {
      id: string;
      type: string;
      filename: string;
      originalName: string;
      expirationDate: Date;
      userId: string | null;
      guestId: string | null;
      isGlobal: boolean;
      size: number;
      createdAt: Date;
      updatedAt: Date;
      targetId: string;
      cloned: boolean;
    }[]
  > {
    // Build department filter CTE
    const deptFilterArray = departmentIds && departmentIds.length > 0
      ? departmentIds.map(id => `'${id}'::uuid`).join(',')
      : 'NULL::uuid';
    const deptFilterCondition = departmentIds && departmentIds.length > 0 ? 'true' : 'false';

    const query = `WITH dept_filter AS (
        SELECT unnest(ARRAY[${deptFilterArray}]) AS dept_id
        WHERE ${deptFilterCondition}
      )
      SELECT 
        a.id,
        a.type,
        a.filename,
        a.original_name,
        a.expiration_date,
        a.user_id,
        a.guest_id,
        a.is_global,
        a.size,
        a.created_at,
        a.updated_at,
        a.target_id,
        a.cloned
      FROM attachments a
      WHERE a.expiration_date IS NOT NULL 
        AND a.expiration_date < NOW() 
        AND cloned = false
        AND (
          NOT EXISTS (SELECT 1 FROM dept_filter)
          OR a.type = 'TASK' AND EXISTS (
            SELECT 1 FROM tasks t 
            WHERE t.id = a.target_id 
            AND (t.target_department_id IN (SELECT dept_id FROM dept_filter)
                 OR t.target_sub_department_id IN (SELECT dept_id FROM dept_filter))
          )
          OR a.type = 'SUPPORT_TICKET' AND EXISTS (
            SELECT 1 FROM support_tickets st 
            WHERE st.id = a.target_id 
            AND st.department_id IN (SELECT dept_id FROM dept_filter)
          )
          OR a.type = 'QUESTION' AND EXISTS (
            SELECT 1 FROM questions q 
            WHERE q.id = a.target_id 
            AND q.department_id IN (SELECT dept_id FROM dept_filter)
          )
        )
      ORDER BY a.expiration_date ASC;`;

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        type: string;
        filename: string;
        original_name: string;
        expiration_date: Date;
        user_id: string | null;
        guest_id: string | null;
        is_global: boolean;
        size: number;
        created_at: Date;
        updated_at: Date;
        target_id: string;
        cloned: boolean;
      }>
    >(query);

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      filename: row.filename,
      originalName: row.original_name,
      expirationDate: row.expiration_date,
      userId: row.user_id,
      guestId: row.guest_id,
      isGlobal: row.is_global,
      size: row.size,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      targetId: row.target_id,
      cloned: row.cloned,
    }));
  }

  async getEmployeeDashboardSummary(
    employeeId: string,
  ): Promise<EmployeeDashboardSummary> {
    const query = `
      WITH completed_tasks AS (
        SELECT COUNT(*)::int AS count
        FROM tasks t
        WHERE t.assignee_id = $1::uuid
          AND t.status = 'completed'
      ),
      closed_tickets AS (
        SELECT COUNT(*)::int AS count
        FROM support_tickets st
        WHERE st.assignee_id = $1::uuid
          AND st.status = 'closed'
      ),
      expired_files AS (
        SELECT COUNT(*)::int AS count
        FROM attachments a
        WHERE a.user_id = $1::uuid
          AND a.expiration_date IS NOT NULL
          AND a.expiration_date < NOW()
          AND a.cloned = false
      )
      SELECT
        (SELECT count FROM completed_tasks) AS completed_tasks,
        (SELECT count FROM closed_tickets) AS closed_tickets,
        (SELECT count FROM expired_files) AS expired_files;
    `;

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        completed_tasks: number;
        closed_tickets: number;
        expired_files: number;
      }>
    >(query, employeeId);

    const result = rows[0] ?? {
      completed_tasks: 0,
      closed_tickets: 0,
      expired_files: 0,
    };

    return {
      completedTasks: result.completed_tasks,
      closedTickets: result.closed_tickets,
      expiredFiles: result.expired_files,
    };
  }

  async getEmployeeDashboard(
    employeeId: string,
    taskLimit: number = 10,
    ticketLimit: number = 10,
  ): Promise<EmployeeDashboardData> {
    // Get summary
    const summary = await this.getEmployeeDashboardSummary(employeeId);

    // Get pending tasks
    const tasksQuery = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.due_date,
        t.status,
        t.created_at,
        t.updated_at
      FROM tasks t
      WHERE t.assignee_id = $1::uuid
        AND t.status IN ('to_do', 'seen', 'pending_review')
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
      LIMIT $2;
    `;

    const tasksRows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        description: string;
        priority: string;
        due_date: Date | null;
        status: string;
        created_at: Date;
        updated_at: Date;
      }>
    >(tasksQuery, employeeId, taskLimit);

    const pendingTasks: PendingTask[] = tasksRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      dueDate: row.due_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Get pending tickets
    const ticketsQuery = `
      SELECT
        st.id,
        st.subject,
        st.description,
        st.status,
        'MEDIUM' as priority,
        st.created_at,
        st.updated_at,
        st.code
      FROM support_tickets st
      WHERE st.assignee_id = $1::uuid
        AND st.status IN ('new', 'seen')
      ORDER BY st.created_at DESC
      LIMIT $2;
    `;

    const ticketsRows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        subject: string;
        description: string;
        status: string;
        priority: string;
        created_at: Date;
        updated_at: Date;
        code: string;
      }>
    >(ticketsQuery, employeeId, ticketLimit);

    const pendingTickets: PendingTicket[] = ticketsRows.map((row) => ({
      id: row.id,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      code: row.code,
    }));

    // Get expired files
    const filesQuery = `
      SELECT
        a.id,
        a.filename,
        a.original_name,
        a.type,
        a.size,
        a.expiration_date,
        a.created_at
      FROM attachments a
      WHERE a.user_id = $1::uuid
        AND a.expiration_date IS NOT NULL
        AND a.expiration_date < NOW()
        AND a.cloned = false
      ORDER BY a.expiration_date DESC
      LIMIT 10;
    `;

    const filesRows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        filename: string;
        original_name: string;
        type: string;
        size: number;
        expiration_date: Date;
        created_at: Date;
      }>
    >(filesQuery, employeeId);

    const expiredFiles: ExpiredFile[] = filesRows.map((row) => ({
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      type: row.type,
      size: Number(row.size),
      expirationDate: row.expiration_date,
      createdAt: row.created_at,
    }));

    return {
      summary,
      pendingTasks,
      pendingTickets,
      expiredFiles,
    };
  }
}
