import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from 'src/shared/infrastructure/redis';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';
import { FilehubUploadedEvent } from 'src/filehub/domain/events/filehub.uploaded.event';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { FilehubGateway } from 'src/filehub/interface/websocket/filehub.gateway';

export interface FilehubUploadedTempData {
  userId?: string;
  guestId?: string;
  targetId?: string;
}

@Injectable()
export class FilehubUploadedListener {
  constructor(
    private readonly redis: RedisService,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly filehubGateway: FilehubGateway,
  ) {}

  @OnEvent(FilehubUploadedEvent.name)
  async handleFilehubUploadedEvent(event: FilehubUploadedEvent): Promise<void> {
    const data = await this.redis.get(
      `filehub:upload:${event.upload.uploadKey}`,
    );

    const json: FilehubUploadedTempData = JSON.parse(data);

    const attachment = Attachment.create({
      type: event.upload.filePath?.split('.').pop(),
      filename: event.upload.filePath,
      originalName: event.upload.originalFilename,
      expirationDate: event.metadata.expiration
        ? new Date(event.metadata.expiration)
        : undefined,
      userId: json.userId,
      guestId: json.guestId,
      targetId: json.targetId,
      cloned: false,
      isGlobal: event?.metadata?.isGlobal === '1',
      size: event.upload.uploadLength,
      createdAt: new Date(event.timestamp),
      updatedAt: new Date(event.timestamp),
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);
    await this.filehubGateway.broadcastAttachment(savedAttachment);
  }
}
