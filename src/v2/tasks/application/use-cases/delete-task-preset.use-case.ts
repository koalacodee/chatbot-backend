import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';

@Injectable()
export class DeleteTaskPresetUseCase {
  constructor(
    private readonly taskPresetRepo: TaskPresetRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(presetId: string, userId: string): Promise<void> {
    const preset = await this.taskPresetRepo.findById(presetId);
    if (!preset) {
      throw new NotFoundException({ presetId: 'not_found' });
    }

    // Validate that the user is the assigner
    const supervisor = await this.supervisorRepository.findByUserId(userId);
    if (!supervisor) {
      throw new ForbiddenException('Only supervisors can delete task presets');
    }

    if (preset.assignerId !== supervisor.id.toString()) {
      throw new ForbiddenException('You can only delete your own task presets');
    }

    await this.taskPresetRepo.delete(presetId);
  }
}
