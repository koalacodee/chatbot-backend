import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { FilesService } from 'src/files/domain/services/files.service';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PromotionCreatedEvent } from 'src/promotion/domain/events/promotion-created.event';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface CreatePromotionInputDto {
  title: string;
  attach?: boolean;
  audience?: any; // domain AudienceType; default ALL
  startDate?: Date;
  endDate?: Date;
  createdByUserId: string;
  chooseAttachments?: string[];
}

@Injectable()
export class CreatePromotionUseCase {
  constructor(
    private readonly promotionRepo: PromotionRepository,
    private readonly userRepo: UserRepository,
    private readonly adminRepo: AdminRepository,
    private readonly supervisorRepo: SupervisorRepository,
    private readonly fileService: FilesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(dto: CreatePromotionInputDto): Promise<{
    promotion: ReturnType<Promotion['toJSON']>;
    uploadKey: string;
    fileHubUploadKey?: string;
  }> {
    const creator = await this.userRepo.findById(dto.createdByUserId);
    if (!creator) throw new NotFoundException({ id: 'creator_not_found' });

    const promotion = Promotion.create({
      title: dto.title,
      audience: dto.audience ?? 'ALL',
      isActive: true,
      startDate: dto.startDate,
      endDate: dto.endDate,
      createdByAdmin:
        creator.role.getRole() === Roles.ADMIN
          ? await this.adminRepo.findByUserId(creator.id)
          : undefined,
      createdBySupervisor:
        creator.role.getRole() === Roles.SUPERVISOR
          ? await this.supervisorRepo.findByUserId(creator.id)
          : undefined,
    });

    const [saved, uploadKey, fileHubUploadKey] = await Promise.all([
      this.promotionRepo.save(promotion),
      dto.attach
        ? this.fileService.genUploadKey(
            promotion.id.toString(),
            dto.createdByUserId,
          )
        : undefined,
      dto.attach
        ? this.fileHubService
            .generateUploadToken({
              expiresInMs: 1000 * 60 * 60 * 24,
              targetId: promotion.id.toString(),
              userId: dto.createdByUserId,
            })
            .then((upload) => upload.upload_key)
        : undefined,
      this.eventEmitter.emitAsync(
        PromotionCreatedEvent.name,
        new PromotionCreatedEvent(
          promotion.title,
          promotion.id.toString(),
          dto.createdByUserId,
          promotion.createdAt,
          promotion.audience,
        ),
      ),
    ]);

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: saved.id.toString(),
      });
    }

    return { promotion: saved.toJSON(), uploadKey, fileHubUploadKey };
  }
}
