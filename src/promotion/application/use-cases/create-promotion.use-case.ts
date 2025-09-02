import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { FilesService } from 'src/files/domain/services/files.service';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface CreatePromotionInputDto {
  title: string;
  attach?: boolean;
  audience?: any; // domain AudienceType; default ALL
  startDate?: Date;
  endDate?: Date;
  createdByUserId: string;
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
  ) {}

  async execute(
    dto: CreatePromotionInputDto,
  ): Promise<{ saved: Promotion; uploadKey: string }> {
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

    const saved = await this.promotionRepo.save(promotion);

    // attach media to saved promotion via generic Attachment table
    let uploadKey: string;
    if (dto.attach) {
      uploadKey = await this.fileService.genUploadKey(promotion.id.toString());
    }
    return { saved, uploadKey: uploadKey ?? undefined };
  }
}
