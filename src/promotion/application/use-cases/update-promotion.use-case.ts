import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { FilesService } from 'src/files/domain/services/files.service';
import { DeleteAttachmentsByIdsUseCase } from 'src/files/application/use-cases/delete-attachments-by-ids.use-case';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface UpdatePromotionInputDto {
  title?: string;
  audience?: any; // use domain AudienceType
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date | null;
  attach?: boolean;
  deleteAttachments?: string[];
  chooseAttachments?: string[];
}

@Injectable()
export class UpdatePromotionUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly filesService: FilesService,
    private readonly deleteAttachmentsUseCase: DeleteAttachmentsByIdsUseCase,
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    id: string,
    dto: UpdatePromotionInputDto,
    userId?: string,
  ): Promise<{
    promotion: Promotion;
    uploadKey?: string;
    fileHubUploadKey?: string;
  }> {
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

    const [savedPromotion, uploadKey, fileHubUploadKey] = await Promise.all([
      this.promotionRepo.save(existing),
      dto.attach ? this.filesService.genUploadKey(id, userId) : undefined,
      dto.attach
        ? this.fileHubService
            .generateUploadToken({
              expiresInMs: 1000 * 60 * 60 * 24,
              targetId: id,
              userId,
            })
            .then((upload) => upload.uploadKey)
        : undefined,
    ]);

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: id,
      });
    }

    return { promotion: savedPromotion, uploadKey, fileHubUploadKey };
  }
}
