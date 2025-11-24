import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FilehubUploadedEvent } from 'src/filehub/domain/events/filehub.uploaded.event';
import { WebhookData } from 'src/filehub/domain/services/filehub.service';

export interface HandleUploadWebhookInput {
  uploadKey: string;
  uploadLength?: number;
  objectName: string;
  originalName: string;
  timestamp: string; // ISO 8601 format
}

@Injectable()
export class HandleUploadWebhookUseCase {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async execute(input: WebhookData): Promise<void> {
    await this.eventEmitter.emitAsync(
      FilehubUploadedEvent.name,
      new FilehubUploadedEvent(input.upload, input.metadata, input.timestamp),
    );
  }
}
