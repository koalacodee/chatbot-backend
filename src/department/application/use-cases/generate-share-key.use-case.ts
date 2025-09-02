import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { RedisService } from 'src/shared/infrastructure/redis';

interface GenerateShareKeyDto {
  departmentId: string;
}

@Injectable()
export class GenerateShareKeyUseCase {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async execute({ departmentId }: GenerateShareKeyDto) {
    const department = await this.departmentRepository.findById(departmentId);

    if (!department) {
      throw new NotFoundException({ department: 'not_found' });
    }

    const key = randomBytes(
      this.config.get('SHARE_LINK_KEY_LENGTH', 64),
    ).toString('hex');

    await this.redis.set(
      key,
      department.id.toString(),
      this.config.get('SHARE_LINK_EXPIRY', undefined),
    );

    return { key };
  }
}
