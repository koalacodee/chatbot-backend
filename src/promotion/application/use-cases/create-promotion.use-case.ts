import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { User } from 'src/shared/entities/user.entity';
import { FilesService } from 'src/files/domain/services/files.service';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
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
  private readonly logger = new Logger(CreatePromotionUseCase.name);

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

    const { createdByAdmin, createdBySupervisor } =
      await this.resolveCreator(creator);

    const promotion = Promotion.create({
      title: dto.title,
      audience: dto.audience ?? 'ALL',
      isActive: true,
      startDate: dto.startDate,
      endDate: dto.endDate,
      createdByAdmin,
      createdBySupervisor,
    });

    promotion.assertCoherentSchedule();

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
            .then((upload) => upload.uploadKey)
        : undefined,
    ]);

    // Published only once the row exists, so a failed save cannot leave a
    // PROMOTION_CREATED entry behind for a promotion nobody can open. The audit log is
    // secondary to the create, so a subscriber that fails is logged rather than
    // surfaced — otherwise a broken log store 500s a promotion that was created fine.
    await this.eventEmitter
      .emitAsync(
        PromotionCreatedEvent.name,
        new PromotionCreatedEvent(
          saved.title,
          saved.id.toString(),
          dto.createdByUserId,
          saved.createdAt,
          saved.audience,
        ),
      )
      .catch((error) =>
        this.logger.error(
          `PromotionCreatedEvent subscribers failed for ${saved.id.toString()}`,
          error instanceof Error ? error.stack : error,
        ),
      );

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: saved.id.toString(),
      });
    }

    return { promotion: saved.toJSON(), uploadKey, fileHubUploadKey };
  }

  /**
   * Only admins and supervisors have a creator row. Previously a missing row was stored
   * as-is, so the entity carried `null` for an admin whose row was gone but `undefined`
   * for a role that has none — and a promotion saved with no author either way. A
   * missing row for a role that should have one is a data fault, not a valid promotion.
   */
  private async resolveCreator(creator: User): Promise<{
    createdByAdmin?: Admin;
    createdBySupervisor?: Supervisor;
  }> {
    switch (creator.role.getRole()) {
      case Roles.ADMIN: {
        const admin = await this.adminRepo.findByUserId(creator.id);
        if (!admin) throw new NotFoundException({ id: 'admin_not_found' });
        return { createdByAdmin: admin };
      }
      case Roles.SUPERVISOR: {
        const supervisor = await this.supervisorRepo.findByUserId(creator.id);
        if (!supervisor) {
          throw new NotFoundException({ id: 'supervisor_not_found' });
        }
        return { createdBySupervisor: supervisor };
      }
      default:
        // Reachable only by bypassing the controller's permission decorator; the
        // columns are nullable, so this saves as an unattributed promotion.
        return {};
    }
  }
}
