import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { Admin } from '@/admin/domain/entities/admin.entity';
import { Supervisor } from '@/supervisor/domain/entities/supervisor.entity';

interface SaveTaskPresetInputDto {
  taskId: string;
  presetName: string;
  userId: string;
}

@Injectable()
export class SaveTaskPresetUseCase {
  constructor(
    private readonly taskPresetRepo: TaskPresetRepository,
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(dto: SaveTaskPresetInputDto): Promise<{
    preset: ReturnType<typeof TaskPreset.prototype.toJSON>;
  }> {
    const { taskId, presetName, userId } = dto;

    // Validate preset name
    if (!presetName || presetName.trim().length === 0) {
      throw new BadRequestException({
        details: [{ field: 'presetName', message: 'Preset name is required' }],
      });
    }

    // Get the task to save as preset
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException({
        details: [{ field: 'taskId', message: 'Task not found' }],
      });
    }

    // Get the user to verify permissions
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    // Check if user is the assigner of the task
    const isAssigner =
      (task.assigner instanceof Admin &&
        task.assigner.userId.value === userId) ||
      (task.assigner instanceof Supervisor &&
        task.assigner.userId.value === userId);

    if (!isAssigner) {
      throw new BadRequestException({
        details: [
          {
            field: 'userId',
            message: 'Only the task assigner can save it as a preset',
          },
        ],
      });
    }

    // Check if preset name already exists for this user
    const existingPreset = await this.taskPresetRepo.findByNameAndAssignerId(
      presetName.trim(),
      userId,
    );

    if (existingPreset) {
      throw new ConflictException({
        details: [
          {
            field: 'presetName',
            message: 'A preset with this name already exists',
          },
        ],
      });
    }

    // Determine assigner role
    const assignerRole =
      user.role.getRole() === Roles.ADMIN ? Roles.ADMIN : Roles.SUPERVISOR;

    // Create the preset
    const preset = TaskPreset.create({
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
      reminderInterval: task.reminders?.[0]?.reminderInterval,
    });

    // Save the preset
    const savedPreset = await this.taskPresetRepo.save(preset);

    return {
      preset: savedPreset.toJSON(),
    };
  }
}
