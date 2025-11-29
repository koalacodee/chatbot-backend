import { Injectable } from '@nestjs/common';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';
import {
  FileHubService,
  SignedUrlBatch,
} from 'src/filehub/domain/services/filehub.service';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';

export type FilehubAttachmentMessage = ReturnType<Attachment['toJSON']> & {
  signedUrl: string;
};

export interface GetTargetAttachmentsWithSignedUrlsInput {
  targetIds: string[];
  expiresInMs?: number;
}

@Injectable()
export class GetTargetAttachmentsWithSignedUrlsUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    input: GetTargetAttachmentsWithSignedUrlsInput,
  ): Promise<FilehubAttachmentMessage[]> {
    const { targetIds, expiresInMs } = input;

    if (!targetIds || targetIds.length === 0) {
      return [];
    }

    // Fetch all attachments for all target IDs
    const attachmentsPerTarget = await Promise.all(
      targetIds.map(async (targetId) => ({
        targetId,
        attachments: await this.attachmentRepository.findByTargetId(targetId),
      })),
    );

    // Flatten all attachments into a single array
    const allAttachments: Attachment[] = attachmentsPerTarget.flatMap(
      ({ attachments }) => attachments,
    );

    if (allAttachments.length === 0) {
      return [];
    }

    // Get unique filenames to avoid duplicate signed URL requests
    const uniqueFilenames = Array.from(
      new Set(allAttachments.map((attachment) => attachment.filename)),
    );

    // Bulk get signed URLs for all unique filenames
    const signedUrlBatch = await this.fileHubService.getSignedUrlBatch(
      uniqueFilenames,
      expiresInMs,
    );

    // Create a lookup map for quick access
    const signedUrlMap = this.createSignedUrlLookup(signedUrlBatch);

    // Map attachments to FilehubAttachmentMessage format
    // Filter out attachments that don't have signed URLs
    return allAttachments
      .map((attachment) => {
        const signedUrl = signedUrlMap.get(attachment.filename);
        if (!signedUrl) {
          return null;
        }
        return {
          ...attachment.toJSON(),
          signedUrl,
        };
      })
      .filter(
        (message): message is FilehubAttachmentMessage => message !== null,
      );
  }

  private createSignedUrlLookup(batch: SignedUrlBatch[]): Map<string, string> {
    return batch.reduce<Map<string, string>>((map, item) => {
      map.set(item.filename, item.signedUrl);
      return map;
    }, new Map());
  }
}
