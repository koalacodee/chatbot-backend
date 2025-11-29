import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';

interface CloseAttachmentGroupUseCaseRequest {
  key: string;
  clientId: string;
}

interface CloseAttachmentGroupUseCaseResponse {
  success: boolean;
}

@Injectable()
export class CloseAttachmentGroupUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
  ) {}

  async execute(
    request: CloseAttachmentGroupUseCaseRequest,
  ): Promise<CloseAttachmentGroupUseCaseResponse> {
    const { key, clientId } = request;

    // Find the attachment group
    const attachmentGroup = await this.attachmentGroupRepository.findByKey(key);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    // Remove the IP from the list if it exists
    const updatedClientIds = attachmentGroup.clientIds.filter(
      (existingClientId) => existingClientId !== clientId,
    );

    // If the IP wasn't in the list, no need to update
    if (updatedClientIds.length === attachmentGroup.clientIds.length) {
      return { success: true };
    }

    // Update the attachment group with the new IPs list
    await this.attachmentGroupRepository.update(attachmentGroup.id, {
      clientIds: updatedClientIds,
    });

    return {
      success: true,
    };
  }
}
