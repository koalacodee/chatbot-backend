import type { SQL } from "drizzle-orm";
import { and, eq, inArray, or } from "drizzle-orm";
import type { CursorInput, PaginatedArrayResult } from "@/common/drizzle/helpers/cursor";
import { departments, tasks } from "@/common/drizzle/schema";
import type {
	Task,
	TaskStatus,
} from "@/v2/tasks/domain/entities/task.entity";
import { statusToDb } from "./mappers";
import type { TaskRepoContext } from "./repository-query";
import { fetchTasks } from "./repository-query";

export async function findTeamTasks(
	ctx: TaskRepoContext,
	options: {
		employeeId?: string;
		subDepartmentId?: string;
		departmentId?: string;
		status?: TaskStatus[];
		cursor?: CursorInput;
	},
): Promise<PaginatedArrayResult<Task>> {
	const whereConditions: SQL[] = [];
	if (options.employeeId) {
		whereConditions.push(eq(tasks.assigneeId, options.employeeId));
	}
	if (options.subDepartmentId) {
		whereConditions.push(
			eq(tasks.targetSubDepartmentId, options.subDepartmentId),
		);
	}
	if (options.departmentId) {
		whereConditions.push(eq(tasks.targetDepartmentId, options.departmentId));
	}
	if (options.status?.length) {
		const dbStatuses = options.status.map((s) => statusToDb(s));
		whereConditions.push(inArray(tasks.status, dbStatuses));
	}
	const paginationParams = ctx.pagination.parseInput(options.cursor);
	const list = await fetchTasks(ctx, {
		where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
		paginationParams,
	});
	return ctx.pagination.processResults(list, paginationParams, (t) => ({
		createdAt: t.createdAt.toISOString(),
		id: t.id,
	}));
}

export async function findTasksForSupervisor(
	ctx: TaskRepoContext,
	options: {
		supervisorDepartmentIds: string[];
		status?: TaskStatus[];
		cursor?: CursorInput;
	},
): Promise<PaginatedArrayResult<Task>> {
	const subDeptIds = (
		await ctx.db
			.select({ id: departments.id })
			.from(departments)
			.where(inArray(departments.parentId, options.supervisorDepartmentIds))
	).map((r) => r.id);
	const whereConditions: SQL[] = [
		or(
			inArray(tasks.targetDepartmentId, options.supervisorDepartmentIds),
			inArray(tasks.targetSubDepartmentId, subDeptIds),
		) as SQL,
	];
	if (options.status?.length) {
		const dbStatuses = options.status.map((s) => statusToDb(s));
		whereConditions.push(inArray(tasks.status, dbStatuses));
	}
	const paginationParams = ctx.pagination.parseInput(options.cursor);
	const list = await fetchTasks(ctx, {
		where: and(...whereConditions),
		paginationParams,
	});
	return ctx.pagination.processResults(list, paginationParams, (t) => ({
		createdAt: t.createdAt.toISOString(),
		id: t.id,
	}));
}

export async function findTasksForEmployee(
	ctx: TaskRepoContext,
	options: {
		employeeId: string;
		supervisorId: string;
		subDepartmentIds: string[];
		status?: TaskStatus[];
		cursor?: CursorInput;
	},
): Promise<PaginatedArrayResult<Task>> {
	const whereConditions: SQL[] = [
		or(
			eq(tasks.assigneeId, options.employeeId),
			inArray(tasks.targetSubDepartmentId, options.subDepartmentIds),
		) as SQL,
	];
	if (options.status?.length) {
		const dbStatuses = options.status.map((s) => statusToDb(s));
		whereConditions.push(inArray(tasks.status, dbStatuses));
	}
	const paginationParams = ctx.pagination.parseInput(options.cursor);
	const list = await fetchTasks(ctx, {
		where: and(...whereConditions),
		paginationParams,
	});
	return ctx.pagination.processResults(list, paginationParams, (t) => ({
		createdAt: t.createdAt.toISOString(),
		id: t.id,
	}));
}
