import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';
import { AttachmentGroupNotificationService } from '../../domain/services/attachment-group-notification.service';

interface UpdateAttachmentGroupUseCaseRequest {
  groupId: string;
  userId: string;
  attachmentIds: string[];
}

interface UpdateAttachmentGroupUseCaseResponse {
  success: boolean;
}

@Injectable()
export class UpdateAttachmentGroupUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly notificationService: AttachmentGroupNotificationService,
  ) {}

  async execute(
    request: UpdateAttachmentGroupUseCaseRequest,
  ): Promise<UpdateAttachmentGroupUseCaseResponse> {
    const { groupId, userId, attachmentIds } = request;

    // Find the attachment group
    const attachmentGroup =
      await this.attachmentGroupRepository.findById(groupId);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    // Check if the user is the creator of the attachment group
    if (attachmentGroup.createdById !== userId) {
      throw new Error(
        'You do not have permission to update this attachment group',
      );
    }

    // Verify that all attachments exist and belong to the user
    const attachments =
      await this.attachmentRepository.findByIds(attachmentIds);

    if (attachments.length !== attachmentIds.length) {
      throw new Error('One or more attachments do not exist');
    }

    // Verify that all attachments belong to the user
    const userAttachments = attachments.filter(
      (attachment) => attachment.userId === userId || attachment.isGlobal,
    );

    if (userAttachments.length !== attachments.length) {
      throw new Error(
        'You do not have permission to access one or more attachments',
      );
    }

    // Update the attachment group
    await this.attachmentGroupRepository.update(groupId, {
      attachmentIds,
    });

    // Notify subscribers about the update
    try {
      this.notificationService.notifyGroupUpdate(attachmentGroup.key, {
        attachmentIds,
        attachments: attachments.map((attachment) => attachment.toJSON()),
        updatedAt: new Date(),
      });
    } catch (error) {
      // Log the error but don't fail the update operation
      console.error('Failed to notify subscribers:', error);
    }

    return {
      success: true,
    };
  }
}
