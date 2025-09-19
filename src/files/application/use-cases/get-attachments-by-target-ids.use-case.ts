import { Injectable } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { randomBytes } from 'crypto';

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
          (attachment) => attachment.expirationDate > new Date(),
        );

        const tokens = await Promise.all(
          validAttachments.map(async (attachment) => {
            const token = randomBytes(32).toString('base64url');
            const redisKey = `attachment:token:${token}`;

            // Store attachment ID in Redis with 24 hour expiry
            await this.redis.set(redisKey, attachment.id, 24 * 60 * 60);

            return token;
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
