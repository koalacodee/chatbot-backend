import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

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
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute({
    key,
    guestId,
    subDepartmentId,
  }: GetSharedDepartmentFAQsDto): Promise<{
    faqs: any[];
    attachments: { [faqId: string]: string[] };
  }> {
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

    const faqs = await this.questionsRepository.viewFaqs({
      departmentId: subDepartmentId ?? departmentId,
      viewPrivate: true,
    });

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: faqs.map((faq) => faq.id),
    });

    return { faqs, attachments };
  }
}
