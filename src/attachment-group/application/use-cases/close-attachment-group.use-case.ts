import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';

interface CloseAttachmentGroupUseCaseRequest {
  key: string;
  ip: string;
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
    const { key, ip } = request;

    // Find the attachment group
    const attachmentGroup = await this.attachmentGroupRepository.findByKey(key);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    // Remove the IP from the list if it exists
    const updatedIps = attachmentGroup.ips.filter(
      (existingIp) => existingIp !== ip,
    );

    // If the IP wasn't in the list, no need to update
    if (updatedIps.length === attachmentGroup.ips.length) {
      return { success: true };
    }

    // Update the attachment group with the new IPs list
    await this.attachmentGroupRepository.update(attachmentGroup.id, {
      ips: updatedIps,
    });

    return {
      success: true,
    };
  }
}
