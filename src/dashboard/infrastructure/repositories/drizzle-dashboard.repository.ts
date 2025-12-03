import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
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
import {
  users,
  employees,
  supervisors,
  supportTickets,
  tasks,
  questions,
  departments,
  employeeSubDepartments,
  departmentToSupervisor,
  attachments,
  supportTicketAnswers,
  activityLogs,
  taskDelegations,
} from 'src/common/drizzle/schema';
import {
  and,
  eq,
  sql,
  inArray,
  or,
  isNotNull,
  lt,
  ne,
  count,
  avg,
  sum,
  desc,
  asc,
  countDistinct,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

@Injectable()
export class DrizzleDashboardRepository extends DashboardRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private async getDepartmentChildren(
    departmentIds: string[],
  ): Promise<string[]> {
    if (!departmentIds || departmentIds.length === 0) {
      return [];
    }

    return this.db
      .select({ id: departments.id })
      .from(departments)
      .where(inArray(departments.parentId, departmentIds))
      .then((result) => result.map((d) => d.id)) as Promise<string[]>;
  }

  async getSummary(departmentIds?: string[]): Promise<DashboardSummary> {
    const hasFilter = departmentIds && departmentIds.length > 0;
    const childDepartmentIds = hasFilter
      ? await this.getDepartmentChildren(departmentIds)
      : [];

    const allDepartmentIds = hasFilter
      ? [...departmentIds, ...childDepartmentIds]
      : [];

    type SummaryRow = {
      adminCnt: number;
      employeeCnt: number;
      supervisorCnt: number;
      activeTickets: number;
      completedTickets: number;
      completedTasksOverall: number;
      completedTasksDept: number;
      completedTasksSubDept: number;
      completedTasksIndiv: number;
      pendingTasksOverall: number;
      pendingTasksDept: number;
      pendingTasksSubDept: number;
      pendingTasksIndiv: number;
      faqSat: number;
      faqDiss: number;
    };

    // Count users by role with filtering rules
    const [adminCountCte, employeeCountCte, supervisorCountCte] =
      this.countFilteredUsers(hasFilter, {
        rootDepartmentIds: departmentIds,
        childDepartmentIds,
      });

    // Count tickets (active and completed)
    const activeTicketsCTE = this.getCountActiveTicketsCTE(
      hasFilter,
      allDepartmentIds,
    );
    const completedTicketsCTE = this.getCountCompletedTicketsCTE(
      hasFilter,
      allDepartmentIds,
    );

    // Count tasks (completed and pending) - returns array of 4 CTEs each
    // [0] = overall count, [1] = department, [2] = sub_department, [3] = individual
    const completedTasksCTEs = this.getCountTasksCTE(
      hasFilter,
      { rootDepartmentIds: departmentIds, childDepartmentIds },
      'completed',
    );
    const pendingTasksCTEs = this.getCountTasksCTE(
      hasFilter,
      { rootDepartmentIds: departmentIds, childDepartmentIds },
      'pending',
    );

    // Calculate FAQ satisfaction
    const faqSatisfactionCTE = this.getCalculateFaqSatisfactionCTE(
      hasFilter,
      allDepartmentIds,
    );

    // Combine all CTEs and execute single query
    // Note: Using type assertion to work around TypeScript's complexity limit with multiple CTEs
    const result = (await (this.db as any)
      .with(
        adminCountCte,
        employeeCountCte,
        supervisorCountCte,
        activeTicketsCTE,
        completedTicketsCTE,
        completedTasksCTEs[0],
        completedTasksCTEs[1],
        completedTasksCTEs[2],
        completedTasksCTEs[3],
        pendingTasksCTEs[0],
        pendingTasksCTEs[1],
        pendingTasksCTEs[2],
        pendingTasksCTEs[3],
        faqSatisfactionCTE,
      )
      .select({
        // User counts
        adminCnt: sql<number>`${adminCountCte}.cnt`.as('adminCnt'),
        employeeCnt: sql<number>`${employeeCountCte}.cnt`.as('employeeCnt'),
        supervisorCnt: sql<number>`${supervisorCountCte}.cnt`.as(
          'supervisorCnt',
        ),
        // Ticket counts
        activeTickets: sql<number>`${activeTicketsCTE}.count`.as(
          'activeTickets',
        ),
        completedTickets: sql<number>`${completedTicketsCTE}.count`.as(
          'completedTickets',
        ),
        // Completed tasks - use overall if no filter, otherwise sum the specific CTEs
        completedTasksOverall: sql<number>`${completedTasksCTEs[0]}.count`.as(
          'completedTasksOverall',
        ),
        completedTasksDept: sql<number>`${completedTasksCTEs[1]}.count`.as(
          'completedTasksDept',
        ),
        completedTasksSubDept: sql<number>`${completedTasksCTEs[2]}.count`.as(
          'completedTasksSubDept',
        ),
        completedTasksIndiv: sql<number>`${completedTasksCTEs[3]}.count`.as(
          'completedTasksIndiv',
        ),
        // Pending tasks - use overall if no filter, otherwise sum the specific CTEs
        pendingTasksOverall: sql<number>`${pendingTasksCTEs[0]}.count`.as(
          'pendingTasksOverall',
        ),
        pendingTasksDept: sql<number>`${pendingTasksCTEs[1]}.count`.as(
          'pendingTasksDept',
        ),
        pendingTasksSubDept: sql<number>`${pendingTasksCTEs[2]}.count`.as(
          'pendingTasksSubDept',
        ),
        pendingTasksIndiv: sql<number>`${pendingTasksCTEs[3]}.count`.as(
          'pendingTasksIndiv',
        ),
        // FAQ satisfaction
        faqSat: sql<number>`${faqSatisfactionCTE}."totalSat"`.as('faqSat'),
        faqDiss: sql<number>`${faqSatisfactionCTE}."totalDiss"`.as('faqDiss'),
      })
      .from(adminCountCte)
      .fullJoin(employeeCountCte, sql`true`)
      .fullJoin(supervisorCountCte, sql`true`)
      .fullJoin(activeTicketsCTE, sql`true`)
      .fullJoin(completedTicketsCTE, sql`true`)
      .fullJoin(completedTasksCTEs[0], sql`true`)
      .fullJoin(completedTasksCTEs[1], sql`true`)
      .fullJoin(completedTasksCTEs[2], sql`true`)
      .fullJoin(completedTasksCTEs[3], sql`true`)
      .fullJoin(pendingTasksCTEs[0], sql`true`)
      .fullJoin(pendingTasksCTEs[1], sql`true`)
      .fullJoin(pendingTasksCTEs[2], sql`true`)
      .fullJoin(pendingTasksCTEs[3], sql`true`)
      .fullJoin(faqSatisfactionCTE, sql`true`)) as SummaryRow[];

    const row = result[0];

    // Calculate totals
    const totalUsers =
      (Number(row?.adminCnt) || 0) +
      (Number(row?.employeeCnt) || 0) +
      (Number(row?.supervisorCnt) || 0);

    // For tasks: if no filter, use overall count; otherwise sum the specific CTEs
    const completedTasks = hasFilter
      ? (Number(row?.completedTasksDept) || 0) +
        (Number(row?.completedTasksSubDept) || 0) +
        (Number(row?.completedTasksIndiv) || 0)
      : Number(row?.completedTasksOverall) || 0;

    const pendingTasks = hasFilter
      ? (Number(row?.pendingTasksDept) || 0) +
        (Number(row?.pendingTasksSubDept) || 0) +
        (Number(row?.pendingTasksIndiv) || 0)
      : Number(row?.pendingTasksOverall) || 0;

    // Calculate FAQ satisfaction percentage
    const faqSat = Number(row?.faqSat) || 0;
    const faqDiss = Number(row?.faqDiss) || 0;
    const faqTotal = faqSat + faqDiss;
    const faqSatisfaction =
      faqTotal === 0 ? 0 : Math.round((faqSat / faqTotal) * 100);

    return {
      totalUsers,
      activeTickets: Number(row?.activeTickets) || 0,
      completedTasks,
      completedTickets: Number(row?.completedTickets) || 0,
      pendingTasks,
      faqSatisfaction,
    };
  }

  private countFilteredUsers(
    hasFilter: boolean,
    deptTree: { rootDepartmentIds: string[]; childDepartmentIds: string[] },
  ) {
    // Admin count CTE (only when no filter)
    const adminCountCte = this.db.$with('admin_count').as(
      this.db
        .select({ cnt: count().as('cnt') })
        .from(users)
        .where(hasFilter ? sql`false` : eq(users.role, 'admin')),
    );

    // Employee count CTE
    const employeeCountCte = this.db.$with('employee_count').as(
      hasFilter && deptTree.childDepartmentIds.length > 0
        ? this.db
            .select({
              cnt: countDistinct(users.id).as('cnt'),
            })
            .from(users)
            .innerJoin(employees, eq(employees.userId, users.id))
            .innerJoin(
              employeeSubDepartments,
              eq(employeeSubDepartments.employeeId, employees.id),
            )
            .where(
              and(
                eq(users.role, 'employee'),
                inArray(
                  employeeSubDepartments.departmentId,
                  deptTree.childDepartmentIds,
                ),
              ),
            )
        : hasFilter
          ? this.db
              .select({
                cnt: countDistinct(users.id).as('cnt'),
              })
              .from(users)
              .innerJoin(employees, eq(employees.userId, users.id))
              .where(sql`false`)
          : this.db
              .select({
                cnt: countDistinct(users.id).as('cnt'),
              })
              .from(users)
              .innerJoin(employees, eq(employees.userId, users.id))
              .where(eq(users.role, 'employee')),
    );

    // Supervisor count CTE
    const supervisorCountCte = this.db.$with('supervisor_count').as(
      hasFilter && deptTree.rootDepartmentIds.length > 0
        ? this.db
            .select({
              cnt: countDistinct(users.id).as('cnt'),
            })
            .from(users)
            .innerJoin(supervisors, eq(supervisors.userId, users.id))
            .innerJoin(
              departmentToSupervisor,
              eq(departmentToSupervisor.b, supervisors.id),
            )
            .where(
              and(
                eq(users.role, 'supervisor'),
                inArray(departmentToSupervisor.a, deptTree.rootDepartmentIds),
              ),
            )
        : hasFilter
          ? this.db
              .select({
                cnt: countDistinct(users.id).as('cnt'),
              })
              .from(users)
              .innerJoin(supervisors, eq(supervisors.userId, users.id))
              .where(sql`false`)
          : this.db
              .select({
                cnt: countDistinct(users.id).as('cnt'),
              })
              .from(users)
              .innerJoin(supervisors, eq(supervisors.userId, users.id))
              .where(eq(users.role, 'supervisor')),
    );

    return [adminCountCte, employeeCountCte, supervisorCountCte];
  }

  private getCountActiveTicketsCTE(
    hasFilter: boolean,
    allDepartmentIds: string[],
  ) {
    const whereConditions = [
      inArray(supportTickets.status, ['new', 'seen', 'answered']),
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      whereConditions.push(
        inArray(supportTickets.departmentId, allDepartmentIds),
      );
    }

    const countActiveTicketsCte = this.db.$with('count_active_tickets').as(
      this.db
        .select({ count: count().as('count') })
        .from(supportTickets)
        .where(and(...whereConditions)),
    );

    return countActiveTicketsCte;
  }

  private getCountCompletedTicketsCTE(
    hasFilter: boolean,
    allDepartmentIds: string[],
  ) {
    const whereConditions = [eq(supportTickets.status, 'closed')];

    if (hasFilter && allDepartmentIds.length > 0) {
      whereConditions.push(
        inArray(supportTickets.departmentId, allDepartmentIds),
      );
    }

    const countCompletedTicketsCte = this.db
      .$with('count_completed_tickets')
      .as(
        this.db
          .select({ count: count().as('count') })
          .from(supportTickets)
          .where(and(...whereConditions)),
      );

    return countCompletedTicketsCte;
  }

  private getCountTasksCTE(
    hasFilter: boolean,
    deptTree: { rootDepartmentIds: string[]; childDepartmentIds: string[] },
    status: 'completed' | 'pending',
  ) {
    const statusWhereCondition =
      status === 'completed'
        ? eq(tasks.status, 'completed')
        : inArray(tasks.status, ['to_do', 'seen', 'pending_review']);

    const countTasksCte = this.db.$with(`count_${status}_tasks`).as(
      this.db
        .select({ count: count().as('count') })
        .from(tasks)
        .where(statusWhereCondition),
    );

    // Department-level tasks
    const departmentTasksCte =
      hasFilter && deptTree.rootDepartmentIds.length > 0
        ? this.db.$with(`count_${status}_tasks_department`).as(
            this.db
              .select({ count: count().as('count') })
              .from(tasks)
              .where(
                and(
                  statusWhereCondition,
                  eq(tasks.assignmentType, 'department'),
                  inArray(tasks.targetDepartmentId, deptTree.rootDepartmentIds),
                ),
              ),
          )
        : this.db
            .$with(`count_${status}_tasks_department`)
            .as(
              this.db
                .select({ count: sql<number>`0`.as('count') })
                .from(sql`(SELECT 1) as dummy`),
            );
    const subDepartmentTasksCte =
      hasFilter && deptTree.childDepartmentIds.length > 0
        ? this.db.$with(`count_${status}_tasks_sub_department`).as(
            this.db
              .select({ count: count().as('count') })
              .from(tasks)
              .where(
                and(
                  statusWhereCondition,
                  eq(tasks.assignmentType, 'sub_department'),
                  inArray(
                    tasks.targetSubDepartmentId,
                    deptTree.childDepartmentIds,
                  ),
                ),
              ),
          )
        : this.db
            .$with(`count_${status}_tasks_sub_department`)
            .as(
              this.db
                .select({ count: sql<number>`0`.as('count') })
                .from(sql`(SELECT 1) as dummy`),
            );
    const individualTasksCte =
      hasFilter && deptTree.childDepartmentIds.length > 0
        ? this.db.$with(`count_${status}_tasks_individual`).as(
            this.db
              .select({ count: countDistinct(tasks.id).as('count') })
              .from(tasks)
              .innerJoin(employees, eq(employees.id, tasks.assigneeId))
              .innerJoin(
                employeeSubDepartments,
                eq(employeeSubDepartments.employeeId, employees.id),
              )
              .where(
                and(
                  statusWhereCondition,
                  eq(tasks.assignmentType, 'individual'),
                  isNotNull(tasks.assigneeId),
                  inArray(
                    employeeSubDepartments.departmentId,
                    deptTree.childDepartmentIds,
                  ),
                ),
              ),
          )
        : this.db
            .$with(`count_${status}_tasks_individual`)
            .as(
              this.db
                .select({ count: sql<number>`0`.as('count') })
                .from(sql`(SELECT 1) as dummy`),
            );

    return [
      countTasksCte,
      departmentTasksCte,
      subDepartmentTasksCte,
      individualTasksCte,
    ];
  }

  private getCalculateFaqSatisfactionCTE(
    hasFilter: boolean,
    allDepartmentIds: string[],
  ) {
    return this.db.$with('faq_satisfaction').as(
      hasFilter && allDepartmentIds.length > 0
        ? this.db
            .select({
              totalSat: sum(questions.satisfaction).as('totalSat'),
              totalDiss: sum(questions.dissatisfaction).as('totalDiss'),
            })
            .from(questions)
            .where(inArray(questions.departmentId, allDepartmentIds))
        : this.db
            .select({
              totalSat: sum(questions.satisfaction).as('totalSat'),
              totalDiss: sum(questions.dissatisfaction).as('totalDiss'),
            })
            .from(questions),
    );
  }

  async getWeeklyPerformance(
    rangeDays: number = 7,
    departmentIds?: string[],
  ): Promise<PerformanceSeriesPoint[]> {
    const hasFilter = departmentIds && departmentIds.length > 0;
    const childDepartmentIds = hasFilter
      ? await this.getDepartmentChildren(departmentIds)
      : [];
    const allDepartmentIds = hasFilter
      ? [...departmentIds, ...childDepartmentIds]
      : [];

    // Generate date series
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (rangeDays - 1));
    startDate.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < rangeDays; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    // Get completed tasks by day
    const taskWhereConditions = [
      isNotNull(tasks.completedAt),
      sql`${tasks.completedAt} >= ${startDate.toISOString()}`,
      sql`${tasks.completedAt} <= ${endDate.toISOString()}`,
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      taskWhereConditions.push(
        or(
          inArray(tasks.targetDepartmentId, allDepartmentIds),
          inArray(tasks.targetSubDepartmentId, allDepartmentIds),
        ),
      );
    }

    const taskResults = await this.db
      .select({
        day: sql<string>`DATE(${tasks.completedAt})`,
        count: count(),
      })
      .from(tasks)
      .where(and(...taskWhereConditions))
      .groupBy(sql`DATE(${tasks.completedAt})`);
    const tasksByDay = new Map(
      taskResults.map((r) => [r.day, Number(r.count)]),
    );

    // Get tickets answered per day with response time
    const ticketAlias = alias(supportTickets, 'st');
    const answerAlias = alias(supportTicketAnswers, 'sta');

    const ticketWhereConditions = [
      sql`${answerAlias.createdAt} >= ${startDate.toISOString()}`,
      sql`${answerAlias.createdAt} <= ${endDate.toISOString()}`,
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      ticketWhereConditions.push(
        inArray(ticketAlias.departmentId, allDepartmentIds),
      );
    }

    const ticketResults = await this.db
      .select({
        day: sql<string>`DATE(${answerAlias.createdAt})`,
        count: count(),
        avgResponseSeconds: avg(
          sql<number>`EXTRACT(EPOCH FROM (${answerAlias.createdAt} - ${ticketAlias.createdAt}))`,
        ),
      })
      .from(ticketAlias)
      .innerJoin(answerAlias, eq(answerAlias.supportTicketId, ticketAlias.id))
      .where(and(...ticketWhereConditions))
      .groupBy(sql`DATE(${answerAlias.createdAt})`);
    const ticketsByDay = new Map(
      ticketResults.map((r) => [
        r.day,
        {
          count: Number(r.count),
          avgResponseSeconds: Math.round(Number(r.avgResponseSeconds ?? 0)),
        },
      ]),
    );

    // Build result array
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day) => {
      const dayKey = day.toISOString().split('T')[0];
      const dayName = dayNames[day.getDay()];

      return {
        label: dayName,
        tasksCompleted: tasksByDay.get(dayKey) ?? 0,
        ticketsClosed: ticketsByDay.get(dayKey)?.count ?? 0,
        avgFirstResponseSeconds:
          ticketsByDay.get(dayKey)?.avgResponseSeconds ?? 0,
      };
    });
  }

  async getAnalyticsSummary(
    rangeDays: number = 7,
    departmentIds?: string[],
  ): Promise<{
    kpis: AnalyticsSummaryKpi[];
    departmentPerformance: DepartmentPerformanceItem[];
  }> {
    const hasFilter = departmentIds && departmentIds.length > 0;
    const childDepartmentIds = hasFilter
      ? await this.getDepartmentChildren(departmentIds)
      : [];
    const allDepartmentIds = hasFilter
      ? [...departmentIds, ...childDepartmentIds]
      : [];

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (rangeDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // Calculate KPIs in parallel
    const [
      avgResponseTime,
      taskCompletionRate,
      faqSatisfactionRate,
      activeUsersCount,
    ] = await Promise.all([
      this.getAvgTicketResponseTime(
        hasFilter,
        allDepartmentIds,
        startDate,
        endDate,
      ),
      this.getTaskCompletionRate(
        hasFilter,
        allDepartmentIds,
        startDate,
        endDate,
      ),
      this.getFaqSatisfactionRate(hasFilter, allDepartmentIds),
      this.getActiveUsersCount(startDate, endDate),
    ]);

    const hours = Math.floor(avgResponseTime / 3600);
    const minutes = Math.floor((avgResponseTime % 3600) / 60);
    const avgResponse = `${hours}h ${minutes}m`;

    const kpis: AnalyticsSummaryKpi[] = [
      { label: 'Avg. Ticket Response', value: avgResponse },
      {
        label: 'Task Completion Rate',
        value: `${Math.round(taskCompletionRate)}%`,
      },
      {
        label: 'FAQ Satisfaction',
        value: `${Math.round(faqSatisfactionRate)}%`,
      },
      { label: 'Active Users (7d)', value: activeUsersCount.toLocaleString() },
    ];

    // Get department performance
    const departmentPerformance = await this.getDepartmentPerformance(
      hasFilter,
      allDepartmentIds,
      startDate,
      endDate,
    );

    return { kpis, departmentPerformance };
  }

  private async getAvgTicketResponseTime(
    hasFilter: boolean,
    allDepartmentIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const ticketAlias = alias(supportTickets, 'st');
    const answerAlias = alias(supportTicketAnswers, 'sta');

    const whereConditions = [
      sql`${answerAlias.createdAt} >= ${startDate.toISOString()}`,
      sql`${answerAlias.createdAt} < ${endDate.toISOString()}`,
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      whereConditions.push(inArray(ticketAlias.departmentId, allDepartmentIds));
    }

    const result = await this.db
      .select({
        avgSeconds: avg(
          sql<number>`EXTRACT(EPOCH FROM (${answerAlias.createdAt} - ${ticketAlias.createdAt}))`,
        ),
      })
      .from(ticketAlias)
      .innerJoin(answerAlias, eq(answerAlias.supportTicketId, ticketAlias.id))
      .where(and(...whereConditions));

    return Number(result[0]?.avgSeconds ?? 0);
  }

  private async getTaskCompletionRate(
    hasFilter: boolean,
    allDepartmentIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Count created tasks
    const createdWhereConditions = [
      sql`${tasks.createdAt} >= ${startDate.toISOString()}`,
      sql`${tasks.createdAt} < ${endDate.toISOString()}`,
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      createdWhereConditions.push(
        or(
          inArray(tasks.targetDepartmentId, allDepartmentIds),
          inArray(tasks.targetSubDepartmentId, allDepartmentIds),
        ),
      );
    }

    // Count completed tasks
    const completedWhereConditions = [
      isNotNull(tasks.completedAt),
      sql`${tasks.completedAt} >= ${startDate.toISOString()}`,
      sql`${tasks.completedAt} < ${endDate.toISOString()}`,
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      completedWhereConditions.push(
        or(
          inArray(tasks.targetDepartmentId, allDepartmentIds),
          inArray(tasks.targetSubDepartmentId, allDepartmentIds),
        ),
      );
    }

    const [createdResult, completedResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(tasks)
        .where(and(...createdWhereConditions)),
      this.db
        .select({ count: count() })
        .from(tasks)
        .where(and(...completedWhereConditions)),
    ]);

    const created = Number(createdResult[0]?.count ?? 0);
    const completed = Number(completedResult[0]?.count ?? 0);

    if (created === 0) return 0;

    return (completed / created) * 100;
  }

  private async getFaqSatisfactionRate(
    hasFilter: boolean,
    allDepartmentIds: string[],
  ): Promise<number> {
    let result;

    if (hasFilter && allDepartmentIds.length > 0) {
      result = await this.db
        .select({
          totalSat: sum(questions.satisfaction),
          totalDiss: sum(questions.dissatisfaction),
        })
        .from(questions)
        .where(inArray(questions.departmentId, allDepartmentIds));
    } else {
      result = await this.db
        .select({
          totalSat: sum(questions.satisfaction),
          totalDiss: sum(questions.dissatisfaction),
        })
        .from(questions);
    }

    const totalSat = Number(result[0]?.totalSat ?? 0);
    const totalDiss = Number(result[0]?.totalDiss ?? 0);
    const total = totalSat + totalDiss;

    if (total === 0) return 0;

    return (totalSat / total) * 100;
  }

  private async getActiveUsersCount(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.db
      .selectDistinct({ userId: activityLogs.userId })
      .from(activityLogs)
      .where(
        and(
          sql`${activityLogs.createdAt} >= ${startDate.toISOString()}`,
          sql`${activityLogs.createdAt} < ${endDate.toISOString()}`,
        ),
      );

    return result.length;
  }

  private async getDepartmentPerformance(
    hasFilter: boolean,
    allDepartmentIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<DepartmentPerformanceItem[]> {
    // Get tickets answered by department
    const ticketAlias = alias(supportTickets, 'st');
    const answerAlias = alias(supportTicketAnswers, 'sta');

    const ticketWhereConditions = [
      sql`${answerAlias.createdAt} >= ${startDate.toISOString()}`,
      sql`${answerAlias.createdAt} < ${endDate.toISOString()}`,
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      ticketWhereConditions.push(
        inArray(ticketAlias.departmentId, allDepartmentIds),
      );
    }

    // Get completed tasks by department
    const taskWhereConditions = [
      isNotNull(tasks.completedAt),
      sql`${tasks.completedAt} >= ${startDate.toISOString()}`,
      sql`${tasks.completedAt} < ${endDate.toISOString()}`,
    ];

    if (hasFilter && allDepartmentIds.length > 0) {
      taskWhereConditions.push(
        or(
          inArray(tasks.targetDepartmentId, allDepartmentIds),
          inArray(tasks.targetSubDepartmentId, allDepartmentIds),
        ),
      );
    }

    const [ticketResults, taskResults] = await Promise.all([
      this.db
        .select({
          departmentId: ticketAlias.departmentId,
          count: count(),
        })
        .from(ticketAlias)
        .innerJoin(answerAlias, eq(answerAlias.supportTicketId, ticketAlias.id))
        .where(and(...ticketWhereConditions))
        .groupBy(ticketAlias.departmentId),
      this.db
        .select({
          departmentId: sql<string>`COALESCE(${tasks.targetSubDepartmentId}, ${tasks.targetDepartmentId})`,
          count: count(),
        })
        .from(tasks)
        .where(and(...taskWhereConditions))
        .groupBy(
          sql`COALESCE(${tasks.targetSubDepartmentId}, ${tasks.targetDepartmentId})`,
        ),
    ]);

    // Aggregate scores by department
    const scoreMap = new Map<string, number>();

    for (const ticket of ticketResults) {
      const current = scoreMap.get(ticket.departmentId) ?? 0;
      scoreMap.set(ticket.departmentId, current + Number(ticket.count));
    }

    for (const task of taskResults) {
      if (task.departmentId) {
        const current = scoreMap.get(task.departmentId) ?? 0;
        scoreMap.set(task.departmentId, current + Number(task.count));
      }
    }

    // Get department names
    const deptIds = Array.from(scoreMap.keys());
    if (deptIds.length === 0) return [];

    const deptNames = await this.db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(inArray(departments.id, deptIds));

    const nameMap = new Map(deptNames.map((d) => [d.id, d.name]));

    // Calculate normalized scores
    const maxScore = Math.max(...Array.from(scoreMap.values()), 1);

    const performance: DepartmentPerformanceItem[] = [];
    for (const [deptId, rawScore] of scoreMap.entries()) {
      const name = nameMap.get(deptId);
      if (name) {
        performance.push({
          name,
          score: Math.round((rawScore / maxScore) * 100),
        });
      }
    }

    // Sort by score descending
    performance.sort((a, b) => b.score - a.score);

    return performance;
  }

  // TODO: department filtering is not supported yet
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
    const now = new Date();

    // Global query - no department filtering
    const results = await this.db
      .select({
        id: attachments.id,
        type: attachments.type,
        filename: attachments.filename,
        originalName: attachments.originalName,
        expirationDate: attachments.expirationDate,
        userId: attachments.userId,
        guestId: attachments.guestId,
        isGlobal: attachments.isGlobal,
        size: attachments.size,
        createdAt: attachments.createdAt,
        updatedAt: attachments.updatedAt,
        targetId: attachments.targetId,
        cloned: attachments.cloned,
      })
      .from(attachments)
      .where(
        and(
          isNotNull(attachments.expirationDate),
          lt(attachments.expirationDate, now.toISOString()),
          eq(attachments.cloned, false),
        ),
      )
      .orderBy(asc(attachments.expirationDate));

    return results.map((r) => ({
      ...r,
      expirationDate: new Date(r.expirationDate!),
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      userId: r.userId ?? null,
      guestId: r.guestId ?? null,
      targetId: r.targetId ?? '',
    }));
  }

  async getEmployeeDashboardSummary(
    employeeId: string,
  ): Promise<EmployeeDashboardSummary> {
    const now = new Date();

    const employeeDepartmentIds = await this.db
      .select({
        id: employeeSubDepartments.departmentId,
        parentId: departments.parentId,
      })
      .from(employeeSubDepartments)
      .leftJoin(
        departments,
        eq(employeeSubDepartments.departmentId, departments.id),
      )
      .where(eq(employeeSubDepartments.employeeId, employeeId))
      .then((res) => res.map((r) => [r.id, r.parentId]).flat());

    const [completedTasksResult, closedTicketsResult, expiredFilesResult] =
      await Promise.all([
        this.db
          .select({ count: count() })
          .from(tasks)
          .where(
            and(
              or(
                eq(tasks.assigneeId, employeeId),
                inArray(tasks.targetSubDepartmentId, employeeDepartmentIds),
              ),
              eq(tasks.status, 'completed'),
            ),
          ),
        this.db
          .select({ count: count() })
          .from(supportTickets)
          .where(
            and(
              or(
                eq(supportTickets.assigneeId, employeeId),
                inArray(supportTickets.departmentId, employeeDepartmentIds),
              ),
              eq(supportTickets.status, 'closed'),
            ),
          ),
        this.db
          .select({ count: count() })
          .from(attachments)
          .where(
            and(
              eq(attachments.userId, employeeId),
              isNotNull(attachments.expirationDate),
              lt(attachments.expirationDate, now.toISOString()),
              eq(attachments.cloned, false),
            ),
          ),
      ]);

    return {
      completedTasks: Number(completedTasksResult[0]?.count ?? 0),
      closedTickets: Number(closedTicketsResult[0]?.count ?? 0),
      expiredFiles: Number(expiredFilesResult[0]?.count ?? 0),
    };
  }

  async getEmployeeDashboard(
    employeeId: string,
    taskLimit: number = 10,
    ticketLimit: number = 10,
  ): Promise<EmployeeDashboardData> {
    const now = new Date();

    const employeeDepartmentIds = await this.db
      .select({
        id: employeeSubDepartments.departmentId,
        parentId: departments.parentId,
      })
      .from(employeeSubDepartments)
      .leftJoin(
        departments,
        eq(employeeSubDepartments.departmentId, departments.id),
      )
      .where(eq(employeeSubDepartments.employeeId, employeeId))
      .then((res) => res.map((r) => [r.id, r.parentId]).flat());

    // Get summary
    const summary = await this.getEmployeeDashboardSummary(employeeId);

    // Get pending tasks
    const pendingTasksResults = await this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        status: tasks.status,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(
        and(
          or(
            eq(tasks.assigneeId, employeeId),
            inArray(tasks.targetSubDepartmentId, employeeDepartmentIds),
          ),
          inArray(tasks.status, ['to_do', 'seen', 'pending_review']),
        ),
      )
      .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))
      .limit(taskLimit);

    const pendingTasks: PendingTask[] = pendingTasksResults.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      dueDate: r.dueDate ? new Date(r.dueDate) : null,
      status: r.status,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }));

    // Get pending tickets
    const pendingTicketsResults = await this.db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        description: supportTickets.description,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        code: supportTickets.code,
      })
      .from(supportTickets)
      .where(
        and(
          or(
            eq(supportTickets.assigneeId, employeeId),
            inArray(supportTickets.departmentId, employeeDepartmentIds),
          ),
          inArray(supportTickets.status, ['new', 'seen']),
        ),
      )
      .orderBy(desc(supportTickets.createdAt))
      .limit(ticketLimit);

    const pendingTickets: PendingTicket[] = pendingTicketsResults.map((r) => ({
      id: r.id,
      subject: r.subject,
      description: r.description,
      status: r.status,
      priority: 'MEDIUM', // Default as per original implementation
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      code: r.code,
    }));

    // Get expired files
    const expiredFilesResults = await this.db
      .select({
        id: attachments.id,
        filename: attachments.filename,
        originalName: attachments.originalName,
        type: attachments.type,
        size: attachments.size,
        expirationDate: attachments.expirationDate,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.userId, employeeId),
          isNotNull(attachments.expirationDate),
          lt(attachments.expirationDate, now.toISOString()),
          eq(attachments.cloned, false),
        ),
      )
      .orderBy(desc(attachments.expirationDate))
      .limit(10);

    const expiredFiles: ExpiredFile[] = expiredFilesResults.map((r) => ({
      id: r.id,
      filename: r.filename,
      originalName: r.originalName,
      type: r.type,
      size: Number(r.size),
      expirationDate: new Date(r.expirationDate!),
      createdAt: new Date(r.createdAt),
    }));

    const pendingDelegationsResults = await this.db
      .select({
        id: taskDelegations.id,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        status: taskDelegations.status,
        createdAt: taskDelegations.createdAt,
        updatedAt: taskDelegations.updatedAt,
      })
      .from(taskDelegations)
      .leftJoin(tasks, eq(taskDelegations.taskId, tasks.id))
      .where(
        and(
          or(
            eq(taskDelegations.assigneeId, employeeId),
            inArray(
              taskDelegations.targetSubDepartmentId,
              employeeDepartmentIds,
            ),
          ),
          inArray(taskDelegations.status, ['to_do', 'seen', 'pending_review']),
        ),
      )
      .orderBy(asc(tasks.dueDate), desc(taskDelegations.createdAt))
      .limit(taskLimit);

    const pendingDelegations: PendingTask[] = pendingDelegationsResults.map(
      (r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        dueDate: r.dueDate ? new Date(r.dueDate) : null,
        status: r.status,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }),
    );

    return {
      summary,
      pendingTasks: pendingTasks.concat(pendingDelegations),
      pendingTickets,
      expiredFiles,
    };
  }
}
