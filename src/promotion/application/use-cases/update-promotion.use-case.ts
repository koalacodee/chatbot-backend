import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { FilesService } from 'src/files/domain/services/files.service';

interface UpdatePromotionInputDto {
  title?: string;
  audience?: any; // use domain AudienceType
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date | null;
  attach?: boolean;
}

@Injectable()
export class UpdatePromotionUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly filesService: FilesService,
  ) {}

  async execute(
    id: string,
    dto: UpdatePromotionInputDto,
  ): Promise<{ promotion: Promotion; uploadKey?: string }> {
    const existing = await this.promotionRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'promotion_not_found' });

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.audience !== undefined) existing.audience = dto.audience as any;
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    if (dto.startDate !== undefined) existing.startDate = dto.startDate;
    if (dto.endDate !== undefined) existing.endDate = dto.endDate ?? undefined;

    const [savedPromotion, uploadKey] = await Promise.all([
      this.promotionRepo.save(existing),
      dto.attach ? this.filesService.replaceFilesByTargetId(id) : undefined,
    ]);

    return { promotion: savedPromotion, uploadKey };
  }
}
