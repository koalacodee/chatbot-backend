import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(FilehubUploadedListener.name);

  constructor(
    private readonly redis: RedisService,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly filehubGateway: FilehubGateway,
  ) {}

  @OnEvent(FilehubUploadedEvent.name)
  async handleFilehubUploadedEvent(event: FilehubUploadedEvent): Promise<void> {
    const redisKey = `filehub:upload:${event.upload.uploadKey}`;
    this.logger.log(
      `[Listener] Fetching Redis key: ${redisKey}`,
    );

    const data = await this.redis.get(redisKey);

    if (!data) {
      this.logger.error(
        `[Listener] Redis key not found for uploadKey: ${event.upload.uploadKey} - cannot create attachment`,
      );
      throw new Error(
        `Redis key filehub:upload:${event.upload.uploadKey} not found`,
      );
    }

    const json: FilehubUploadedTempData = JSON.parse(data);

    this.logger.log(
      `[Listener] Redis data: userId=${json.userId ?? 'null'}, guestId=${json.guestId ?? 'null'}, targetId=${json.targetId ?? 'null'}`,
    );

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

    this.logger.log(
      `[Listener] Saving attachment: filename=${attachment.filename}, userId=${attachment.userId}`,
    );

    const savedAttachment = await this.attachmentRepository.save(attachment);

    this.logger.log(
      `[Listener] Saved attachment id=${savedAttachment.id}, filename=${savedAttachment.filename}`,
    );

    await this.filehubGateway.broadcastAttachment(savedAttachment);

    this.logger.log(`[Listener] Broadcast complete for attachment ${savedAttachment.id}`);
  }
}
