import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskPresetCreatedEvent } from '../../domain/events/task-preset-created.event';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class TaskPresetCreatedListener {
  constructor(
    @Inject('TaskPresetRepository')
    private readonly taskPresetRepository: TaskPresetRepository,
    private readonly taskRepository: TaskRepository,
  ) {}

  @OnEvent(TaskPresetCreatedEvent.name)
  async handleTaskPresetCreated(event: TaskPresetCreatedEvent) {
    try {
      const { taskId, assignerId, assignerRole, presetName } = event;

      // Get the task to extract preset data
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        console.error(`Task not found for preset creation: ${taskId}`);
        return;
      }

      // Check if preset name already exists for this user
      const existingPreset =
        await this.taskPresetRepository.findByNameAndAssignerId(
          presetName,
          assignerId,
        );

      if (existingPreset) {
        console.warn(
          `Preset with name "${presetName}" already exists for user ${assignerId}`,
        );
        return;
      }

      // Create the preset
      const preset = TaskPreset.create({
        id: UUID.create().toString(),
        name: presetName,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        assigneeId: task.assigneeId,
        assignerId,
        assignerRole: assignerRole as 'ADMIN' | 'SUPERVISOR',
        approverId: task.approver?.id?.toString(),
        assignmentType: task.assignmentType,
        targetDepartmentId: task.targetDepartmentId,
        targetSubDepartmentId: task.targetSubDepartmentId,
        priority: task.priority,
        reminderInterval: task.reminderInterval,
      });

      // Save the preset
      await this.taskPresetRepository.save(preset);

      console.log(
        `Task preset "${presetName}" created successfully for task ${taskId}`,
      );
    } catch (error) {
      console.error('Error creating task preset:', error);
    }
  }
}
