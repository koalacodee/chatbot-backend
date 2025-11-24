import { Injectable } from '@nestjs/common';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';
import {
  FileHubService,
  SignedUrlBatch,
} from 'src/filehub/domain/services/filehub.service';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';

export interface GetTargetAttachmentsSignedUrlsInput {
  targetIds: string[];
  expiresInMs?: number;
}

export type TargetAttachmentsSignedUrlMap = Record<
  string,
  Record<string, string>
>;

@Injectable()
export class GetTargetAttachmentsSignedUrlsUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    input: GetTargetAttachmentsSignedUrlsInput,
  ): Promise<TargetAttachmentsSignedUrlMap> {
    const { targetIds, expiresInMs } = input;

    if (!targetIds || targetIds.length === 0) {
      return {};
    }

    const attachmentsPerTarget = await Promise.all(
      targetIds.map(async (targetId) => ({
        targetId,
        attachments: await this.attachmentRepository.findByTargetId(targetId),
      })),
    );

    const allAttachments: Attachment[] = attachmentsPerTarget.flatMap(
      ({ attachments }) => attachments,
    );

    if (allAttachments.length === 0) {
      return targetIds.reduce<TargetAttachmentsSignedUrlMap>(
        (acc, targetId) => {
          acc[targetId] = {};
          return acc;
        },
        {},
      );
    }

    const uniqueFilenames = Array.from(
      new Set(allAttachments.map((attachment) => attachment.filename)),
    );

    const signedUrlBatch = await this.fileHubService.getSignedUrlBatch(
      uniqueFilenames,
      expiresInMs,
    );

    const signedUrlMap = this.createSignedUrlLookup(signedUrlBatch);

    return attachmentsPerTarget.reduce<TargetAttachmentsSignedUrlMap>(
      (acc, { targetId, attachments }) => {
        acc[targetId] = {};

        for (const attachment of attachments) {
          const signedUrl = signedUrlMap.get(attachment.filename);

          if (signedUrl) {
            acc[targetId][attachment.id] = signedUrl;
          }
        }

        return acc;
      },
      {},
    );
  }

  private createSignedUrlLookup(batch: SignedUrlBatch[]): Map<string, string> {
    return batch.reduce<Map<string, string>>((map, item) => {
      map.set(item.filename, item.signedUrl);
      return map;
    }, new Map());
  }
}
