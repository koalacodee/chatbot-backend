import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

@Injectable()
export class TogglePromotionActiveUseCase {
  constructor(private readonly promotionRepo: PromotionRepository) {}

  async execute(id: string): Promise<Promotion> {
    // One statement, not read-flip-write: the previous pair let two concurrent toggles
    // both read the same value and write the same result, collapsing a round trip into
    // a single flip.
    const toggled = await this.promotionRepo.toggleActive(id);
    if (!toggled) throw new NotFoundException({ id: 'promotion_not_found' });
    return toggled;
  }
}
