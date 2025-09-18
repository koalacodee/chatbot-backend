import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

@Injectable()
export class GetPromotionUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute(
    id: string,
  ): Promise<{
    promotion: Promotion;
    attachments: { [promotionId: string]: string[] };
  }> {
    const promotion = await this.promotionRepo.findById(id);
    if (!promotion) throw new NotFoundException({ id: 'promotion_not_found' });

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [promotion.id.toString()],
    });

    return { promotion, attachments };
  }
}
