import type { SQL } from 'drizzle-orm';
import { and, count, eq, exists, ilike, inArray, or, sql } from 'drizzle-orm';
import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import {
  departments,
  departmentToSupervisor,
  employees,
  employeeSubDepartments,
  supervisors,
  taskDelegations,
  tasks,
} from '@/common/drizzle/schema';
import type { Attachment } from '@/filehub/domain/entities/attachment.entity';
import type {
  Task,
  TaskPriority,
  TaskStatus,
} from '@/v2/tasks/domain/entities/task.entity';
import type { TaskDelegation } from '@/v2/tasks/domain/entities/task-delegation.entity';
import type { TaskDelegationSubmission } from '@/v2/tasks/domain/entities/task-delegation-submission.entity';
import type { TaskSubmission } from '@/v2/tasks/domain/entities/task-submission.entity';
import type {
  DepartmentTaskFilters,
  IndividualTaskFilters,
} from '@/v2/tasks/domain/repositories/task.repository';
import { priorityToDb, statusToDb } from './mappers';
import type { TaskRepoContext } from './repository-query';
import {
  applyDepartmentTaskFilters,
  fetchTasks,
  paginateEmpty,
} from './repository-query';
import { Matches } from 'class-validator';

export async function getTaskMetricsForSupervisor(
  ctx: TaskRepoContext,
  options?: {
    filters?: {
      priority?: TaskPriority[];
      search?: string;
      departmentId?: string;
      subDepartmentId?: string;
    };
    whereConditions?: SQL[];
  },
): Promise<{
  pendingCount: number;
  completedCount: number;
  completionPercentage: number;
}> {
  const conditions = options?.whereConditions ?? [];

  if (options?.filters?.departmentId) {
    conditions.push(eq(tasks.targetDepartmentId, options.filters.departmentId));
  }

  if (options?.filters?.subDepartmentId) {
    conditions.push(
      eq(tasks.targetSubDepartmentId, options.filters.subDepartmentId),
    );
  }

  if (options?.filters?.priority) {
    conditions.push(
      inArray(
        tasks.priority,
        options.filters.priority.map((p) => priorityToDb(p)),
      ),
    );
  }

  if (options?.filters?.search) {
    conditions.push(
      or(
        ilike(tasks.title, `%${options.filters.search}%`),
        ilike(tasks.description, `%${options.filters.search}%`),
      ),
    );
  }

  const [pending] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(...conditions, sql`${tasks.status} <> 'completed'`));
  const [completed] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(...conditions, eq(tasks.status, 'completed')));
  const pendingCount = pending?.count ?? 0;
  const completedCount = completed?.count ?? 0;
  const total = pendingCount + completedCount;
  return {
    pendingCount,
    completedCount,
    completionPercentage:
      total > 0 ? Math.round((completedCount / total) * 100) : 0,
  };
}

export async function getTasksForSupervisor(
  ctx: TaskRepoContext,
  options: {
    supervisorUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    departmentId?: string;
  },
): Promise<
  PaginatedArrayResult<{
    task: Task;
    rejectionReason?: string;
    approvalFeedback?: string;
  }> & {
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }
> {
  const [supervisorRow] = await ctx.db
    .select()
    .from(supervisors)
    .where(eq(supervisors.userId, options.supervisorUserId))
    .limit(1);
  if (!supervisorRow) {
    const empty = await paginateEmpty(ctx, options.cursor);
    return {
      data: [],
      meta: empty.meta,
      metrics: {
        pendingTasks: 0,
        completedTasks: 0,
        taskCompletionPercentage: 0,
      },
    };
  }
  const deptRows = await ctx.db
    .select({ departmentId: departmentToSupervisor.departmentId })
    .from(departmentToSupervisor)
    .where(eq(departmentToSupervisor.supervisorId, supervisorRow.id));
  const departmentIds = options.departmentId
    ? [options.departmentId]
    : deptRows.map((r) => r.departmentId);

  const whereConditions: SQL[] = [
    inArray(tasks.targetDepartmentId, departmentIds),
  ];
  applyDepartmentTaskFilters(whereConditions, {
    status: options.status,
    priority: options.priority,
    search: options.search,
  });
  const paginationParams = ctx.pagination.parseInput(options.cursor);
  const list = await fetchTasks(ctx, {
    where: and(...whereConditions),
    paginationParams,
  });
  const result = ctx.pagination.processResults(list, paginationParams, (t) => ({
    createdAt: t.task.createdAt.toISOString(),
    id: t.task.id,
  }));

  const metrics = await getTaskMetricsForSupervisor(ctx, {
    filters: {
      priority: options.priority,
      search: options.search,
      departmentId: options.departmentId,
    },
    whereConditions: whereConditions,
  });
  return {
    data: result.data.map((task) => ({
      task: task.task,
      rejectionReason: task.submissions.find((s) => s.status === 'REJECTED')
        ?.feedback,
      approvalFeedback: task.submissions.find((s) => s.status === 'APPROVED')
        ?.feedback,
    })),
    meta: result.meta,
    metrics: {
      pendingTasks: metrics.pendingCount,
      completedTasks: metrics.completedCount,
      taskCompletionPercentage: metrics.completionPercentage,
    },
  };
}

export async function getTaskMetricsForEmployee(
  ctx: TaskRepoContext,
  employeeId: string,
  _supervisorId: string,
  subDepartmentIds: string[],
): Promise<{
  pendingCount: number;
  completedCount: number;
  completionPercentage: number;
}> {
  const whereBase = or(
    eq(tasks.assigneeId, employeeId),
    inArray(tasks.targetSubDepartmentId, subDepartmentIds),
  );
  const [pending] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(whereBase, sql`${tasks.status} <> 'completed'`));
  const [completed] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(whereBase, eq(tasks.status, 'completed')));
  const pendingCount = pending?.count ?? 0;
  const completedCount = completed?.count ?? 0;
  const total = pendingCount + completedCount;
  return {
    pendingCount,
    completedCount,
    completionPercentage: total > 0 ? (completedCount / total) * 100 : 0,
  };
}

export async function getTaskMetricsForDepartment(
  ctx: TaskRepoContext,
  departmentId?: string,
  filters?: DepartmentTaskFilters,
): Promise<{
  pendingCount: number;
  completedCount: number;
  completionPercentage: number;
}> {
  const whereConditions: SQL[] = [eq(tasks.assignmentType, 'department')];
  if (departmentId) {
    whereConditions.push(eq(tasks.targetDepartmentId, departmentId));
  }
  applyDepartmentTaskFilters(whereConditions, filters);
  const baseWhere =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;
  const [pending] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(
      baseWhere
        ? and(baseWhere, sql`${tasks.status} <> 'completed'`)
        : sql`${tasks.status} <> 'completed'`,
    );
  const [completed] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(
      baseWhere
        ? and(baseWhere, eq(tasks.status, 'completed'))
        : eq(tasks.status, 'completed'),
    );
  const pendingCount = pending?.count ?? 0;
  const completedCount = completed?.count ?? 0;
  const total = pendingCount + completedCount;
  return {
    pendingCount,
    completedCount,
    completionPercentage:
      total > 0 ? Math.floor((completedCount / total) * 100) : 0,
  };
}

export async function getTaskMetricsForSubDepartment(
  ctx: TaskRepoContext,
  subDepartmentId?: string,
  filters?: DepartmentTaskFilters,
): Promise<{
  pendingCount: number;
  completedCount: number;
  completionPercentage: number;
}> {
  const whereConditions: SQL[] = [eq(tasks.assignmentType, 'sub_department')];
  if (subDepartmentId) {
    whereConditions.push(eq(tasks.targetSubDepartmentId, subDepartmentId));
  }
  applyDepartmentTaskFilters(whereConditions, filters);
  const [pending] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(...whereConditions, sql`${tasks.status} <> 'completed'`));
  const [completed] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(...whereConditions, eq(tasks.status, 'completed')));
  const pendingCount = pending?.count ?? 0;
  const completedCount = completed?.count ?? 0;
  const total = pendingCount + completedCount;
  return {
    pendingCount,
    completedCount,
    completionPercentage: total > 0 ? (completedCount / total) * 100 : 0,
  };
}

export async function getTeamTasksForSupervisor(
  ctx: TaskRepoContext,
  options: {
    supervisorDepartmentIds: string[];
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    departmentId?: string;
    subDepartmentId?: string;
  },
): Promise<
  PaginatedArrayResult<{
    task: {
      data: Task;
      submissions: TaskSubmission[];
      delegationSubmissions: TaskDelegationSubmission[];
    };
  }> & {
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }
> {
  const { supervisorDepartmentIds } = options;

  // ── Base condition: two paths to find tasks visible to this supervisor ──
  const whereConditions: SQL[] = [
    or(
      // Path 1: Task targets a sub-department under supervisor's departments
      exists(
        ctx.db
          .select({ one: sql`1` })
          .from(departments)
          .where(
            and(
              eq(departments.id, tasks.targetSubDepartmentId),
              inArray(departments.parentId, supervisorDepartmentIds),
            ),
          ),
      ),
      // Path 2: Task assigned to an employee who belongs to a sub-department
      //         under supervisor's departments
      exists(
        ctx.db
          .select({ one: sql`1` })
          .from(employees)
          .innerJoin(
            employeeSubDepartments,
            eq(employees.id, employeeSubDepartments.employeeId),
          )
          .innerJoin(
            departments,
            eq(employeeSubDepartments.departmentId, departments.id),
          )
          .where(
            and(
              eq(tasks.assigneeId, employees.id),
              inArray(departments.parentId, supervisorDepartmentIds),
            ),
          ),
      ),
    ) as SQL,
  ];

  // ── Optional department filter ──
  if (options.departmentId) {
    whereConditions.push(
      or(
        eq(tasks.targetDepartmentId, options.departmentId),
        exists(
          ctx.db
            .select({ one: sql`1` })
            .from(departments)
            .where(
              and(
                eq(departments.id, tasks.targetSubDepartmentId),
                eq(departments.parentId, options.departmentId),
              ),
            ),
        ),
      ) as SQL,
    );
  }

  // ── Optional sub-department filter ──
  if (options.subDepartmentId) {
    whereConditions.push(
      or(
        eq(tasks.targetSubDepartmentId, options.subDepartmentId),
        exists(
          ctx.db
            .select({ one: sql`1` })
            .from(employees)
            .innerJoin(
              employeeSubDepartments,
              eq(employees.id, employeeSubDepartments.employeeId),
            )
            .where(
              and(
                eq(tasks.assigneeId, employees.id),
                eq(
                  employeeSubDepartments.departmentId,
                  options.subDepartmentId,
                ),
              ),
            ),
        ),
      ) as SQL,
    );
  }

  applyDepartmentTaskFilters(whereConditions, {
    status: options.status,
    priority: options.priority,
    search: options.search,
  });
  const paginationParams = ctx.pagination.parseInput(options.cursor);
  const list = await fetchTasks(ctx, {
    where: and(...whereConditions),
    paginationParams,
  });
  const result = ctx.pagination.processResults(list, paginationParams, (t) => ({
    createdAt: t.task.createdAt.toISOString(),
    id: t.task.id,
  }));
  const metrics = await getTaskMetricsForSupervisor(ctx, {
    filters: {
      priority: options.priority,
      search: options.search,
    },
    whereConditions: whereConditions,
  });
  return {
    data: result.data.map((task) => ({
      task: {
        data: task.task,
        submissions: task.submissions,
        delegationSubmissions: [],
      },
    })),
    meta: result.meta,
    metrics: {
      pendingTasks: metrics.pendingCount,
      completedTasks: metrics.completedCount,
      taskCompletionPercentage: metrics.completionPercentage,
    },
  };
}

export async function getTaskMetricsForIndividual(
  ctx: TaskRepoContext,
  filters?: IndividualTaskFilters,
): Promise<{
  pendingCount: number;
  completedCount: number;
  completionPercentage: number;
}> {
  const whereConditions: SQL[] = [eq(tasks.assignmentType, 'individual')];
  if (filters?.assigneeId) {
    whereConditions.push(eq(tasks.assigneeId, filters.assigneeId));
  }
  if (filters?.departmentIds?.length) {
    whereConditions.push(
      inArray(tasks.targetDepartmentId, filters.departmentIds),
    );
  }
  applyDepartmentTaskFilters(whereConditions, filters);
  const [pending] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(...whereConditions, sql`${tasks.status} <> 'completed'`));
  const [completed] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(...whereConditions, eq(tasks.status, 'completed')));
  const pendingCount = pending?.count ?? 0;
  const completedCount = completed?.count ?? 0;
  const total = pendingCount + completedCount;
  return {
    pendingCount,
    completedCount,
    completionPercentage: total > 0 ? (completedCount / total) * 100 : 0,
  };
}

export async function getTasksAndDelegationsForEmployee(
  ctx: TaskRepoContext,
  options: {
    employeeUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    subDepartmentId?: string;
  },
): Promise<
  PaginatedArrayResult<{
    task: Task;
    rejectionReason?: string;
    approvalFeedback?: string;
  }> & {
    delegations: TaskDelegation[];
    fileHubAttachments: Attachment[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      pendingDelegations: number;
      completedDelegations: number;
      taskCompletionPercentage: number;
      delegationCompletionPercentage: number;
      totalPercentage: number;
    };
  }
> {
  const [employeeRow] = await ctx.db
    .select()
    .from(employees)
    .where(eq(employees.userId, options.employeeUserId))
    .limit(1);
  if (!employeeRow) {
    const empty = await paginateEmpty(ctx, options.cursor);
    return {
      data: [],
      meta: empty.meta,
      delegations: [],
      fileHubAttachments: [],
      metrics: {
        pendingTasks: 0,
        completedTasks: 0,
        pendingDelegations: 0,
        completedDelegations: 0,
        taskCompletionPercentage: 0,
        delegationCompletionPercentage: 0,
        totalPercentage: 0,
      },
    };
  }
  const whereConditions: SQL[] = [eq(tasks.assigneeId, employeeRow.id)];
  if (options.subDepartmentId) {
    whereConditions.push(
      eq(tasks.targetSubDepartmentId, options.subDepartmentId),
    );
  }
  applyDepartmentTaskFilters(whereConditions, {
    status: options.status,
    priority: options.priority,
    search: options.search,
  });
  const paginationParams = ctx.pagination.parseInput(options.cursor);
  const list = await fetchTasks(ctx, {
    where: and(...whereConditions),
    paginationParams,
  });
  const result = ctx.pagination.processResults(list, paginationParams, (t) => ({
    createdAt: t.task.createdAt.toISOString(),
    id: t.task.id,
  }));
  const delegationRows = await ctx.db
    .select()
    .from(taskDelegations)
    .where(eq(taskDelegations.assigneeId, employeeRow.id));
  const delegations: TaskDelegation[] = [];
  const [pendingTasks] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, employeeRow.id),
        sql`${tasks.status} <> 'completed'`,
      ),
    );
  const [completedTasks] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(
      and(eq(tasks.assigneeId, employeeRow.id), eq(tasks.status, 'completed')),
    );
  const pendingDelegations = delegationRows.filter(
    (d) => d.status !== 'completed',
  ).length;
  const completedDelegations = delegationRows.filter(
    (d) => d.status === 'completed',
  ).length;
  const taskPending = pendingTasks?.count ?? 0;
  const taskCompleted = completedTasks?.count ?? 0;
  const taskTotal = taskPending + taskCompleted;
  const delTotal = pendingDelegations + completedDelegations;
  const taskPct = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;
  const delPct = delTotal > 0 ? (completedDelegations / delTotal) * 100 : 0;
  const totalItems = taskTotal + delTotal;
  const totalPercentage =
    totalItems > 0
      ? ((taskCompleted + completedDelegations) / totalItems) * 100
      : 0;
  return {
    data: result.data.map((task) => ({
      task: task.task,
      rejectionReason: task.submissions.find((s) => s.status === 'REJECTED')
        ?.feedback,
      approvalFeedback: task.submissions.find((s) => s.status === 'APPROVED')
        ?.feedback,
    })),
    meta: result.meta,
    delegations,
    fileHubAttachments: [],
    metrics: {
      pendingTasks: taskPending,
      completedTasks: taskCompleted,
      pendingDelegations,
      completedDelegations,
      taskCompletionPercentage: taskPct,
      delegationCompletionPercentage: delPct,
      totalPercentage,
    },
  };
}
