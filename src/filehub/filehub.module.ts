import { Global, Module } from '@nestjs/common';
import { AttachmentRepository } from './domain/repositories/attachment.repository';
import { DrizzleAttachmentRepository } from './infrastructure/repositories/drizzle-attachment.repository';
import { FilehubWebhookController } from './interface/http/controllers/webhook.controller';
import { HandleUploadWebhookUseCase } from './application/use-cases/handle-upload-webhook.use-case';
import { FilehubUploadedListener } from './application/listeners/filehub.uploaded.listener';
import { FileHubService } from './domain/services/filehub.service';
import { FileHubServiceImpl } from './infrastructure/services/filehub.service';
import { GetTargetAttachmentsSignedUrlsUseCase } from './application/use-cases/get-target-attachments-signed-urls.use-case';
import { GetTargetAttachmentsWithSignedUrlsUseCase } from './application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { GetMyAttachmentsUseCase } from './application/use-cases/get-my-attachments.use-case';
import { FilehubGateway } from './interface/websocket/filehub.gateway';
import { FilehubHttpController } from './interface/http/controllers/http.controller';
import { GenerateUserUploadTokenUseCase } from './application/use-cases/generate-user-upload-token.use-case';
import { DeleteMyAttachmentsUseCase } from './application/use-cases/delete-my-attachments.use-case';

@Global()
@Module({
  providers: [
    { provide: AttachmentRepository, useClass: DrizzleAttachmentRepository },
    { provide: FileHubService, useClass: FileHubServiceImpl },
    HandleUploadWebhookUseCase,
    GetTargetAttachmentsSignedUrlsUseCase,
    GetTargetAttachmentsWithSignedUrlsUseCase,
    GetMyAttachmentsUseCase,
    GenerateUserUploadTokenUseCase,
    DeleteMyAttachmentsUseCase,
    FilehubUploadedListener,
    FilehubGateway,
  ],
  exports: [
    AttachmentRepository,
    FileHubService,
    GetTargetAttachmentsSignedUrlsUseCase,
    GetTargetAttachmentsWithSignedUrlsUseCase,
    GetMyAttachmentsUseCase,
  ],
  controllers: [FilehubWebhookController, FilehubHttpController],
})
export class FilehubModule {}
