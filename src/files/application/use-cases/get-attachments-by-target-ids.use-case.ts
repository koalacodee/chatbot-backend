import { Injectable } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { randomBytes } from 'crypto';
import { FileManagementClass } from 'src/files/domain/services/file-mangement.service';

interface GetAttachmentsByTargetIdsInput {
  targetIds: string[];
}

export interface AttachmentTokensByTarget {
  [targetId: string]: string[];
}

@Injectable()
export class GetAttachmentsByTargetIdsUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileManagementService: FileManagementClass,
    private readonly redis: RedisService,
  ) {}

  async execute({
    targetIds,
  }: GetAttachmentsByTargetIdsInput): Promise<AttachmentTokensByTarget> {
    if (targetIds.length === 0) {
      return {};
    }

    const attachments = await Promise.all(
      targetIds.map(async (targetId) => {
        const targetAttachments =
          await this.attachmentRepository.findByTargetId(targetId);

        // Filter out expired attachments and generate tokens for valid ones
        const validAttachments = targetAttachments.filter(
          (attachment) =>
            !attachment.expirationDate ||
            attachment.expirationDate > new Date(),
        );

        const tokens = await Promise.all(
          validAttachments.map(async (attachment) => {
            return this.fileManagementService.genShareKey(
              attachment.id,
              24 * 60 * 60,
            );
          }),
        );

        return {
          targetId,
          tokens,
        };
      }),
    );

    const result: AttachmentTokensByTarget = {};
    attachments.forEach(({ targetId, tokens }) => {
      result[targetId] = tokens;
    });

    return result;
  }
}
