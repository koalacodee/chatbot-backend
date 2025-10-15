import { Module } from '@nestjs/common';
import { AttachmentGroupRepository } from './domain/repositories/attachment-group.repository';
import { PrismaAttachmentGroupRepository } from './infrastructure/repositories/prisma-attachment-group.repository';
import { CreateAttachmentGroupUseCase } from './application/use-cases/create-attachment-group.use-case';
import { GetAttachmentGroupByKeyUseCase } from './application/use-cases/get-attachment-group-by-key.use-case';
import { GetAttachmentGroupDetailsUseCase } from './application/use-cases/get-attachment-group-details.use-case';
import { GetMyAttachmentGroupsUseCase } from './application/use-cases/get-my-attachment-groups.use-case';
import { UpdateAttachmentGroupUseCase } from './application/use-cases/update-attachment-group.use-case';
import { DeleteAttachmentGroupUseCase } from './application/use-cases/delete-attachment-group.use-case';
import { CloseAttachmentGroupUseCase } from './application/use-cases/close-attachment-group.use-case';
import { AttachmentGroupController } from './interface/http/attachment-group.controller';
import { FileModule } from '../files/files.module';

@Module({
  imports: [FileModule],
  controllers: [AttachmentGroupController],
  providers: [
    {
      provide: AttachmentGroupRepository,
      useClass: PrismaAttachmentGroupRepository,
    },
    CreateAttachmentGroupUseCase,
    GetAttachmentGroupByKeyUseCase,
    GetAttachmentGroupDetailsUseCase,
    GetMyAttachmentGroupsUseCase,
    UpdateAttachmentGroupUseCase,
    DeleteAttachmentGroupUseCase,
    CloseAttachmentGroupUseCase,
  ],
  exports: [
    AttachmentGroupRepository,
    CreateAttachmentGroupUseCase,
    GetAttachmentGroupByKeyUseCase,
    GetAttachmentGroupDetailsUseCase,
    GetMyAttachmentGroupsUseCase,
    UpdateAttachmentGroupUseCase,
    DeleteAttachmentGroupUseCase,
    CloseAttachmentGroupUseCase,
  ],
})
export class AttachmentGroupModule {}
