import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

@Injectable()
export class GetPromotionUseCase {
  constructor(private readonly promotionRepo: PromotionRepository) {}

  async execute(id: string): Promise<Promotion> {
    const promotion = await this.promotionRepo.findById(id);
    if (!promotion) throw new NotFoundException({ id: 'promotion_not_found' });
    return promotion;
  }
}
