import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

@Injectable()
export class TogglePromotionActiveUseCase {
  constructor(private readonly promotionRepo: PromotionRepository) {}

  async execute(id: string): Promise<Promotion> {
    const existing = await this.promotionRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'promotion_not_found' });
    existing.isActive = !existing.isActive;
    return this.promotionRepo.save(existing);
  }
}
