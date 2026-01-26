import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { TaskDelegationRepository } from '../../../domain/repositories/task-delegation.repository';
import { TaskDelegation } from '../../../domain/entities/task-delegation.entity';
import { TaskRepository } from '../../../domain/repositories/task.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { taskDelegations } from 'src/common/drizzle/schema';
import { eq, inArray, desc, and, count } from 'drizzle-orm';
import { TaskStatus } from 'src/task/domain/entities/task.entity';
import {
  domainToDrizzleStatus,
  drizzleToDomainAssignmentType,
  drizzleToDomainStatus,
  mapDomainAssignmentTypeToDrizzleAssignmentType,
} from './drizzle-task.repository';

@Injectable()
export class DrizzleTaskDelegationRepository extends TaskDelegationRepository {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly taskRepository: TaskRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private async toDomain(row: any): Promise<TaskDelegation> {
    const [task, targetSubDepartment, delegator, assignee] = await Promise.all([
      this.taskRepository.findById(row.taskId),
      this.departmentRepository.findById(row.targetSubDepartmentId),
      this.supervisorRepository.findById(row.delegatorId),
      row.assigneeId
        ? this.employeeRepository.findById(row.assigneeId)
        : undefined,
    ]);

    if (!task) {
      throw new Error(`Task with id ${row.taskId} not found`);
    }

    if (!targetSubDepartment) {
      throw new Error(
        `Target sub-department with id ${row.targetSubDepartmentId} not found`,
      );
    }

    if (!delegator) {
      throw new Error(`Delegator with id ${row.delegatorId} not found`);
    }

    return TaskDelegation.create({
      id: row.id,
      taskId: row.taskId,
      task: task,
      assignee: assignee ?? undefined,
      assigneeId: row.assigneeId ?? undefined,
      targetSubDepartment: targetSubDepartment,
      targetSubDepartmentId: row.targetSubDepartmentId,
      delegator: delegator,
      delegatorId: row.delegatorId,
      status: drizzleToDomainStatus(row.status),
      assignmentType: drizzleToDomainAssignmentType(row.assignmentType),
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
    });
  }

  private toISOStringSafe(
    date: Date | string | undefined | null,
  ): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return null;
  }

  async save(taskDelegation: TaskDelegation): Promise<TaskDelegation> {
    const data: typeof taskDelegations.$inferInsert = {
      id: taskDelegation.id.toString(),
      taskId: taskDelegation.taskId.toString(),
      assigneeId: taskDelegation.assigneeId ?? null,
      targetSubDepartmentId: taskDelegation.targetSubDepartmentId.toString(),
      delegatorId: taskDelegation.delegatorId.toString(),
      status: domainToDrizzleStatus(taskDelegation.status),
      assignmentType: mapDomainAssignmentTypeToDrizzleAssignmentType(taskDelegation.assignmentType),
      createdAt:
        taskDelegation.createdAt instanceof Date
          ? taskDelegation.createdAt.toISOString()
          : (taskDelegation.createdAt ?? new Date().toISOString()),
      updatedAt: new Date().toISOString(),
      completedAt: this.toISOStringSafe(taskDelegation.completedAt),
    };

    await this.db
      .insert(taskDelegations)
      .values(data)
      .onConflictDoUpdate({
        target: taskDelegations.id,
        set: {
          taskId: data.taskId,
          assigneeId: data.assigneeId,
          targetSubDepartmentId: data.targetSubDepartmentId,
          delegatorId: data.delegatorId,
          status: data.status,
          assignmentType: data.assignmentType,
          updatedAt: data.updatedAt,
          completedAt: data.completedAt,
        },
      });

    return this.findById(taskDelegation.id.toString());
  }

  async update(id: string, updates: Partial<TaskDelegation>): Promise<TaskDelegation> {
    const result = await this.db
      .update(taskDelegations)
      .set({
        ...updates,
        status: updates?.status ? domainToDrizzleStatus(updates.status) : undefined,
        updatedAt: updates?.updatedAt?.toISOString(),
        createdAt: updates?.createdAt?.toISOString(),
        completedAt: updates?.completedAt?.toISOString(),
        assignmentType: updates?.assignmentType ? mapDomainAssignmentTypeToDrizzleAssignmentType(updates.assignmentType) : undefined,
      })
      .where(eq(taskDelegations.id, id))
      .returning();


    console.log(result);
    return this.toDomain(result[0]);
  }

  async findById(id: string): Promise<TaskDelegation | null> {
    const result = await this.db
      .select()
      .from(taskDelegations)
      .where(eq(taskDelegations.id, id))
      .limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async findByIds(ids: string[]): Promise<TaskDelegation[]> {
    if (ids.length === 0) return [];

    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(inArray(taskDelegations.id, ids))
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findAll(): Promise<TaskDelegation[]> {
    const results = await this.db
      .select()
      .from(taskDelegations)
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async removeById(id: string): Promise<TaskDelegation | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(taskDelegations).where(eq(taskDelegations.id, id));

    return existing;
  }

  async removeByIds(ids: string[]): Promise<TaskDelegation[]> {
    if (ids.length === 0) return [];

    const existing = await this.findByIds(ids);
    if (existing.length === 0) return [];

    await this.db
      .delete(taskDelegations)
      .where(inArray(taskDelegations.id, ids));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(taskDelegations)
      .where(eq(taskDelegations.id, id));

    return Number(result[0]?.count || 0) > 0;
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(taskDelegations);

    return Number(result[0]?.count || 0);
  }

  async findByTaskId(taskId: string): Promise<TaskDelegation[]> {
    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(eq(taskDelegations.taskId, taskId))
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByTaskIds(taskIds: string[]): Promise<TaskDelegation[]> {
    if (taskIds.length === 0) return [];

    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(inArray(taskDelegations.taskId, taskIds))
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByAssigneeId(assigneeId: string): Promise<TaskDelegation[]> {
    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(eq(taskDelegations.assigneeId, assigneeId))
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByAssigneeIds(assigneeIds: string[]): Promise<TaskDelegation[]> {
    if (assigneeIds.length === 0) return [];

    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(inArray(taskDelegations.assigneeId, assigneeIds))
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByTargetSubDepartmentId(
    targetSubDepartmentId: string,
  ): Promise<TaskDelegation[]> {
    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(eq(taskDelegations.targetSubDepartmentId, targetSubDepartmentId))
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByTargetSubDepartmentIds(
    targetSubDepartmentIds: string[],
  ): Promise<TaskDelegation[]> {
    if (targetSubDepartmentIds.length === 0) return [];

    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(
        inArray(taskDelegations.targetSubDepartmentId, targetSubDepartmentIds),
      )
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByDelegatorId(delegatorId: string): Promise<TaskDelegation[]> {
    const results = await this.db
      .select()
      .from(taskDelegations)
      .where(eq(taskDelegations.delegatorId, delegatorId))
      .orderBy(desc(taskDelegations.createdAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByDelegatorIdWithFilters(options: {
    delegatorId: string;
    status?: TaskStatus;
    offset?: number;
    limit?: number;
  }): Promise<{ delegations: TaskDelegation[]; total: number }> {
    const { delegatorId, status, offset, limit } = options;

    const whereConditions = [eq(taskDelegations.delegatorId, delegatorId)];

    if (status) {
      whereConditions.push(
        eq(taskDelegations.status, domainToDrizzleStatus(status)),
      );
    }

    const whereClause =
      whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    const [results, totalResult] = await Promise.all([
      this.db
        .select()
        .from(taskDelegations)
        .where(whereClause)
        .orderBy(desc(taskDelegations.createdAt))
        .limit(limit ?? 1000)
        .offset(offset ?? 0),
      this.db
        .select({ count: count() })
        .from(taskDelegations)
        .where(whereClause),
    ]);

    const delegations = await Promise.all(
      results.map((row) => this.toDomain(row)),
    );

    return {
      delegations,
      total: Number(totalResult[0]?.count || 0),
    };
  }
}
