import { eq } from "drizzle-orm";
import { tasks } from "@/common/drizzle/schema";
import type { Task } from "@/v2/tasks/domain/entities/task.entity";
import * as crud from "./repository-crud";
import type { TaskRepoContext } from "./repository-query";

export async function findTaskForReminder(
	ctx: TaskRepoContext,
	taskId: string,
): Promise<Task | null> {
	return crud.findById(ctx, taskId);
}

export async function restart(
	ctx: TaskRepoContext,
	taskId: string,
): Promise<void> {
	await ctx.db
		.update(tasks)
		.set({
			status: "to_do",
			updatedAt: new Date(),
			completedAt: null,
		})
		.where(eq(tasks.id, taskId));
}
