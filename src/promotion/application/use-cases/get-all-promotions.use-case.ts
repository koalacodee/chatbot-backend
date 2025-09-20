import { Injectable } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

@Injectable()
export class GetAllPromotionsUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    offset?: number,
    limit?: number,
  ): Promise<{
    promotions: Promotion[];
    attachments: { [promotionId: string]: string[] };
  }> {
    const promotions = await this.promotionRepo.findAll(offset, limit);

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: promotions.map((promotion) => promotion.id.toString()),
    });

    return { promotions, attachments };
  }
}
