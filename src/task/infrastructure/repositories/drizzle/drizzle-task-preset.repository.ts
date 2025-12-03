import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { TaskPresetRepository } from '../../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../../domain/entities/task-preset.entity';
import { taskPresets } from 'src/common/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { TaskAssignmentTypeMapping } from './drizzle-task-delegation.repository';

export enum TaskPriorityMapping {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Injectable()
export class DrizzleTaskPresetRepository implements TaskPresetRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.client;
  }

  async save(preset: TaskPreset): Promise<TaskPreset> {
    const data: typeof taskPresets.$inferInsert = {
      id: preset.id.value,
      name: preset.name,
      title: preset.title,
      description: preset.description,
      dueDate: preset.dueDate?.toISOString() ?? null,
      assigneeId: preset.assigneeId ?? null,
      assignerId: preset.assignerId.value,
      assignerRole: preset.assignerRole,
      approverId: preset.approverId ?? null,
      assignmentType: TaskAssignmentTypeMapping[preset.assignmentType],
      priority: TaskPriorityMapping[preset.priority],
      targetDepartmentId: preset.targetDepartmentId ?? null,
      targetSubDepartmentId: preset.targetSubDepartmentId ?? null,
      reminderInterval: preset.reminderInterval ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.insert(taskPresets).values(data);

    return this.findById(preset.id.value);
  }

  async findById(id: string): Promise<TaskPreset | null> {
    const result = await this.db
      .select()
      .from(taskPresets)
      .where(eq(taskPresets.id, id))
      .limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async findByAssignerId(assignerId: string): Promise<TaskPreset[]> {
    const results = await this.db
      .select()
      .from(taskPresets)
      .where(eq(taskPresets.assignerId, assignerId))
      .orderBy(desc(taskPresets.createdAt));

    return results.map((preset) => this.toDomain(preset));
  }

  async findByNameAndAssignerId(
    name: string,
    assignerId: string,
  ): Promise<TaskPreset | null> {
    const result = await this.db
      .select()
      .from(taskPresets)
      .where(
        and(eq(taskPresets.name, name), eq(taskPresets.assignerId, assignerId)),
      )
      .limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async update(preset: TaskPreset): Promise<TaskPreset> {
    const data = {
      name: preset.name,
      title: preset.title,
      description: preset.description,
      dueDate: preset.dueDate?.toISOString() ?? null,
      assigneeId: preset.assigneeId ?? null,
      assignerRole: preset.assignerRole,
      approverId: preset.approverId ?? null,
      assignmentType: TaskAssignmentTypeMapping[preset.assignmentType],
      priority: TaskPriorityMapping[preset.priority],
      targetDepartmentId: preset.targetDepartmentId ?? null,
      targetSubDepartmentId: preset.targetSubDepartmentId ?? null,
      reminderInterval: preset.reminderInterval ?? null,
      updatedAt: new Date().toISOString(),
    };

    await this.db
      .update(taskPresets)
      .set(data)
      .where(eq(taskPresets.id, preset.id.value));

    return this.findById(preset.id.value);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(taskPresets).where(eq(taskPresets.id, id));
  }

  async findAll(offset?: number, limit?: number): Promise<TaskPreset[]> {
    const baseQuery = this.db
      .select()
      .from(taskPresets)
      .orderBy(desc(taskPresets.createdAt));

    const results =
      offset !== undefined && limit !== undefined
        ? await baseQuery.limit(limit).offset(offset)
        : limit !== undefined
          ? await baseQuery.limit(limit)
          : offset !== undefined
            ? await baseQuery.offset(offset)
            : await baseQuery;

    return results.map((preset) => this.toDomain(preset));
  }

  private toDomain(data: any): TaskPreset {
    return TaskPreset.create({
      id: data.id,
      name: data.name,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      assigneeId: data.assigneeId ?? undefined,
      assignerId: data.assignerId,
      assignerRole: data.assignerRole,
      approverId: data.approverId ?? undefined,
      assignmentType: data.assignmentType,
      priority: data.priority,
      targetDepartmentId: data.targetDepartmentId ?? undefined,
      targetSubDepartmentId: data.targetSubDepartmentId ?? undefined,
      reminderInterval: data.reminderInterval ?? undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    });
  }
}
