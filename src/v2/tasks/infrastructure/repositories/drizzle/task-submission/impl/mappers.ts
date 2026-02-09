import type { taskSubmissions } from "@/common/drizzle/schema";
import type { TaskSubmission } from "@/v2/tasks/domain/entities/task-submission.entity";
import {
	TaskSubmission as TaskSubmissionEntity,
	TaskSubmissionStatus,
} from "@/v2/tasks/domain/entities/task-submission.entity";
export type TaskSubmissionRow = typeof taskSubmissions.$inferSelect;

const STATUS_TO_DB: Record<TaskSubmissionStatus, TaskSubmissionRow["status"]> =
	{
		[TaskSubmissionStatus.SUBMITTED]: "submitted",
		[TaskSubmissionStatus.APPROVED]: "approved",
		[TaskSubmissionStatus.REJECTED]: "rejected",
	};

const DB_TO_STATUS: Record<TaskSubmissionRow["status"], TaskSubmissionStatus> =
	{
		submitted: TaskSubmissionStatus.SUBMITTED,
		approved: TaskSubmissionStatus.APPROVED,
		rejected: TaskSubmissionStatus.REJECTED,
	};

export function statusToDb(
	s: TaskSubmissionStatus,
): TaskSubmissionRow["status"] {
	return STATUS_TO_DB[s];
}

export function dbToStatus(
	s: TaskSubmissionRow["status"],
): TaskSubmissionStatus {
	return DB_TO_STATUS[s];
}

export function rowToEntity(row: TaskSubmissionRow): TaskSubmission {
	const performerId =
		row.performerAdminId ??
		row.performerSupervisorId ??
		row.performerEmployeeId ??
		"";
	const performerType: "admin" | "supervisor" | "employee" =
		row.performerAdminId
			? "admin"
			: row.performerSupervisorId
				? "supervisor"
				: "employee";
	return TaskSubmissionEntity.create({
		id: row.id,
		taskId: row.taskId,
		delegationSubmissionId: row.delegationSubmissionId ?? undefined,
		performerId,
		performerType,
		notes: row.notes ?? undefined,
		feedback: row.feedback ?? undefined,
		status: dbToStatus(row.status),
		submittedAt: row.submittedAt,
		reviewedAt: row.reviewedAt ?? undefined,
		reviewedByAdminId: row.reviewedByAdminId ?? undefined,
		reviewedBySupervisorId: row.reviewedBySupervisorId ?? undefined,
	});
}

export { TaskSubmissionStatus };
