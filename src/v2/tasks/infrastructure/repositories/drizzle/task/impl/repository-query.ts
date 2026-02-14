import type { SQL } from 'drizzle-orm';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type {
  CursorInput,
  CursorPagination,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import {
  admins,
  departments,
  employees,
  supervisors,
  taskReminders,
  tasks,
  taskSubmissions,
  users,
} from '@/common/drizzle/schema';
import type { Task } from '@/v2/tasks/domain/entities/task.entity';
import type {
  DepartmentTaskFilters,
  IndividualTaskFilters,
} from '@/v2/tasks/domain/repositories/task.repository';
import type { TaskCursorData, TaskRow } from './mappers';
import { priorityToDb, statusToDb } from './mappers';
import { alias } from 'drizzle-orm/pg-core';
import { TaskSubmission } from '@/v2/tasks/domain/entities/task-submission.entity';
import { dbToStatus } from '../../task-submission/impl/mappers';

const subDepartments = alias(departments, 'sub_departments');

export interface TaskRepoContext {
  db: DatabaseInstance | DrizzleTransaction;
  pagination: CursorPagination<TaskCursorData>;
  mapRowToTask: (row: TaskRow) => Task;
}

export function applyDepartmentTaskFilters(
  whereConditions: SQL[],
  filters?: DepartmentTaskFilters | IndividualTaskFilters,
): void {
  if (!filters) return;
  if (filters.status?.length) {
    whereConditions.push(inArray(tasks.status, filters.status.map(statusToDb)));
  }
  if (filters.priority?.length) {
    whereConditions.push(
      inArray(tasks.priority, filters.priority.map(priorityToDb)),
    );
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    whereConditions.push(
      or(ilike(tasks.title, term), ilike(tasks.description, term)) as SQL,
    );
  }
}

export async function fetchTasks(
  ctx: TaskRepoContext,
  options: {
    where?: SQL;
    paginationParams?: {
      pageSize: number;
      direction: 'next' | 'prev';
      cursor: string | undefined;
      cursorData: TaskCursorData | null;
      limit: number;
    };
  },
): Promise<
  {
    task: Task;
    submissions: TaskSubmission[];
  }[]
> {
  const { paginationParams } = options;
  const cursorCondition = paginationParams?.cursorData
    ? ctx.pagination.buildCursorCondition(
        paginationParams.cursorData,
        paginationParams.direction,
      )
    : undefined;

  let query = ctx.db.select().from(tasks).$dynamic();

  const whereParts: SQL[] = [];
  if (options.where) whereParts.push(options.where);
  if (cursorCondition) whereParts.push(cursorCondition);
  if (whereParts.length > 0) query = query.where(and(...whereParts));
  if (paginationParams?.limit) query = query.limit(paginationParams.limit);
  if (paginationParams) {
    query = query.orderBy(...ctx.pagination.getOrderBy());
  }

  // Build the CTE with pagination
  const paginatedTasksCTE = ctx.db.$with('paginated_tasks').as(query);

  // 1. Create aliases for the 'users' table to avoid collisions
  const performerUser = alias(users, 'performer_user');
  const assigneeUser = alias(users, 'assignee_user');
  const assignees = alias(employees, 'assignees');

  const rows = await ctx.db
    .with(paginatedTasksCTE)
    .select({
      task: paginatedTasksCTE._.selectedFields,
      assigneeName: sql<string>`
      CASE 
        WHEN ${paginatedTasksCTE.assignmentType} = 'individual' THEN ${assigneeUser.name}
        WHEN ${paginatedTasksCTE.assignmentType} = 'department' THEN ${departments.name}
        WHEN ${paginatedTasksCTE.assignmentType} = 'sub_department' THEN ${subDepartments.name}
        ELSE 'Unassigned'
      END
    `.as('assignee_name'),

      // Performer Name Resolution:
      // Checks which role joined, then grabs the name from the performerUser alias
      performerName: sql<string>`
      CASE 
        WHEN ${admins.id} IS NOT NULL OR ${supervisors.id} IS NOT NULL OR ${employees.id} IS NOT NULL 
        THEN ${performerUser.name}
        ELSE 'Pending'
      END
    `.as('performer_name'),

      performerType: sql<'admin' | 'supervisor' | 'employee'>`
      CASE 
        WHEN ${admins.id} IS NOT NULL THEN 'admin'
        WHEN ${supervisors.id} IS NOT NULL THEN 'supervisor'
        WHEN ${employees.id} IS NOT NULL THEN 'employee'
        ELSE 'Pending'
      END
    `.as('performer_type'),

      performerId: sql<string | null>`
      CASE 
        WHEN ${admins.id} IS NOT NULL THEN ${admins.id}
        WHEN ${supervisors.id} IS NOT NULL THEN ${supervisors.id}
        WHEN ${employees.id} IS NOT NULL THEN ${employees.id}
        ELSE NULL
      END
    `.as('performer_id'),
      submission: taskSubmissions,
      reminder: taskReminders,
    })
    .from(paginatedTasksCTE)
    .leftJoin(taskReminders, eq(taskReminders.taskId, paginatedTasksCTE.id))
    .leftJoin(taskSubmissions, eq(taskSubmissions.taskId, paginatedTasksCTE.id))

    // JOINS FOR PERFORMER (Submission)
    .leftJoin(admins, eq(admins.id, taskSubmissions.performerAdminId))
    .leftJoin(
      supervisors,
      eq(supervisors.id, taskSubmissions.performerSupervisorId),
    )
    .leftJoin(employees, eq(employees.id, taskSubmissions.performerEmployeeId))
    // Link to the user table via whichever role ID was present
    .leftJoin(
      performerUser,
      sql`${performerUser.id} IN (${admins.userId}, ${supervisors.userId}, ${employees.userId})`,
    )

    // JOINS FOR ASSIGNEE (Task)
    .leftJoin(assignees, eq(assignees.id, paginatedTasksCTE.assigneeId))
    .leftJoin(assigneeUser, eq(assigneeUser.id, assignees.userId))

    // JOINS FOR DEPARTMENTS
    .leftJoin(
      departments,
      eq(departments.id, paginatedTasksCTE.targetDepartmentId),
    )
    .leftJoin(
      subDepartments,
      eq(subDepartments.id, paginatedTasksCTE.targetSubDepartmentId),
    );

  // Deduplicate: group reminders by task ID
  const taskMap = new Map<string, TaskRow>();
  for (const row of rows) {
    const taskId = row.task.id;
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, {
        ...row.task,
        assigneeName: row.assigneeName,
        reminders: [],
        submissions: [],
      });
    }
    if (row.reminder) {
      taskMap.get(taskId)!.reminders!.push(row.reminder);
    }
    if (row.submission) {
      taskMap.get(taskId)!.submissions!.push({
        ...row.submission,
        performerId: row.performerId,
        performerType: row.performerType,
        performerName: row.performerName,
        taskId: row.task.id,
      });
    }
  }

  return Array.from(taskMap.values()).map((r) => ({
    task: ctx.mapRowToTask(r),
    submissions: r.submissions.map((s) =>
      TaskSubmission.create({
        ...s,
        performerId: s.performerId,
        performerType: s.performerType,
        performerName: s.performerName,
        status: dbToStatus(s.status),
      }),
    ),
  }));
}

export async function paginateEmpty(
  ctx: TaskRepoContext,
  cursor?: CursorInput,
): Promise<PaginatedArrayResult<Task>> {
  const paginationParams = ctx.pagination.parseInput(cursor);
  return ctx.pagination.processResults([], paginationParams, () => ({
    createdAt: new Date().toISOString(),
    id: '',
  }));
}
