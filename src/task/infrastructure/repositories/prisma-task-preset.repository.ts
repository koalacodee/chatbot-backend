import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

/**
 * @deprecated This repository has been replaced by DrizzleTaskPresetRepository.
 * Use DrizzleTaskPresetRepository from './drizzle/drizzle-task-preset.repository' instead.
 * This class will be removed in a future version.
 */
@Injectable()
export class PrismaTaskPresetRepository implements TaskPresetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(preset: TaskPreset): Promise<TaskPreset> {
    const data = {
      id: preset.id.value,
      name: preset.name,
      title: preset.title,
      description: preset.description,
      dueDate: preset.dueDate,
      assigneeId: preset.assigneeId,
      assignerId: preset.assignerId.value,
      assignerRole: preset.assignerRole,
      approverId: preset.approverId,
      assignmentType: preset.assignmentType,
      priority: preset.priority,
      targetDepartmentId: preset.targetDepartmentId,
      targetSubDepartmentId: preset.targetSubDepartmentId,
      reminderInterval: preset.reminderInterval,
    };

    const saved = await this.prisma.taskPreset.create({ data });
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<TaskPreset | null> {
    const preset = await this.prisma.taskPreset.findUnique({
      where: { id },
    });

    return preset ? this.toDomain(preset) : null;
  }

  async findByAssignerId(assignerId: string): Promise<TaskPreset[]> {
    const presets = await this.prisma.taskPreset.findMany({
      where: { assignerId },
      orderBy: { createdAt: 'desc' },
    });

    return presets.map((preset) => this.toDomain(preset));
  }

  async findByNameAndAssignerId(
    name: string,
    assignerId: string,
  ): Promise<TaskPreset | null> {
    const preset = await this.prisma.taskPreset.findFirst({
      where: {
        name,
        assignerId,
      },
    });

    return preset ? this.toDomain(preset) : null;
  }

  async update(preset: TaskPreset): Promise<TaskPreset> {
    const data = {
      name: preset.name,
      title: preset.title,
      description: preset.description,
      dueDate: preset.dueDate,
      assigneeId: preset.assigneeId,
      assignerRole: preset.assignerRole,
      approverId: preset.approverId,
      assignmentType: preset.assignmentType,
      priority: preset.priority,
      targetDepartmentId: preset.targetDepartmentId,
      targetSubDepartmentId: preset.targetSubDepartmentId,
      reminderInterval: preset.reminderInterval,
    };

    const updated = await this.prisma.taskPreset.update({
      where: { id: preset.id.value },
      data,
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taskPreset.delete({
      where: { id },
    });
  }

  async findAll(offset?: number, limit?: number): Promise<TaskPreset[]> {
    const presets = await this.prisma.taskPreset.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return presets.map((preset) => this.toDomain(preset));
  }

  private toDomain(data: any): TaskPreset {
    return TaskPreset.create({
      id: data.id,
      name: data.name,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      assigneeId: data.assigneeId,
      assignerId: data.assignerId,
      assignerRole: data.assignerRole,
      approverId: data.approverId,
      assignmentType: data.assignmentType,
      priority: data.priority,
      targetDepartmentId: data.targetDepartmentId,
      targetSubDepartmentId: data.targetSubDepartmentId,
      reminderInterval: data.reminderInterval,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
