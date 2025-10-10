import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';

interface SaveTaskPresetRequest {
  taskId: string;
  presetName: string;
  userId: string;
}

interface SaveTaskPresetResponse {
  preset: TaskPreset;
}

@Injectable()
export class SaveTaskPresetUseCase {
  constructor(
    @Inject('TaskPresetRepository')
    private readonly taskPresetRepository: TaskPresetRepository,
    private readonly taskRepository: TaskRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    request: SaveTaskPresetRequest,
  ): Promise<SaveTaskPresetResponse> {
    const { taskId, presetName, userId } = request;

    // Validate inputs
    if (!presetName || presetName.trim().length === 0) {
      throw new BadRequestException('Preset name is required');
    }

    // Get the task to save as preset
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new BadRequestException('Task not found');
    }

    // Get the user to verify permissions
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user is the assigner of the task
    const isAssigner =
      (task.assigner instanceof Admin &&
        task.assigner.userId.value === userId) ||
      (task.assigner instanceof Supervisor &&
        task.assigner.userId.value === userId);

    if (!isAssigner) {
      throw new BadRequestException(
        'Only the task assigner can save it as a preset',
      );
    }

    // Check if preset name already exists for this user
    const existingPreset =
      await this.taskPresetRepository.findByNameAndAssignerId(
        presetName.trim(),
        userId,
      );

    if (existingPreset) {
      throw new ConflictException('A preset with this name already exists');
    }

    // Determine assigner role
    const assignerRole =
      user.role.getRole() === 'ADMIN' ? 'ADMIN' : 'SUPERVISOR';

    // Create the preset
    const preset = TaskPreset.create({
      id: UUID.create().toString(),
      name: presetName.trim(),
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      assignerId: userId,
      assignerRole,
      approverId: task.approver?.id?.toString(),
      assignmentType: task.assignmentType,
      targetDepartmentId: task.targetDepartmentId,
      targetSubDepartmentId: task.targetSubDepartmentId,
      priority: task.priority,
      reminderInterval: task.reminderInterval,
    });

    // Save the preset
    const savedPreset = await this.taskPresetRepository.save(preset);

    return {
      preset: savedPreset,
    };
  }
}
