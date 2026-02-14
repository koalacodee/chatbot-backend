import { count as drizzleCount, eq, inArray } from 'drizzle-orm';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { taskDelegations } from '@/common/drizzle/schema';
import type { TaskDelegation } from '@/v2/tasks/domain/entities/task-delegation.entity';
import { assignmentTypeToDb, rowToEntity, statusToDb } from './mappers';

export async function save(
  db: DatabaseInstance | DrizzleTransaction,
  taskDelegation: TaskDelegation,
): Promise<TaskDelegation> {
  const data: typeof taskDelegations.$inferInsert = {
    id: taskDelegation.id,
    taskId: taskDelegation.taskId,
    assigneeId: taskDelegation.assigneeId ?? null,
    targetSubDepartmentId: taskDelegation.targetSubDepartmentId ?? null,
    delegatorId: taskDelegation.delegatorId,
    status: statusToDb(taskDelegation.status),
    assignmentType: assignmentTypeToDb(taskDelegation.assignmentType),
    createdAt: taskDelegation.createdAt,
    updatedAt: taskDelegation.updatedAt,
    completedAt: taskDelegation.completedAt ?? null,
  };
  const [result] = await db
    .insert(taskDelegations)
    .values(data)
    .onConflictDoUpdate({
      target: taskDelegations.id,
      set: data,
    })
    .returning();
  return result ? rowToEntity(result) : taskDelegation;
}

export async function update(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
  updates: Partial<TaskDelegation>,
): Promise<TaskDelegation> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.taskId !== undefined) set.taskId = updates.taskId;
  if (updates.assigneeId !== undefined) set.assigneeId = updates.assigneeId;
  if (updates.targetSubDepartmentId !== undefined)
    set.targetSubDepartmentId = updates.targetSubDepartmentId;
  if (updates.delegatorId !== undefined) set.delegatorId = updates.delegatorId;
  if (updates.status !== undefined) set.status = statusToDb(updates.status);
  if (updates.assignmentType !== undefined)
    set.assignmentType = assignmentTypeToDb(updates.assignmentType);
  if (updates.createdAt !== undefined) set.createdAt = updates.createdAt;
  if (updates.completedAt !== undefined) set.completedAt = updates.completedAt;
  const [result] = await db
    .update(taskDelegations)
    .set(set)
    .where(eq(taskDelegations.id, id))
    .returning();
  if (!result) throw new Error(`TaskDelegation not found: ${id}`);
  return rowToEntity(result);
}

export async function findById(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
): Promise<TaskDelegation | null> {
  const [row] = await db
    .select()
    .from(taskDelegations)
    .where(eq(taskDelegations.id, id))
    .limit(1);
  return row ? rowToEntity(row) : null;
}

export async function findByIds(
  db: DatabaseInstance | DrizzleTransaction,
  ids: string[],
): Promise<TaskDelegation[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(inArray(taskDelegations.id, ids));
  return rows.map(rowToEntity);
}

export async function findAll(
  db: DatabaseInstance | DrizzleTransaction,
): Promise<TaskDelegation[]> {
  const rows = await db.select().from(taskDelegations);
  return rows.map(rowToEntity);
}

export async function removeById(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
): Promise<TaskDelegation | null> {
  const existing = await findById(db, id);
  if (!existing) return null;
  await db.delete(taskDelegations).where(eq(taskDelegations.id, id));
  return existing;
}

export async function removeByIds(
  db: DatabaseInstance | DrizzleTransaction,
  ids: string[],
): Promise<TaskDelegation[]> {
  if (ids.length === 0) return [];
  const existing = await findByIds(db, ids);
  await db.delete(taskDelegations).where(inArray(taskDelegations.id, ids));
  return existing;
}

export async function exists(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: taskDelegations.id })
    .from(taskDelegations)
    .where(eq(taskDelegations.id, id))
    .limit(1);
  return row != null;
}

export async function count(
  db: DatabaseInstance | DrizzleTransaction,
): Promise<number> {
  const [row] = await db
    .select({ count: drizzleCount(taskDelegations.id) })
    .from(taskDelegations);
  return row?.count ?? 0;
}
export async function deleteByTaskId(
  db: DatabaseInstance | DrizzleTransaction,
  taskId: string,
): Promise<void> {
  await db.delete(taskDelegations).where(eq(taskDelegations.taskId, taskId));
}
