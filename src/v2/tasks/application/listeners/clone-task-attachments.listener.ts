import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CloneTaskAttachmentsEvent } from '../../domain/events/clone-task-attachments.event';
import { CloneAttachmentUseCase } from '@/files/application/use-cases/clone-attachment.use-case';

@Injectable()
export class CloneTaskAttachmentsListener {
  constructor(
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
  ) {}

  @OnEvent(CloneTaskAttachmentsEvent.name)
  async handleCloneTaskAttachmentsEvent(event: CloneTaskAttachmentsEvent) {
    await this.cloneAttachmentUseCase.execute({
      attachmentIds: event.attachmentIds,
      targetId: event.targetTaskId,
    });
  }
}
