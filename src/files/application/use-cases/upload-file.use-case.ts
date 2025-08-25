import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Attachment } from 'src/files/domain/entities/attachment.entity';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';

interface UploadFileInput {
  targetId: string;
  filename: string;
}

@Injectable()
export class UploadFileUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly config: ConfigService,
  ) {}

  async execute({ targetId, filename }: UploadFileInput) {
    const url = `${this.config.getOrThrow('BASE_URL')}/public/${filename}`;

    const attachment = await this.attachmentRepository.save(
      Attachment.create({
        targetId,
        url,
        type: filename.split('.').pop(),
      }),
    );

    return attachment;
  }
}
