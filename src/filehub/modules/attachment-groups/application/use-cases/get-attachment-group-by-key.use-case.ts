import { GoneException, Injectable } from '@nestjs/common';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
interface GetAttachmentGroupByKeyUseCaseRequest {
  key: string;
  clientId: string;
}

interface GetAttachmentGroupByKeyUseCaseResponse {
  attachments: (ReturnType<typeof Attachment.prototype.toJSON> & {
    signedUrl: string;
  })[];
}

@Injectable()
export class GetAttachmentGroupByKeyUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    request: GetAttachmentGroupByKeyUseCaseRequest,
  ): Promise<GetAttachmentGroupByKeyUseCaseResponse> {
    const { key, clientId } = request;

    // Find the attachment group by key
    const attachmentGroup = await this.attachmentGroupRepository.findByKey(key);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    if (attachmentGroup.isExpired()) {
      throw new GoneException('Attachment group has expired');
    }

    // Add the IP to the list if it doesn't exist
    const updatedAttachmentGroup = AttachmentGroup.create({
      id: attachmentGroup.id,
      createdById: attachmentGroup.createdById,
      key: attachmentGroup.key,
      clientIds: attachmentGroup.clientIds,
      attachmentIds: attachmentGroup.attachmentIds,
      createdAt: attachmentGroup.createdAt,
      updatedAt: attachmentGroup.updatedAt,
      expiresAt: attachmentGroup.expiresAt,
    });

    updatedAttachmentGroup.addClient(clientId);

    // Update the attachment group with the new IP
    if (!attachmentGroup.clientIds.includes(clientId)) {
      await this.attachmentGroupRepository.update(attachmentGroup.id, {
        clientIds: updatedAttachmentGroup.clientIds,
      });
    }

    // Get the attachments
    const attachments = await this.attachmentRepository.findByIds(
      attachmentGroup.attachmentIds,
    );

    const signedUrls = await this.fileHubService.getSignedUrlBatch(
      attachments.map((attachment) => attachment.filename),
    );

    return {
      attachments: attachments.map((attachment) => {
        const signedUrl = signedUrls.find(
          (url) => url.filename === attachment.filename,
        );
        return {
          ...attachment.toJSON(),
          signedUrl: signedUrl?.signedUrl,
        };
      }),
    };
  }
}
