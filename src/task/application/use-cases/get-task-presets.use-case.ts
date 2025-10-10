import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';

interface GetTaskPresetsRequest {
  userId: string;
  offset?: number;
  limit?: number;
}

interface GetTaskPresetsResponse {
  presets: TaskPreset[];
  total: number;
}

@Injectable()
export class GetTaskPresetsUseCase {
  constructor(
    @Inject('TaskPresetRepository')
    private readonly taskPresetRepository: TaskPresetRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    request: GetTaskPresetsRequest,
  ): Promise<GetTaskPresetsResponse> {
    const { userId, offset, limit } = request;

    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get presets for the user
    const presets = await this.taskPresetRepository.findByAssignerId(userId);

    // Apply pagination if specified
    const startIndex = offset || 0;
    const endIndex = limit ? startIndex + limit : presets.length;
    const paginatedPresets = presets.slice(startIndex, endIndex);

    return {
      presets: paginatedPresets,
      total: presets.length,
    };
  }
}
