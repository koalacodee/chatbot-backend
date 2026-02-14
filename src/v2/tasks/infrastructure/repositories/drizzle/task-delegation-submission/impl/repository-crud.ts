import { eq } from 'drizzle-orm';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { taskDelegationSubmissions } from '@/common/drizzle/schema';
import type { TaskDelegationSubmission } from '@/v2/tasks/domain/entities/task-delegation-submission.entity';
import { rowToEntity, statusToDb } from './mappers';

export async function save(
  db: DatabaseInstance | DrizzleTransaction,
  submission: TaskDelegationSubmission,
): Promise<TaskDelegationSubmission> {
  const performerAdminId =
    submission.performerType === 'admin' ? submission.performerId : null;
  const performerSupervisorId =
    submission.performerType === 'supervisor' ? submission.performerId : null;
  const performerEmployeeId =
    submission.performerType === 'employee' ? submission.performerId : null;
  const data: typeof taskDelegationSubmissions.$inferInsert = {
    id: submission.id,
    delegationId: submission.delegationId,
    taskId: submission.taskId,
    performerAdminId,
    performerSupervisorId,
    performerEmployeeId,
    notes: submission.notes ?? null,
    feedback: submission.feedback ?? null,
    status: statusToDb(submission.status),
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt ?? null,
    reviewedByAdminId: submission.reviewedByAdminId ?? null,
    reviewedBySupervisorId: submission.reviewedBySupervisorId ?? null,
    forwarded: submission.forwarded,
    forwardedMessage: submission.forwardedMessage ?? null,
    forwardedToSupervisorId: submission.forwardedToSupervisorId ?? null,
  };
  const [result] = await db
    .insert(taskDelegationSubmissions)
    .values(data)
    .onConflictDoUpdate({
      target: taskDelegationSubmissions.id,
      set: data,
    })
    .returning();
  return result ? rowToEntity(result) : submission;
}

export async function findById(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
): Promise<TaskDelegationSubmission | null> {
  const [row] = await db
    .select()
    .from(taskDelegationSubmissions)
    .where(eq(taskDelegationSubmissions.id, id))
    .limit(1);
  return row ? rowToEntity(row) : null;
}

export async function deleteById(
  db: DatabaseInstance | DrizzleTransaction,
  id: string,
): Promise<void> {
  await db
    .delete(taskDelegationSubmissions)
    .where(eq(taskDelegationSubmissions.id, id));
}
export async function deleteByTaskId(
  db: DatabaseInstance | DrizzleTransaction,
  taskId: string,
): Promise<void> {
  await db
    .delete(taskDelegationSubmissions)
    .where(eq(taskDelegationSubmissions.taskId, taskId));
}
