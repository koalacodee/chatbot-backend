import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { FilesService } from 'src/files/domain/services/files.service';
import { DeleteAttachmentsByIdsUseCase } from 'src/files/application/use-cases/delete-attachments-by-ids.use-case';

interface UpdatePromotionInputDto {
  title?: string;
  audience?: any; // use domain AudienceType
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date | null;
  attach?: boolean;
  deleteAttachments?: string[];
}

@Injectable()
export class UpdatePromotionUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly filesService: FilesService,
    private readonly deleteAttachmentsUseCase: DeleteAttachmentsByIdsUseCase,
  ) {}

  async execute(
    id: string,
    dto: UpdatePromotionInputDto,
    userId?: string,
  ): Promise<{ promotion: Promotion; uploadKey?: string }> {
    const existing = await this.promotionRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'promotion_not_found' });

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.audience !== undefined) existing.audience = dto.audience as any;
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    if (dto.startDate !== undefined) existing.startDate = dto.startDate;
    if (dto.endDate !== undefined) existing.endDate = dto.endDate ?? undefined;

    // Handle attachment deletion if specified
    if (dto.deleteAttachments && dto.deleteAttachments.length > 0) {
      await this.deleteAttachmentsUseCase.execute({
        attachmentIds: dto.deleteAttachments,
      });
    }

    const [savedPromotion, uploadKey] = await Promise.all([
      this.promotionRepo.save(existing),
      dto.attach ? this.filesService.genUploadKey(id, userId) : undefined,
    ]);

    return { promotion: savedPromotion, uploadKey };
  }
}
