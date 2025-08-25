import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

interface UpdatePromotionInputDto {
  title?: string;
  audience?: any; // use domain AudienceType
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date | null;
}

@Injectable()
export class UpdatePromotionUseCase {
  constructor(private readonly promotionRepo: PromotionRepository) {}

  async execute(id: string, dto: UpdatePromotionInputDto): Promise<Promotion> {
    const existing = await this.promotionRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'promotion_not_found' });

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.audience !== undefined) existing.audience = dto.audience as any;
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    if (dto.startDate !== undefined) existing.startDate = dto.startDate;
    if (dto.endDate !== undefined) existing.endDate = dto.endDate ?? undefined;

    return this.promotionRepo.save(existing);
  }
}
