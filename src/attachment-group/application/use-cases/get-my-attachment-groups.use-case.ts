import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';
import { Attachment } from 'src/files/domain/entities/attachment.entity';

interface GetMyAttachmentGroupsUseCaseRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

interface AttachmentGroupWithAttachments {
  id: string;
  key: string;
  ips: string[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

interface GetMyAttachmentGroupsUseCaseResponse {
  attachmentGroups: AttachmentGroupWithAttachments[];
  totalCount: number;
  hasMore: boolean;
}

@Injectable()
export class GetMyAttachmentGroupsUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly attachmentRepository: AttachmentRepository,
  ) {}

  async execute(
    request: GetMyAttachmentGroupsUseCaseRequest,
  ): Promise<GetMyAttachmentGroupsUseCaseResponse> {
    const { userId, limit = 50, offset = 0 } = request;

    // Get the attachment groups
    const attachmentGroups =
      await this.attachmentGroupRepository.findByCreatedById(
        userId,
        limit,
        offset,
      );

    // Get the total count
    const totalCount =
      await this.attachmentGroupRepository.countByCreatedById(userId);

    // Get the attachments for each group
    const attachmentGroupsWithAttachments = await Promise.all(
      attachmentGroups.map(async (group) => {
        const attachments = await this.attachmentRepository.findByIds(
          group.attachmentIds,
        );

        return {
          id: group.id,
          key: group.key,
          ips: group.ips,
          attachments,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        };
      }),
    );

    return {
      attachmentGroups: attachmentGroupsWithAttachments,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  }
}
