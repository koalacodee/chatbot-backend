import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';
import { Attachment } from 'src/files/domain/entities/attachment.entity';

interface GetAttachmentGroupDetailsUseCaseRequest {
  groupId: string;
  userId: string;
}

interface GetAttachmentGroupDetailsUseCaseResponse {
  id: string;
  key: string;
  ips: string[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

@Injectable()
export class GetAttachmentGroupDetailsUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly attachmentRepository: AttachmentRepository,
  ) { }

  async execute(
    request: GetAttachmentGroupDetailsUseCaseRequest,
  ): Promise<GetAttachmentGroupDetailsUseCaseResponse> {
    const { groupId, userId } = request;

    // Find the attachment group by ID
    const attachmentGroup =
      await this.attachmentGroupRepository.findById(groupId);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    // Check if the user is the creator of the attachment group
    if (attachmentGroup.createdById !== userId) {
      throw new Error(
        'You do not have permission to access this attachment group',
      );
    }

    // Get the attachments
    const attachments = await this.attachmentRepository.findByIds(
      attachmentGroup.attachmentIds,
    );

    return {
      id: attachmentGroup.id,
      key: attachmentGroup.key,
      ips: attachmentGroup.ips,
      attachments,
      createdAt: attachmentGroup.createdAt,
      updatedAt: attachmentGroup.updatedAt,
      expiresAt: attachmentGroup.expiresAt,
    };
  }
}
