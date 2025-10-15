import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';

interface DeleteAttachmentGroupUseCaseRequest {
  groupId: string;
  userId: string;
}

interface DeleteAttachmentGroupUseCaseResponse {
  success: boolean;
}

@Injectable()
export class DeleteAttachmentGroupUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
  ) {}

  async execute(
    request: DeleteAttachmentGroupUseCaseRequest,
  ): Promise<DeleteAttachmentGroupUseCaseResponse> {
    const { groupId, userId } = request;

    // Find the attachment group
    const attachmentGroup =
      await this.attachmentGroupRepository.findById(groupId);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    // Check if the user is the creator of the attachment group
    if (attachmentGroup.createdById !== userId) {
      throw new Error(
        'You do not have permission to delete this attachment group',
      );
    }

    // Delete the attachment group
    await this.attachmentGroupRepository.removeById(groupId);

    return {
      success: true,
    };
  }
}
