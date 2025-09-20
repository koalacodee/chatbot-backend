import { Injectable } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';

interface GetAttachmentIdsByTargetIdsInput {
  targetIds: string[];
}

export interface AttachmentIdsByTarget {
  [targetId: string]: string[];
}

@Injectable()
export class GetAttachmentIdsByTargetIdsUseCase {
  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async execute({
    targetIds,
  }: GetAttachmentIdsByTargetIdsInput): Promise<AttachmentIdsByTarget> {
    if (targetIds.length === 0) {
      return {};
    }

    const attachments = await Promise.all(
      targetIds.map(async (targetId) => {
        const targetAttachments =
          await this.attachmentRepository.findByTargetId(targetId);

        // Filter out expired attachments and return IDs for valid ones
        const validAttachments = targetAttachments.filter(
          (attachment) => attachment.expirationDate > new Date(),
        );

        const attachmentIds = validAttachments.map(
          (attachment) => attachment.id,
        );

        return {
          targetId,
          attachmentIds,
        };
      }),
    );

    const result: AttachmentIdsByTarget = {};
    attachments.forEach(({ targetId, attachmentIds }) => {
      result[targetId] = attachmentIds;
    });

    return result;
  }
}
