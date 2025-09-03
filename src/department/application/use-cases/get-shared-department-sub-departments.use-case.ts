import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { RedisService } from 'src/shared/infrastructure/redis';

interface GetSharedDepartmentSubDepartmentsDto {
  key: string;
}

@Injectable()
export class GetSharedDepartmentSubDepartmentsUseCase {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute({ key }: GetSharedDepartmentSubDepartmentsDto) {
    if (key.length !== +this.config.get('SHARE_LINK_KEY_LENGTH', 64) * 2) {
      throw new BadRequestException('Invalid key');
    }

    const departmentId = await this.redis.get(key);

    if (!departmentId) {
      throw new NotFoundException('Key Not Found');
    }

    const department = await this.departmentRepository.findMainDepartmentById(
      departmentId,
      {
        includeSubDepartments: true,
        includeQuestions: false,
        includeKnowledgeChunks: false,
      },
    );

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department.subDepartments;
  }
}
