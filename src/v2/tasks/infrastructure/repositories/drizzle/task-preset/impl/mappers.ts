import type { taskPresets } from "@/common/drizzle/schema";
import {
	TaskAssignmentType,
	TaskPriority,
} from "@/v2/tasks/domain/entities/task.entity";
import { TaskPreset } from "@/v2/tasks/domain/entities/task-preset.entity";

export type TaskPresetRow = typeof taskPresets.$inferSelect;

const ASSIGNMENT_TYPE_TO_DB: Record<
	TaskAssignmentType,
	TaskPresetRow["assignmentType"]
> = {
	[TaskAssignmentType.INDIVIDUAL]: "individual",
	[TaskAssignmentType.DEPARTMENT]: "department",
	[TaskAssignmentType.SUB_DEPARTMENT]: "sub_department",
};

const DB_TO_ASSIGNMENT_TYPE: Record<
	TaskPresetRow["assignmentType"],
	TaskAssignmentType
> = {
	individual: TaskAssignmentType.INDIVIDUAL,
	department: TaskAssignmentType.DEPARTMENT,
	sub_department: TaskAssignmentType.SUB_DEPARTMENT,
};

const PRIORITY_TO_DB: Record<TaskPriority, TaskPresetRow["priority"]> = {
	[TaskPriority.LOW]: "low",
	[TaskPriority.MEDIUM]: "medium",
	[TaskPriority.HIGH]: "high",
};

const DB_TO_PRIORITY: Record<TaskPresetRow["priority"], TaskPriority> = {
	low: TaskPriority.LOW,
	medium: TaskPriority.MEDIUM,
	high: TaskPriority.HIGH,
};

const DB_TO_ASSIGNER_ROLE: Record<
	TaskPresetRow["assignerRole"],
	"ADMIN" | "SUPERVISOR"
> = {
	admin: "ADMIN",
	supervisor: "SUPERVISOR",
};

const ASSIGNER_ROLE_TO_DB: Record<
	"ADMIN" | "SUPERVISOR",
	TaskPresetRow["assignerRole"]
> = {
	ADMIN: "admin",
	SUPERVISOR: "supervisor",
};

export function assignmentTypeToDb(
	t: TaskAssignmentType,
): TaskPresetRow["assignmentType"] {
	return ASSIGNMENT_TYPE_TO_DB[t];
}

export function dbToAssignmentType(
	t: TaskPresetRow["assignmentType"],
): TaskAssignmentType {
	return DB_TO_ASSIGNMENT_TYPE[t];
}

export function priorityToDb(p: TaskPriority): TaskPresetRow["priority"] {
	return PRIORITY_TO_DB[p];
}

export function dbToPriority(p: TaskPresetRow["priority"]): TaskPriority {
	return DB_TO_PRIORITY[p];
}

export function dbToAssignerRole(
	r: TaskPresetRow["assignerRole"],
): "ADMIN" | "SUPERVISOR" {
	return DB_TO_ASSIGNER_ROLE[r];
}

export function assignerRoleToDb(
	r: "ADMIN" | "SUPERVISOR",
): TaskPresetRow["assignerRole"] {
	return ASSIGNER_ROLE_TO_DB[r];
}

export function rowToEntity(row: TaskPresetRow): TaskPreset {
	return TaskPreset.create({
		id: row.id,
		name: row.name,
		title: row.title,
		description: row.description,
		dueDate: row.dueDate ?? undefined,
		assigneeId: row.assigneeId ?? undefined,
		assignerId: row.assignerId,
		assignerRole: dbToAssignerRole(row.assignerRole),
		approverId: row.approverId ?? undefined,
		assignmentType: dbToAssignmentType(row.assignmentType),
		targetDepartmentId: row.targetDepartmentId ?? undefined,
		targetSubDepartmentId: row.targetSubDepartmentId ?? undefined,
		priority: dbToPriority(row.priority),
		reminderInterval: row.reminderInterval ?? undefined,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}
