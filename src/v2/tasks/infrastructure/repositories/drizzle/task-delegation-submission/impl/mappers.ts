import type { taskDelegationSubmissions } from "@/common/drizzle/schema";
import { TaskDelegationSubmission } from "@/v2/tasks/domain/entities/task-delegation-submission.entity";
import { TaskSubmissionStatus } from "@/v2/tasks/domain/entities/task-submission.entity";

export type TaskDelegationSubmissionRow =
	typeof taskDelegationSubmissions.$inferSelect;

const STATUS_TO_DB: Record<
	TaskSubmissionStatus,
	TaskDelegationSubmissionRow["status"]
> = {
	[TaskSubmissionStatus.SUBMITTED]: "submitted",
	[TaskSubmissionStatus.APPROVED]: "approved",
	[TaskSubmissionStatus.REJECTED]: "rejected",
};

const DB_TO_STATUS: Record<
	TaskDelegationSubmissionRow["status"],
	TaskSubmissionStatus
> = {
	submitted: TaskSubmissionStatus.SUBMITTED,
	approved: TaskSubmissionStatus.APPROVED,
	rejected: TaskSubmissionStatus.REJECTED,
};

export function statusToDb(
	s: TaskSubmissionStatus,
): TaskDelegationSubmissionRow["status"] {
	return STATUS_TO_DB[s];
}

export function dbToStatus(
	s: TaskDelegationSubmissionRow["status"],
): TaskSubmissionStatus {
	return DB_TO_STATUS[s];
}

export function rowToEntity(
	row: TaskDelegationSubmissionRow,
): TaskDelegationSubmission {
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
	return TaskDelegationSubmission.create({
		id: row.id,
		delegationId: row.delegationId,
		taskId: row.taskId,
		performerId,
		performerType,
		notes: row.notes ?? undefined,
		feedback: row.feedback ?? undefined,
		status: dbToStatus(row.status),
		submittedAt: row.submittedAt,
		reviewedAt: row.reviewedAt ?? undefined,
		reviewedByAdminId: row.reviewedByAdminId ?? undefined,
		reviewedBySupervisorId: row.reviewedBySupervisorId ?? undefined,
		forwarded: row.forwarded,
	});
}

export { TaskSubmissionStatus };
