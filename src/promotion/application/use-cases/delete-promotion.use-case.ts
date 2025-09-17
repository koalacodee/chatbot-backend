import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { FilesService } from 'src/files/domain/services/files.service';

@Injectable()
export class DeletePromotionUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly filesService: FilesService,
  ) {}

  async execute(id: string): Promise<{ success: boolean }> {
    // Delete associated files first
    await this.filesService.deleteFilesByTargetId(id);

    const removed: Promotion | null = await this.promotionRepo.removeById(id);
    if (!removed) throw new NotFoundException({ id: 'promotion_not_found' });
    return { success: true };
  }
}
