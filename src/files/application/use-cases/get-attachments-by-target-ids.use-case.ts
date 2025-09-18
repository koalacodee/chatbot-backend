import { Injectable } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';

interface GetAttachmentsByTargetIdsInput {
  targetIds: string[];
}

export interface AttachmentUrlsByTarget {
  [targetId: string]: string[];
}

@Injectable()
export class GetAttachmentsByTargetIdsUseCase {
  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async execute({
    targetIds,
  }: GetAttachmentsByTargetIdsInput): Promise<AttachmentUrlsByTarget> {
    if (targetIds.length === 0) {
      return {};
    }

    const attachments = await Promise.all(
      targetIds.map(async (targetId) => {
        const targetAttachments =
          await this.attachmentRepository.findByTargetId(targetId);
        return {
          targetId,
          urls: targetAttachments.map((attachment) => attachment.url),
        };
      }),
    );

    const result: AttachmentUrlsByTarget = {};
    attachments.forEach(({ targetId, urls }) => {
      result[targetId] = urls;
    });

    return result;
  }
}
