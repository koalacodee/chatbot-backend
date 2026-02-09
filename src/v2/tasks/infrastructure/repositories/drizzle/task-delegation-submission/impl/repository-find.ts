import { and, eq, inArray, or } from 'drizzle-orm';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { taskDelegationSubmissions } from '@/common/drizzle/schema';
import type { TaskDelegationSubmission } from '@/v2/tasks/domain/entities/task-delegation-submission.entity';
import type { TaskDelegationSubmissionRow } from './mappers';
import { rowToEntity, statusToDb, TaskSubmissionStatus } from './mappers';

export async function findByDelegationId(
  db: DatabaseInstance | DrizzleTransaction,
  delegationId: string,
): Promise<TaskDelegationSubmission[]> {
  const rows = await db
    .select()
    .from(taskDelegationSubmissions)
    .where(eq(taskDelegationSubmissions.delegationId, delegationId));
  return rows.map(rowToEntity);
}

export async function findByDelegationIds(
  db: DatabaseInstance | DrizzleTransaction,
  delegationIds: string[],
): Promise<TaskDelegationSubmission[]> {
  if (delegationIds.length === 0) return [];
  const rows = await db
    .select()
    .from(taskDelegationSubmissions)
    .where(inArray(taskDelegationSubmissions.delegationId, delegationIds));
  return rows.map(rowToEntity);
}

export async function findByPerformerId(
  db: DatabaseInstance | DrizzleTransaction,
  performerId: string,
): Promise<TaskDelegationSubmission[]> {
  const rows = await db
    .select()
    .from(taskDelegationSubmissions)
    .where(
      or(
        eq(taskDelegationSubmissions.performerAdminId, performerId),
        eq(taskDelegationSubmissions.performerSupervisorId, performerId),
        eq(taskDelegationSubmissions.performerEmployeeId, performerId),
      ),
    );
  return rows.map(rowToEntity);
}

export async function findByStatus(
  db: DatabaseInstance | DrizzleTransaction,
  status: string,
): Promise<TaskDelegationSubmission[]> {
  const dbStatus: TaskDelegationSubmissionRow['status'] =
    status === 'submitted' || status === 'approved' || status === 'rejected'
      ? status
      : status === TaskSubmissionStatus.SUBMITTED ||
          status === TaskSubmissionStatus.APPROVED ||
          status === TaskSubmissionStatus.REJECTED
        ? statusToDb(status as TaskSubmissionStatus)
        : (status.toLowerCase() as TaskDelegationSubmissionRow['status']);
  if (
    dbStatus !== 'submitted' &&
    dbStatus !== 'approved' &&
    dbStatus !== 'rejected'
  ) {
    return [];
  }
  const rows = await db
    .select()
    .from(taskDelegationSubmissions)
    .where(eq(taskDelegationSubmissions.status, dbStatus));
  return rows.map(rowToEntity);
}

export async function findAll(
  db: DatabaseInstance | DrizzleTransaction,
): Promise<TaskDelegationSubmission[]> {
  const rows = await db.select().from(taskDelegationSubmissions);
  return rows.map(rowToEntity);
}

export async function findByTaskId(
  db: DatabaseInstance | DrizzleTransaction,
  taskId: string,
  forwardedOnly?: boolean,
  status?: string | string[],
): Promise<TaskDelegationSubmission[]> {
  const conditions = [eq(taskDelegationSubmissions.taskId, taskId)];
  if (forwardedOnly === true) {
    conditions.push(eq(taskDelegationSubmissions.forwarded, true));
  }

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const dbStatuses = statuses
      .map((s) => {
        const dbS =
          s === 'submitted' || s === 'approved' || s === 'rejected'
            ? s
            : s === TaskSubmissionStatus.SUBMITTED ||
                s === TaskSubmissionStatus.APPROVED ||
                s === TaskSubmissionStatus.REJECTED
              ? statusToDb(s as TaskSubmissionStatus)
              : (s.toLowerCase() as TaskDelegationSubmissionRow['status']);

        return dbS !== 'submitted' && dbS !== 'approved' && dbS !== 'rejected'
          ? null
          : dbS;
      })
      .filter(Boolean) as TaskDelegationSubmissionRow['status'][];

    if (dbStatuses.length > 0) {
      conditions.push(inArray(taskDelegationSubmissions.status, dbStatuses));
    }
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);
  const rows = await db.select().from(taskDelegationSubmissions).where(where);
  return rows.map(rowToEntity);
}

export async function findByTaskIds(
  db: DatabaseInstance | DrizzleTransaction,
  taskIds: string[],
  forwardedOnly?: boolean,
): Promise<TaskDelegationSubmission[]> {
  if (taskIds.length === 0) return [];
  const conditions = [inArray(taskDelegationSubmissions.taskId, taskIds)];
  if (forwardedOnly === true) {
    conditions.push(eq(taskDelegationSubmissions.forwarded, true));
  }
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);
  const rows = await db.select().from(taskDelegationSubmissions).where(where);
  return rows.map(rowToEntity);
}
