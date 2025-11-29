import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AttachmentRepository } from './domain/repositories/attachment.repository';
import { PrismaAttachmentRepository } from './infrastructure/repositories/prisma-attachment.repository';
import { FilesService } from './domain/services/files.service';
import { LocalFilesService } from './infrastructure/services/local.files.service';
import { FileManagementClass } from './domain/services/file-mangement.service';
import { LocalFileManagementService } from './infrastructure/services/local-file-management.service';
import { AliOSSFileManagementService } from './infrastructure/services/ali-oss-file-management.service';
import { FilesController } from './interface/http/files.controller';
import { AttachmentController } from './interface/http/attachment.controller';
import { UploadFileUseCase } from './application/use-cases/upload-file.use-case';
import { GenTokenUseCase } from './application/use-cases/gen-token.use-case';
import { GetAttachmentsByTargetIdsUseCase } from './application/use-cases/get-attachments-by-target-ids.use-case';
import { GetAttachmentByTokenUseCase } from './application/use-cases/get-attachment-by-token.use-case';
import { GetAttachmentMetadataByTokenUseCase } from './application/use-cases/get-attachment-metadata-by-token.use-case';
import { DeleteAttachmentsByIdsUseCase } from './application/use-cases/delete-attachments-by-ids.use-case';
import { DeleteMyAttachmentUseCase } from './application/use-cases/delete-my-attachment.use-case';
import { GetAttachmentIdsByTargetIdsUseCase } from './application/use-cases/get-attachment-ids-by-target-ids.use-case';
import { GetMyAttachmentsUseCase } from './application/use-cases/get-my-attachments.use-case';
import { ShareAttachmentUseCase } from './application/use-cases/share-attachment.use-case';
import { CloneAttachmentUseCase } from './application/use-cases/clone-attachment.use-case';
import { SharedModule } from '../shared/shared.module';

@Global()
@Module({
  imports: [ConfigModule, SharedModule],
  controllers: [FilesController, AttachmentController],
  providers: [
    {
      provide: AttachmentRepository,
      useClass: PrismaAttachmentRepository,
    },
    {
      provide: FilesService,
      useClass: LocalFilesService,
    },
    {
      provide: FileManagementClass,
      useFactory: (
        config: ConfigService,
        localService: LocalFileManagementService,
        ossService: AliOSSFileManagementService,
      ) => {
        if (config.get('FILE_MANAGEMENT_SERVICE', 'local') === 'local') {
          return localService;
        } else if (
          config.get('FILE_MANAGEMENT_SERVICE', 'local') === 'ali-oss'
        ) {
          return ossService;
        } else {
          throw new Error('Invalid file management service');
        }
      },
      inject: [
        ConfigService,
        LocalFileManagementService,
        AliOSSFileManagementService,
      ],
    },
    LocalFileManagementService,
    AliOSSFileManagementService,
    UploadFileUseCase,
    GenTokenUseCase,
    GetAttachmentsByTargetIdsUseCase,
    GetAttachmentByTokenUseCase,
    GetAttachmentMetadataByTokenUseCase,
    DeleteAttachmentsByIdsUseCase,
    DeleteMyAttachmentUseCase,
    GetAttachmentIdsByTargetIdsUseCase,
    GetMyAttachmentsUseCase,
    ShareAttachmentUseCase,
    CloneAttachmentUseCase,
  ],
  exports: [
    AttachmentRepository,
    FilesService,
    FileManagementClass,
    LocalFileManagementService,
    AliOSSFileManagementService,
    GetAttachmentsByTargetIdsUseCase,
    GetAttachmentByTokenUseCase,
    GetAttachmentMetadataByTokenUseCase,
    DeleteAttachmentsByIdsUseCase,
    DeleteMyAttachmentUseCase,
    GetAttachmentIdsByTargetIdsUseCase,
    GetMyAttachmentsUseCase,
    ShareAttachmentUseCase,
    CloneAttachmentUseCase,
  ],
})
export class FileModule {}
