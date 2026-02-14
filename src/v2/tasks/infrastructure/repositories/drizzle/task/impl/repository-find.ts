import type { SQL } from 'drizzle-orm';
import { and, eq, inArray } from 'drizzle-orm';
import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import { tasks } from '@/common/drizzle/schema';
import type {
  Task,
  TaskAssignmentType,
} from '@/v2/tasks/domain/entities/task.entity';
import type {
  DepartmentTaskFilters,
  IndividualTaskFilters,
} from '@/v2/tasks/domain/repositories/task.repository';
import { assignmentTypeToDb } from './mappers';
import type { TaskRepoContext } from './repository-query';
import { applyDepartmentTaskFilters, fetchTasks } from './repository-query';
import { TaskSubmission } from '@/v2/tasks/domain/entities/task-submission.entity';

export async function findByAssignee(
  ctx: TaskRepoContext,
  assigneeId: string,
  cursor?: CursorInput,
): Promise<PaginatedArrayResult<Task>> {
  const paginationParams = ctx.pagination.parseInput(cursor);
  const list = await fetchTasks(ctx, {
    where: eq(tasks.assigneeId, assigneeId),
    paginationParams,
  });
  return ctx.pagination.processResults(
    list.map((t) => t.task),
    paginationParams,
    (t) => ({
      createdAt: t.createdAt.toISOString(),
      id: t.id,
    }),
  );
}

export async function findByDepartment(
  ctx: TaskRepoContext,
  departmentId: string,
  cursor?: CursorInput,
): Promise<PaginatedArrayResult<Task>> {
  const paginationParams = ctx.pagination.parseInput(cursor);
  const list = await fetchTasks(ctx, {
    where: eq(tasks.targetDepartmentId, departmentId),
    paginationParams,
  });
  return ctx.pagination.processResults(
    list.map((t) => t.task),
    paginationParams,
    (t) => ({
      createdAt: t.createdAt.toISOString(),
      id: t.id,
    }),
  );
}

export async function findByAssignmentType(
  ctx: TaskRepoContext,
  assignmentType: TaskAssignmentType,
  targetId?: string,
  cursor?: CursorInput,
): Promise<PaginatedArrayResult<Task>> {
  const normalized = assignmentTypeToDb(assignmentType);
  const whereConditions: SQL[] = [eq(tasks.assignmentType, normalized)];
  if (targetId) {
    if (normalized === 'department') {
      whereConditions.push(eq(tasks.targetDepartmentId, targetId));
    } else if (normalized === 'sub_department') {
      whereConditions.push(eq(tasks.targetSubDepartmentId, targetId));
    } else if (normalized === 'individual') {
      whereConditions.push(eq(tasks.assigneeId, targetId));
    }
  }
  const paginationParams = ctx.pagination.parseInput(cursor);
  const list = await fetchTasks(ctx, {
    where: and(...whereConditions),
    paginationParams,
  });
  return ctx.pagination.processResults(
    list.map((t) => t.task),
    paginationParams,
    (t) => ({
      createdAt: t.createdAt.toISOString(),
      id: t.id,
    }),
  );
}

export async function findDepartmentLevelTasks(
  ctx: TaskRepoContext,
  departmentId?: string,
  filters?: DepartmentTaskFilters,
): Promise<
  PaginatedArrayResult<{
    task: Task;
    submissions: TaskSubmission[];
  }>
> {
  const whereConditions: SQL[] = [eq(tasks.assignmentType, 'department')];
  if (departmentId) {
    whereConditions.push(eq(tasks.targetDepartmentId, departmentId));
  }
  applyDepartmentTaskFilters(whereConditions, filters);
  const paginationParams = ctx.pagination.parseInput(filters?.cursor);
  const list = await fetchTasks(ctx, {
    where: and(...whereConditions),
    paginationParams,
  });
  return ctx.pagination.processResults(list, paginationParams, (t) => ({
    createdAt: t.task.createdAt.toISOString(),
    id: t.task.id,
  }));
}

export async function findSubDepartmentLevelTasks(
  ctx: TaskRepoContext,
  subDepartmentId?: string,
  filters?: DepartmentTaskFilters,
): Promise<PaginatedArrayResult<Task>> {
  const whereConditions: SQL[] = [eq(tasks.assignmentType, 'sub_department')];
  if (subDepartmentId) {
    whereConditions.push(eq(tasks.targetSubDepartmentId, subDepartmentId));
  }
  applyDepartmentTaskFilters(whereConditions, filters);
  const paginationParams = ctx.pagination.parseInput(filters?.cursor);
  const list = await fetchTasks(ctx, {
    where: and(...whereConditions),
    paginationParams,
  });
  return ctx.pagination.processResults(
    list.map((t) => t.task),
    paginationParams,
    (t) => ({
      createdAt: t.createdAt.toISOString(),
      id: t.id,
    }),
  );
}

export async function findSubIndividualsLevelTasks(
  ctx: TaskRepoContext,
  filters?: IndividualTaskFilters,
): Promise<PaginatedArrayResult<Task>> {
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
  const paginationParams = ctx.pagination.parseInput(filters?.cursor);
  const list = await fetchTasks(ctx, {
    where: and(...whereConditions),
    paginationParams,
  });
  return ctx.pagination.processResults(
    list.map((t) => t.task),
    paginationParams,
    (t) => ({
      createdAt: t.createdAt.toISOString(),
      id: t.id,
    }),
  );
}
