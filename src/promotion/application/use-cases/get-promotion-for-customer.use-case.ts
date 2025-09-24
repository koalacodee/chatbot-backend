import { Injectable } from '@nestjs/common';
import { PromotionRepository } from 'src/promotion/domain/repositories/promotion.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

interface GetPromotionForCustomerOutput {
  promotion: any;
  attachments: { [promotionId: string]: string[] };
}

@Injectable()
export class GetPromotionForCustomerUseCase {
  constructor(
    private readonly promotionRepository: PromotionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute(): Promise<GetPromotionForCustomerOutput> {
    const promotion = await this.promotionRepository.getPromotionForCustomer();

    // Get attachments for the promotion
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: promotion ? [promotion.id.toString()] : [],
    });

    return {
      promotion,
      attachments,
    };
  }
}
