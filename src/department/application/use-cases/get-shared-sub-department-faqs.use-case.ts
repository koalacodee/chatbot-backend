import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

interface GetSharedSubDepartmentFaqsDto {
  key: string;
  subDepartmentId: string;
}

@Injectable()
export class GetSharedSubDepartmentFaqsUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly departmentRepository: DepartmentRepository,
    private readonly questionRepository: QuestionRepository,
  ) {}

  async execute({ key, subDepartmentId }: GetSharedSubDepartmentFaqsDto) {
    const departmentId = await this.redis.get(key);

    if (!departmentId) {
      throw new NotFoundException({
        details: [{ field: 'key', message: 'Key not found' }],
      });
    }

    // Verify the sub-department belongs to the shared department
    const subDepartment = await this.departmentRepository.findSubDepartmentById(
      subDepartmentId,
      {
        includeParent: true,
      },
    );

    if (!subDepartment) {
      throw new NotFoundException({
        details: [
          { field: 'subDepartmentId', message: 'Sub-department not found' },
        ],
      });
    }

    if (
      !subDepartment.parent ||
      subDepartment.parent.id.toString() !== departmentId
    ) {
      throw new NotFoundException(
        'Sub-department does not belong to the shared department',
      );
    }

    const faqs = await this.questionRepository.findByDepartmentIds([
      subDepartmentId,
    ]);

    // Return questions that have answers (considered as FAQs)
    return faqs.filter((faq) => faq.answer && faq.answer.trim() !== '');
  }
}
