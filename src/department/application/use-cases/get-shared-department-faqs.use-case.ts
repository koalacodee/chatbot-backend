import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

interface GetSharedDepartmentFaqsDto {
  key: string;
}

@Injectable()
export class GetSharedDepartmentFaqsUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly departmentRepository: DepartmentRepository,
    private readonly questionRepository: QuestionRepository,
  ) {}

  async execute({ key }: GetSharedDepartmentFaqsDto) {
    const departmentId = await this.redis.get(key);

    if (!departmentId) {
      throw new NotFoundException({
        details: [{ field: 'key', message: 'Key not found' }],
      });
    }

    const department =
      await this.departmentRepository.findMainDepartmentById(departmentId);

    if (!department) {
      throw new NotFoundException({
        details: [{ field: 'departmentId', message: 'Department not found' }],
      });
    }

    const faqs = await this.questionRepository.findByDepartmentIds([
      department.id.toString(),
    ]);

    // Return questions that have answers (considered as FAQs)
    return faqs.filter((faq) => faq.answer && faq.answer.trim() !== '');
  }
}
