import { eq } from 'drizzle-orm';
import {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { taskSubmissions } from '@/common/drizzle/schema';
import type { TaskSubmission } from '@/v2/tasks/domain/entities/task-submission.entity';
import { rowToEntity, statusToDb } from './mappers';

export async function save(
  db: DatabaseInstance | DrizzleTransaction,
  taskSubmission: TaskSubmission,
): Promise<TaskSubmission> {
  const taskId = taskSubmission.taskId ?? taskSubmission.task?.id;
  if (!taskId) {
    throw new Error('TaskSubmission must have taskId or task.id to save');
  }
  const performerAdminId =
    taskSubmission.performerType === 'admin'
      ? taskSubmission.performerId
      : null;
  const performerSupervisorId =
    taskSubmission.performerType === 'supervisor'
      ? taskSubmission.performerId
      : null;
  const performerEmployeeId =
    taskSubmission.performerType === 'employee'
      ? taskSubmission.performerId
      : null;
  const data: typeof taskSubmissions.$inferInsert = {
    id: taskSubmission.id,
    taskId,
    performerAdminId,
    performerSupervisorId,
    performerEmployeeId,
    notes: taskSubmission.notes ?? null,
    feedback: taskSubmission.feedback ?? null,
    status: statusToDb(taskSubmission.status),
    submittedAt: taskSubmission.submittedAt,
    reviewedAt: taskSubmission.reviewedAt ?? null,
    reviewedByAdminId: taskSubmission.reviewedByAdminId ?? null,
    reviewedBySupervisorId: taskSubmission.reviewedBySupervisorId ?? null,
    delegationSubmissionId: taskSubmission.delegationSubmissionId ?? null,
  };
  const [result] = await db
    .insert(taskSubmissions)
    .values(data)
    .onConflictDoUpdate({
      target: taskSubmissions.id,
      set: data,
    })
    .returning();
  return result ? rowToEntity(result) : taskSubmission;
}

export async function findById(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
): Promise<TaskSubmission | null> {
  const [row] = await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.id, id))
    .limit(1);
  return row ? rowToEntity(row) : null;
}

export async function deleteById(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
): Promise<void> {
  await db.delete(taskSubmissions).where(eq(taskSubmissions.id, id));
}
export async function deleteByTaskId(
  db: DatabaseInstance | DrizzleTransaction,
  taskId: string,
): Promise<void> {
  await db.delete(taskSubmissions).where(eq(taskSubmissions.taskId, taskId));
}
