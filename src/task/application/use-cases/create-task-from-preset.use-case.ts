import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { CreateTaskUseCase } from './create-task.use-case';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { Task } from '../../domain/entities/task.entity';
import {
  TaskAssignmentType,
  TaskPriority,
} from '../../domain/entities/task.entity';
import { Roles } from 'src/shared/value-objects/role.vo';

interface CreateTaskFromPresetRequest {
  presetId: string;
  assignerId: string;
  assignerRole: Roles;
  // Override fields - all optional
  title?: string;
  description?: string;
  dueDate?: Date;
  assigneeId?: string;
  approverId?: string;
  status?: any; // TaskStatus
  assignmentType?: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  completedAt?: Date | null;
  priority?: TaskPriority;
  attach?: boolean;
  reminderInterval?: number;
}

interface CreateTaskFromPresetResponse {
  task: Task;
  uploadKey?: string;
  fileHubUploadKey?: string;
}

@Injectable()
export class CreateTaskFromPresetUseCase {
  constructor(
    @Inject('TaskPresetRepository')
    private readonly taskPresetRepository: TaskPresetRepository,
    private readonly createTaskUseCase: CreateTaskUseCase,
  ) {}

  async execute(
    request: CreateTaskFromPresetRequest,
  ): Promise<CreateTaskFromPresetResponse> {
    const { presetId, assignerId, assignerRole, ...overrides } = request;

    // Get the preset
    const preset = await this.taskPresetRepository.findById(presetId);
    if (!preset) {
      throw new NotFoundException('Task preset not found');
    }

    // Verify the user has permission to use this preset
    if (preset.assignerId.value !== assignerId) {
      throw new BadRequestException('You can only use your own presets');
    }

    // Merge preset data with overrides
    const taskData = {
      title: overrides.title ?? preset.title,
      description: overrides.description ?? preset.description,
      dueDate: overrides.dueDate ?? preset.dueDate,
      assigneeId: overrides.assigneeId ?? preset.assigneeId,
      assignerId,
      assignerRole,
      approverId: overrides.approverId ?? preset.approverId,
      status: overrides.status ?? 'TODO', // Default status for new tasks
      assignmentType: overrides.assignmentType ?? preset.assignmentType,
      targetDepartmentId:
        overrides.targetDepartmentId ?? preset.targetDepartmentId,
      targetSubDepartmentId:
        overrides.targetSubDepartmentId ?? preset.targetSubDepartmentId,
      completedAt: overrides.completedAt ?? undefined,
      priority: overrides.priority ?? preset.priority,
      attach: overrides.attach ?? false,
      reminderInterval: overrides.reminderInterval ?? preset.reminderInterval,
    };

    // Create the task using the existing CreateTaskUseCase
    return this.createTaskUseCase.execute(taskData, assignerId);
  }
}
