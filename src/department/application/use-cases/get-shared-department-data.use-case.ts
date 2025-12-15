import { Injectable, NotFoundException } from '@nestjs/common';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { RedisService } from 'src/shared/infrastructure/redis';

interface GetSharedDepartmentDataDto {
  key: string;
}

@Injectable()
export class GetSharedDepartmentDataUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute({
    key,
  }: GetSharedDepartmentDataDto): Promise<ReturnType<Department['toJSON']>> {
    const departmentId = await this.redis.get(key);

    if (!departmentId) {
      throw new NotFoundException({
        details: [{ field: 'key', message: 'Key not found' }],
      });
    }

    const department = await this.departmentRepository.findMainDepartmentById(
      departmentId,
      {
        includeSubDepartments: true,
      },
    );

    if (!department) {
      throw new NotFoundException({
        details: [{ field: 'departmentId', message: 'Department not found' }],
      });
    }

    return department.toJSON();
  }
}
