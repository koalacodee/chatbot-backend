import type { taskDelegations } from "@/common/drizzle/schema";
import {
	TaskAssignmentType,
	TaskStatus,
} from "@/v2/tasks/domain/entities/task.entity";
import type { TaskDelegation } from "@/v2/tasks/domain/entities/task-delegation.entity";
import { TaskDelegation as TaskDelegationEntity } from "@/v2/tasks/domain/entities/task-delegation.entity";

export type TaskDelegationRow = typeof taskDelegations.$inferSelect;

const STATUS_TO_DB: Record<TaskStatus, TaskDelegationRow["status"]> = {
	[TaskStatus.TODO]: "to_do",
	[TaskStatus.SEEN]: "seen",
	[TaskStatus.PENDING_REVIEW]: "pending_review",
	[TaskStatus.COMPLETED]: "completed",
};

const DB_TO_STATUS: Record<TaskDelegationRow["status"], TaskStatus> = {
	to_do: TaskStatus.TODO,
	seen: TaskStatus.SEEN,
	pending_review: TaskStatus.PENDING_REVIEW,
	completed: TaskStatus.COMPLETED,
};

const ASSIGNMENT_TYPE_TO_DB: Record<
	TaskAssignmentType,
	TaskDelegationRow["assignmentType"]
> = {
	[TaskAssignmentType.INDIVIDUAL]: "individual",
	[TaskAssignmentType.DEPARTMENT]: "department",
	[TaskAssignmentType.SUB_DEPARTMENT]: "sub_department",
};

const DB_TO_ASSIGNMENT_TYPE: Record<
	TaskDelegationRow["assignmentType"],
	TaskAssignmentType
> = {
	individual: TaskAssignmentType.INDIVIDUAL,
	department: TaskAssignmentType.DEPARTMENT,
	sub_department: TaskAssignmentType.SUB_DEPARTMENT,
};

export function statusToDb(s: TaskStatus): TaskDelegationRow["status"] {
	return STATUS_TO_DB[s];
}

export function dbToStatus(s: TaskDelegationRow["status"]): TaskStatus {
	return DB_TO_STATUS[s];
}

export function assignmentTypeToDb(
	a: TaskAssignmentType,
): TaskDelegationRow["assignmentType"] {
	return ASSIGNMENT_TYPE_TO_DB[a];
}

export function dbToAssignmentType(
	a: TaskDelegationRow["assignmentType"],
): TaskAssignmentType {
	return DB_TO_ASSIGNMENT_TYPE[a];
}

export function rowToEntity(row: TaskDelegationRow): TaskDelegation {
	return TaskDelegationEntity.create({
		id: row.id,
		taskId: row.taskId,
		assigneeId: row.assigneeId ?? undefined,
		targetSubDepartmentId: row.targetSubDepartmentId,
		delegatorId: row.delegatorId,
		status: dbToStatus(row.status),
		assignmentType: dbToAssignmentType(row.assignmentType),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		completedAt: row.completedAt ?? undefined,
	});
}
