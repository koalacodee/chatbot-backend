import { Injectable, NotFoundException } from '@nestjs/common';
import { PromotionRepository } from 'src/promotion/domain/repositories/promotion.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

interface GetPromotionForUserInput {
  userId: string;
}

interface GetPromotionForUserOutput {
  promotion: any;
  attachments: { [promotionId: string]: string[] };
}

@Injectable()
export class GetPromotionForUserUseCase {
  constructor(
    private readonly promotionRepository: PromotionRepository,
    private readonly userRepository: UserRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute({
    userId,
  }: GetPromotionForUserInput): Promise<GetPromotionForUserOutput> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }
    const promotion = await this.promotionRepository.getPromotionForUser(
      user.role.getRole(),
    );

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
