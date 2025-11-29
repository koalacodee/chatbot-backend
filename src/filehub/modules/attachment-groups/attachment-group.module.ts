import { Global, Module } from '@nestjs/common';
import { DrizzleAttachmentGroupRepository } from './infrastructure/repositories/drizzle-attachment-group.repository';
import { AttachmentGroupRepository } from './domain/repositories/attachment-group.repository';
import { AttachmentGroupController } from './interface/http/attachment-group.controller';
import { AttachmentGroupGateway } from './interface/websocket/attachment-group.gateway';
import { CloseAttachmentGroupUseCase } from './application/use-cases/close-attachment-group.use-case';
import { CreateAttachmentGroupUseCase } from './application/use-cases/create-attachment-group.use-case';
import { DeleteAttachmentGroupUseCase } from './application/use-cases/delete-attachment-group.use-case';
import { GetAttachmentGroupByKeyUseCase } from './application/use-cases/get-attachment-group-by-key.use-case';
import { GetAttachmentGroupDetailsUseCase } from './application/use-cases/get-attachment-group-details.use-case';
import { GetMyAttachmentGroupsUseCase } from './application/use-cases/get-my-attachment-groups.use-case';
import { UpdateAttachmentGroupUseCase } from './application/use-cases/update-attachment-group.use-case';

@Global()
@Module({
  providers: [
    {
      provide: AttachmentGroupRepository,
      useClass: DrizzleAttachmentGroupRepository,
    },
    AttachmentGroupGateway,
    CloseAttachmentGroupUseCase,
    CreateAttachmentGroupUseCase,
    DeleteAttachmentGroupUseCase,
    GetAttachmentGroupByKeyUseCase,
    GetAttachmentGroupDetailsUseCase,
    GetMyAttachmentGroupsUseCase,
    UpdateAttachmentGroupUseCase,
  ],
  exports: [AttachmentGroupRepository],
  controllers: [AttachmentGroupController],
})
export class FileHubAttachmentGroupModule {}
