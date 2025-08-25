import { Global, Module } from '@nestjs/common';
import { AttachmentRepository } from './domain/repositories/attachment.repository';
import { PrismaAttachmentRepository } from './infrastructure/repositories/prisma-attachment.repository';
import { FilesService } from './domain/services/files.service';
import { LocalFilesService } from './infrastructure/services/local.files.service';
import { FilesController } from './interface/http/files.controller';
import { UploadFileUseCase } from './application/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from './application/use-cases/delete-file.use-case';
import { GenTokenUseCase } from './application/use-cases/gen-token.use-case';

@Global()
@Module({
  controllers: [FilesController],
  providers: [
    {
      provide: AttachmentRepository,
      useClass: PrismaAttachmentRepository,
    },
    {
      provide: FilesService,
      useClass: LocalFilesService,
    },
    UploadFileUseCase,
    DeleteFileUseCase,
    GenTokenUseCase,
  ],
  exports: [AttachmentRepository, FilesService],
})
export class FileModule {}
