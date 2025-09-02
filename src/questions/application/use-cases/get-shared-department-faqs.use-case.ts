import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { RedisService } from 'src/shared/infrastructure/redis';

interface GetSharedDepartmentFAQsDto {
  key: string;
  guestId: string;
  subDepartmentId?: string;
}

@Injectable()
export class GetSharedDepartmentFAQsUseCase {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly questionsRepository: QuestionRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute({ key, guestId, subDepartmentId }: GetSharedDepartmentFAQsDto) {
    if (key.length !== this.config.get('SHARE_LINK_KEY_LENGTH', 64)) {
      throw new Error('Invalid key');
    }

    const departmentId = await this.redis.get(key);

    let storedSubDepartmentId;

    if (subDepartmentId) {
      storedSubDepartmentId = await this.departmentRepository
        .findSubDepartmentById(subDepartmentId)
        .then((dept) => dept.id.toString());
    }

    if (!departmentId) {
      throw new Error('Department not found');
    }

    return this.questionsRepository.viewFaqs({
      departmentId: subDepartmentId ?? departmentId,
      guestId,
      viewPrivate: true,
    });
  }
}
