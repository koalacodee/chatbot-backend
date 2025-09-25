import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Attachment } from 'src/files/domain/entities/attachment.entity';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';

interface UploadFileInput {
  targetId: string;
  filename: string;
  originalName: string;
  expirationDate?: Date;
}

@Injectable()
export class UploadFileUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly config: ConfigService,
  ) {}

  async execute({
    targetId,
    filename,
    originalName,
    expirationDate,
  }: UploadFileInput) {
    const attachment = await this.attachmentRepository.save(
      Attachment.create({
        targetId,
        filename,
        type: filename.split('.').pop(),
        originalName,
        expirationDate,
      }),
    );

    return attachment;
  }
}
