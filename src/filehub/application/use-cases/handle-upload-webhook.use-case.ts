import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FilehubUploadedEvent } from 'src/filehub/domain/events/filehub.uploaded.event';
import { WebhookData } from 'src/filehub/domain/services/filehub.service';
import { ProfilePictureUploadedEvent } from 'src/filehub/modules/profile-pictures/domain/events/profile.picture.uploaded.event';
import { RedisService } from 'src/shared/infrastructure/redis';

export interface HandleUploadWebhookInput {
  uploadKey: string;
  uploadLength?: number;
  objectName: string;
  originalName: string;
  timestamp: string; // ISO 8601 format
}

@Injectable()
export class HandleUploadWebhookUseCase {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly redis: RedisService,
  ) {}

  async execute(input: WebhookData): Promise<void> {
    if (input.event !== 'tus_completed') {
      if (input.event == 'upload_completed') {
        const userId = await this.redis.get(
          `profile:upload:${input.objectPath}`,
        );
        if (userId) {
          await this.eventEmitter.emitAsync(
            ProfilePictureUploadedEvent.name,
            new ProfilePictureUploadedEvent(input.objectPath, userId),
          );
        }
        return;
      }
    }

    await this.eventEmitter.emitAsync(
      FilehubUploadedEvent.name,
      new FilehubUploadedEvent(input.upload, input.metadata, input.timestamp),
    );
  }
}
