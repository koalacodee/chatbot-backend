import { Injectable, BadRequestException } from '@nestjs/common';
import { TaskPresetRepository } from '../../domain/repositories/task-preset.repository';
import { TaskPreset } from '../../domain/entities/task-preset.entity';
import { CursorInput } from '@/common/drizzle/helpers/cursor';
import { UserRepository } from '@/shared/repositories/user.repository';

interface GetTaskPresetsResponse {
  presets: TaskPreset[];
  total: number;
}

@Injectable()
export class GetTaskPresetsUseCase {
  constructor(
    private readonly taskPresetRepo: TaskPresetRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(dto: {
    userId: string;
    cursor?: CursorInput;
  }): Promise<GetTaskPresetsResponse> {
    const { userId, cursor } = dto;

    // Validate user exists (Parity with v1)
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { data: presets, total } = await this.taskPresetRepo.findByAssignerId(
      userId,
      cursor,
    );

    return {
      presets,
      total,
    };
  }
}
