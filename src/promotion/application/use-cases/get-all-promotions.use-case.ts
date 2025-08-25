import { Injectable } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

@Injectable()
export class GetAllPromotionsUseCase {
  constructor(private readonly promotionRepo: PromotionRepository) {}

  async execute(offset?: number, limit?: number): Promise<Promotion[]> {
    return this.promotionRepo.findAll(offset, limit);
  }
}
