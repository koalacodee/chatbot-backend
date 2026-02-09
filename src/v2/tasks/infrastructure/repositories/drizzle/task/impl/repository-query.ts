import type { SQL } from 'drizzle-orm';
import { and, eq, ilike, inArray, or } from 'drizzle-orm';
import type {
  CursorInput,
  CursorPagination,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { taskReminders, tasks } from '@/common/drizzle/schema';
import type { Task } from '@/v2/tasks/domain/entities/task.entity';
import type {
  DepartmentTaskFilters,
  IndividualTaskFilters,
} from '@/v2/tasks/domain/repositories/task.repository';
import type { TaskCursorData, TaskRow } from './mappers';
import { priorityToDb, statusToDb } from './mappers';

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
): Promise<Task[]> {
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

  // Join with the CTE
  const rows = await ctx.db
    .with(paginatedTasksCTE)
    .select({
      task: tasks,
      reminder: taskReminders,
    })
    .from(paginatedTasksCTE)
    .innerJoin(tasks, eq(tasks.id, paginatedTasksCTE.id))
    .leftJoin(taskReminders, eq(taskReminders.taskId, tasks.id));

  // Deduplicate: group reminders by task ID
  const taskMap = new Map<string, TaskRow>();
  for (const row of rows) {
    const taskId = row.task.id;
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, { ...row.task, reminders: [] });
    }
    if (row.reminder) {
      taskMap.get(taskId)!.reminders!.push(row.reminder);
    }
  }

  return Array.from(taskMap.values()).map((r) => ctx.mapRowToTask(r));
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
