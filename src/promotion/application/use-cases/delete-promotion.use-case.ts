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
    // The row goes first. `targetId` is not namespaced by entity type, so deleting the
    // files ahead of the existence check meant any id in the system reached
    // `deleteFilesByTargetId` before the 404 came back.
    const removed: Promotion | null = await this.promotionRepo.removeById(id);
    if (!removed) throw new NotFoundException({ id: 'promotion_not_found' });

    // Still not atomic, but the surviving failure mode is now orphaned bytes rather
    // than a promotion pointing at attachments that no longer exist.
    await this.filesService.deleteFilesByTargetId(id);

    return { success: true };
  }
}
