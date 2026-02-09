import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskPresetCreatedEvent } from '../../domain/events/task-preset-created.event';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';

@Injectable()
export class CreateTaskPresetListener {
  constructor(
    private readonly taskPresetRepository: TaskPresetRepository,
    private readonly taskRepository: TaskRepository,
  ) {}

  @OnEvent(TaskPresetCreatedEvent.name)
  async handleTaskPresetCreatedEvent(event: TaskPresetCreatedEvent) {
    const task = await this.taskRepository.findById(event.taskId);

    const preset = TaskPreset.create({
      assignerId: event.assignerId,
      assignmentType: task.assignmentType,
      assignerRole: event.assignerRole,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      approverId: task.approverId,
      targetDepartmentId: task.targetDepartmentId,
      targetSubDepartmentId: task.targetSubDepartmentId,
      priority: task.priority,
      name: event.presetName,
    });

    await this.taskPresetRepository.save(preset);
  }
}
