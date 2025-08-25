import { Injectable, NotFoundException } from '@nestjs/common';
import { PromotionRepository } from 'src/promotion/domain/repositories/promotion.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

interface GetPromotionForUserInput {
  userId: string;
}

@Injectable()
export class GetPromotionForUserUseCase {
  constructor(
    private readonly promotionRepository: PromotionRepository,
    private readonly userRepoitory: UserRepository,
  ) {}

  async execute({ userId }: GetPromotionForUserInput) {
    const user = await this.userRepoitory.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const promotion = await this.promotionRepository.getPromotionForUser(
      user.role.getRole(),
    );
    return promotion;
  }
}
