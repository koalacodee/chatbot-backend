import type { SQL } from 'drizzle-orm';
import { and, count as drizzleCount, eq, gte, inArray, lte } from 'drizzle-orm';
import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import { taskReminders, tasks } from '@/common/drizzle/schema';
import {
  Task,
  TaskPriority,
  TaskStatus,
} from '@/v2/tasks/domain/entities/task.entity';
import type { TaskSubmission } from '@/v2/tasks/domain/entities/task-submission.entity';
import {
  assignmentTypeToDb,
  dbToStatus,
  priorityToDb,
  statusToDb,
} from './mappers';
import type { TaskRepoContext } from './repository-query';
import { fetchTasks } from './repository-query';
import {
  buildConflictUpdateColumns,
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { dbToAssignmentType } from '../../task-delegation/impl/mappers';
import { dbToPriority } from '../../task-preset/impl/mappers';

export async function save(ctx: TaskRepoContext, task: Task): Promise<Task> {
  const now = new Date();
  const data: typeof tasks.$inferInsert = {
    id: task.id,
    title: task.title,
    description: task.description,
    assigneeId: task.assigneeId ?? null,
    status: statusToDb(task.status),
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
    completedAt: task.completedAt ?? null,
    assignmentType: assignmentTypeToDb(task.assignmentType),
    targetDepartmentId: task.targetDepartmentId ?? null,
    targetSubDepartmentId: task.targetSubDepartmentId ?? null,
    assignerAdminId: task.assignerId ?? null,
    assignerSupervisorId: task.assignerId ?? null,
    priority: priorityToDb(task.priority),
    dueDate: task.dueDate ?? null,
    creatorId: task.creatorId,
  };

  const returnSavedTask = async (db: DrizzleTransaction | DatabaseInstance) => {
    const [result] = await db
      .insert(tasks)
      .values(data)
      .onConflictDoUpdate({
        target: tasks.id,
        set: data,
      })
      .returning();

    return result;
  };

  if (task.reminders.length > 0) {
    return ctx.db.transaction(async (tx) => {
      const savedTask = await returnSavedTask(tx);

      const reminderValues: (typeof taskReminders.$inferInsert)[] =
        task.reminders.map((r) => ({
          ...r,
          taskId: savedTask.id,
        }));

      const savedReminders = await tx
        .insert(taskReminders)
        .values(reminderValues)
        .onConflictDoUpdate({
          target: taskReminders.id,
          set: buildConflictUpdateColumns(taskReminders, [
            'name',
            'reminderDate',
            'reminderInterval',
          ]),
        })
        .returning();

      return Task.create({
        ...savedTask,
        status: dbToStatus(savedTask.status),
        assignmentType: dbToAssignmentType(savedTask.assignmentType),
        priority: dbToPriority(savedTask.priority),
        reminders: savedReminders.map((r) => ({
          id: r.id,
          name: r.name,
          reminderDate: r.reminderDate,
          reminderInterval: r.reminderInterval,
          taskId: r.taskId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      });
    });
  }

  const result = await returnSavedTask(ctx.db);

  return result ? ctx.mapRowToTask(result) : task;
}

export async function findById(
  ctx: TaskRepoContext,
  id: string,
): Promise<Task | null> {
  const list = await fetchTasks(ctx, { where: eq(tasks.id, id) });
  return list.length > 0 ? list[0].task : null;
}

export async function findByIdWithSubmissions(
  ctx: TaskRepoContext,
  id: string,
): Promise<{ task: Task; submissions: TaskSubmission[] } | null> {
  const list = await fetchTasks(ctx, { where: eq(tasks.id, id) });
  return list.length > 0 ? list[0] : null;
}

export async function findByIds(
  ctx: TaskRepoContext,
  ids: string[],
): Promise<Task[]> {
  if (ids.length === 0) return [];
  const list = await fetchTasks(ctx, { where: inArray(tasks.id, ids) });
  return list.map((t) => t.task);
}

export async function findByIdsWithSubmissions(
  ctx: TaskRepoContext,
  ids: string[],
): Promise<{ task: Task; submissions: TaskSubmission[] }[]> {
  if (ids.length === 0) return [];
  return fetchTasks(ctx, { where: inArray(tasks.id, ids) });
}

export async function findAll(
  ctx: TaskRepoContext,
  filters?: {
    cursor?: CursorInput;
    departmentIds?: string[]; // for role-based filtering
    assigneeId?: string; // explicit filter
    departmentId?: string; // explicit filter
    start?: Date;
    end?: Date;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    search?: string;
  },
): Promise<PaginatedArrayResult<Task>> {
  const { ilike } = await import('drizzle-orm');
  const whereConditions: SQL[] = [];

  // Role-based filtering
  if (filters?.departmentIds?.length) {
    whereConditions.push(
      inArray(tasks.targetDepartmentId, filters.departmentIds),
    );
  }

  // Explicit filters
  if (filters?.assigneeId) {
    whereConditions.push(eq(tasks.assigneeId, filters.assigneeId));
  }
  if (filters?.departmentId) {
    whereConditions.push(eq(tasks.targetDepartmentId, filters.departmentId));
  }
  if (filters?.status?.length) {
    whereConditions.push(
      inArray(
        tasks.status,
        filters.status.map((s) => statusToDb(s)),
      ),
    );
  }
  if (filters?.priority?.length) {
    whereConditions.push(
      inArray(
        tasks.priority,
        filters.priority.map((p) => priorityToDb(p)),
      ),
    );
  }
  if (filters?.search) {
    whereConditions.push(ilike(tasks.title, `%${filters.search}%`));
  }

  // Date filters
  if (filters?.start) {
    whereConditions.push(gte(tasks.createdAt, filters.start));
  }
  if (filters?.end) {
    whereConditions.push(lte(tasks.createdAt, filters.end));
  }

  const paginationParams = ctx.pagination.parseInput(filters?.cursor);
  const list = await fetchTasks(ctx, {
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    paginationParams,
  });
  return ctx.pagination.processResults(list.map((t) => t.task), paginationParams, (t) => ({
    createdAt: t.createdAt.toISOString(),
    id: t.id,
  }));
}

export async function removeById(
  ctx: TaskRepoContext,
  id: string,
): Promise<Task | null> {
  const task = await findById(ctx, id);
  if (!task) return null;
  await ctx.db.delete(tasks).where(eq(tasks.id, id));
  return task;
}

export async function exists(
  ctx: TaskRepoContext,
  id: string,
): Promise<boolean> {
  const [row] = await ctx.db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);
  return row != null;
}

export async function count(
  ctx: TaskRepoContext,
  options?: { departmentIds?: string[] },
): Promise<number> {
  let query = ctx.db
    .select({ count: drizzleCount(tasks.id) })
    .from(tasks)
    .$dynamic();
  if (options?.departmentIds?.length) {
    query = query.where(
      inArray(tasks.targetDepartmentId, options.departmentIds),
    );
  }
  const [row] = await query;
  return row?.count ?? 0;
}
