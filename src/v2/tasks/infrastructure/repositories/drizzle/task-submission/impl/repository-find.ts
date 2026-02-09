import { and, eq, inArray, or } from 'drizzle-orm';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { taskSubmissions } from '@/common/drizzle/schema';
import type { TaskSubmission } from '@/v2/tasks/domain/entities/task-submission.entity';
import type { TaskSubmissionRow } from './mappers';
import { rowToEntity, statusToDb, TaskSubmissionStatus } from './mappers';

export async function findByTaskId(
  db: DatabaseInstance | DrizzleTransaction,
  taskId: string,
  status?: string | string[],
): Promise<TaskSubmission[]> {
  const conditions = [eq(taskSubmissions.taskId, taskId)];

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const dbStatuses = statuses
      .map((s) => statusToDb(s as TaskSubmissionStatus))
      .filter(Boolean) as TaskSubmissionRow['status'][];

    if (dbStatuses.length > 0) {
      conditions.push(inArray(taskSubmissions.status, dbStatuses));
    }
  }

  const rows = await db
    .select()
    .from(taskSubmissions)
    .where(and(...conditions));
  return rows.map(rowToEntity);
}

export async function findByPerformerId(
  db: DatabaseInstance | DrizzleTransaction,
  performerId: string,
): Promise<TaskSubmission[]> {
  const rows = await db
    .select()
    .from(taskSubmissions)
    .where(
      or(
        eq(taskSubmissions.performerAdminId, performerId),
        eq(taskSubmissions.performerSupervisorId, performerId),
        eq(taskSubmissions.performerEmployeeId, performerId),
      ),
    );
  return rows.map(rowToEntity);
}

export async function findByStatus(
  db: DatabaseInstance | DrizzleTransaction,
  status: TaskSubmissionStatus,
): Promise<TaskSubmission[]> {
  const dbStatus: TaskSubmissionRow['status'] = statusToDb(status);
  if (!dbStatus) {
    return [];
  }
  const rows = await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.status, dbStatus));
  return rows.map(rowToEntity);
}

export async function findAll(
  db: DatabaseInstance | DrizzleTransaction,
): Promise<TaskSubmission[]> {
  const rows = await db.select().from(taskSubmissions);
  return rows.map(rowToEntity);
}

export async function findByTaskIds(
  db: DatabaseInstance | DrizzleTransaction,
  taskIds: string[],
): Promise<TaskSubmission[]> {
  if (taskIds.length === 0) return [];
  const rows = await db
    .select()
    .from(taskSubmissions)
    .where(inArray(taskSubmissions.taskId, taskIds));
  return rows.map(rowToEntity);
}
