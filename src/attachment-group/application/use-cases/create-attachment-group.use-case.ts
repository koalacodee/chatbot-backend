import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';
import { randomInt } from 'crypto';

interface CreateAttachmentGroupUseCaseRequest {
  userId: string;
  attachmentIds: string[];
  expiresAt?: Date;
}

interface CreateAttachmentGroupUseCaseResponse {
  key: string;
}

@Injectable()
export class CreateAttachmentGroupUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly attachmentRepository: AttachmentRepository,
  ) { }

  async execute(
    request: CreateAttachmentGroupUseCaseRequest,
  ): Promise<CreateAttachmentGroupUseCaseResponse> {
    const { userId, attachmentIds, expiresAt } = request;

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

    // Generate a random key
    const key = randomInt(1000000000, 10000000000).toString();

    // Create the attachment group
    const attachmentGroup = AttachmentGroup.create({
      createdById: userId,
      key,
      attachmentIds,
      expiresAt,
    });

    // Save the attachment group
    await this.attachmentGroupRepository.save(attachmentGroup);

    return {
      key: attachmentGroup.key,
    };
  }
}
