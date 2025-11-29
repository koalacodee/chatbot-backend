import { Injectable } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@Injectable()
export class GetAllPromotionsUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    offset?: number,
    limit?: number,
  ): Promise<{
    promotions: Promotion[];
    attachments: { [promotionId: string]: string[] };
    fileHubAttachments: FilehubAttachmentMessage[];
  }> {
    const promotions = await this.promotionRepo.findAll(offset, limit);

    const targetIds = promotions.map((promotion) => promotion.id.toString());

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds,
    });

    const fileHubAttachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds,
      });

    return { promotions, attachments, fileHubAttachments };
  }
}
