import { GoneException, Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';
import { Attachment } from 'src/files/domain/entities/attachment.entity';
import { AttachmentGroup } from 'src/attachment-group/domain/entities/attachment-group.entity';

interface GetAttachmentGroupByKeyUseCaseRequest {
  key: string;
  ip: string;
}

interface GetAttachmentGroupByKeyUseCaseResponse {
  attachments: Attachment[];
}

@Injectable()
export class GetAttachmentGroupByKeyUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly attachmentRepository: AttachmentRepository,
  ) { }

  async execute(
    request: GetAttachmentGroupByKeyUseCaseRequest,
  ): Promise<GetAttachmentGroupByKeyUseCaseResponse> {
    const { key, ip } = request;

    // Find the attachment group by key
    const attachmentGroup = await this.attachmentGroupRepository.findByKey(key);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    if (attachmentGroup.isExpired()) {
      throw new GoneException("Attachment group has expired");
    }

    // Add the IP to the list if it doesn't exist
    const updatedAttachmentGroup = AttachmentGroup.create({
      id: attachmentGroup.id,
      createdById: attachmentGroup.createdById,
      key: attachmentGroup.key,
      ips: attachmentGroup.ips,
      attachmentIds: attachmentGroup.attachmentIds,
      createdAt: attachmentGroup.createdAt,
      updatedAt: attachmentGroup.updatedAt,
      expiresAt: attachmentGroup.expiresAt,
    });

    updatedAttachmentGroup.addIp(ip);

    // Update the attachment group with the new IP
    if (!attachmentGroup.ips.includes(ip)) {
      await this.attachmentGroupRepository.update(attachmentGroup.id, {
        ips: updatedAttachmentGroup.ips,
      });
    }

    // Get the attachments
    const attachments = await this.attachmentRepository.findByIds(
      attachmentGroup.attachmentIds,
    );

    return {
      attachments,
    };
  }
}
