import { Global, Module } from '@nestjs/common';
import { AttachmentRepository } from './domain/repositories/attachment.repository';
import { DrizzleAttachmentRepository } from './infrastructure/repositories/drizzle-attachment.repository';
import { FilehubWebhookController } from './interface/http/controllers/webhook.controller';
import { HandleUploadWebhookUseCase } from './application/use-cases/handle-upload-webhook.use-case';
import { FilehubUploadedListener } from './application/listeners/filehub.uploaded.listener';
import { FileHubService } from './domain/services/filehub.service';
import { FileHubServiceImpl } from './infrastructure/services/filehub.service';
import { GetTargetAttachmentsSignedUrlsUseCase } from './application/use-cases/get-target-attachments-signed-urls.use-case';

@Global()
@Module({
  providers: [
    { provide: AttachmentRepository, useClass: DrizzleAttachmentRepository },
    { provide: FileHubService, useClass: FileHubServiceImpl },
    HandleUploadWebhookUseCase,
    GetTargetAttachmentsSignedUrlsUseCase,
    FilehubUploadedListener,
  ],
  exports: [
    AttachmentRepository,
    FileHubService,
    GetTargetAttachmentsSignedUrlsUseCase,
  ],
  controllers: [FilehubWebhookController],
})
export class FilehubModule {}
