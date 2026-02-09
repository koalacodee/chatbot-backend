import type { SQL } from 'drizzle-orm';
import { and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import {
  departments,
  departmentToSupervisor,
  employees,
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

export async function getTaskMetricsForSupervisor(
  ctx: TaskRepoContext,
  supervisorDepartmentIds: string[],
): Promise<{
  pendingCount: number;
  completedCount: number;
  completionPercentage: number;
}> {
  const subDeptIds = (
    await ctx.db
      .select({ id: departments.id })
      .from(departments)
      .where(inArray(departments.parentId, supervisorDepartmentIds))
  ).map((r) => r.id);
  const [pending] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(
      and(
        or(
          inArray(tasks.targetDepartmentId, supervisorDepartmentIds),
          inArray(tasks.targetSubDepartmentId, subDeptIds),
        ) as SQL,
        sql`${tasks.status} <> 'completed'`,
      ),
    );
  const [completed] = await ctx.db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(
      and(
        or(
          inArray(tasks.targetDepartmentId, supervisorDepartmentIds),
          inArray(tasks.targetSubDepartmentId, subDeptIds),
        ) as SQL,
        eq(tasks.status, 'completed'),
      ),
    );
  const pendingCount = pending?.count ?? 0;
  const completedCount = completed?.count ?? 0;
  const total = pendingCount + completedCount;
  return {
    pendingCount,
    completedCount,
    completionPercentage: total > 0 ? (completedCount / total) * 100 : 0,
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
    fileHubAttachments: Attachment[];
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
      fileHubAttachments: [],
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
    or(
      inArray(tasks.targetDepartmentId, departmentIds),
      inArray(
        tasks.targetSubDepartmentId,
        (
          await ctx.db
            .select({ id: departments.id })
            .from(departments)
            .where(inArray(departments.parentId, departmentIds))
        ).map((r) => r.id),
      ) as SQL,
    ) as SQL,
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
    createdAt: t.createdAt.toISOString(),
    id: t.id,
  }));
  const metrics = await getTaskMetricsForSupervisor(ctx, departmentIds);
  return {
    data: result.data.map((task) => ({ task })),
    meta: result.meta,
    fileHubAttachments: [],
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
  const whereConditions: SQL[] = [];
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
    completionPercentage: total > 0 ? (completedCount / total) * 100 : 0,
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
    fileHubAttachments: Attachment[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }
> {
  const departmentIds = options.departmentId
    ? [options.departmentId]
    : options.supervisorDepartmentIds;

  const whereConditions: SQL[] = [
    or(
      inArray(tasks.targetDepartmentId, departmentIds),
      inArray(
        tasks.targetSubDepartmentId,
        (
          await ctx.db
            .select({ id: departments.id })
            .from(departments)
            .where(
              options.subDepartmentId
                ? eq(departments.id, options.subDepartmentId)
                : inArray(departments.parentId, departmentIds),
            )
        ).map((r) => r.id),
      ) as SQL,
    ) as SQL,
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
    createdAt: t.createdAt.toISOString(),
    id: t.id,
  }));
  const metrics = await getTaskMetricsForSupervisor(
    ctx,
    options.supervisorDepartmentIds,
  );
  return {
    data: result.data.map((task) => ({
      task: {
        data: task,
        submissions: [],
        delegationSubmissions: [],
      },
    })),
    meta: result.meta,
    fileHubAttachments: [],
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
    createdAt: t.createdAt.toISOString(),
    id: t.id,
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
    data: result.data.map((task) => ({ task })),
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
