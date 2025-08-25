import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

@Injectable()
export class DeletePromotionUseCase {
  constructor(private readonly promotionRepo: PromotionRepository) {}

  async execute(id: string): Promise<{ success: boolean }>{
    const removed: Promotion | null = await this.promotionRepo.removeById(id);
    if (!removed) throw new NotFoundException({ id: 'promotion_not_found' });
    return { success: true };
  }
}
