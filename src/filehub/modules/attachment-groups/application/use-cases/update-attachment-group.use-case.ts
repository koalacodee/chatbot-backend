import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';
import { AttachmentGroupGateway } from '../../interface/websocket/attachment-group.gateway';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { AttachmentGroupMemberGateway } from '../../interface/websocket/member.gateway';

interface UpdateAttachmentGroupUseCaseRequest {
  groupId: string;
  userId: string;
  attachmentIds: string[];
  expiresAt?: Date;
}

interface UpdateAttachmentGroupUseCaseResponse {
  success: boolean;
}

@Injectable()
export class UpdateAttachmentGroupUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly attachmentGroupGateway: AttachmentGroupGateway,
    private readonly attachmentGroupMemberGateway: AttachmentGroupMemberGateway,

    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    request: UpdateAttachmentGroupUseCaseRequest,
  ): Promise<UpdateAttachmentGroupUseCaseResponse> {
    const { groupId, userId, attachmentIds, expiresAt } = request;

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
      expiresAt,
    });

    const signedUrls = await this.fileHubService.getSignedUrlBatch(
      attachments.map((attachment) => attachment.filename),
    );

    // Notify subscribers about the update
    try {
      this.attachmentGroupGateway.notifyGroup(attachmentGroup.key, {
        attachmentIds,
        attachments: attachments.map((attachment) => {
          const signedUrl = signedUrls.find(
            (url) => url.filename === attachment.filename,
          );
          return {
            ...attachment.toJSON(),
            signedUrl: signedUrl?.signedUrl,
          };
        }),
        updatedAt: new Date(),
      });

      this.attachmentGroupMemberGateway.notifyAttachmentsChange(
        attachmentGroup.id.toString(),
        attachments.map((attachment) => {
          const signedUrl = signedUrls.find(
            (url) => url.filename === attachment.filename,
          );
          return {
            ...attachment.toJSON(),
            signedUrl: signedUrl?.signedUrl,
          };
        }),
      );
    } catch (error) {
      // Log the error but don't fail the update operation
      console.error('Failed to notify subscribers:', error);
    }

    return {
      success: true,
    };
  }
}
