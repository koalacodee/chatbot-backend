import { eq } from "drizzle-orm";
import type { DatabaseInstance, DrizzleTransaction } from "@/common/drizzle/drizzle.service";
import { taskPresets } from "@/common/drizzle/schema";
import type { TaskPreset } from "@/v2/tasks/domain/entities/task-preset.entity";
import {
	assignerRoleToDb,
	assignmentTypeToDb,
	priorityToDb,
	rowToEntity,
} from "./mappers";

export async function save(
	db: DatabaseInstance | DrizzleTransaction,
	preset: TaskPreset,
): Promise<TaskPreset> {
	const data: typeof taskPresets.$inferInsert = {
		id: preset.id,
		name: preset.name,
		title: preset.title,
		description: preset.description,
		dueDate: preset.dueDate ?? null,
		assigneeId: preset.assigneeId ?? null,
		assignerId: preset.assignerId,
		assignerRole: assignerRoleToDb(preset.assignerRole),
		approverId: preset.approverId ?? null,
		assignmentType: assignmentTypeToDb(preset.assignmentType),
		targetDepartmentId: preset.targetDepartmentId ?? null,
		targetSubDepartmentId: preset.targetSubDepartmentId ?? null,
		priority: priorityToDb(preset.priority),
		reminderInterval: preset.reminderInterval ?? null,
		createdAt: preset.createdAt,
		updatedAt: preset.updatedAt,
	};
	const [result] = await db
		.insert(taskPresets)
		.values(data)
		.onConflictDoUpdate({
			target: taskPresets.id,
			set: data,
		})
		.returning();
	return result ? rowToEntity(result) : preset;
}

export async function update(
	db: DatabaseInstance | DrizzleTransaction,
	preset: TaskPreset,
): Promise<TaskPreset> {
	const data: typeof taskPresets.$inferInsert = {
		id: preset.id,
		name: preset.name,
		title: preset.title,
		description: preset.description,
		dueDate: preset.dueDate ?? null,
		assigneeId: preset.assigneeId ?? null,
		assignerId: preset.assignerId,
		assignerRole: assignerRoleToDb(preset.assignerRole),
		approverId: preset.approverId ?? null,
		assignmentType: assignmentTypeToDb(preset.assignmentType),
		targetDepartmentId: preset.targetDepartmentId ?? null,
		targetSubDepartmentId: preset.targetSubDepartmentId ?? null,
		priority: priorityToDb(preset.priority),
		reminderInterval: preset.reminderInterval ?? null,
		updatedAt: new Date(),
	};
	const [result] = await db
		.update(taskPresets)
		.set(data)
		.where(eq(taskPresets.id, preset.id))
		.returning();
	if (!result) throw new Error(`TaskPreset not found: ${preset.id}`);
	return rowToEntity(result);
}

export async function findById(
	db: DatabaseInstance | DrizzleTransaction,
	id: string,
): Promise<TaskPreset | null> {
	const [row] = await db
		.select()
		.from(taskPresets)
		.where(eq(taskPresets.id, id))
		.limit(1);
	return row ? rowToEntity(row) : null;
}

export async function deleteById(
	db: DatabaseInstance | DrizzleTransaction,
	id: string,
): Promise<void> {
	await db.delete(taskPresets).where(eq(taskPresets.id, id));
}
