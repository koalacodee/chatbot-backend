import type { taskReminders, tasks } from '@/common/drizzle/schema';
import {
  Task,
  TaskAssignmentType,
  TaskPriority,
  TaskStatus,
} from '@/v2/tasks/domain/entities/task.entity';

export type TaskRow = typeof tasks.$inferSelect & {
  reminders?: (typeof taskReminders.$inferSelect)[];
};
export type TaskCursorData = { createdAt: string; id: string };

const STATUS_TO_DB: Record<TaskStatus, TaskRow['status']> = {
  [TaskStatus.TODO]: 'to_do',
  [TaskStatus.SEEN]: 'seen',
  [TaskStatus.PENDING_REVIEW]: 'pending_review',
  [TaskStatus.COMPLETED]: 'completed',
};

const DB_TO_STATUS: Record<TaskRow['status'], TaskStatus> = {
  to_do: TaskStatus.TODO,
  seen: TaskStatus.SEEN,
  pending_review: TaskStatus.PENDING_REVIEW,
  completed: TaskStatus.COMPLETED,
};

const PRIORITY_TO_DB: Record<TaskPriority, TaskRow['priority']> = {
  [TaskPriority.LOW]: 'low',
  [TaskPriority.MEDIUM]: 'medium',
  [TaskPriority.HIGH]: 'high',
};

const DB_TO_PRIORITY: Record<TaskRow['priority'], TaskPriority> = {
  low: TaskPriority.LOW,
  medium: TaskPriority.MEDIUM,
  high: TaskPriority.HIGH,
};

const ASSIGNMENT_TYPE_TO_DB: Record<
  TaskAssignmentType,
  TaskRow['assignmentType']
> = {
  [TaskAssignmentType.INDIVIDUAL]: 'individual',
  [TaskAssignmentType.DEPARTMENT]: 'department',
  [TaskAssignmentType.SUB_DEPARTMENT]: 'sub_department',
};

const DB_TO_ASSIGNMENT_TYPE: Record<
  TaskRow['assignmentType'],
  TaskAssignmentType
> = {
  individual: TaskAssignmentType.INDIVIDUAL,
  department: TaskAssignmentType.DEPARTMENT,
  sub_department: TaskAssignmentType.SUB_DEPARTMENT,
};

export function statusToDb(s: TaskStatus): TaskRow['status'] {
  return STATUS_TO_DB[s];
}
export function dbToStatus(s: TaskRow['status']): TaskStatus {
  return DB_TO_STATUS[s];
}
export function priorityToDb(p: TaskPriority): TaskRow['priority'] {
  return PRIORITY_TO_DB[p];
}
export function assignmentTypeToDb(
  a: TaskAssignmentType,
): TaskRow['assignmentType'] {
  return ASSIGNMENT_TYPE_TO_DB[a];
}

export function mapRowToTask(row: TaskRow): Task {
  return Task.create({
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate ?? undefined,
    assigneeId: row.assigneeId ?? undefined,
    creatorId: row.creatorId ?? '',
    status: DB_TO_STATUS[row.status],
    assignmentType: DB_TO_ASSIGNMENT_TYPE[row.assignmentType],
    priority: DB_TO_PRIORITY[row.priority],
    targetDepartmentId: row.targetDepartmentId ?? undefined,
    targetSubDepartmentId: row.targetSubDepartmentId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? undefined,
    reminders: row.reminders,
  });
}
