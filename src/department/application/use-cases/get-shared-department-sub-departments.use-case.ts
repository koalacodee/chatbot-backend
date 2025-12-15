import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { RedisService } from 'src/shared/infrastructure/redis';

interface GetSharedDepartmentSubDepartmentsDto {
  key: string;
}

@Injectable()
export class GetSharedDepartmentSubDepartmentsUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute({ key }: GetSharedDepartmentSubDepartmentsDto) {
    const departmentId = await this.redis.get(key);

    if (!departmentId) {
      throw new NotFoundException({
        details: [{ field: 'key', message: 'Key not found' }],
      });
    }

    const subDepartments =
      await this.departmentRepository.findSubDepartmentByParentId(departmentId);

    return subDepartments;
  }
}
